/**
 * Change password in every portal (CONTEXT.md §4): a learner, an admin, a
 * trainer and a platform admin, each a throwaway, open Change password from
 * their account menu, change it, and afterwards the new password signs in and
 * the old one does not. A wrong current password is refused on the page.
 */
import { test, expect } from './support.mjs';
import { newLearner } from './helpers-1.mjs';
import { firstAdminSignIn, newPersonAs, newPlatformAdmin, passwordWorks } from './helpers-4.mjs';
import { signIn } from './support.mjs';

const NEXT = 'Changed-Passw0rd!7';

async function changeFromMenu(page, who, path) {
  await page.getByRole('button', { name: new RegExp(`^${who.firstName}`) }).first().click();
  await page.getByRole('menuitem', { name: 'Change password' }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole('heading', { name: /Change\s*password/ })).toBeVisible();

  // A wrong current password is refused and nothing changes.
  await page.getByLabel('Current Password').fill('Not-The-Passw0rd!');
  await page.getByLabel('New Password', { exact: true }).fill(NEXT);
  await page.getByLabel('Confirm New Password').fill(NEXT);
  await page.getByRole('button', { name: 'Update Password' }).click();
  await expect(page.getByText('Current password is incorrect')).toBeVisible();
  await expect(page.getByText('Password Changed')).toBeHidden();

  await page.getByLabel('Current Password').fill(who.password);
  await page.getByLabel('New Password', { exact: true }).fill(NEXT);
  await page.getByLabel('Confirm New Password').fill(NEXT);
  await page.getByRole('button', { name: 'Update Password' }).click();
  await expect(page.getByText('Password Changed')).toBeVisible();

  expect(await passwordWorks(who.email, NEXT)).toBe(true);
  expect(await passwordWorks(who.email, who.password)).toBe(false);
}

test('a learner changes their password on /change-password', async ({ page }) => {
  const learner = await newLearner('A', 'Cpl');
  await signIn(page, learner);
  await changeFromMenu(page, learner, '/change-password');
});

test('an admin changes their password on /admin/change-password', async ({ page }) => {
  const admin = await newPersonAs('A', 'admin', 'Cpa');
  // First sign-in: the privacy notice and two-step setup are owed, done through the real pages.
  await firstAdminSignIn(page, admin);
  await changeFromMenu(page, admin, '/admin/change-password');
});

test('a trainer changes their password on /trainer/change-password', async ({ page }) => {
  const trainer = await newPersonAs('A', 'trainer', 'Cpt');
  await signIn(page, trainer);
  await expect(page).toHaveURL(/\/trainer\//);
  await changeFromMenu(page, trainer, '/trainer/change-password');
});

test('a platform admin changes their password on /platform/change-password', async ({ page }) => {
  const platformAdmin = await newPlatformAdmin();
  await signIn(page, platformAdmin);
  await expect(page).toHaveURL(/\/platform\//);
  await changeFromMenu(page, platformAdmin, '/platform/change-password');
});
