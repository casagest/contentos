import { test, expect } from "@playwright/test";

test.describe("SEO artifacts", () => {
  test("robots.txt is served and has sitemap reference", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("Sitemap:");
    expect(text).toMatch(/sitemap\.xml/);
  });

  test("sitemap.xml is served and includes homepage", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("<url>");
    expect(text).toContain("<loc>");
    expect(text).toContain("</urlset>");
  });

  test("homepage has title and meta description", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ContentOS/i);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
    expect(description?.length).toBeGreaterThan(20);
  });

  test("homepage has JSON-LD schema", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd!);
    expect(parsed["@graph"]).toBeDefined();
    expect(parsed["@graph"].some((n: { "@type"?: string }) => n["@type"] === "Organization")).toBe(true);
    expect(parsed["@graph"].some((n: { "@type"?: string }) => n["@type"] === "WebSite")).toBe(true);
  });

  test("sitemap excludes login and register", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).not.toContain("/login");
    expect(text).not.toContain("/register");
  });

  test("auth and dashboard remain noindex", async ({ request }) => {
    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.ok()).toBeTruthy();
    const robots = await robotsRes.text();
    expect(robots).toContain("Disallow: /login");
    expect(robots).toContain("Disallow: /register");
    expect(robots).toMatch(/Disallow:.*\/dashboard/);
  });
});
