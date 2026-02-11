import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /bine ai revenit|conectare/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /conectare|login/i })).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /creează cont|înregistrare|verifică-ți emailul/i })
    ).toBeVisible();
  });

  test("login form submits without crashing", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/parolă|password/i).fill("wrongpassword123");
    await page.getByRole("button", { name: /conectare|login/i }).click();
    // Should stay on login or show error (not 500)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });
});
