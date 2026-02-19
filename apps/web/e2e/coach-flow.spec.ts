import { test, expect } from "@playwright/test";

/**
 * AI Coach — chat flow cu mock API.
 * Testează: empty state → sugestii clickable → send mesaj → răspuns AI.
 */

const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

// Mock coach response — shape-ul așteptat: { answer, actionItems?, meta }
const COACH_MOCK = {
  answer: "Bună! Pe baza analizei profilului tău, îți recomand să postezi conținut de tip educațional dimineața devreme (8-9 AM). Iată 3 idei concrete pentru azi.",
  actionItems: ["Postează un sfat rapid despre industria ta", "Creează un studiu de caz"],
  meta: { mode: "ai" },
};

test.describe("AI Coach — chat flow", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD");
  });

  test("empty state: heading și sugestii vizibile", async ({ page }) => {
    await page.goto("/coach");
    await expect(page).toHaveURL(/\/(coach|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Empty state: titlu coach
    await expect(
      page.getByText(/coach|antrenor|salut/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Sugestii: "Ce să postez azi?"
    await expect(
      page.getByText(/ce să postez/i).first()
    ).toBeVisible();

    // Input textarea vizibil
    await expect(page.locator("textarea").first()).toBeVisible();
  });

  test("trimite mesaj → primește răspuns AI", async ({ page }) => {
    test.setTimeout(30_000);

    // Mock API coach
    await page.route(/\/api\/ai\/coach/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(COACH_MOCK),
      });
    });

    await page.goto("/coach");
    await expect(page).toHaveURL(/\/(coach|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Scrie un mesaj
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 15_000 });
    await textarea.fill("Ce să postez azi pe Instagram?");

    // Submit (Enter sau button)
    const sendBtn = page.locator("button[type='submit'], button").filter({ has: page.locator("svg") }).last();
    await sendBtn.click();

    // Mesajul user-ului apare în chat
    await expect(
      page.getByText(/Ce să postez azi pe Instagram/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Răspunsul AI-ului apare
    await expect(
      page.getByText(/educațional|dimineața|recomand|idei concrete/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("click pe sugestie trimite mesaj", async ({ page }) => {
    test.setTimeout(30_000);

    // Mock API
    await page.route(/\/api\/ai\/coach/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(COACH_MOCK),
      });
    });

    await page.goto("/coach");
    await expect(page).toHaveURL(/\/(coach|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Click pe sugestia "Ce să postez azi?"
    const suggestion = page.getByText(/ce să postez azi/i).first();
    await expect(suggestion).toBeVisible({ timeout: 15_000 });
    await suggestion.click();

    // Așteptăm răspunsul AI
    await expect(
      page.getByText(/educațional|dimineața|recomand|idei concrete/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
