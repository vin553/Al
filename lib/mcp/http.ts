/**
 * Access control for the remote MCP endpoint.
 *
 * Kept apart from the route handler so the two controls that matter — deciding
 * the audience, and stopping a caller from choosing its own — are directly
 * testable.
 */

export type Audience = "customer" | "internal";

export interface Gate {
  ok: boolean;
  audience: Audience;
  reason?: string;
}

export interface GateConfig {
  /** When set, must be supplied as `?k=` on every request. */
  publicToken?: string;
  /** When set, grants the internal audience as a bearer token. */
  internalToken?: string;
}

/**
 * Decide whether a request may proceed, and as which audience.
 *
 * Fails closed: an unrecognised bearer token yields the customer audience
 * rather than an error, so a misconfigured client leaks nothing.
 */
export function authorize(
  req: { url: string; headers: { get(name: string): string | null } },
  config: GateConfig,
): Gate {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = /^bearer\s+/i.test(auth) ? auth.replace(/^bearer\s+/i, "").trim() : null;

  if (config.internalToken && bearer && timingSafeEqual(bearer, config.internalToken)) {
    return { ok: true, audience: "internal" };
  }

  if (config.publicToken) {
    let supplied: string | null = null;
    try {
      supplied = new URL(req.url).searchParams.get("k");
    } catch {
      supplied = null;
    }
    if (!supplied || !timingSafeEqual(supplied, config.publicToken)) {
      return {
        ok: false,
        audience: "customer",
        reason: "Missing or invalid access key.",
      };
    }
  }

  return { ok: true, audience: "customer" };
}

/** Constant-time string comparison, so a token cannot be guessed byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Overwrite the `audience` argument on every `tools/call` in a payload.
 *
 * The audience is a property of the transport, never of the request body.
 * Without this, any ChatGPT user could pass `audience: "internal"` and receive
 * the rates venues asked us never to publish.
 */
export function forceAudience(payload: unknown, audience: Audience): unknown {
  const apply = (entry: unknown): unknown => {
    if (!entry || typeof entry !== "object") return entry;
    const req = entry as {
      method?: string;
      params?: { arguments?: Record<string, unknown> };
    };
    if (req.method !== "tools/call") return entry;
    return {
      ...req,
      params: {
        ...req.params,
        arguments: { ...(req.params?.arguments ?? {}), audience },
      },
    };
  };

  return Array.isArray(payload) ? payload.map(apply) : apply(payload);
}

/** Read gate configuration from the environment. */
export function gateConfigFromEnv(): GateConfig {
  return {
    publicToken: process.env.MCP_PUBLIC_TOKEN,
    internalToken: process.env.MCP_INTERNAL_TOKEN,
  };
}
