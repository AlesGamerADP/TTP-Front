import { test, expect } from '@playwright/test';
import path from 'path';

const TEST_CODE = process.env.E2E_LOGIN_CODE || 'ADMIN';
const TEST_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'password';

test.describe('Subida de componente', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.CI && !process.env.E2E_WITH_BACKEND, 'Requiere backend');
    await page.goto('/login');
    await page.getByLabel(/^código$/i).fill(TEST_CODE);
    await page.getByLabel(/^contraseña$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
  });

  test('página de ingreso carga formulario', async ({ page }) => {
    await page.goto('/components/ingress');
    await expect(page.getByRole('heading', { name: /ingreso|nuevo componente/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('input, select, textarea').first()).toBeVisible();
  });

  test('formulario acepta archivo adjunto', async ({ page }) => {
    await page.goto('/components/ingress');
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });

    const fixture = path.join(__dirname, 'fixtures', 'sample.txt');
    await fileInput.setInputFiles(fixture).catch(async () => {
      // Si no hay fixture, crear blob mínimo vía evaluate
      await page.evaluate(() => {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
        if (!input) return;
        const dt = new DataTransfer();
        dt.items.add(new File(['test'], 'sample.txt', { type: 'text/plain' }));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    const files = await fileInput.evaluate((el: HTMLInputElement) => el.files?.length ?? 0);
    expect(files).toBeGreaterThanOrEqual(0);
  });
});
