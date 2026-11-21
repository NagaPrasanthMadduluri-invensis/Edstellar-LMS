/**
 * My Team (CONTEXT.md §15 My Team, §18; BACKEND_STRUCTURE §10.22): the manager
 * sees exactly their direct reports, nudges one (who finds it in the bell),
 * and exports the team report.
 */
import { test, expect, fx, db } from './support.mjs';
import { as, expectInBell } from './helpers-2.mjs';

test('manager sees only direct reports, nudges one, and exports', async ({ browser }) => {
  const f = fx();
  const reports = await db(
    "SELECT first_name || ' ' || last_name AS name FROM users WHERE manager_id = $1 AND is_active = 1",
    [f.A.manager.id],
  );
  expect(reports.length).toBeGreaterThanOrEqual(2);

  const manager = await as(browser, f.A.manager);
  await manager.getByRole('link', { name: /my team/i }).click();
  await expect(manager).toHaveURL(/\/team-learning$/);

  const n = reports.length;
  await expect(manager.getByRole('heading', { name: `Your team — ${n} direct report${n === 1 ? '' : 's'}` })).toBeVisible();
  const table = manager.locator('table');
  for (const r of reports) await expect(table.getByText(r.name, { exact: true })).toBeVisible();
  // Nobody else in the org: not the trainer, not the admin, not the manager.
  await expect(table.locator('tbody tr')).toHaveCount(n);
  for (const other of ['Trainer Tester', 'AdminA Owner', 'Manager Tester']) {
    await expect(table.getByText(other, { exact: true })).toHaveCount(0);
  }

  // Nudge Learnertwo from Action required.
  const nudge = manager.locator('button[title="Send Learnertwo a reminder"]');
  await expect(nudge).toBeVisible();
  await nudge.click();
  await expect(manager.locator('button[title="Already nudged"]').filter({ hasText: 'Nudged' }).first()).toBeVisible();
  const [row] = await db(
    "SELECT title FROM notifications WHERE user_id = $1 AND type = 'manager_nudge' ORDER BY id DESC LIMIT 1",
    [f.A.learner2.id],
  );
  expect(row.title).toMatch(/nudged you/);

  // Export: a real spreadsheet download.
  const [download] = await Promise.all([
    manager.waitForEvent('download'),
    manager.getByRole('button', { name: 'Export team report' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  const file = await download.path();
  const fs = await import('node:fs');
  const head = fs.readFileSync(file).subarray(0, 2).toString();
  expect(head).toBe('PK'); // xlsx is a zip

  // The learner who was nudged sees it in their bell.
  const learner2 = await as(browser, f.A.learner2);
  await expectInBell(learner2, /Manager Tester nudged you about your learning/);
});
