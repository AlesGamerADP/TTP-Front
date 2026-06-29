import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:4000';

test.describe('API health', () => {
  test('backend /ready responde ok', async ({ request }) => {
    test.skip(!process.env.CI && !process.env.E2E_API_URL, 'Requiere backend en CI');

    const res = await request.get(`${API_URL}/ready`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
