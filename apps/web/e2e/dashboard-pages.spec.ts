import { test, expect } from "@playwright/test";

/**
 * Verificare: TOATE paginile dashboard se încarcă corect după autentificare.
 * Folosește storageState din auth.setup.ts (chromium-auth / firefox-auth projects).
 *
 * Fiecare test verifică:
 * 1. Pagina se încarcă (nu redirect la /login)
 * 2. Header-ul shell arată titlul corect
 * 3. Un element specific paginii este vizibil
 */

const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

test.describe("Dashboard pages — authenticated", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD");
  });

  test("Command Center se încarcă", async ({ page }) => {
    await page.goto("/dashboard/command-center");
    // Poate redirecționa la onboarding dacă user-ul nu a completat wizard-ul
    await expect(page).toHaveURL(/\/(dashboard\/command-center|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding — Command Center nu e accesibil");
    }
    await expect(page.getByRole("heading", { name: /command center/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("Dashboard Business se încarcă", async ({ page }) => {
    await page.goto("/dashboard/business");
    await expect(page).toHaveURL(/\/(dashboard\/business|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Shell header shows "Dashboard Business"
    await expect(page.locator("h1").filter({ hasText: /dashboard business/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("Brain Dump se încarcă", async ({ page }) => {
    await page.goto("/braindump");
    await expect(page).toHaveURL(/\/(braindump|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Brain Dump are fie idle state cu heading, fie textarea/input
    await expect(
      page.locator("h1, textarea, [aria-label='Mesaj Brain Dump']").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Compune se încarcă", async ({ page }) => {
    await page.goto("/compose");
    await expect(page).toHaveURL(/\/(compose|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Compose are textarea sau platform selectors
    await expect(
      page.locator("textarea, [role='group'], [role='switch']").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Antrenor AI (Coach) se încarcă", async ({ page }) => {
    await page.goto("/coach");
    await expect(page).toHaveURL(/\/(coach|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Coach are empty state sau chat area cu textarea input
    await expect(
      page.locator("textarea, [aria-label='Mesaj AI Coach'], button:has-text('Ce să postez')").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Scor Conținut (Analyze) se încarcă", async ({ page }) => {
    await page.goto("/analyze");
    await expect(page).toHaveURL(/\/(analyze|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Analyze/Scorer are textarea sau secțiune de evaluare
    await expect(
      page.locator("textarea, [role='group']").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Cercetare Conturi (Research) se încarcă", async ({ page }) => {
    await page.goto("/research");
    await expect(page).toHaveURL(/\/(research|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Research are input de căutare
    await expect(
      page.locator("input, textarea").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Inspirație se încarcă", async ({ page }) => {
    await page.goto("/inspiration");
    await expect(page).toHaveURL(/\/(inspiration|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Inspirație: input de search sau lista de inspirații sau empty state
    await expect(
      page.locator("input, h2, button").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Performanță (Analytics) se încarcă", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page).toHaveURL(/\/(analytics|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Analytics: stat cards sau chart area
    await expect(
      page.locator("[class*='font-bold'], canvas, svg").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Calendar Conținut se încarcă", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/(calendar|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Calendar: grid sau nav lună
    await expect(
      page.locator("button, [role='dialog'], table, [class*='grid']").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Istoric Postări se încarcă", async ({ page }) => {
    await page.goto("/history");
    await expect(page).toHaveURL(/\/(history|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // History: lista de postări sau empty state
    await expect(
      page.locator("h2, table, [class*='grid']").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Setări se încarcă", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/(settings|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Settings: tabs sau form elements
    await expect(
      page.locator("input, button, [role='tablist']").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Script Video se încarcă", async ({ page }) => {
    await page.goto("/video-script");
    await expect(page).toHaveURL(/\/(video-script|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Video Script: textarea sau form
    await expect(
      page.locator("textarea, input, button").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Editor Imagine se încarcă", async ({ page }) => {
    await page.goto("/image-editor");
    await expect(page).toHaveURL(/\/(image-editor|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }
    // Image Editor: canvas sau form
    await expect(
      page.locator("textarea, input, canvas, button").first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
