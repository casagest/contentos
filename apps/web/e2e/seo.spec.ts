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
});
