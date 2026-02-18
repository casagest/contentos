import path from "path";
import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Încarcă .env.local (apps/web sau root monorepo) pentru credențiale de test
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), "../../.env.local") });

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// baseURL: NEXT_PUBLIC_BASE_URL → PLAYWRIGHT_BASE_URL → Vercel prod → localhost
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://contentos-project.vercel.app";

const isCI = !!process.env.CI;

// Headless în CI, headed pentru debug local (sau când se rulează cu --headed)
const headless = isCI ? true : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer:
    BASE_URL.includes("localhost") || BASE_URL.includes("127.0.0.1")
      ? {
          command: "pnpm run start",
          url: BASE_URL,
          reuseExistingServer: !isCI,
          timeout: 120_000,
        }
      : undefined,
});
