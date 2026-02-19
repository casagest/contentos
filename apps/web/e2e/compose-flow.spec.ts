import { test, expect } from "@playwright/test";

/**
 * Compose (Creative Engine) — user journey cu 3 faze.
 * Phase 1: Input → Phase 2: Explore angles → Phase 3: Generate.
 */

const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

// Mock creative angles response
const ANGLES_MOCK = {
  angles: [
    {
      id: "hook_contrary_1",
      name: "Hook Contrariu",
      description: "Surprinde audiența cu un punct de vedere neașteptat.",
      framework: "Paradox Hook",
      predictedScore: 87,
    },
    {
      id: "storytelling_personal_1",
      name: "Storytelling Personal",
      description: "Conectează prin experiențe personale autentice.",
      framework: "Hero Journey Micro",
      predictedScore: 82,
    },
  ],
  meta: { mode: "ai", cached: false },
};

// Mock generation response — shape: { platformVersions: { [platform]: PlatformVersion }, meta }
const GENERATE_MOCK = {
  platformVersions: {
    facebook: {
      text: "🚀 Conținut generat: Știai că 90% din marketeri fac această greșeală?",
      hashtags: ["#marketing", "#digital", "#tips"],
      algorithmScore: { overallScore: 91, grade: "A" },
      alternativeVersions: [],
    },
  },
  meta: { mode: "ai", cached: false },
};

test.describe("Compose — Creative Engine flow", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD");
  });

  test("Phase 1: pagina se încarcă cu input area", async ({ page }) => {
    await page.goto("/compose");
    await expect(page).toHaveURL(/\/(compose|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Textarea vizibil
    await expect(page.locator("textarea").first()).toBeVisible({ timeout: 15_000 });

    // Platform selectors vizibile
    await expect(
      page.locator("[role='group'], [role='switch'], button:has-text('Facebook')").first()
    ).toBeVisible();
  });

  test("Phase 1 → Phase 2: submit trece la angles", async ({ page }) => {
    test.setTimeout(30_000);

    // Mock API creative tools (angles)
    // Compose uses /api/ai/generate for both explore and generate
    await page.route(/\/api\/ai\/generate/, async (route) => {
      const body = route.request().postDataJSON();
      if (body?.exploreOnly) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ANGLES_MOCK),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GENERATE_MOCK),
        });
      }
    });

    await page.goto("/compose");
    await expect(page).toHaveURL(/\/(compose|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Type in textarea (type not fill — React needs onChange events)
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 15_000 });
    await textarea.click();
    await textarea.type("O idee despre productivitate", { delay: 15 });
    await page.waitForTimeout(300);

    // Click "Exploreaza Unghiuri Creative" button
    const exploreBtn = page.getByRole("button", { name: /explor/i }).first();
    await expect(exploreBtn).toBeEnabled({ timeout: 5_000 });
    await exploreBtn.click();

    // Verify Phase 2: angles appear
    await expect(
      page.getByText(/Hook Contrariu|Storytelling Personal/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Phase 2 → Phase 3: selectare angle și generare", async ({ page }) => {
    test.setTimeout(45_000);

    // Mock API — single endpoint handles both explore and generate
    await page.route(/\/api\/ai\/generate/, async (route) => {
      const body = route.request().postDataJSON();
      if (body?.exploreOnly) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ANGLES_MOCK),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GENERATE_MOCK),
        });
      }
    });

    await page.goto("/compose");
    await expect(page).toHaveURL(/\/(compose|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Phase 1: fill textarea + click explore
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 15_000 });
    await textarea.click();
    await textarea.type("Testare flow complet", { delay: 20 });
    await page.waitForTimeout(300);

    const exploreBtn = page.getByRole("button", { name: /explor/i }).first();
    await exploreBtn.click();

    // Phase 2: wait for angles to appear
    const hookAngle = page.getByRole("button", { name: /Hook Contrariu/i }).first();
    await expect(hookAngle).toBeVisible({ timeout: 15_000 });

    // Click the angle to select it
    await hookAngle.click();
    await page.waitForTimeout(300);

    // Click "Genereaza cu Hook Contrariu" button
    const generateBtn = page.getByRole("button", { name: /genereaz/i }).last();
    await expect(generateBtn).toBeEnabled({ timeout: 5_000 });
    await generateBtn.click();

    // Phase 3: generated content appears
    await expect(
      page.getByText(/90%|marketeri|greșeală|Conținut generat/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
