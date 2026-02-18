import * as fs from "fs";
import path from "path";
import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";
const authDir = path.dirname(authFile);

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

setup("autentificare pentru teste care necesită login", async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }), "utf-8");
    setup.skip(true, "Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD — setup-ul de auth este ignorat");
    return;
  }

  await page.goto("/login?redirect=/dashboard/command-center");
  await page.getByLabel(/email/i).waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/parolă|password/i).waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel(/parolă|password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /conectare|login/i }).click();

  await expect(page).toHaveURL(/\/(dashboard\/command-center|onboarding)/, { timeout: 15_000 });

  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: authFile });
});
