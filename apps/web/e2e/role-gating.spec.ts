import { test, expect } from '@playwright/test';
import { signIn } from './auth-helpers';

const PASSWORD = 'password123';
const WORKSPACE_ID = 'ws_demo';
const PROJECT_ID = 'proj_demo';
const TASK_ID = 'task_member_demo';

test('member cannot edit task metadata and sees forbidden response', async ({
  page,
}) => {
  await signIn(page, 'member@test.local', PASSWORD);

  await page.goto(
    `/w/${WORKSPACE_ID}/projects/${PROJECT_ID}/tasks/${TASK_ID}`,
  );

  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send to internal review' })).toHaveCount(0);
});

test('client cannot access workspace members management', async ({ page }) => {
  await signIn(page, 'client@test.local', PASSWORD);

  await page.goto(`/w/${WORKSPACE_ID}/settings/members`);
  await expect(page.getByRole('heading', { name: 'Members' })).toHaveCount(0);
});
