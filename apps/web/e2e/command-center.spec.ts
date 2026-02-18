import { test, expect } from "@playwright/test";

/**
 * Test Command Center după login.
 * Necesită TEST_USER_EMAIL și TEST_USER_PASSWORD în .env.local.
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

test("login și verificare Command Center", async ({ page }, testInfo) => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD în .env.local");

  await page.goto("/login?redirect=/dashboard/command-center");
  await expect(page.getByRole("heading", { name: /bine ai revenit|conectare/i })).toBeVisible();
  await page.getByLabel(/email/i).fill(TEST_EMAIL!);
  await page.getByLabel(/parolă|password/i).fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: /conectare|login/i }).click();

  await page.waitForURL(/\/(dashboard\/command-center|onboarding|login)/, { timeout: 15_000 });
  const path = new URL(page.url()).pathname;

  if (path === "/login") {
    let errorContext = "";
    try {
      const screenshot = await page.screenshot();
      await testInfo.attach("login-failed.png", { body: screenshot, contentType: "image/png" });
    } catch {
      /* ignoră */
    }
    const alert = page.getByRole("alert");
    if ((await alert.count()) > 0) {
      const alertText = await alert.first().textContent();
      if (alertText?.trim()) {
        errorContext = ` Mesaj de pe pagină: "${alertText.trim()}"`;
        await testInfo.attach("login-error-text.txt", { body: alertText, contentType: "text/plain" });
      }
    }
    const errorParam = new URL(page.url()).searchParams.get("error");
    if (errorParam) errorContext += ` Param URL (?error): "${errorParam}"`;

    throw new Error(
      `Login eșuat — verifică credențialele în .env.local.${errorContext || " (nu s-a afișat eroare pe pagină)"}`
    );
  }
  if (path === "/onboarding") {
    test.skip(true, "User în onboarding — Command Center nu este accesibil");
  }

  await expect(page.getByRole("heading", { name: /command center/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/sistem ok/i)).toBeVisible();
  await expect(page.getByText(/control central|metrici|acțiuni rapide/i)).toBeVisible();
  await expect(page.getByText(/draft-uri/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /brain dump/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /activitate recentă/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /conturi conectate/i })).toBeVisible();

  const braindumpLink = page.getByRole("link", { name: /brain dump/i }).first();
  await braindumpLink.click();
  await expect(page).toHaveURL(/\/braindump/);
});
