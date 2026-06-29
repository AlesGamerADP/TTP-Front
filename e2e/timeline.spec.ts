import { test, expect } from '@playwright/test';

const TEST_CODE = process.env.E2E_LOGIN_CODE || 'ADMIN';
const TEST_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'password';

test.describe('Timeline de componente', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.CI && !process.env.E2E_WITH_BACKEND, 'Requiere backend');
    await page.goto('/login');
    await page.getByLabel(/^código$/i).fill(TEST_CODE);
    await page.getByLabel(/^contraseña$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
  });

  test('muestra historial de eventos en detalle', async ({ page }) => {
    const row = page.locator('[data-testid="component-row"]').first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: /ver detalle/i }).click();
    await expect(page).toHaveURL(/\/components\//);
    await expect(page.getByText(/historial de eventos/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: /línea de tiempo/i })).toBeVisible();
  });
});
