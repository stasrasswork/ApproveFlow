import { test, expect } from '@playwright/test';
import { signIn } from './auth-helpers';
import { SEED_IDS } from './seed-ids';

const PASSWORD = 'password123';
const TASK_TITLE = `E2E task ${Date.now()}`;

test('manager logs in, creates task, and starts work', async ({ page }) => {
  await signIn(page, 'manager@test.local', PASSWORD);

  await page.goto(`/w/${SEED_IDS.workspace}/projects/${SEED_IDS.project}`);

  await page.getByRole('button', { name: '+ New task' }).click();
  await page.getByLabel('Title', { exact: true }).fill(TASK_TITLE);
  await page.getByRole('button', { name: 'Create task' }).click();

  await page.getByRole('link', { name: new RegExp(TASK_TITLE) }).click();
  await expect(page.getByRole('heading', { name: TASK_TITLE })).toBeVisible();
  await page.getByRole('button', { name: 'Start work' }).click();
  await expect(page.getByText('In progress')).toBeVisible({ timeout: 15_000 });
});
