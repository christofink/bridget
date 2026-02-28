import { test, expect } from '@playwright/test';

test.describe('Onboarding', () => {
  test('onboarding flow completes end-to-end', async ({ page }) => {
    // Clear localStorage for fresh state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Welcome step
    await expect(page.getByRole('heading', { name: 'Meet Bridget' })).toBeVisible();
    await page.getByRole('button', { name: 'Get Started' }).click();

    // Mic permission step
    await expect(page.getByRole('heading', { name: 'Microphone Access' })).toBeVisible();

    // Mock getUserMedia and click via DOM (Playwright click doesn't trigger React handlers
    // reliably in WebKit after evaluate-based mocks)
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const track = { stop() {}, kind: 'audio', enabled: true, addEventListener() {}, removeEventListener() {} };
        return { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
      };
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Allow Microphone');
      btn?.click();
    });

    // After mic permission, we either see PWA install step or main view
    const pwaHeading = page.getByRole('heading', { name: 'Add to Home Screen' });
    const mainNav = page.getByRole('navigation', { name: 'App controls' });

    // Wait for either to appear
    await expect(pwaHeading.or(mainNav)).toBeVisible({ timeout: 5000 });

    // If PWA step is visible, skip it
    if (await pwaHeading.isVisible()) {
      await page.getByRole('button', { name: 'Skip for now' }).click();
    }

    // Main app view should now be visible
    await expect(page.getByRole('navigation', { name: 'App controls' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo', { name: 'Audio controls' })).toBeVisible();
  });

  test('subsequent visits skip onboarding', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('bridget_onboarding_complete', 'true'));
    await page.reload();

    // Main app view should be visible immediately
    await expect(page.getByRole('navigation', { name: 'App controls' })).toBeVisible();
    await expect(page.getByRole('button', { name: /start listening/i })).toBeVisible();
  });
});
