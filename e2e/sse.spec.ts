import { test, expect } from '@playwright/test';

const TEST_CODE = process.env.E2E_LOGIN_CODE || 'ADMIN';
const TEST_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'password';

test.describe('SSE componentes', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CI && !process.env.E2E_WITH_BACKEND, 'Requiere backend');
  });

  test('stream responde text/event-stream tras login', async ({ page, request }) => {
    await page.goto('/login');
    await page.getByLabel(/^código$/i).fill(TEST_CODE);
    await page.getByLabel(/^contraseña$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get('/api/components/stream', {
      headers: { Cookie: cookieHeader },
      timeout: 10_000,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/text\/event-stream/i);
  });
});
