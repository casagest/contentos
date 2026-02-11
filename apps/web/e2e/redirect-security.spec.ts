import { test, expect } from "@playwright/test";

test.describe("Redirect security (open redirect)", () => {
  test("auth callback rejects external redirect URLs", async ({ request }) => {
    const res = await request.get(
      "/api/auth/callback?code=fake&next=https://evil.com/phish",
      { maxRedirects: 0 }
    );
    const loc = res.headers()["location"];
    expect(loc).toBeTruthy();
    expect(loc).not.toContain("evil.com");
    expect(loc).toMatch(/\/login|\/dashboard/);
  });

  test("auth confirm rejects protocol-relative redirect", async ({ request }) => {
    const res = await request.get(
      "/api/auth/confirm?token_hash=fake&type=recovery&next=//evil.com",
      { maxRedirects: 0 }
    );
    const loc = res.headers()["location"];
    expect(loc).toBeTruthy();
    expect(loc).not.toContain("evil.com");
  });

  test("login with external redirect stays on site", async ({ page }) => {
    await page.goto("/login?redirect=https://evil.com/phish");

    // The hidden redirect field should be sanitized by the server action.
    // Submit the form with invalid credentials to trigger the error redirect.
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // After form submission, we should stay on our own domain.
    await page.waitForURL(/\/login/);
    const url = new URL(page.url());
    expect(url.hostname).not.toBe("evil.com");
    // The redirect param preserved in the URL should be the sanitized /dashboard fallback.
    expect(url.searchParams.get("redirect")).toBe("/dashboard");
  });

  test("login with protocol-relative redirect stays on site", async ({ page }) => {
    await page.goto("/login?redirect=//evil.com");

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);
    const url = new URL(page.url());
    expect(url.hostname).not.toBe("evil.com");
    expect(url.searchParams.get("redirect")).toBe("/dashboard");
  });
});
