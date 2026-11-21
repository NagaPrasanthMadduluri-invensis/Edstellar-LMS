/**
 * Every role signs in through the real login page and lands on its own portal
 * (CONTEXT.md §15 and §4 Gate order). Admins pass the real TOTP code step.
 */
import { test, expect, fx, signIn } from './support.mjs';

const cases = [
  ['learner', (f) => f.A.learner, /\/dashboard$/],
  ['manager', (f) => f.A.manager, /\/dashboard$/],
  ['trainer', (f) => f.A.trainer, /\/trainer\/sessions$/],
  // Org B's admin: org A's admin signs in many times in a full run and has its own 10-per-15-min budget.
  ['admin', (f) => f.B.admin, /\/admin\/dashboard$/],
  ['platform admin', (f) => f.platform.admin, /\/platform\/dashboard$/],
];

for (const [name, who, landing] of cases) {
  test(`${name} signs in and lands on their portal`, async ({ page }) => {
    await signIn(page, who(fx()), { fresh: true });
    await expect(page).toHaveURL(landing);
  });
}

test('a wrong password shows one message and stays on the login page', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill(fx().A.learner.email);
  await page.locator('#password').fill('Wrong-Passw0rd!');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
});

test('the manager sees My Team; a plain learner does not', async ({ page }) => {
  await signIn(page, fx().A.manager, { fresh: true });
  await expect(page.getByRole('link', { name: /my team/i })).toBeVisible();
  await page.context().clearCookies();
  await signIn(page, fx().A.learner2, { fresh: true });
  await expect(page.getByRole('link', { name: /my team/i })).toHaveCount(0);
});
