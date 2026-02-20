import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', name: 'Landing' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/reset-password', name: 'Reset Password' },
  { path: '/gdpr', name: 'GDPR' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/terms', name: 'Terms' },
];

const PLACEHOLDERS = ['lorem ipsum', 'coming soon', 'under construction', 'not implemented', 'work in progress'];

for (const { path, name } of PAGES) {
  test(`Public: ${name}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const body = (await page.locator('body').innerText()).toLowerCase();
    const found = PLACEHOLDERS.filter(p => body.includes(p));
    expect(found, `Placeholders pe ${name}: ${found.join(', ')}`).toHaveLength(0);
    const appError = await page.locator('text=Application error').count();
    expect(appError, `App error pe ${name}`).toBe(0);
  });
}