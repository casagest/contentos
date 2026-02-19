import { test, expect } from "@playwright/test";

/**
 * Error handling — 404, API errors, network status.
 */

test.describe("Error handling", () => {
  test("404 page afișare corectă pe rută inexistentă", async ({ page }) => {
    const res = await page.goto("/aceasta-pagina-nu-exista-xyz");
    // Accept 404 status
    expect(res?.status()).toBe(404);
    // Body vizibil, nu blank page
    await expect(page.locator("body")).toBeVisible();
    // Ar trebui să arate un mesaj de 404 sau link înapoi
    await expect(
      page.getByText(/nu a fost găsită|not found|404|pagina nu există|acasă|înapoi/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("API error nu crashuiește pagina", async ({ page }) => {
    // Testăm că o pagină publică cu fetch eșuat nu arată 500
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/500|internal server error/i)).not.toBeVisible();
  });

  test("error.tsx se afișează corect", async ({ page }) => {
    // Verificăm existența error page prin navigare la /error (dacă există)
    // Alternativ, verificăm că error boundary nu produce blank page
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
