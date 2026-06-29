import { test, expect } from '@playwright/test';

const TEST_CODE = process.env.E2E_LOGIN_CODE || 'ADMIN';
const TEST_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'password';

test.describe('Flujo autenticado', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CI && !process.env.E2E_WITH_BACKEND, 'Requiere backend (CI o E2E_WITH_BACKEND=1)');
  });

  test('login admin accede al dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/^código$/i).fill(TEST_CODE);
    await page.getByLabel(/^contraseña$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
    await expect(page.getByText(/componente|panel|dashboard/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('página /status muestra checks', async ({ page }) => {
    await page.goto('/status');
    await expect(page.getByRole('heading', { name: /estado del sistema/i })).toBeVisible();
  });
});
