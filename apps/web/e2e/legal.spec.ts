import { test, expect } from "@playwright/test";

test.describe("Legal pages", () => {
  test("GDPR page loads", async ({ page }) => {
    await page.goto("/gdpr");
    await expect(page.getByRole("heading", { name: /GDPR/i })).toBeVisible();
    await expect(page.getByText(/Acces|Rectificare|Ștergere|Portabilitate/i).first()).toBeVisible();
  });

  test("Terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /termeni|condiții/i })).toBeVisible();
  });

  test("Privacy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /confidențialitate|privacy/i })).toBeVisible();
  });

  test("legal pages have back link", async ({ page }) => {
    await page.goto("/gdpr");
    await expect(page.getByRole("link", { name: /înapoi/i })).toBeVisible();
  });
});
