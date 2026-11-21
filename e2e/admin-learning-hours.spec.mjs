/**
 * Admin Learning Hours (CONTEXT.md §7 Learning hours): a learner who completes
 * three 10-minute lessons this month is credited 30 minutes, which the admin
 * page shows as 0.5h on their row and on their department's card.
 */
import { readFile } from 'node:fs/promises';
import { test, expect, fx } from './support.mjs';
import { pageAs, setupCourse, uniq } from './helpers-1.mjs';
import { completeCourse, learnerIn, tag } from './helpers-3.mjs';

test('admin sees a learner\'s credited hours on Learning Hours, by person and by department', async ({ browser }) => {
  const A = fx().A;
  const dept = `Hours ${tag()}`;
  const learner = await learnerIn('A', dept, 'Hl');
  const course = await setupCourse('A', { name: uniq('Hours course'), lessons: 3, assignTo: [learner.id] });
  await completeCourse(learner, course);

  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/learning-hours');
  await expect(admin.getByText('Department Breakdown')).toBeVisible();

  const card = admin.locator('[data-slot="card"]', { has: admin.getByText(dept, { exact: true }) }).first();
  await expect(card).toContainText('1 learners');
  await expect(card.getByRole('heading', { name: '0.5h' })).toBeVisible();

  const row = admin.locator('div.grid', { has: admin.getByText(learner.name, { exact: true }) }).last();
  await expect(row).toContainText(dept);
  // This month 0.5h, last month 0h, all time 0.5h.
  await expect(row).toHaveText(/0\.5h.*0h.*0\.5h/);

  // Sorting by department keeps the row on the page.
  await admin.getByText('DEPARTMENT', { exact: true }).click();
  await expect(row).toBeVisible();
});

test('Export CSV on admin Learning Hours downloads the learner rows on screen', async ({ browser }) => {
  // CONTEXT.md "Absent, not disabled": a screen never offers what it cannot do,
  // so the button must produce the file, holding exactly the table's rows.
  const A = fx().A;
  const dept = `Csv ${tag()}`;
  const learner = await learnerIn('A', dept, 'Hc');
  const course = await setupCourse('A', { name: uniq('Csv course'), lessons: 3, assignTo: [learner.id] });
  await completeCourse(learner, course);

  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/learning-hours');
  await expect(admin.getByText('Individual Learner Hours')).toBeVisible();
  // No row offers a "+ Credit" it cannot perform.
  await expect(admin.getByRole('button', { name: '+ Credit' })).toHaveCount(0);

  // Each learner row is a grid line with an avatar; the header row has none.
  const rows = admin.locator('div.grid', { has: admin.locator('[data-slot="avatar"]') });
  await expect(rows.filter({ hasText: learner.name })).toHaveCount(1);
  const shown = await rows.count();
  expect(shown).toBeGreaterThan(0);

  const downloading = admin.waitForEvent('download', { timeout: 10_000 });
  await admin.getByRole('button', { name: 'Export CSV' }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toMatch(/^learning-hours-\d{4}-\d{2}-\d{2}\.csv$/);

  const text = (await readFile(await file.path(), 'utf8')).replace(/^\uFEFF/, '');
  const lines = text.split('\r\n').filter(Boolean);
  expect(lines[0]).toBe('Learner,Job role,Department,Location,This month (h),Last month (h),Goal (h),Progress (%),All time (h),Status');
  // One line per row on screen, no more, no fewer.
  expect(lines.length - 1).toBe(shown);
  const mine = lines.filter((l) => l.startsWith(`${learner.name},`));
  expect(mine).toHaveLength(1);
  const cells = mine[0].split(',');
  expect(cells[2]).toBe(dept);
  // This month 0.5h, last month 0h, all time 0.5h: the figures the row shows.
  expect(cells[4]).toBe('0.5');
  expect(cells[5]).toBe('0');
  expect(cells[8]).toBe('0.5');
  await admin.context().close();
});
