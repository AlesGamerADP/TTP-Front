import { test, expect } from '@playwright/test';

test.describe('Dashboard autenticado', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CI && !process.env.E2E_WITH_BACKEND, 'Requiere backend');
  });

  test('muestra panel tras login admin', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/^código$/i).fill(process.env.E2E_LOGIN_CODE || 'ADMIN');
    await page.getByLabel(/^contraseña$/i).fill(process.env.E2E_LOGIN_PASSWORD || 'password');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
    await expect(page.getByText(/panel|componente|dashboard/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
