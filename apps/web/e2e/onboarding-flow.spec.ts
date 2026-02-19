import { test, expect } from "@playwright/test";

/**
 * Onboarding wizard — verificare UI elements.
 * Notă: Testăm doar structura UI, nu completarea wizardului
 * (ar schimba starea user-ului permanent).
 */

const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

test.describe("Onboarding — wizard structure", () => {
  test("pagina se încarcă (sau redirect la login/dashboard)", async ({ page }) => {
    await page.goto("/onboarding");
    // Poate fi: onboarding (dacă user e nou), dashboard (dacă completat), sau login (dacă neautentificat)
    await expect(page).toHaveURL(/\/(onboarding|dashboard|login)/, { timeout: 15_000 });
    await expect(page.locator("body")).toBeVisible();
    // Nu ar trebui să fie eroare 500
    await expect(page.getByText(/500|internal server error/i)).not.toBeVisible();
  });

  test("wizard-ul arată industry cards sau redirect la dashboard", async ({ page }) => {
    test.skip(!hasCredentials, "Lipsește credențiale");

    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 });

    if (page.url().includes("/dashboard")) {
      // User a completat deja onboarding-ul
      test.skip(true, "User a completat onboarding — redirect la dashboard");
    }

    // Step 1: Industry cards cu Lucide icons
    await expect(
      page.getByText(/dental|restaurant|beauty|fitness|e-commerce|imobiliare/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("wizard-ul are stepper vizual", async ({ page }) => {
    test.skip(!hasCredentials, "Lipsește credențiale");

    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 });

    if (page.url().includes("/dashboard")) {
      test.skip(true, "User a completat onboarding");
    }

    // Stepper: cel puțin butoane/indicatori de pas
    await expect(
      page.locator("button, [class*='step'], [class*='dot']").first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
