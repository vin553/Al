import { expect, test } from "@playwright/test";

test.describe("Charts flow", () => {
  test("pricing heatmap renders cells for every vendor row and a positioning scatter renders SVG", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Where everyone charges/i })).toBeVisible();

    // Heatmap table should have 6 data rows (one per vendor)
    const dataRows = page.locator("table tbody tr");
    await expect(dataRows).toHaveCount(6);
    // Each row should have 5 cells (1 vendor + 4 tiers)
    const firstRowCells = dataRows.first().locator("td");
    await expect(firstRowCells).toHaveCount(5);

    await page.goto("/positioning");
    await expect(page.getByRole("heading", { name: /Price vs\. breadth/i })).toBeVisible();

    // Recharts renders SVG; the scatter should render 6 points
    await page.waitForSelector(".recharts-scatter-symbol", { timeout: 15_000 });
    const points = page.locator(".recharts-scatter-symbol");
    await expect(points).toHaveCount(6);

    // Axis labels exist
    await expect(page.locator(".recharts-label").first()).toBeVisible();
  });

  test("pdf export api returns a pdf", async ({ request }) => {
    const res = await request.get("/api/export-pdf?view=compare");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const body = await res.body();
    expect(body.subarray(0, 4).toString()).toBe("%PDF");
  });
});
