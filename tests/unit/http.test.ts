/**
 * Tests for remote-endpoint access control.
 *
 * `forceAudience` is the single control that keeps confidential rates away from
 * ChatGPT, which cannot authenticate at all. If it regresses, every rate a
 * venue asked us never to publish becomes reachable by asking for it.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { authorize, forceAudience } from "../../lib/mcp/http";

function request(url: string, headers: Record<string, string> = {}) {
  return {
    url,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  };
}

const URL_BASE = "https://example.test/api/mcp";

test("with no tokens configured, anyone may connect as a customer", () => {
  const gate = authorize(request(URL_BASE), {});

  assert.equal(gate.ok, true);
  assert.equal(gate.audience, "customer");
});

test("the internal bearer token grants the internal audience", () => {
  const gate = authorize(request(URL_BASE, { authorization: "Bearer s3cret" }), {
    internalToken: "s3cret",
  });

  assert.equal(gate.audience, "internal");
});

test("a wrong bearer token falls back to customer rather than erroring", () => {
  const gate = authorize(request(URL_BASE, { authorization: "Bearer wrong" }), {
    internalToken: "s3cret",
  });

  assert.equal(gate.ok, true);
  assert.equal(gate.audience, "customer", "fails closed, not open");
});

test("the bearer scheme is matched case-insensitively", () => {
  const gate = authorize(request(URL_BASE, { authorization: "bearer s3cret" }), {
    internalToken: "s3cret",
  });

  assert.equal(gate.audience, "internal");
});

test("when a public token is configured it is required on the query string", () => {
  const config = { publicToken: "url-key" };

  assert.equal(authorize(request(URL_BASE), config).ok, false);
  assert.equal(authorize(request(`${URL_BASE}?k=nope`), config).ok, false);
  assert.equal(authorize(request(`${URL_BASE}?k=url-key`), config).ok, true);
});

test("the internal bearer works even without the URL key", () => {
  const gate = authorize(request(URL_BASE, { authorization: "Bearer s3cret" }), {
    publicToken: "url-key",
    internalToken: "s3cret",
  });

  assert.equal(gate.ok, true);
  assert.equal(gate.audience, "internal");
});

test("a caller cannot choose its own audience", () => {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "get_venue", arguments: { venue: "x", audience: "internal" } },
  };

  const forced = forceAudience(payload, "customer") as typeof payload;

  assert.equal(
    forced.params.arguments.audience,
    "customer",
    "the transport decides the audience, not the request body",
  );
});

test("audience is forced across every call in a batch", () => {
  const batch = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "list_venues", arguments: { audience: "internal" } },
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "get_venue", arguments: { venue: "y" } },
    },
  ];

  const forced = forceAudience(batch, "customer") as any[];

  assert.equal(forced[0].params.arguments.audience, "customer");
  assert.equal(forced[1].params.arguments.audience, "customer");
});

test("non-tool methods pass through untouched", () => {
  const payload = { jsonrpc: "2.0", id: 1, method: "tools/list" };

  assert.deepEqual(forceAudience(payload, "customer"), payload);
});
