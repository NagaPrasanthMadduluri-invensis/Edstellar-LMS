/**
 * Edstellar services and referrals (CONTEXT.md §14 Commercial and platform):
 * admin A requests a service through its questionnaire, the platform answers
 * it and admin A reads the reply; admin A refers a company (the prospect is
 * emailed as a direct outbox row with no user), the platform marks it
 * converted and admin A sees the status and the reward tier.
 */
import { test, expect, fx, db, apiAs } from './support.mjs';
import { as, expectInBell, choose, uniq } from './helpers-2.mjs';

const TNA = 'Training Needs Analysis (TNA)';

test('a service request is filled in, answered by Edstellar, and the admin reads the reply', async ({ browser }) => {
  const f = fx();
  const admin = await as(browser, f.A.admin);

  // The admin opens the catalogue and requests TNA.
  await admin.goto('/admin/services');
  await expect(admin.getByRole('heading', { name: TNA, exact: true })).toBeVisible();
  const card = admin.locator('div')
    .filter({ has: admin.getByRole('heading', { name: TNA, exact: true }) })
    .filter({ has: admin.getByRole('button', { name: /^Request/ }) })
    .last();
  await card.getByRole('button', { name: /^Request/ }).click();

  const dlg = admin.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: `${TNA} Request` })).toBeVisible();
  await dlg.getByRole('button', { name: 'Identified performance gaps' }).click();
  await dlg.getByRole('button', { name: 'Team / department level' }).click();
  await choose(admin, dlg.getByRole('combobox').first(), '50–200');
  const situation = `Sales onboarding gaps ${uniq('S')}`;
  await dlg.locator('textarea').first().fill(situation);
  await dlg.getByRole('button', { name: 'Submit request' }).click();

  await expect(dlg.getByText('Request submitted')).toBeVisible();
  const refNo = (await dlg.locator('span.font-mono').first().innerText()).trim();
  const [row] = await db('SELECT id, status, answers, organization_id FROM service_requests WHERE ref_no = $1', [refNo]);
  expect(row).toMatchObject({ status: 'pending', organization_id: f.A.id });
  expect(row.answers).toMatchObject({
    trigger: ['Identified performance gaps'],
    scope: 'Team / department level',
    headcount: '50–200',
    context: situation,
  });
  await dlg.getByRole('button', { name: 'Done' }).click();
  await expect(dlg).toBeHidden();
  const mine = admin.getByRole('row').filter({ hasText: refNo });
  await expect(mine).toContainText(TNA);
  await expect(mine).toContainText('Pending');

  // Edstellar opens it from its queue, reads the answers and replies.
  const sa = await as(browser, f.platform.admin);
  await sa.getByRole('link', { name: 'Service Requests' }).click();
  await expect(sa).toHaveURL(/\/platform\/services$/);
  await sa.getByPlaceholder('Search ref, tenant, service, contact…').fill(refNo);
  const queued = sa.getByRole('row').filter({ hasText: refNo });
  await expect(queued).toContainText('Org A E2E');
  await expect(queued).toContainText('Pending');
  await queued.getByRole('button', { name: 'Open' }).click();
  const reply = sa.getByRole('dialog');
  await expect(reply.getByRole('heading', { name: TNA })).toBeVisible();
  await expect(reply.getByText('Identified performance gaps')).toBeVisible();
  await expect(reply.getByText(situation)).toBeVisible();
  await choose(sa, reply.getByRole('combobox'), 'In discussion');
  const note = `Discovery call booked ${uniq('N')}`;
  await reply.getByPlaceholder(/Discovery call booked/).fill(note);
  await reply.getByRole('button', { name: 'Save response' }).click();
  await expect(reply).toBeHidden();
  await expect(queued).toContainText('In discussion');
  const [after] = await db('SELECT status, response_note FROM service_requests WHERE id = $1', [row.id]);
  expect(after).toEqual({ status: 'in_discussion', response_note: note });

  // The admin sees the reply on their own request, and in the bell.
  await admin.reload();
  const answered = admin.getByRole('row').filter({ hasText: refNo });
  await expect(answered).toContainText('In discussion');
  await expect(answered).toContainText(note);
  await expectInBell(admin, `Edstellar replied about ${refNo}`);
});

