// Google Calendar integration.
//
// Lets the business connect ONE Google account (the owner's) so that every
// booking is pushed to their Google Calendar in real time. Implemented with
// plain fetch against Google's OAuth 2.0 + Calendar v3 endpoints so we don't
// pull in the heavy googleapis SDK.
//
// Required environment variables (set these on the host once you've created an
// OAuth client in Google Cloud Console):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI   (optional — otherwise derived from the request origin)
//
// The integration degrades gracefully: with no env vars set, the app runs
// exactly as before and the Settings page explains how to enable it.

import type { BookingDetail } from "./types";
import { getSetting, setSetting, deleteSetting } from "./db";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// Calendar event create/read + the user's email so we can show who's connected.
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"];

const TIME_ZONE = "Asia/Singapore";

const KEY_REFRESH = "google_refresh_token";
const KEY_EMAIL = "google_email";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildRedirectUri(origin: string): string {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/google/callback`;
}

export interface GoogleConnection {
  configured: boolean; // env vars present
  connected: boolean; // a Google account is linked
  email: string | null; // which account
}

export function getConnection(): GoogleConnection {
  return {
    configured: isGoogleConfigured(),
    connected: Boolean(getSetting(KEY_REFRESH)),
    email: getSetting(KEY_EMAIL),
  };
}

/** Build the Google consent screen URL to start the connect flow. */
export function getAuthUrl(origin: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: buildRedirectUri(origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // request a refresh token
    prompt: "consent", // force refresh token even on re-consent
    include_granted_scopes: "true",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/** Exchange the OAuth code for tokens and persist the connection. */
export async function handleCallback(code: string, origin: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: buildRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  const tokens = (await res.json()) as TokenResponse;
  if (!tokens.refresh_token) {
    // Google only returns a refresh token on first consent; prompt=consent above
    // should force it. If missing, the account was likely already authorised.
    throw new Error(
      "Google did not return a refresh token. Remove app access at myaccount.google.com/permissions and reconnect."
    );
  }

  // Look up which account just connected (for display on the Settings page).
  let email = "Google account";
  try {
    const who = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (who.ok) {
      const data = (await who.json()) as { email?: string };
      if (data.email) email = data.email;
    }
  } catch {
    /* non-fatal */
  }

  setSetting(KEY_REFRESH, tokens.refresh_token);
  setSetting(KEY_EMAIL, email);
  return email;
}

export function disconnect(): void {
  deleteSetting(KEY_REFRESH);
  deleteSetting(KEY_EMAIL);
}

/** Get a fresh access token using the stored refresh token. */
async function getAccessToken(): Promise<string | null> {
  const refresh = getSetting(KEY_REFRESH);
  if (!refresh || !isGoogleConfigured()) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("Google token refresh failed:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as TokenResponse;
  return data.access_token;
}

function eventPayload(b: BookingDetail) {
  const start = `${b.date}T${b.startTime}:00`;
  const end = `${b.date}T${b.endTime}:00`;
  const lines = [
    `Cleaner: ${b.cleaner.name}`,
    `Amount: S$${b.amount}`,
    b.customer.phone ? `Phone: ${b.customer.phone}` : "",
    b.remark ? `Notes: ${b.remark}` : "",
  ].filter(Boolean);
  return {
    summary: `${b.customer.name} — cleaning (${b.cleaner.code})`,
    description: lines.join("\n"),
    location: [b.customer.address, b.customer.postal].filter(Boolean).join(", "),
    start: { dateTime: start, timeZone: TIME_ZONE },
    end: { dateTime: end, timeZone: TIME_ZONE },
  };
}

/**
 * Create a Google Calendar event for a booking. Returns the event id, or null
 * if not connected / on failure (callers treat this as best-effort).
 */
export async function createCalendarEvent(b: BookingDetail): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(CALENDAR_EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventPayload(b)),
  });
  if (!res.ok) {
    console.error("Google Calendar event create failed:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

/** Delete a previously synced Google Calendar event (best-effort). */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;
  const res = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 410 /* already gone */) {
    console.error("Google Calendar event delete failed:", res.status, await res.text());
  }
}
