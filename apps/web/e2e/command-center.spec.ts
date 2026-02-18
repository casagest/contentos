import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Test Command Center după login.
 * Necesită TEST_USER_EMAIL și TEST_USER_PASSWORD în .env.local.
 */
test.describe("Command Center", () => {
  test("login și verificare Command Center", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD în .env.local");

    await login(page, "/dashboard/command-center");
    await expect(page).toHaveURL(/\/(dashboard\/command-center|onboarding)/);

    const path = new URL(page.url()).pathname;
    if (path === "/onboarding") {
      test.skip(true, "User în onboarding — Command Center nu este accesibil");
    }

    await expect(page.getByRole("heading", { name: /command center/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/sistem ok/i)).toBeVisible();
    await expect(page.getByText(/control central|metrici|acțiuni rapide/i).first()).toBeVisible();
    await expect(page.getByText(/draft-uri/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /brain dump/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /activitate recentă/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /conturi conectate/i })).toBeVisible();

    // Card Brain Dump din conținut (nth(1)), nu link-ul din sidebar — mai stabil în Firefox
    const braindumpLink = page.getByRole("link", { name: /brain dump/i }).nth(1);
    await braindumpLink.click();
    await expect(page).toHaveURL(/\/braindump/);
  });
});
