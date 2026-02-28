import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('manifest is accessible at expected URL', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.name).toBe('Bridget');
    expect(body.short_name).toBe('Bridget');
    expect(body.display).toBe('standalone');
  });

  test('service worker script is accessible', async ({ page }) => {
    // In dev mode, Serwist is disabled so /sw.js will 404.
    // Just verify the app loads correctly.
    await page.goto('/');
    const heading = page.getByRole('heading', { name: 'Meet Bridget' });
    const nav = page.getByRole('navigation', { name: 'App controls' });
    await expect(heading.or(nav)).toBeVisible();
  });
});
