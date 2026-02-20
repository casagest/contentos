import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/dashboard', name: 'Dashboard Home' },
  { path: '/dashboard/business', name: 'Business' },
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

const PLACEHOLDERS = ['lorem ipsum', 'coming soon', 'under construction', 'not implemented', 'work in progress'];

for (const { path, name } of PAGES) {
  test(`Dashboard: ${name}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
    const body = (await page.locator('body').innerText()).toLowerCase();
    const found = PLACEHOLDERS.filter(p => body.includes(p));
    expect(found, `Placeholders pe ${name}: ${found.join(', ')}`).toHaveLength(0);
    const appError = await page.locator('text=Application error').count();
    expect(appError, `App error pe ${name}`).toBe(0);
  });
}