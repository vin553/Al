import { expect, test } from "@playwright/test";

test.describe("Dashboard flow", () => {
  test("renders KPI cards, vendor list, and links to a vendor detail page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SG Wedding Intel/);

    // Heading
    await expect(page.getByRole("heading", { name: /Luxury wedding market/i })).toBeVisible();

    // Four KPI cards
    for (const label of ["Vendors tracked", "Avg Google rating", "Aggregate IG reach", "Entry pp pricing"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // Vendor list has Alangkaar
    const alangkaarLink = page.getByRole("link", { name: /Alangkaar/ }).first();
    await expect(alangkaarLink).toBeVisible();
    await alangkaarLink.click();

    await expect(page).toHaveURL(/\/vendor\/alangkaar/);
    await expect(page.getByRole("heading", { name: "Alangkaar" })).toBeVisible();
    await expect(page.getByText("SWOT analysis")).toBeVisible();
  });
});
