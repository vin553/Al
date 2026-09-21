/**
 * Minimal MCP JSON-RPC dispatcher.
 *
 * A tools-only MCP server needs a small slice of the protocol, so this is
 * implemented directly rather than through the SDK. That keeps the Next.js
 * route handler free of transport adapters and leaves one code path shared by
 * both the HTTP and stdio entry points.
 */

import { callTool, TOOLS } from "./tools";

/** Protocol revision this server implements. */
export const PROTOCOL_VERSION = "2025-06-18";

export const SERVER_INFO = {
  name: "alangkaar-venues",
  version: "1.0.0",
} as const;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  /** Absent for notifications, which must not be answered. */
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;
const INVALID_REQUEST = -32600;

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function fail(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Handle one request.
 *
 * Returns `null` for notifications, which the caller must not respond to — the
 * spec treats a response to a notification as a protocol error.
 */
export async function handleRpc(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const isNotification = req.id === undefined;
  const id = req.id ?? null;

  if (req.jsonrpc !== "2.0") {
    return isNotification ? null : fail(id, INVALID_REQUEST, "Expected jsonrpc 2.0");
  }

  try {
    switch (req.method) {
      case "initialize":
        return ok(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
        });

      // Sent by the client once it has processed `initialize`. No reply.
      case "notifications/initialized":
      case "initialized":
        return null;

      case "ping":
        return ok(id, {});

      case "tools/list":
        return ok(id, { tools: TOOLS });

      case "tools/call": {
        const name = String(req.params?.name ?? "");
        const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
        return ok(id, await callTool(name, args));
      }

      default:
        return isNotification
          ? null
          : fail(id, METHOD_NOT_FOUND, `Unknown method: ${req.method}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return isNotification ? null : fail(id, INTERNAL_ERROR, message);
  }
}

/** Handle a single request or a JSON-RPC batch. */
export async function handlePayload(
  payload: unknown,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    const results = await Promise.all(
      payload.map((entry) => handleRpc(entry as JsonRpcRequest)),
    );
    const answered = results.filter((r): r is JsonRpcResponse => r !== null);
    return answered.length ? answered : null;
  }
  return handleRpc(payload as JsonRpcRequest);
}
