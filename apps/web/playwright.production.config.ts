import path from "path";
import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Încarcă .env.local pentru credențiale de test
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), "../../.env.local") });

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://contentos-project.vercel.app";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: 1,
  workers: 1,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["html"], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "on",
    video: "on",
    headless: isCI ? true : undefined,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Nu pornește server — testează împotriva producției
});