test('a referral emails the prospect, converts on the platform, and the admin sees the reward tier', async ({ browser, request }) => {
  const f = fx();
  // Setup (not the subject): make sure this conversion reaches a reward tier.
  const [{ n: convertedBefore }] = await db(
    "SELECT COUNT(*)::int AS n FROM referrals WHERE organization_id = $1 AND status = 'converted'", [f.A.id]);
  if (convertedBefore < 1) {
    const adminApi = await apiAs(request, f.A.admin);
    const seed = await adminApi.post('/api/admin/referrals', {
      company_name: `Seed Co ${uniq('R')}`, contact_name: 'Seed Contact', contact_email: `${uniq('seed')}@prospect.e2e.test`,
    });
    expect(seed.status()).toBe(201);
    const saApi = await apiAs(request, f.platform.admin);
    const conv = await saApi.patch(`/api/platform/referrals/${(await seed.json()).referral.id}`, { status: 'converted' });
    expect(conv.status()).toBe(200);
  }
  const [{ n: base }] = await db(
    "SELECT COUNT(*)::int AS n FROM referrals WHERE organization_id = $1 AND status = 'converted'", [f.A.id]);

  const admin = await as(browser, f.A.admin);
  await admin.goto('/admin/referrals');
  await admin.getByRole('button', { name: 'Refer a company' }).click();
  const dlg = admin.getByRole('dialog', { name: 'Refer a company' });
  const company = `Globex ${uniq('C')}`;
  const email = `${uniq('pat').toLowerCase()}@prospect.e2e.test`;
  await expect(dlg.getByRole('button', { name: 'Send referral' })).toBeDisabled();
  await dlg.getByPlaceholder('Acme Corporation').fill(company);
  await dlg.getByPlaceholder('Jordan Lee').fill('Pat Prospect');
  await dlg.getByPlaceholder('jordan@acme.com').fill(email);
  await dlg.getByPlaceholder('e.g. 50-100').fill('200-500');
  await dlg.getByRole('button', { name: 'Send referral' }).click();
  await expect(dlg).toBeHidden();

  const card = admin.locator('div').filter({ hasText: company }).filter({ hasText: /REF-\d{4}-\d{4}/ }).last();
  await expect(card).toContainText('Invited');
  await expect(card).toContainText(`Pat Prospect · ${email}`);
  const [ref] = await db('SELECT id, ref_no, status, referred_by FROM referrals WHERE contact_email = $1', [email]);
  expect(ref).toMatchObject({ status: 'invited', referred_by: f.A.admin.id });
  await expect(card).toContainText(ref.ref_no);

  // The prospect invitation is queued to an address with no user behind it.
  await expect.poll(async () => (await db(
    "SELECT user_id, type, organization_id FROM email_outbox WHERE to_email = $1", [email]))[0] ?? null,
  ).toEqual({ user_id: null, type: 'referral_invite', organization_id: f.A.id });

  // Edstellar marks it converted.
  const sa = await as(browser, f.platform.admin);
  await sa.getByRole('link', { name: 'Referrals' }).click();
  await expect(sa).toHaveURL(/\/platform\/referrals$/);
  await sa.getByPlaceholder('Search ref, tenant, company, contact…').fill(company);
  const queued = sa.getByRole('row').filter({ hasText: company });
  await expect(queued).toContainText('Org A E2E');
  await expect(queued).toContainText('Invited');
  await queued.getByRole('button', { name: 'Open' }).click();
  const reply = sa.getByRole('dialog');
  await expect(reply.getByRole('heading', { name: company })).toBeVisible();
  await expect(reply.getByText('200-500')).toBeVisible();
  await choose(sa, reply.getByRole('combobox').first(), 'Converted');
  await expect(reply.getByText('Marking converted rewards the referrer')).toBeVisible();
  const note = `Signed a 12 month deal ${uniq('N')}`;
  await reply.getByPlaceholder(/Intro call booked/).fill(note);
  await reply.getByRole('button', { name: 'Save response' }).click();
  await expect(reply).toBeHidden();
  await expect(queued).toContainText('Converted');
  const [done] = await db('SELECT status, platform_note, converted_at FROM referrals WHERE id = $1', [ref.id]);
  expect(done).toMatchObject({ status: 'converted', platform_note: note });
  expect(done.converted_at).toBeTruthy();

  // The admin sees the status, the note, and the tier they reached.
  const converted = base + 1;
  const pct = converted >= 3 ? 25 : 15;
  await admin.reload();
  const row = admin.locator('div').filter({ hasText: company }).filter({ hasText: /REF-\d{4}-\d{4}/ }).last();
  await expect(row).toContainText('Converted');
  await expect(row).toContainText('Now a Spectra customer');
  await expect(row).toContainText(note);
  await expect(admin.getByText(`You have unlocked ${pct}% off`)).toBeVisible();
  await expect(admin.getByText(converted >= 3
    ? `${converted} referrals converted. You are at the top tier.`
    : `${converted} converted so far. 1 more to reach 25% off.`)).toBeVisible();
  await expectInBell(admin, `${company} is now a Spectra customer`);
});
