/**
 * Leaderboard privacy on the admin board (CONTEXT.md §8 Leaderboard privacy):
 * a learner who opts out is not ranked, and the admin's board says how many
 * learners chose not to appear; the department filter narrows the ranking.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, pageAs } from './helpers-1.mjs';
import { learnerIn, tag } from './helpers-3.mjs';

test('an opted-out learner is counted, not ranked, on the admin Leaderboard', async ({ browser }) => {
  const A = fx().A;
  const dept = `Board ${tag()}`;
  const shown = await learnerIn('A', dept, 'Ls');
  const hidden = await learnerIn('A', dept, 'Lh');

  // SETUP (not the subject): the learner opts out from their own profile.
  const me = await api(hidden);
  await me.patch('/api/auth/profile', { leaderboard_hidden: true });
  await me.ctx.dispose();
  const [{ n }] = await db(
    "SELECT count(*)::int AS n FROM users WHERE organization_id = $1 AND role = 'learner' AND is_active = 1 AND leaderboard_hidden = 1",
    [A.id],
  );
  expect(n).toBeGreaterThan(0);

  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/dashboard');
  await admin.getByRole('link', { name: 'Recognition' }).hover();
  await admin.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await admin.mouse.move(900, 600);
  await expect(admin).toHaveURL(/\/admin\/leaderboard$/);

  const notice = n === 1
    ? '1 learner has chosen not to appear on leaderboards'
    : `${n} learners have chosen not to appear on leaderboards`;
  await expect(admin.getByText(notice)).toBeVisible();
  await expect(admin.getByText(shown.name).first()).toBeVisible();
  await expect(admin.getByText(hidden.name)).toHaveCount(0);

  // Narrow to the new department: only the visible learner is ranked.
  await admin.getByRole('combobox').filter({ hasText: 'All Departments' }).click();
  await admin.getByRole('option', { name: dept }).click();
  await expect(admin.getByText('1 learner ranked')).toBeVisible();
  await expect(admin.getByText(shown.name).first()).toBeVisible();
  await expect(admin.getByText(hidden.name)).toHaveCount(0);
});
