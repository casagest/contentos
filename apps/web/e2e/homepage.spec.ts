import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and displays hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/ContentOS|AI românesc|România/i).first()).toBeVisible();
  });

  test("has navigation to login and register", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /începe gratuit/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /încearcă.*gratuit|creează cont gratuit|începe gratuit/i }).first()).toBeVisible();
  });

  test("footer has legal links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /GDPR/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /termeni|condiții/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /confidențialitate|privacy/i })).toBeVisible();
  });
});
