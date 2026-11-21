/**
 * Reports (CONTEXT.md §12 Insight): the admin builds a Group report of Course
 * Completion narrowed to one department, reads the summary and the rows, then
 * downloads it as .xlsx; the file carries the same rows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test, expect, fx } from './support.mjs';
import { pageAs, setupCourse, uniq } from './helpers-1.mjs';
import { completeCourse, learnerIn, tag } from './helpers-3.mjs';
import { RUNTIME_DIR } from '../playwright.config.mjs';

const require = createRequire(import.meta.url);
const XLSX = require(path.join(RUNTIME_DIR, '..', '..', 'node_modules', 'xlsx'));

test('admin builds a department group report and downloads it as a spreadsheet', async ({ browser }) => {
  const A = fx().A;
  const dept = `Reports ${tag()}`;
  // SETUP (not the subject): two learners in their own department share a course; one finishes it.
  const done = await learnerIn('A', dept, 'Rd');
  const open = await learnerIn('A', dept, 'Ro');
  const course = await setupCourse('A', { name: uniq('Report course'), assignTo: [done.id, open.id] });
  await completeCourse(done, course);

  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/dashboard');
  await admin.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(admin).toHaveURL(/\/admin\/reports$/);
  await admin.mouse.move(900, 600); // off the sidebar, so its flyout closes
  await admin.getByRole('button', { name: 'Group report' }).click();
  await expect(admin.getByRole('button', { name: 'Course Completion' })).toBeVisible();

  const deptSelect = admin.locator('select', { has: admin.locator('option', { hasText: 'All departments' }) });
  await deptSelect.selectOption(dept);
  await admin.getByRole('button', { name: 'Create report' }).click();

  await expect(admin.getByRole('heading', { name: 'Course completion' })).toBeVisible();
  // A summary tile is its value over its label; the chart below repeats some labels later.
  const kpi = (label) => admin.getByText(label, { exact: true }).first().locator('xpath=..');
  await expect(kpi('Completions')).toHaveText(/^1\s*Completions$/);
  await expect(kpi('Enrolments in window')).toHaveText(/^2\s*Enrolments in window$/);
  await expect(kpi('Completion rate')).toHaveText(/^50%\s*Completion rate$/);
  await expect(admin.getByText('2 rows')).toBeVisible();
  await expect(admin.getByRole('row', { name: new RegExp(done.name) })).toContainText(course.name);
  await expect(admin.getByRole('row', { name: new RegExp(done.name) })).toContainText('100%');
  await expect(admin.getByRole('row', { name: new RegExp(open.name) })).toContainText('0%');

  // Download the report on screen.
  const downloading = admin.waitForEvent('download');
  await admin.getByRole('button', { name: 'Download .xlsx' }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
  const saved = path.join(RUNTIME_DIR, 'e2e-files', `group-${tag()}.xlsx`);
  fs.mkdirSync(path.dirname(saved), { recursive: true });
  await file.saveAs(saved);

  const book = XLSX.readFile(saved);
  const cells = book.SheetNames.flatMap((n) => XLSX.utils.sheet_to_json(book.Sheets[n], { header: 1 }))
    .map((row) => row.join(' | '));
  const all = cells.join('\n');
  expect(all).toContain(done.name);
  expect(all).toContain(open.name);
  expect(all).toContain(course.name);
  // Only the chosen department travels in the file: exactly the two rows.
  expect(cells.filter((r) => r.includes(course.name))).toHaveLength(2);
});
