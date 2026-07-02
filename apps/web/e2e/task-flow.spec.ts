import { test, expect } from '@playwright/test';

const PASSWORD = 'password123';
const WORKSPACE_ID = 'ws_demo';
const PROJECT_ID = 'proj_demo';
const TASK_TITLE = `E2E task ${Date.now()}`;

test('manager logs in, creates task, and starts work', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('manager@test.local');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/w\//);

  await page.goto(`/w/${WORKSPACE_ID}/projects/${PROJECT_ID}`);

  await page.getByRole('button', { name: '+ New task' }).click();
  await page.getByLabel('Title', { exact: true }).fill(TASK_TITLE);
  await page.getByRole('button', { name: 'Create task' }).click();

  await page.getByRole('link', { name: TASK_TITLE }).click();
  await page.getByRole('button', { name: 'Start work' }).click();

  await expect(page.getByText('In progress')).toBeVisible();
});
