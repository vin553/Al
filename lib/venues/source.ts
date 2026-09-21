/**
 * Venue data source.
 *
 * Reads the venue folders from Google Drive at request time, so Drive stays the
 * single source of truth and nothing in this repo can drift from it. Results
 * are cached in memory for `CACHE_TTL_MS` because the data changes on the order
 * of days, not seconds.
 *
 * With no service-account credentials configured the loader falls back to the
 * synthetic fixtures in `data/fixtures`, which is what the tests run against.
 * Those fixtures deliberately contain no real rates.
 */

import { createSign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Venue } from "./types";

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const CACHE_TTL_MS = 10 * 60 * 1000;

interface Cache {
  venues: Venue[];
  loadedAt: number;
  source: "drive" | "fixtures";
}

let cache: Cache | null = null;

function credentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Private keys are usually pasted into env with literal \n escapes.
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const rootFolderId = process.env.VENUE_ROOT_FOLDER_ID;
  if (!email || !key || !rootFolderId) return null;
  return { email, key, rootFolderId };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Mint a short-lived access token via the service-account JWT grant.
 *
 * Done by hand rather than through google-auth-library so that deploying this
 * server needs no additional dependency.
 */
async function accessToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = base64url(signer.sign(key));

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Drive auth failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Drive auth returned no access_token");
  return body.access_token;
}

interface DriveFile {
  id: string;
  name: string;
  parents?: string[];
}

/**
 * Find every `pricing.json` under the venue root.
 *
 * Drive cannot query "descendant of X", so this searches by filename across
 * everything the service account can see, then keeps the files whose parent
 * folder sits under the configured root.
 */
async function findPricingFiles(token: string, rootFolderId: string): Promise<DriveFile[]> {
  const folderIds = new Set<string>();
  for (const f of await listAll(token, `'${rootFolderId}' in parents and trashed = false`)) {
    folderIds.add(f.id);
  }

  const pricing = await listAll(token, `name = 'pricing.json' and trashed = false`);
  return pricing.filter((f) => f.parents?.some((p) => folderIds.has(p)));
}

async function listAll(token: string, q: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(DRIVE_FILES);
    url.searchParams.set("q", q);
    url.searchParams.set("fields", "nextPageToken, files(id, name, parents)");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Drive list failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as {
      files?: DriveFile[];
      nextPageToken?: string;
    };
    out.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return out;
}

async function fetchVenue(token: string, fileId: string): Promise<Venue | null> {
  const res = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  try {
    return normalise(await res.json());
  } catch {
    // A malformed pricing.json should not take down the whole listing.
    return null;
  }
}

/**
 * Fill in fields that older `pricing.json` files may be missing, so downstream
 * code can rely on shape without optional-chaining everything.
 */
function normalise(raw: unknown): Venue {
  const v = raw as Partial<Venue> & { id: string; name: string };
  return {
    id: v.id,
    name: v.name,
    address: v.address ?? "",
    map: v.map ?? "",
    status: v.status ?? "PENDING",
    push_rank: v.push_rank ?? null,
    catering_policy: v.catering_policy ?? "",
    fire_ceremony: v.fire_ceremony ?? "Not asked",
    contact: v.contact ?? "",
    rates: (v.rates ?? []).map((r) => ({
      room: r.room ?? "",
      capacity: r.capacity ?? null,
      rate: r.rate ?? "",
      tax: r.tax ?? "",
      notes: r.notes ?? "",
      // Real classification happens in disclosure.ts; this is a safe placeholder
      // so the field is never undefined.
      disclosure: "confidential",
    })),
    rental_per_guest_all_in: v.rental_per_guest_all_in ?? null,
    terms: v.terms ?? "",
    includes: v.includes ?? [],
    rules: v.rules ?? [],
    addons: v.addons ?? [],
    links: v.links ?? [],
    photos: v.photos ?? [],
    originals: v.originals ?? [],
    docs: v.docs ?? [],
    next_action: v.next_action ?? "",
    updated: v.updated ?? "",
  };
}

async function loadFixtures(): Promise<Venue[]> {
  const dir = path.join(process.cwd(), "data", "fixtures");
  const names = (await readdir(dir)).filter((n) => n.endsWith(".json"));
  const venues = await Promise.all(
    names.map(async (n) => normalise(JSON.parse(await readFile(path.join(dir, n), "utf8")))),
  );
  return venues.sort((a, b) => a.id.localeCompare(b.id));
}

/** Load every venue, from Drive when configured and fixtures otherwise. */
export async function loadVenues(opts: { force?: boolean } = {}): Promise<Venue[]> {
  if (!opts.force && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.venues;
  }

  const creds = credentials();
  if (!creds) {
    const venues = await loadFixtures();
    cache = { venues, loadedAt: Date.now(), source: "fixtures" };
    return venues;
  }

  const token = await accessToken(creds.email, creds.key);
  const files = await findPricingFiles(token, creds.rootFolderId);
  const loaded = await Promise.all(files.map((f) => fetchVenue(token, f.id)));
  const venues = loaded
    .filter((v): v is Venue => v !== null)
    .sort((a, b) => a.id.localeCompare(b.id));

  cache = { venues, loadedAt: Date.now(), source: "drive" };
  return venues;
}

/** Where the currently cached data came from. Surfaced by the `health` tool. */
export function cacheStatus(): { source: string; ageMs: number | null; count: number } {
  if (!cache) return { source: "cold", ageMs: null, count: 0 };
  return {
    source: cache.source,
    ageMs: Date.now() - cache.loadedAt,
    count: cache.venues.length,
  };
}

/** Drop the cache. Used by tests and by the `refresh` tool. */
export function clearCache(): void {
  cache = null;
}
