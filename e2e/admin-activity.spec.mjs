/**
 * Activity Log (CONTEXT.md §11 Activity log): a change an admin has just made
 * appears at the top of the log; the admin narrows it with Search and the
 * action, person and outcome filters, and opens the row to see what was sent.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, dbUntil, pageAs, setupCourse, uniq } from './helpers-1.mjs';

async function pick(page, placeholder, option) {
  await page.getByRole('combobox').filter({ hasText: placeholder }).click();
  await page.getByRole('option', { name: option }).click();
}

test('a course change just made shows in the Activity Log and the filters narrow to it', async ({ browser }) => {
  const A = fx().A;
  const course = await setupCourse('A', { name: uniq('Logged course') });
  const renamed = uniq('Renamed course');
  // The change under observation: the admin renames the course.
  await (await api(A.admin)).put(`/api/admin/courses/${course.id}`, { name: renamed, category: 'Technical' });
  const path = `/api/admin/courses/${course.id}`;
  const [entry] = await dbUntil(
    "SELECT action, entity, entity_id, actor_user_id, outcome FROM audit_log WHERE method = 'PUT' AND path = $1",
    [path], (r) => r.length === 1, 'audit row for the rename',
  );
  expect(entry).toEqual(expect.objectContaining({ action: 'update', entity: 'courses', actor_user_id: A.admin.id, outcome: 'success' }));
  const [me] = await db('SELECT first_name, last_name FROM users WHERE id = $1', [A.admin.id]);
  const adminName = `${me.first_name} ${me.last_name}`.trim();

  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/dashboard');
  await admin.getByRole('link', { name: 'Activity Log' }).click();
  await expect(admin).toHaveURL(/\/admin\/activity$/);
  await admin.mouse.move(900, 600);
  await expect(admin.getByText('Narrow it down')).toBeVisible();

  // Search for the course's path: the rename and the module added at setup.
  await admin.getByPlaceholder('Name, path or thing…').fill(path);
  await admin.getByRole('button', { name: 'Search' }).click();
  const updated = admin.getByRole('row')
    .filter({ has: admin.getByRole('cell', { name: 'Updated', exact: true }) })
    .filter({ has: admin.getByRole('cell', { name: `Courses #${course.id}`, exact: true }) });
  await expect(updated).toHaveCount(1);
  await expect(updated).toContainText(adminName);
  await expect(updated).toContainText('Courses');

  // Only updates: the creation of the module drops out.
  await pick(admin, 'Any action', 'Updated');
  await expect(admin.getByRole('cell', { name: 'Created', exact: true })).toHaveCount(0);
  await expect(updated).toHaveCount(1);

  // Open the row: the request line and the body that was sent.
  await updated.click();
  const opened = admin.getByRole('row').filter({ hasText: `PUT ${path}` });
  await expect(opened).toHaveCount(1);
  await expect(opened).toContainText(renamed);
  await opened.click();
  await expect(opened).toHaveCount(0);

  // Narrow to this admin and to successes: still there.
  await pick(admin, 'Any person', new RegExp(`^${adminName} \\(`));
  await pick(admin, 'Any outcome', 'Succeeded');
  await expect(updated).toHaveCount(1);

  // Nothing about this course was deleted.
  await pick(admin, 'Updated', 'Deleted');
  await expect(admin.getByText('Nothing matches those filters.')).toBeVisible();
});
