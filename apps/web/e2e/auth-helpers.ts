import { expect, type Page } from '@playwright/test';

export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    try {
      await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await page.goto('/login');
    }
  }
}
