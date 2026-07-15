import { test, expect } from '@playwright/test';
import { signIn } from './auth-helpers';
import { SEED_IDS } from './seed-ids';

const PASSWORD = 'password123';

test('member cannot edit task metadata and sees forbidden response', async ({
  page,
}) => {
  await signIn(page, 'member@test.local', PASSWORD);

  await page.goto(
    `/w/${SEED_IDS.workspace}/projects/${SEED_IDS.project}/tasks/${SEED_IDS.taskMemberDemo}`,
  );

  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send to internal review' })).toHaveCount(0);
});

test('client cannot access workspace members management', async ({ page }) => {
  await signIn(page, 'client@test.local', PASSWORD);

  await page.goto(`/w/${SEED_IDS.workspace}/members`);
  await expect(page.getByRole('heading', { name: 'Members' })).toHaveCount(0);
});
