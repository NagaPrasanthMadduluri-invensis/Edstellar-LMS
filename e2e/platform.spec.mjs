/**
 * The super-admin portal (CONTEXT.md §14, §13 Security incident;
 * BACKEND_STRUCTURE §10.17, §10.46): provision a tenant and open its page, run
 * a support session and exit it; answer admin A's seat request with fewer seats
 * than asked; log a security incident and notify admin A, who sees the notice.
 */
import { test, expect, fx, db } from './support.mjs';
import { as, apiFrom, expectInBell, uniq } from './helpers-2.mjs';

test('provision a tenant and open its page', async ({ browser }) => {
  const f = fx();
  const sa = await as(browser, f.platform.admin);
  await expect(sa).toHaveURL(/\/platform\/dashboard$/);
  await expect(sa.getByText('Org A E2E').first()).toBeVisible();

  const name = `Northwind ${uniq('E')}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const adminEmail = `owner@${slug}.e2e.test`;

  await sa.getByRole('link', { name: 'Tenant Directory' }).click();
  await expect(sa).toHaveURL(/\/platform\/tenants$/);
  await sa.getByRole('button', { name: 'New tenant' }).click();
  const dlg = sa.getByRole('dialog', { name: 'New tenant' });
  await dlg.getByPlaceholder('e.g. Northwind Logistics').fill(name);
  await expect(dlg.getByPlaceholder('northwind-logistics')).toHaveValue(slug);
  // A branch location is required: pick a country, then one of its cities.
  await dlg.getByRole('combobox').filter({ hasText: 'Pick a country' }).click();
  await sa.getByRole('option', { name: /India$/ }).click();
  const city = dlg.getByPlaceholder(/^Search \d+ cities in India/);
  await expect(city).toBeEnabled();
  await city.fill('Bengaluru');
  await dlg.getByRole('button', { name: /Bengaluru/ }).first().click();
  // First admin (no password: they are emailed a welcome link).
  const firstName = dlg.locator('div.space-y-1\\.5', { has: sa.getByText(/^First name\s*\*?$/) }).locator('input').first();
  const lastName = dlg.locator('div.space-y-1\\.5', { has: sa.getByText(/^Last name\s*\*?$/) }).locator('input').first();
  await firstName.fill('Nora');
  await lastName.fill('Owner');
  await dlg.getByPlaceholder('admin@northwind.com').fill(adminEmail);
  await dlg.getByPlaceholder('Leave blank for unlimited').fill('25');
  await dlg.getByRole('button', { name: 'Create tenant' }).click();
  await expect(dlg).toBeHidden();

  const [org] = await db('SELECT id, public_id, seat_limit FROM organizations WHERE slug = $1', [slug]);
  expect(org.seat_limit).toBe(25);
  const [owner] = await db('SELECT id, role, organization_id FROM users WHERE email = $1', [adminEmail]);
  expect(owner).toMatchObject({ role: 'admin', organization_id: org.id });
  expect((await db("SELECT 1 FROM email_outbox WHERE to_email = $1 AND type = 'welcome'", [adminEmail])).length).toBe(1);

  // Its page.
  const card = sa.locator('div').filter({ hasText: name }).filter({ has: sa.getByRole('link', { name: 'Details' }) }).last();
  await card.getByRole('link', { name: 'Details' }).click();
  await expect(sa).toHaveURL(new RegExp(`/platform/organizations/${org.public_id}$`));
  await expect(sa.getByText(`/${slug}`, { exact: false }).first()).toBeVisible();
  await expect(sa.getByRole('heading', { name: 'Roles' })).toBeVisible();

  // Access Control lists the new owner among privileged accounts.
  await sa.getByRole('link', { name: 'Access Control' }).click();
  await expect(sa).toHaveURL(/\/platform\/access$/);
  await expect(sa.getByText(adminEmail).first()).toBeVisible();
});

/** Open a support session into `name` from the Tenant Directory. */
async function openTenant(sa, name, adminEmail) {
  await sa.goto('/platform/tenants');
  const card = sa.locator('div').filter({ hasText: name }).filter({ has: sa.getByRole('button', { name: 'Open tenant' }) }).last();
  await card.getByRole('button', { name: 'Open tenant' }).click();
  const confirm = sa.getByRole('dialog', { name: `Sign in to ${name}?` });
  await expect(confirm.getByText(adminEmail)).toBeVisible();
  await confirm.getByRole('button', { name: 'Sign in to tenant' }).click();
}

test('a support session lands in the tenant admin dashboard under the red banner, and exits', async ({ browser }) => {
  const f = fx();
  // Admin A has acknowledged the privacy notice through their own sign-in
  // (support.mjs signIn), so this exercises the session itself.
  const own = await as(browser, f.A.admin);
  await expect(own).toHaveURL(/\/admin\/dashboard$/);
  await own.context().close();

  const sa = await as(browser, f.platform.admin);
  const [before] = await db("SELECT COUNT(*)::int AS n FROM activity_log WHERE organization_id = $1 AND type = 'support_session_started'", [f.A.id]);
  await openTenant(sa, 'Org A E2E', f.A.admin.email);
  await expect(sa).toHaveURL(/\/admin\/dashboard$/);
  const banner = sa.getByText(/Support session — you are signed in to/);
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Org A E2E');
  const [after] = await db("SELECT COUNT(*)::int AS n FROM activity_log WHERE organization_id = $1 AND type = 'support_session_started'", [f.A.id]);
  expect(after.n).toBe(before.n + 1);
  // Inside a tenant the platform console is unreachable.
  await sa.goto('/platform/dashboard');
  await expect(sa).not.toHaveURL(/\/platform\/dashboard$/);

  await sa.getByRole('button', { name: 'Exit to platform' }).click();
  await expect(sa).toHaveURL(/\/platform\/tenants$/);
  await expect(sa.getByText(/Support session — you are signed in to/)).toHaveCount(0);
});

// CONTEXT/BACKEND_STRUCTURE §10.39: "A support session reports
// consent_required: false", so opening a tenant whose owner has never signed in
// (every freshly provisioned tenant) lands on the dashboard, not /consent.
test('a support session into a new tenant lands on the admin dashboard, not /consent', async ({ browser }) => {
  const f = fx();
  const sa = await as(browser, f.platform.admin);
  const name = `Fresh ${uniq('S')}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const adminEmail = `owner@${slug}.e2e.test`;
  const res = await apiFrom(sa).post('/api/platform/organizations', {
    name, slug, admin: { firstName: 'Fresh', lastName: 'Owner', email: adminEmail },
  });
  expect(res.status()).toBeLessThan(300);
  await openTenant(sa, name, adminEmail);
  await expect(sa).toHaveURL(/\/admin\/dashboard$/);
  await expect(sa.getByText(/Support session — you are signed in to/)).toContainText(name);
});

