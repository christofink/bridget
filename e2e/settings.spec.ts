import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('bridget_onboarding_complete', 'true'));
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'App controls' })).toBeVisible();
  });

  test('settings panel opens and changes persist across reload', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    // Toggle high contrast on
    const highContrastCheckbox = page.getByRole('checkbox', { name: /enable high contrast/i });
    await highContrastCheckbox.check();

    // Close settings
    await page.getByRole('button', { name: 'Close settings' }).click();

    // Reload
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'App controls' })).toBeVisible();

    // Reopen settings and verify persisted
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    const checkbox = page.getByRole('checkbox', { name: /enable high contrast/i });
    await expect(checkbox).toBeChecked();
  });
});
