import { test, expect } from "@playwright/test";

/**
 * Settings page — verificare secțiuni și funcționalitate.
 * Testează: secțiuni vizibile, profil form, billing, conturi conectate.
 */

const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

test.describe("Settings — secțiuni și funcționalitate", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD");
  });

  test("toate secțiunile sunt vizibile", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/(settings|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Secțiuni principale: Profil, Business, Conturi, Billing, Notificări, Securitate
    await expect(page.getByText(/profil|cont/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/business|afacere/i).first()).toBeVisible();
    await expect(page.getByText(/conectate|platforme/i).first()).toBeVisible();
    await expect(page.getByText(/billing|plan|abonament/i).first()).toBeVisible();
  });

  test("profil: heading și câmpul nume vizibil", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/(settings|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Heading "Profil" și câmpul "Numele tau"
    await expect(page.getByRole("heading", { name: /profil/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("textbox", { name: /numele/i }).first()).toBeVisible();
  });

  test("billing: planul curent afișat", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/(settings|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Plan curent: Free, Pro, sau Agency
    await expect(
      page.getByText(/free|pro|agency|gratuit|plan curent/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("conturi conectate: platforme vizibile", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/(settings|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Cel puțin o platformă de social media menționată
    await expect(
      page.getByText(/facebook|instagram|tiktok|linkedin/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
