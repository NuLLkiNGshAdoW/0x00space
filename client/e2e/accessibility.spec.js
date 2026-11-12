import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home page has no axe accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.locator("#application").scrollIntoViewIfNeeded();
  await expect(page.locator("#application form")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("video collection has no axe accessibility violations", async ({ page }) => {
  await page.goto("/videos");
  await expect(page.getByRole("heading", { name: "Видео 0x00 SPACE" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
