#!/usr/bin/env node
/**
 * Local MCP server over stdio, for Claude Desktop and Claude Code.
 *
 * Runs on the operator's own machine, so it serves the `internal` audience:
 * negotiated rates, confidential rates and venue contacts are all visible.
 * The remote HTTP endpoint is the one that withholds them.
 *
 * Register it with:
 *
 *   claude mcp add alangkaar-venues -- pnpm tsx scripts/mcp-stdio.ts
 *
 * Messages are newline-delimited JSON, one object per line.
 */

import { createInterface } from "node:readline";

import { handlePayload } from "../lib/mcp/rpc";

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let payload: unknown;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      write({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      });
      continue;
    }

    // Local stdio is trusted, so the caller's audience stands and defaults to
    // internal when unset.
    const response = await handlePayload(withDefaultInternalAudience(payload));
    if (response !== null) write(response);
  }
}

function withDefaultInternalAudience(payload: unknown): unknown {
  const apply = (entry: unknown): unknown => {
    if (!entry || typeof entry !== "object") return entry;
    const req = entry as {
      method?: string;
      params?: { arguments?: Record<string, unknown> };
    };
    if (req.method !== "tools/call") return entry;
    const args = req.params?.arguments ?? {};
    if ("audience" in args) return entry;
    return {
      ...req,
      params: { ...req.params, arguments: { ...args, audience: "internal" } },
    };
  };

  return Array.isArray(payload) ? payload.map(apply) : apply(payload);
}

function write(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

main().catch((err) => {
  process.stderr.write(`alangkaar-venues: ${err instanceof Error ? err.stack : err}\n`);
  process.exit(1);
});
