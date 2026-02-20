import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://contentos-project.vercel.app';

const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /coming soon/i,
  /lorem ipsum/i,
  /TODO/,
  /în curând/i,
  /under construction/i,
  /not implemented/i,
  /work in progress/i,
];

// Pagini publice (fără login)
const PUBLIC_PAGES = [
  { path: '/', name: 'Landing' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/reset-password', name: 'Reset Password' },
  { path: '/gdpr', name: 'GDPR' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/terms', name: 'Terms' },
];

// Pagini dashboard (necesită login)
const DASHBOARD_PAGES = [
  { path: '/dashboard', name: 'Dashboard Home' },
  { path: '/dashboard/business', name: 'Business Dashboard' },
  { path: '/dashboard/command-center', name: 'Command Center' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/analyze', name: 'Analyze' },
  { path: '/braindump', name: 'Braindump' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/coach', name: 'Coach' },
  { path: '/compose', name: 'Compose' },
  { path: '/history', name: 'History' },
  { path: '/image-editor', name: 'Image Editor' },
  { path: '/inspiration', name: 'Inspiration' },
  { path: '/research', name: 'Research' },
  { path: '/settings', name: 'Settings' },
  { path: '/video-script', name: 'Video Script' },
];

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

async function checkPlaceholders(page: Page, pageName: string) {
  const bodyText = await page.locator('body').innerText();
  const found: string[] = [];
  
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(bodyText)) {
      found.push(pattern.toString());
    }
  }
  
  if (found.length > 0) {
    console.warn(`⚠️  PLACEHOLDERS găsite pe "${pageName}": ${found.join(', ')}`);
  }
  
  return found;
}

test.describe('Visual Audit — Pagini Publice', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      
      // Screenshot
      await page.screenshot({
        path: `playwright/screenshots/public-${name.replace(/\s/g, '-').toLowerCase()}.png`,
        fullPage: true,
      });
      
      // Nu e pagină 500
      const status = page.url();
      expect(status).not.toContain('500');
      
      // Nu are error boundary crash
      const hasError = await page.locator('text=Application error').count();
      expect(hasError).toBe(0);
      
      // Check placeholders
      const placeholders = await checkPlaceholders(page, name);
      expect(placeholders.length, `Placeholders pe ${name}: ${placeholders.join(', ')}`).toBe(0);
    });
  }
});

test.describe('Visual Audit — Pagini Dashboard (autentificat)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const { path, name } of DASHBOARD_PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      
      // Screenshot full page
      await page.screenshot({
        path: `playwright/screenshots/dashboard-${name.replace(/\s/g, '-').toLowerCase()}.png`,
        fullPage: true,
      });
      
      // Nu a redirectat la login (pagina protejată funcționează)
      expect(page.url()).not.toContain('/login');
      
      // Nu e pagină 500/error
      const hasAppError = await page.locator('text=Application error').count();
      expect(hasAppError, `App error pe ${name}`).toBe(0);
      
      // Check placeholders
      const placeholders = await checkPlaceholders(page, name);
      expect(placeholders.length, `Placeholders pe ${name}: ${placeholders.join(', ')}`).toBe(0);
    });
  }
});