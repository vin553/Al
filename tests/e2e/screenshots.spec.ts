import { test, expect } from "@playwright/test";
import path from "node:path";

const OUT = path.join(process.cwd(), "data", "screenshots");

test.describe("Screenshots for README", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const name of ["dashboard", "compare", "pricing", "positioning", "vendor-alangkaar", "focus", "focus-review", "focus-ai"]) {
    test(name, async ({ page, request }) => {
      const url =
        name === "dashboard"
          ? "/"
          : name === "vendor-alangkaar"
            ? "/vendor/alangkaar"
            : name === "focus-review"
              ? "/focus/review"
              : name === "focus-ai"
                ? "/focus/ai"
                : `/${name}`;
      if (name.startsWith("focus")) {
        // Starter tasks make the board worth looking at; 409 means it already has content.
        await request.post("/api/focus/seed");
      }
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      // let framer-motion settle
      await page.waitForTimeout(600);
      if (url.includes("positioning")) {
        await page.waitForSelector(".recharts-scatter-symbol", { timeout: 15_000 });
        await page.waitForTimeout(400);
      }
      if (url.includes("vendor")) {
        await page.waitForSelector("text=Strengths", { timeout: 15_000 });
      }
      await expect(page.locator("body")).toBeVisible();
      await page.screenshot({
        path: path.join(OUT, `${name}.png`),
        fullPage: name !== "positioning",
      });
    });
  }
});
