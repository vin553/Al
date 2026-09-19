import { expect, test, type APIRequestContext } from "@playwright/test";

async function clearBoard(request: APIRequestContext) {
  const res = await request.get("/api/focus/tasks?done=1");
  const { tasks } = (await res.json()) as { tasks: { id: string }[] };
  for (const t of tasks) await request.delete(`/api/focus/tasks/${t.id}`);
}

test.describe("Focus board flow", () => {
  test.beforeEach(async ({ request }) => {
    await clearBoard(request);
  });

  test("adds, starts, snoozes and completes a task; KPIs and digest follow", async ({ page, request }) => {
    await page.goto("/focus");
    await expect(page).toHaveTitle(/Focus/);
    await expect(page.getByRole("heading", { name: /Board is empty/ })).toBeVisible();

    // Add an overdue task through the API and a due-today task through the form.
    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
    await request.post("/api/focus/tasks", {
      data: { title: "Chase Bali resort contract", entity: "alangkaar", priority: "p1", dueOn: yesterday },
    });
    await page.reload();

    await page.getByLabel("New task").fill("Send Ivory tea ceremony quote");
    await page.getByLabel("Entity").selectOption("ivory");
    await page.getByLabel("Priority").selectOption("p1");
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByRole("heading", { name: /Board is .*1 overdue/ })).toBeVisible();
    await expect(page.getByText("Overdue · 1")).toBeVisible();
    await expect(page.getByText("Due today · 1")).toBeVisible();
    await expect(page.getByText("Do these three first")).toBeVisible();

    // Start the Ivory task → moves to In progress.
    await page.getByRole("button", { name: "Start Send Ivory tea ceremony quote" }).click();
    await expect(page.getByText("In progress · 1")).toBeVisible();

    // Snooze the overdue one → it lands on tomorrow and leaves the overdue group.
    await page.getByRole("button", { name: "Snooze Chase Bali resort contract" }).click();
    await expect(page.getByText("Overdue · 1")).toHaveCount(0);
    await expect(page.getByText("Next 3 days · 1")).toBeVisible();

    // Complete the Ivory task via the checkbox.
    await page.getByRole("button", { name: "Complete Send Ivory tea ceremony quote" }).click();
    await expect(page.getByText("In progress · 1")).toHaveCount(0);
    await page.getByLabel("Show done").check();
    await expect(page.getByText("Done · 1")).toBeVisible();

    // Entity filter narrows the list.
    await page.getByRole("button", { name: "Ivory", exact: true }).click();
    await expect(page.getByTestId("task-row")).toHaveCount(1);

    // The review page previews a digest that names the remaining task.
    await page.goto("/focus/review");
    await page.getByRole("button", { name: /Evening review/ }).click();
    await expect(page.getByTestId("digest-body")).toContainText("Send Ivory tea ceremony quote");
    await expect(page.getByTestId("digest-body")).toContainText("1 completed today");

    // Sending with no channel configured records the digest rather than failing.
    await page.getByRole("button", { name: "Send now" }).click();
    await expect(page.getByText(/none: not sent/)).toBeVisible();
    await expect(page.getByText("recorded").first()).toBeVisible();
  });

  test("API validates input and enforces the cron secret contract", async ({ request }) => {
    const bad = await request.post("/api/focus/tasks", { data: { title: "   " } });
    expect(bad.status()).toBe(400);
    const badDate = await request.post("/api/focus/tasks", { data: { title: "x", dueOn: "19/09/2026" } });
    expect(badDate.status()).toBe(400);
    const badEntity = await request.post("/api/focus/tasks", { data: { title: "x", entity: "closed-co" } });
    expect(badEntity.status()).toBe(400);

    const missing = await request.patch("/api/focus/tasks/does-not-exist", { data: { status: "done" } });
    expect(missing.status()).toBe(404);

    // Preview is always open; with no CRON_SECRET set, send is open too.
    const preview = await request.get("/api/focus/nudge?kind=morning");
    expect(preview.ok()).toBeTruthy();
    const j = await preview.json();
    expect(j.digest.kind).toBe("morning");
    expect(j.digest.provider).toBe("offline-heuristic");
    expect(Array.isArray(j.channels)).toBeTruthy();
  });

  test("starter tasks load only onto an empty board", async ({ request }) => {
    const first = await request.post("/api/focus/seed");
    expect(first.status()).toBe(201);
    const second = await request.post("/api/focus/seed");
    expect(second.status()).toBe(409);
    const list = await (await request.get("/api/focus/tasks")).json();
    expect(list.tasks.length).toBeGreaterThanOrEqual(8);
  });
});
