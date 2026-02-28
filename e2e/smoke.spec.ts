import { test, expect } from '@playwright/test';

test('App loads successfully in WebKit browser', async ({ page }) => {
  await page.goto('/');
  // The app shows either onboarding (heading "Meet Bridget") or the main view (nav "Bridget" title)
  const heading = page.getByRole('heading', { name: 'Meet Bridget' });
  const nav = page.getByRole('navigation', { name: 'App controls' });
  await expect(heading.or(nav)).toBeVisible();
});
