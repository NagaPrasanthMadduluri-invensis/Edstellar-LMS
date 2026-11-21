/**
 * Analytics (CONTEXT.md §12 Insight): the admin opens Analytics from the
 * sidebar, reads the monthly trends, then switches granularity; the page asks
 * the API for the new window and redraws the same panels for it.
 */
import { test, expect, fx } from './support.mjs';
import { pageAs } from './helpers-1.mjs';

test('admin switches Analytics from monthly to weekly and quarterly trends', async ({ browser }) => {
  const admin = await pageAs(browser, fx().A.admin);
  await admin.goto('/admin/dashboard');
  await admin.getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(admin).toHaveURL(/\/admin\/analytics$/);
  await admin.mouse.move(900, 600);

  const viewing = admin.getByText(/^Viewing\s+\S+\s+trends$/);
  await expect(viewing).toHaveText(/Viewing\s+Monthly\s+trends/);
  await expect(admin.getByText('Learners over time')).toBeVisible();

  for (const [label, key] of [['Weekly', 'weekly'], ['Quarterly', 'quarterly']]) {
    const asked = admin.waitForResponse((r) => r.url().includes('/api/admin/analytics') && r.url().includes(`granularity=${key}`));
    await admin.getByRole('button', { name: label, exact: true }).click();
    const res = await asked;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.periods.length).toBeGreaterThan(0);
    await expect(viewing).toHaveText(new RegExp(`Viewing\\s+${label}\\s+trends`));
    await expect(admin.getByText(`Insights — ${label}`)).toBeVisible();
    await expect(admin.getByText('Enrolments vs completions')).toBeVisible();
  }
});
