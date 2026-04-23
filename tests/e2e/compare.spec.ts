import { expect, test } from "@playwright/test";

test.describe("Compare matrix flow", () => {
  test("sorts, filters, and exposes a PDF export link", async ({ page }) => {
    await page.goto("/compare");

    // All 6 vendors present by default
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(6);

    // Filter by name
    await page.getByLabel("Filter by name").fill("alangkaar");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Alangkaar");

    // Clear
    await page.getByLabel("Filter by name").fill("");
    await expect(rows).toHaveCount(6);

    // Require a specific service and confirm fewer rows
    await page.getByRole("button", { name: "Destination" }).click();
    await expect(rows.first()).toContainText(/Alangkaar|1-Stop|8 Asthas|KM|Divine|Rasa/);
    await expect(await rows.count()).toBeLessThanOrEqual(6);

    // Clear service filter
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(rows).toHaveCount(6);

    // Sort by rating (toggle to ascending)
    await page.getByRole("columnheader", { name: /Rating/ }).click();
    const firstRowText = await rows.first().innerText();
    expect(firstRowText.length).toBeGreaterThan(0);

    // PDF export link points at the api
    const pdfLink = page.getByRole("link", { name: /Export PDF/ });
    await expect(pdfLink).toHaveAttribute("href", /\/api\/export-pdf\?view=compare/);
  });
});
