import { test, expect } from '@playwright/test';

/**
 * Requiere E2E_WITH_BACKEND=1 y credenciales de seed-ci.
 */
test.describe('Detalle de componente', () => {
  test.skip(!process.env.E2E_WITH_BACKEND, 'Backend no disponible en este entorno');

  test.beforeEach(async ({ page }) => {
    const codigo = process.env.E2E_LOGIN_CODE || 'CLI001';
    const password = process.env.E2E_LOGIN_PASSWORD || 'Test1234!';

    await page.goto('/login');
    await page.getByLabel(/código/i).fill(codigo);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
  });

  test('navega al detalle desde el dashboard', async ({ page }) => {
    const firstRow = page.locator('[data-testid="component-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await firstRow.getByRole('button', { name: /ver detalle/i }).click();
    await expect(page).toHaveURL(/\/components\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
