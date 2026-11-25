/**
 * Extra admin permissions on a learner-portal role (CONTEXT.md §3,
 * BACKEND_STRUCTURE §10.65): a Learner/Manager role given an admin permission
 * keeps the learner portal and gains exactly that admin module (sidebar link,
 * its buttons, the API), and nothing else. The Permission Matrix shows a dash
 * where a permission cannot apply to a role.
 *
 * The role is written straight to the database rather than through the roles
 * API, because a role write signs the whole fixture organization out and the
 * other journeys share it.
 */
import { test, expect, fx, signIn, db } from './support.mjs';
import { newPersonAs } from './helpers-4.mjs';
import { apiFrom } from './helpers-2.mjs';

test('a learner role given "Manage courses" gets Course Library and nothing more', async ({ page }) => {
  const f = fx();
  const key = `coord_${Date.now().toString(36)}`;
  const [role] = await db(
    "INSERT INTO roles (organization_id, key, label, portal, scope, is_system) VALUES ($1, $2, 'Coordinator', 'learner', 'self', false) RETURNING id",
    [f.A.id, key],
  );
  await db('INSERT INTO role_permissions (role_id, permission) VALUES ($1, $2)', [role.id, 'manage_courses']);
  // Created as a learner the normal way, then moved onto the new role.
  const person = await newPersonAs('A', 'learner', 'Coord');
  await db('UPDATE users SET role_id = $2 WHERE id = $1', [person.id, role.id]);

  await signIn(page, person, { fresh: true });
  await expect(page).toHaveURL(/\/dashboard$/);

  // Still a learner: their own modules, plus one "Admin" group. The sidebar
  // opens as an icon rail; a group shows its links in a flyout on hover.
  await expect(page.getByRole('link', { name: 'Course Catalogue' })).toBeVisible();
  await page.getByRole('link', { name: 'Admin' }).hover();
  await expect(page.getByRole('link', { name: 'Course Library' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage Users' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0);

  // The module works, buttons included.
  await page.getByRole('link', { name: 'Course Library' }).click();
  await page.mouse.move(900, 600);
  await expect(page).toHaveURL(/\/admin\/courses$/);
  await expect(page.getByRole('button', { name: /add course/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to My Learning' })).toBeVisible();

  // A module they were not given: refused on screen and by the API.
  await page.goto('/admin/users');
  await expect(page.getByTestId('no-access')).toBeVisible();
  const api = apiFrom(page);
  expect((await api.get('/api/admin/users')).status()).toBe(403);
  expect((await api.get('/api/admin/courses')).status()).toBe(200);

  // Back to their own portal.
  await page.goto('/admin/courses');
  await page.getByRole('link', { name: 'Back to My Learning' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('a plain learner has no Admin group and is sent away from admin pages', async ({ page }) => {
  const learner = await newPersonAs('A', 'learner', 'Plain');
  await signIn(page, learner, { fresh: true });
  await expect(page.getByRole('link', { name: 'Course Catalogue' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.goto('/admin/courses');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('the Permission Matrix shows a dash where a permission cannot apply', async ({ page }) => {
  const f = fx();
  await signIn(page, f.A.admin);
  await page.goto('/admin/roles');
  await expect(page.getByText('Permission Matrix')).toBeVisible();
  // My Team is a learner-portal permission: no checkbox for the Admin role.
  await expect(page.getByRole('checkbox', { name: 'View team learning for Admin' })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'View team learning for Manager' })).toBeVisible();
  // An admin permission can be ticked for Manager, as an extra.
  await expect(page.getByRole('checkbox', { name: 'View reports for Manager' })).toBeVisible();
});
