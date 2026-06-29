import { test, expect } from '@playwright/test';

const TEST_CODE = process.env.E2E_LOGIN_CODE || 'admin';
const TEST_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'Admin123!';

test.describe('Login', () => {
  test('muestra formulario de acceso', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /acceso|ingresar|login/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('login con credenciales de prueba redirige al dashboard', async ({ page }) => {
    test.skip(!process.env.CI && !process.env.E2E_WITH_BACKEND, 'Requiere backend');

    await page.goto('/login');
    await page.getByLabel(/^código$/i).fill(process.env.E2E_LOGIN_CODE || 'ADMIN');
    await page.getByLabel(/^contraseña$/i).fill(process.env.E2E_LOGIN_PASSWORD || 'password');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
  });
});
