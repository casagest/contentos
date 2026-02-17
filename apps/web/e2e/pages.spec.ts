import { test, expect } from "@playwright/test";

/**
 * Verificare exhaustivă: toate paginile aplicației trebuie să se încarce și să fie funcționale.
 * Rulează pagina cu pagină pentru a detecta erori 500, componente rupte, redirect-uri incorecte.
 */

// ─── Pagini publice (fără auth) ─────────────────────────────────────────────────────────
const PUBLIC_PAGES: { path: string; expectText?: RegExp }[] = [
  { path: "/", expectText: /ContentOS|AI|România/i },
  { path: "/login", expectText: /bine ai revenit|conectare/i },
  { path: "/register", expectText: /creează|verifică|email/i },
  { path: "/reset-password", expectText: /parolă|reset|email/i },
  { path: "/terms", expectText: /termeni|condiții/i },
  { path: "/privacy", expectText: /confidențialitate|privacy/i },
  { path: "/gdpr", expectText: /GDPR|acces|rectificare/i },
];

test.describe("Pagini publice - încărcare fără erori", () => {
  for (const { path, expectText } of PUBLIC_PAGES) {
    test(`${path} se încarcă corect`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "load" });
      expect(res?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
      if (expectText) {
        await expect(page.locator("body")).toContainText(expectText);
      }
      // Verifică că nu avem eroare 500
      await expect(page.getByText(/500|internal server error|eroare server/i)).not.toBeVisible();
    });
  }
});

// ─── Pagini care necesită autentificare (redirect la /login) ──────────────────────────
const AUTH_REQUIRED_PAGES: string[] = [
  "/dashboard",
  "/dashboard/business",
  "/braindump",
  "/compose",
  "/coach",
  "/analyze",
  "/research",
  "/inspiration",
  "/video-script",
  "/image-editor",
  "/analytics",
  "/calendar",
  "/history",
  "/settings",
];

test.describe("Pagini protejate - redirect la login", () => {
  for (const path of AUTH_REQUIRED_PAGES) {
    test(`${path} redirecționează la login`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});

// ─── Onboarding (poate fi accesat după login) ──────────────────────────────────────────
test.describe("Onboarding", () => {
  test("/onboarding se încarcă (sau redirect la login)", async ({ page }) => {
    const res = await page.goto("/onboarding", { waitUntil: "load" });
    expect(res?.status()).toBeLessThan(500);
    const url = page.url();
    // Fie e pe onboarding, fie redirect la login
    expect(url).toMatch(/\/(onboarding|login)/);
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─── Interacțiuni critice pe pagini publice ────────────────────────────────────────────
test.describe("Interacțiuni - home, login, register", () => {
  test("home: navigare la secțiuni (anchor)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /prețuri|pricing/i }).first().click();
    await expect(page).toHaveURL(/#pricing/);
  });

  test("login: formular se submitează fără crash", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/parolă|password/i).fill("wrongpass123");
    await page.getByRole("button", { name: /conectare/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("register: link către login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("link", { name: "Conectare", exact: true })).toBeVisible();
  });
});

// ─── Prețuri afișate în RON ───────────────────────────────────────────────────────────
test.describe("Prețuri RON", () => {
  test("home: secțiunea Prețuri afișează RON", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /prețuri/i }).first().click();
    await expect(page.locator("body")).toContainText(/RON/i);
  });
});
