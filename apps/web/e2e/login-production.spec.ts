import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Test de login real în producție.
 * Folosește TEST_USER_EMAIL și TEST_USER_PASSWORD din .env.local.
 */

test.describe("Login real în producție", () => {
  test("login cu credențiale reale și redirect la Command Center", async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, "Lipsește credențiale în .env.local");

    await login(page);
    await expect(page).toHaveURL(/\/(dashboard\/command-center|onboarding)/);
    await expect(page.locator("body")).toBeVisible();
    const title = await page.title();
    expect(title.toLowerCase()).not.toContain("error");
  });
});
