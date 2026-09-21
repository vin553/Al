/**
 * Tests for the MCP layer.
 *
 * The important property is that no confidential rate can reach a caller that
 * asked for the customer audience, whatever arguments it supplies.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { handleRpc, PROTOCOL_VERSION } from "../../lib/mcp/rpc";
import { callTool, TOOLS } from "../../lib/mcp/tools";
import { clearCache } from "../../lib/venues/source";

function parse(result: Awaited<ReturnType<typeof callTool>>): any {
  return JSON.parse(result.content[0].text);
}

test("initialize advertises the tools capability", async () => {
  const res = await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize" });

  assert.ok(res);
  assert.equal((res.result as any).protocolVersion, PROTOCOL_VERSION);
  assert.ok((res.result as any).capabilities.tools);
});

test("a notification is not answered", async () => {
  const res = await handleRpc({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  });

  assert.equal(res, null, "answering a notification is a protocol error");
});

test("an unknown method returns method-not-found", async () => {
  const res = await handleRpc({ jsonrpc: "2.0", id: 2, method: "nope" });

  assert.equal(res?.error?.code, -32601);
});

test("tools/list exposes every tool with a schema", async () => {
  const res = await handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/list" });
  const tools = (res?.result as any).tools;

  assert.equal(tools.length, TOOLS.length);
  for (const tool of tools) {
    assert.ok(tool.name && tool.description && tool.inputSchema);
  }
});

test("list_venues hides NOT ALLOWED venues from a customer but not internally", async () => {
  clearCache();
  const asCustomer = parse(await callTool("list_venues", { audience: "customer" }));
  const asStaff = parse(await callTool("list_venues", { audience: "internal" }));

  const ids = (r: any) => r.venues.map((v: any) => v.id);
  assert.ok(!ids(asCustomer).includes("blockedclub"));
  assert.ok(ids(asStaff).includes("blockedclub"));
});

test("a customer gets no headline rate for a confidential venue", async () => {
  const res = parse(await callTool("list_venues", { audience: "customer" }));
  const venue = res.venues.find((v: any) => v.id === "confidentialhotel");

  assert.match(venue.headline_rate, /withheld/);
  assert.match(venue.handling, /never publish/i);
});

test("get_venue withholds confidential rates and the contact", async () => {
  const res = parse(
    await callTool("get_venue", { venue: "confidentialhotel", audience: "customer" }),
  );

  assert.equal(res.venue.rates.length, 0);
  assert.equal(res.venue.contact, undefined);
  assert.equal(res.venue.withheld.count, 2);
});

test("get_venue on a NOT ALLOWED venue tells a customer it is withheld", async () => {
  const res = parse(
    await callTool("get_venue", { venue: "blockedclub", audience: "customer" }),
  );

  assert.equal(res.error, "withheld");
  assert.match(res.handling, /never propose/i);
});

test("an unrecognised audience value falls back to customer", async () => {
  const res = parse(
    await callTool("get_venue", { venue: "confidentialhotel", audience: "admin" }),
  );

  assert.equal(res.audience, "customer");
  assert.equal(res.venue.rates.length, 0);
});

test("min_capacity filters on the largest room", async () => {
  const res = parse(
    await callTool("list_venues", { audience: "internal", min_capacity: 500 }),
  );

  assert.ok(res.venues.length > 0);
  for (const venue of res.venues) {
    assert.ok(venue.max_capacity >= 500, `${venue.id} seats ${venue.max_capacity}`);
  }
});

test("search matches on inclusions, not just names", async () => {
  const res = parse(
    await callTool("search_venues", { query: "pillarless", audience: "internal" }),
  );

  assert.equal(res.count, 1);
  assert.equal(res.venues[0].id, "affiliatehall");
});

test("pricing_notation states the compounded ++ figure", async () => {
  const res = parse(await callTool("pricing_notation", {}));

  assert.equal(res.worked_example.final, 23980);
  assert.match(res.tax_basis["++"], /10% service charge AND 9% GST/);
});

test("health reports that fixtures are not real data", async () => {
  const res = parse(await callTool("health", {}));

  assert.equal(res.source, "fixtures");
  assert.match(res.note, /not real/i);
});

test("an unknown tool is an error, not a silent empty result", async () => {
  const res = await callTool("drop_database", {});

  assert.equal(res.isError, true);
});
