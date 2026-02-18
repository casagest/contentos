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

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Wait for redirect back to /login (with error param from failed auth)
    await page.waitForURL(/\/login\?.*error=/);
    const url = new URL(page.url());
    expect(url.hostname).not.toBe("evil.com");
    expect(url.searchParams.get("redirect")).toBe("/dashboard");
  });

  test("login with protocol-relative redirect stays on site", async ({ page }) => {
    await page.goto("/login?redirect=//evil.com");

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login\?.*error=/);
    const url = new URL(page.url());
    expect(url.hostname).not.toBe("evil.com");
    expect(url.searchParams.get("redirect")).toBe("/dashboard");
  });
});
