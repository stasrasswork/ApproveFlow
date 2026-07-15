import { test, expect } from '@playwright/test';
import { signIn } from './auth-helpers';
import { SEED_IDS } from './seed-ids';

const PASSWORD = 'password123';

test('client accepts handoff and approves task (scenario C)', async ({ page }) => {
  await signIn(page, 'client@test.local', PASSWORD);

  await page.goto(
    `/w/${SEED_IDS.workspace}/projects/${SEED_IDS.project}/tasks/${SEED_IDS.taskClientHandoff}`,
  );

  await page.getByRole('button', { name: 'Accept for review' }).click();
  await expect(page.getByText('Client approval', { exact: true })).toBeVisible();

  await page.goto(
    `/w/${SEED_IDS.workspace}/projects/${SEED_IDS.project}/tasks/${SEED_IDS.taskClientApproval}`,
  );

  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Pending closure', { exact: true })).toBeVisible();
});

test('manager confirms closure (scenario D)', async ({ page }) => {
  await signIn(page, 'manager@test.local', PASSWORD);

  await page.goto(
    `/w/${SEED_IDS.workspace}/projects/${SEED_IDS.project}/tasks/${SEED_IDS.taskPendingClosure}`,
  );

  await page.getByRole('button', { name: 'Confirm closure' }).click();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
});
