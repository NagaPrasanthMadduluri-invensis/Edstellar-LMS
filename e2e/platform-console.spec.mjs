/**
 * The super-admin's organisation list and cross-tenant activity log
 * (CONTEXT.md §14, §11 Activity log): the list shows every tenant and opens
 * one; an action org A's admin just took appears in the platform activity log
 * and survives filtering to that organisation.
 */
import { test, expect, fx, db, apiAs } from './support.mjs';
import { as, choose, uniq } from './helpers-2.mjs';

test('the organisation list shows every tenant and opens one', async ({ browser }) => {
  const f = fx();
  const sa = await as(browser, f.platform.admin);
  await sa.goto('/platform/organizations');
  const [{ n }] = await db('SELECT COUNT(*)::int AS n FROM organizations');
  await expect(sa.getByText(`${n} organisation${n === 1 ? '' : 's'}`, { exact: true })).toBeVisible();

  const rowA = sa.getByRole('row').filter({ has: sa.getByRole('link', { name: 'Org A E2E', exact: true }) });
  await expect(rowA).toContainText(`/${f.A.slug}`);
  await expect(rowA).toContainText('Active');
  await expect(sa.getByRole('link', { name: 'Org B E2E', exact: true })).toBeVisible();

  await rowA.getByRole('link', { name: 'Org A E2E', exact: true }).click();
  await expect(sa).toHaveURL(new RegExp(`/platform/organizations/${f.A.publicId}$`));
  await expect(sa.getByRole('heading', { name: 'Org A E2E', exact: true })).toBeVisible();
  await expect(sa.getByRole('heading', { name: 'Roles' })).toBeVisible();
});

test('an action by org A appears in the platform activity log, filtered to that organisation', async ({ browser, request }) => {
  const f = fx();
  // Setup (not the subject): admin A does something worth recording.
  const adminApi = await apiAs(request, f.A.admin);
  const res = await adminApi.post('/api/admin/referrals', {
    company_name: `Audit Co ${uniq('A')}`, contact_name: 'Ada Audit', contact_email: `${uniq('ada').toLowerCase()}@prospect.e2e.test`,
  });
  expect(res.status()).toBe(201);
  await expect.poll(async () => (await db(
    "SELECT COUNT(*)::int AS n FROM audit_log WHERE organization_id = $1 AND method = 'POST' AND path = '/api/admin/referrals' AND actor_user_id = $2",
    [f.A.id, f.A.admin.id]))[0].n).toBeGreaterThan(0);
  const [actor] = await db("SELECT first_name || ' ' || last_name AS name FROM users WHERE id = $1", [f.A.admin.id]);

  const sa = await as(browser, f.platform.admin);
  await sa.getByRole('link', { name: 'Activity Log', exact: true }).click();
  await expect(sa).toHaveURL(/\/platform\/activity$/);
  await expect(sa.locator('thead').getByText('Tenant', { exact: true })).toBeVisible();

  await choose(sa, sa.getByRole('combobox').filter({ hasText: 'Every tenant' }), 'Org A E2E');
  await sa.getByPlaceholder('Name, path or thing…').fill('referrals');
  await sa.getByRole('button', { name: 'Search' }).click();

  const rows = sa.locator('tbody tr');
  const first = rows.first();
  await expect(first).toContainText('Referrals');
  await expect(first).toContainText(actor.name);
  await expect(first).toContainText('Created');
  await expect(first).toContainText('Org A E2E');
  await expect(first).toContainText('201');
  // Every row shown belongs to org A.
  const tenants = await rows.locator('td:nth-child(5)').allInnerTexts();
  expect(tenants.length).toBeGreaterThan(0);
  expect(new Set(tenants)).toEqual(new Set(['Org A E2E']));
  // Expanding the row shows the request it records.
  await first.click();
  await expect(first).toContainText('POST /api/admin/referrals');
});
