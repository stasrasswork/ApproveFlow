import { test, expect } from '@playwright/test';

const PASSWORD = 'password123';
const WORKSPACE_ID = 'ws_demo';
const PROJECT_ID = 'proj_demo';

test('client accepts handoff and approves task (scenario C)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('client@test.local');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/w\//);

  await page.goto(
    `/w/${WORKSPACE_ID}/projects/${PROJECT_ID}/tasks/task_client_handoff`,
  );

  await page.getByRole('button', { name: 'Accept for review' }).click();
  await expect(page.getByText('Client approval')).toBeVisible();

  await page.goto(
    `/w/${WORKSPACE_ID}/projects/${PROJECT_ID}/tasks/task_client_approval`,
  );

  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Pending closure')).toBeVisible();
});

test('manager confirms closure (scenario D)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('manager@test.local');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/w\//);

  await page.goto(
    `/w/${WORKSPACE_ID}/projects/${PROJECT_ID}/tasks/task_pending_closure`,
  );

  await page.getByRole('button', { name: 'Confirm closure' }).click();
  await expect(page.getByText('Done')).toBeVisible();
});
