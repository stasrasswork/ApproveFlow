import { test, expect } from '@playwright/test';
import { signIn } from './auth-helpers';

const PASSWORD = 'password123';
const WORKSPACE_ID = 'ws_demo';
const PROJECT_ID = 'proj_demo';

test('client accepts handoff and approves task (scenario C)', async ({ page }) => {
  await signIn(page, 'client@test.local', PASSWORD);

  await page.goto(
    `/w/${WORKSPACE_ID}/projects/${PROJECT_ID}/tasks/task_client_handoff`,
  );

  await page.getByRole('button', { name: 'Accept for review' }).click();
  await expect(page.getByText('Client approval', { exact: true })).toBeVisible();

  await page.goto(
    `/w/${WORKSPACE_ID}/projects/${PROJECT_ID}/tasks/task_client_approval`,
  );

  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Pending closure', { exact: true })).toBeVisible();
});

test('manager confirms closure (scenario D)', async ({ page }) => {
  await signIn(page, 'manager@test.local', PASSWORD);

  await page.goto(
    `/w/${WORKSPACE_ID}/projects/${PROJECT_ID}/tasks/task_pending_closure`,
  );

  await page.getByRole('button', { name: 'Confirm closure' }).click();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
});
