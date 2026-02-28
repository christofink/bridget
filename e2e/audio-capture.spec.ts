import { test, expect } from '@playwright/test';

test.describe('Audio Capture', () => {
  test.beforeEach(async ({ page }) => {
    // Mock getUserMedia since WebKit doesn't support grantPermissions
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const track = {
          stop: () => {},
          kind: 'audio',
          enabled: true,
          addEventListener: () => {},
          removeEventListener: () => {},
        } as unknown as MediaStreamTrack;
        return { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
      };
    });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('bridget_onboarding_complete', 'true'));
    await page.reload();
    await expect(page.getByRole('button', { name: /start listening/i })).toBeVisible();
  });

  test('start button triggers audio capture flow', async ({ page }) => {
    await page.getByRole('button', { name: /start listening/i }).click();

    // After clicking Start, the UI should leave idle state. We detect this
    // by waiting for a "Requesting…" or "Pause" button to appear (both prove
    // the click handler triggered). In headless WebKit, AudioWorklet may fail,
    // causing a brief Requesting→Error cycle, so we use a short initial check.
    const requesting = page.getByRole('button', { name: /requesting/i });
    const pauseBtn = page.getByRole('button', { name: /pause/i });

    // At least one non-idle state button should appear briefly
    await expect(requesting.or(pauseBtn)).toBeVisible({ timeout: 5000 });
  });
});
