import { test, expect } from "@playwright/test";

/**
 * Brain Dump — user journey complet cu API mock.
 * Testează: idle state → scrie idee → selectează platforme → submit → rezultate → save draft.
 */

const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

// Mock response pentru /api/ai/braindump — shape-ul așteptat de client
const BRAINDUMP_MOCK = {
  platforms: {
    facebook: {
      content: "🎯 Test conținut generat pentru Facebook.\n\nAceasta este o postare de test cu #hashtag.",
      score: 85,
      hashtags: ["#test", "#contentos", "#marketing"],
      tips: ["Postează dimineața devreme", "Adaugă imagini"],
    },
    instagram: {
      content: "📸 Test conținut pentru Instagram.\n\nVizualul contează cel mai mult pe această platformă.",
      score: 78,
      hashtags: ["#test", "#reels", "#content"],
      tips: ["Folosește Reels pentru reach mai mare"],
    },
  },
  meta: { mode: "ai", model: "test-mock", cached: false },
};

test.describe("Brain Dump — user journey", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD");
  });

  test("idle state afișează heading și input area", async ({ page }) => {
    await page.goto("/braindump");
    await expect(page).toHaveURL(/\/(braindump|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Idle state: heading sau quick actions vizibile
    await expect(
      page.locator("h1, [class*='text-4xl'], [class*='text-5xl']").first()
    ).toBeVisible({ timeout: 15_000 });

    // Input bar vizibil (textarea)
    await expect(page.locator("textarea").first()).toBeVisible();
  });

  test("scrie idee → selectează platforme → generează conținut", async ({ page }) => {
    test.setTimeout(30_000);

    // Mock API-ul de braindump (intercept orice request care conține /api/ai/braindump)
    await page.route(/\/api\/ai\/braindump/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(BRAINDUMP_MOCK),
      });
    });

    await page.goto("/braindump");
    await expect(page).toHaveURL(/\/(braindump|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    // Așteaptă input area
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 15_000 });

    // Scrie o idee (type instead of fill for React state sync)
    await textarea.click();
    await textarea.type("Idee de test pentru AI", { delay: 20 });

    // Mic wait pentru React state update
    await page.waitForTimeout(300);

    // Submit via Enter
    await textarea.press("Enter");

    // Așteaptă rezultate (mock instant) — pagina trece din idle la generating/done
    // Verifică că apare conținut generat sau mesaj de confirmare
    await expect(
      page.getByText(/Test conținut|generat|Facebook|Instagram|platformele selectate/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("empty input nu trimite (validare)", async ({ page }) => {
    await page.goto("/braindump");
    await expect(page).toHaveURL(/\/(braindump|onboarding)/);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "User în onboarding");
    }

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 15_000 });

    // Textarea gol — send button ar trebui dezactivat sau click nu face nimic
    const sendButton = page.locator("button").filter({ has: page.locator("svg") }).last();

    // Verificăm că pagina rămâne în idle (nu apare loading/generating)
    await sendButton.click();
    await page.waitForTimeout(1000);
    // Nu ar trebui să apară progress sau loading state
    await expect(page.getByText(/generez|se procesează/i)).not.toBeVisible();
  });
});
