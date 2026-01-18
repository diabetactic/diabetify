import { test, expect } from '@playwright/test';

test.describe('Ionic overlay registration (production build)', () => {
  test('overlay web components are defined and usable', async ({ page }) => {
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('ion-app', { state: 'attached', timeout: 15_000 });

    const result = await page.evaluate(async () => {
      const overlays = [
        'ion-loading',
        'ion-toast',
        'ion-alert',
        'ion-modal',
        'ion-action-sheet',
        'ion-popover',
        'ion-picker',
      ] as const;

      const timeout = (ms: number) =>
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms));

      const defined: Record<string, boolean> = {};
      for (const tag of overlays) {
        defined[tag] = Boolean(customElements.get(tag));
      }

      const whenDefinedOk: Record<string, boolean> = {};
      for (const tag of overlays) {
        try {
          await Promise.race([customElements.whenDefined(tag), timeout(1500)]);
          whenDefinedOk[tag] = true;
        } catch {
          whenDefinedOk[tag] = false;
        }
      }

      // Prove at least one overlay is actually functional (present/dismiss resolves).
      const loading = document.createElement('ion-loading') as unknown as {
        message: string;
        present: () => Promise<void>;
        dismiss: () => Promise<boolean>;
      };
      loading.message = 'Overlay smoke test';
      document.body.appendChild(loading as unknown as Node);

      const start = performance.now();
      await Promise.race([loading.present(), timeout(5000)]);
      const presentedMs = Math.round(performance.now() - start);
      await Promise.race([loading.dismiss(), timeout(5000)]);

      return { defined, whenDefinedOk, presentedMs };
    });

    expect(result.defined).toEqual({
      'ion-loading': true,
      'ion-toast': true,
      'ion-alert': true,
      'ion-modal': true,
      'ion-action-sheet': true,
      'ion-popover': true,
      'ion-picker': true,
    });

    expect(Object.values(result.whenDefinedOk)).toEqual([true, true, true, true, true, true, true]);
    expect(result.presentedMs).toBeLessThan(1500);
  });
});

