/**
 * Remote MCP endpoint (Streamable HTTP), for ChatGPT and any other remote
 * MCP client.
 *
 * Access model
 * ------------
 * ChatGPT's custom connectors cannot present an API key or a custom header —
 * OpenAI supports OAuth or no authentication, and explicitly does not support
 * machine-to-machine grants or customer-supplied keys. Standing up a full OAuth
 * authorization server for a five-tool read-only service is disproportionate,
 * so access is tiered instead:
 *
 *   - Unauthenticated, or holding the URL secret: the `customer` audience.
 *     Negotiated and confidential rates, venue staff contacts and NOT ALLOWED
 *     venues are all withheld, so this view is safe to expose.
 *   - Holding `MCP_INTERNAL_TOKEN` as a bearer token: the `internal` audience.
 *     Reachable from Claude, which can send headers on a remote MCP server, and
 *     from scripts — but not from ChatGPT.
 *
 * `MCP_PUBLIC_TOKEN`, when set, must appear as `?k=` on every request. It keeps
 * the endpoint from being found by chance; it is not a substitute for the
 * redaction, because a URL secret can leak through logs and referrers. The
 * security of this endpoint rests on the customer view being safe to publish,
 * not on the URL staying unknown.
 */

import { authorize, forceAudience, gateConfigFromEnv } from "../../../lib/mcp/http";
import { handlePayload } from "../../../lib/mcp/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const gate = authorize(req, gateConfigFromEnv());
  if (!gate.ok) return json({ error: gate.reason ?? "Unauthorized" }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      400,
    );
  }

  const response = await handlePayload(forceAudience(payload, gate.audience));

  // Notifications get 202 with no body.
  if (response === null) return new Response(null, { status: 202 });

  return json(response, 200);
}

/** Liveness probe. MCP itself is POST-only. */
export async function GET(req: Request): Promise<Response> {
  const gate = authorize(req, gateConfigFromEnv());
  if (!gate.ok) return json({ error: gate.reason ?? "Unauthorized" }, 401);

  return json(
    {
      server: "alangkaar-venues",
      transport: "streamable-http",
      audience: gate.audience,
      hint: "POST JSON-RPC 2.0 to this URL.",
    },
    200,
  );
}