test('a seat request is approved for fewer seats and the admin sees the new limit', async ({ browser }) => {
  const f = fx();
  const [{ seat_limit: limit }] = await db('SELECT seat_limit FROM organizations WHERE id = $1', [f.A.id]);
  const asked = limit + 10;
  const granted = limit + 5;

  // Admin A asks from the Seat Licence panel.
  const admin = await as(browser, f.A.admin);
  await admin.goto('/admin/users');
  await expect(admin.getByText(`seats used`, { exact: false }).first()).toContainText(`of ${limit} seats used`);
  await admin.getByRole('button', { name: /Request more seats/ }).click();
  const req = admin.getByRole('dialog', { name: 'Request more seats' });
  await expect(req.locator('input[type="number"]')).toHaveValue(String(asked));
  await req.getByPlaceholder(/Onboarding 12 people/).fill('Onboarding a new team.');
  await req.getByRole('button', { name: 'Send request' }).click();
  await expect(req).toBeHidden();
  await expect(admin.getByText(`Awaiting Edstellar — asked for ${asked}`)).toBeVisible();

  // The platform grants fewer than asked.
  const sa = await as(browser, f.platform.admin);
  await sa.getByRole('link', { name: 'Seat Requests', exact: true }).click();
  await expect(sa).toHaveURL(/\/platform\/seats$/);
  await sa.getByRole('button', { name: 'Decide' }).first().click();
  const decide = sa.getByRole('dialog', { name: 'Org A E2E — seat request' });
  await decide.locator('input[type="number"]').fill(String(granted));
  await expect(decide.getByText(`Saving sets this tenant's limit to ${granted} immediately.`)).toBeVisible();
  await decide.getByRole('button', { name: 'Approve & set limit' }).click();
  await expect(decide).toBeHidden();
  expect((await db('SELECT seat_limit FROM organizations WHERE id = $1', [f.A.id]))[0].seat_limit).toBe(granted);

  // Admin A sees the new limit and the answer.
  await admin.reload();
  await expect(admin.getByText(`of ${granted} seats used`, { exact: false })).toBeVisible();
  await expect(admin.getByText(`Approved — ${granted} seats granted`)).toBeVisible();
});

test('a security incident is logged and its notice reaches admin A', async ({ browser }) => {
  const f = fx();
  const title = `Wrong distribution list ${uniq('I')}`;
  const sa = await as(browser, f.platform.admin);
  await sa.getByRole('link', { name: 'Security Incidents' }).click();
  await expect(sa).toHaveURL(/\/platform\/incidents$/);
  await sa.getByRole('button', { name: 'Log an incident' }).click();
  const create = sa.getByRole('dialog', { name: 'Log a security incident' });
  await create.getByPlaceholder('e.g. Bulk email sent to the wrong distribution list').fill(title);
  await create.getByRole('checkbox', { name: 'Org A E2E' }).check();
  await create.getByRole('button', { name: 'Log incident' }).click();

  const detail = sa.getByRole('dialog', { name: new RegExp(title) });
  await expect(detail).toBeVisible();
  await expect(detail.getByText('Org A E2E', { exact: false }).first()).toBeVisible();
  await detail.getByPlaceholder(/What happened, what data is involved/).fill('A report was emailed to the wrong list. No action needed from you yet.');
  await detail.getByRole('button', { name: 'Send notice' }).click();
  await expect(detail.getByText(/^Sent to \d+ admins?\.$/)).toBeVisible();
  const [inc] = await db('SELECT clients_notified_at FROM security_incidents WHERE title = $1', [title]);
  expect(inc.clients_notified_at).not.toBeNull();

  // Admin A finds the notice in the bell.
  const admin = await as(browser, f.A.admin);
  await expectInBell(admin, `Security incident notice: ${title}`);
});
