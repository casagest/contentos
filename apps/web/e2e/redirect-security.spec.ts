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
});
