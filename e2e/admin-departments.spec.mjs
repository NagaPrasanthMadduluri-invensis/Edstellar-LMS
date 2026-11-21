/**
 * Department performance (CONTEXT.md §12 Insight): from the dashboard's
 * Department progress panel the admin opens every department's card; a new
 * department with one learner who finished and one who has not started reads
 * 2 employees, 1/2 completed, 50%.
 */
import { test, expect, fx } from './support.mjs';
import { pageAs, setupCourse, uniq } from './helpers-1.mjs';
import { completeCourse, learnerIn, tag } from './helpers-3.mjs';

test('admin opens Department performance and reads a department card that matches its people', async ({ browser }) => {
  const A = fx().A;
  const dept = `Dept ${tag()}`;
  // SETUP (not the subject): two people in a new department, one course each; one finishes.
  const done = await learnerIn('A', dept, 'Dd');
  const idle = await learnerIn('A', dept, 'Di');
  const course = await setupCourse('A', { name: uniq('Dept course'), assignTo: [done.id, idle.id] });
  await completeCourse(done, course);

  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/dashboard');
  await admin.getByRole('link', { name: 'View all' }).first().click();
  await expect(admin).toHaveURL(/\/admin\/departments$/);
  await expect(admin.getByRole('heading', { name: /Department/ }).first()).toBeVisible();

  const card = admin.locator('[data-slot="card"]', { has: admin.getByRole('heading', { name: dept, exact: true }) });
  await expect(card).toBeVisible();
  await expect(card).toContainText('2 employees');
  await expect(card).toContainText('50%');
  await expect(card).toContainText('1/2');
  // Each stat tile is a number over its label; the legend repeats the labels later in the card.
  const tile = (label) => card.getByText(label, { exact: true }).first().locator('xpath=..');
  await expect(tile('Completed')).toHaveText(/^1\s*Completed$/);
  await expect(tile('Not Started')).toHaveText(/^1\s*Not Started$/);
  await expect(tile('Failed')).toHaveText(/^0\s*Failed$/);
});
