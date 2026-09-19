import { expect, test } from "@playwright/test";
import { pickProvider } from "../../lib/ai/router";
import { parseCalendarSources } from "../../lib/focus-sync";

const KEYS = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "HIGGSFIELD_API_KEY_ID", "HIGGSFIELD_API_KEY_SECRET"];

function withEnv(set: Record<string, string>, fn: () => void) {
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, set);
  try {
    fn();
  } finally {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k] as string;
    }
  }
}

test.describe("AI router (pure)", () => {
  test("routes each mode to its preferred provider when everything is configured", () => {
    withEnv({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "b", GEMINI_API_KEY: "c" }, () => {
      expect(pickProvider("plan").provider).toBe("anthropic");
      expect(pickProvider("draft").provider).toBe("anthropic");
      expect(pickProvider("summarize").provider).toBe("gemini");
      expect(pickProvider("second-opinion").provider).toBe("openai");
      expect(pickProvider("creative").provider).toBe("anthropic");
    });
  });

  test("falls back down the chain and explains why", () => {
    withEnv({ OPENAI_API_KEY: "b" }, () => {
      const p = pickProvider("plan");
      expect(p.provider).toBe("openai");
      expect(p.reason).toMatch(/Claude not configured, fell back to ChatGPT/);
      expect(pickProvider("summarize").provider).toBe("openai");
    });
    withEnv({}, () => {
      const p = pickProvider("draft");
      expect(p.provider).toBeNull();
      expect(p.reason).toBe("no text provider configured");
    });
  });

  test("honours a forced provider only when it is configured", () => {
    withEnv({ ANTHROPIC_API_KEY: "a" }, () => {
      expect(pickProvider("draft", "anthropic").provider).toBe("anthropic");
      const p = pickProvider("draft", "gemini");
      expect(p.provider).toBeNull();
      expect(p.reason).toMatch(/Gemini is not configured/);
    });
  });

  test("calendar source parsing still works (regression guard for shared helpers)", () => {
    expect(parseCalendarSources("A=https://x.test/a.ics")).toEqual([{ name: "A", url: "https://x.test/a.ics" }]);
  });
});

test.describe("AI desk flow", () => {
  test("validates input and records an honest offline run when no key is set", async ({ page, request }) => {
    const bad = await request.post("/api/ai/run", { data: { mode: "nope", prompt: "x" } });
    expect(bad.status()).toBe(400);
    const empty = await request.post("/api/ai/run", { data: { mode: "plan", prompt: "   " } });
    expect(empty.status()).toBe(400);
    const badProvider = await request.post("/api/ai/run", { data: { mode: "plan", prompt: "x", provider: "grok" } });
    expect(badProvider.status()).toBe(400);

    const status = await (await request.get("/api/ai/providers")).json();
    expect(status.providers.map((p: { id: string }) => p.id)).toEqual(["anthropic", "openai", "gemini", "higgsfield"]);
    const anyText = status.providers.some((p: { id: string; configured: boolean }) => p.id !== "higgsfield" && p.configured);
    test.skip(anyText, "a real key is configured in this environment; offline assertions do not apply");

    await page.goto("/focus/ai");
    await expect(page).toHaveTitle(/AI desk/);
    await page.getByRole("tab", { name: "Council" }).click();
    await page.getByLabel("Prompt").fill("Should we open in Bali?");
    await page.getByRole("button", { name: "Run" }).click();
    await expect(page.getByTestId("run-error")).toHaveText(/no text provider configured/);
    await expect(page.getByTestId("run-routing")).toContainText("no text provider configured");

    const runs = await (await request.get("/api/ai/runs?limit=5")).json();
    expect(runs.runs[0].mode).toBe("council");
    expect(runs.runs[0].prompt).toBe("Should we open in Bali?");
  });

  test("task link pre-selects breakdown mode with the task attached", async ({ page, request }) => {
    const created = await (await request.post("/api/focus/tasks", { data: { title: "Plan the Ivory tea ceremony", entity: "ivory" } })).json();
    await page.goto(`/focus/ai?task=${created.task.id}`);
    await expect(page.getByText("About task:")).toBeVisible();
    await expect(page.getByText("Plan the Ivory tea ceremony")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Break down a task" })).toHaveAttribute("aria-selected", "true");
    await request.delete(`/api/focus/tasks/${created.task.id}`);
  });
});
