import { Page } from "@playwright/test";

export async function login(page: Page, redirectTo = "/dashboard/command-center") {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error("Lipsește TEST_USER_EMAIL sau TEST_USER_PASSWORD în .env.local");
  }

  await page.goto(`/login?redirect=${redirectTo}`);
  await page.getByRole("heading", { name: /bine ai revenit|conectare/i }).waitFor({ state: "visible" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/parolă|password/i).fill(password);
  await page.getByRole("button", { name: /conectare|login/i }).click();
}
