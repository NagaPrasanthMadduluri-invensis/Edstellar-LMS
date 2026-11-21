/**
 * External certification (CONTEXT.md §8; BACKEND_STRUCTURE §10.26): the learner
 * files a claim with a PDF, their manager confirms it on My Team, the admin
 * approves it on Certificates, and the learner sees Approved. It becomes a
 * completed course but pays no points (§10.5.1).
 */
import { test, expect, fx, db } from './support.mjs';
import { as, apiFrom, tinyPdf, uniq } from './helpers-2.mjs';

test('learner claims, manager confirms, admin approves; no points paid', async ({ browser }) => {
  const f = fx();
  const course = `Ext ${uniq('Cert')} Practitioner`;

  // 1. Learner files the claim.
  const learner = await as(browser, f.A.learner);
  const learnerApi = apiFrom(learner);
  const pointsBefore = (await (await learnerApi.get('/api/learner/achievements')).json()).summary.points;
  await learner.goto('/certifications');
  await learner.getByRole('button', { name: /Add external certification/ }).click();
  const dlg = learner.getByRole('dialog');
  await expect(dlg.getByText('Nothing is added to your record yet.', { exact: false })).toBeVisible();
  await dlg.getByPlaceholder('Exactly as it is printed').fill('Learner Tester');
  await dlg.getByPlaceholder('e.g. PRINCE2 Practitioner').fill(course);
  await dlg.getByPlaceholder('e.g. 21').fill('6');
  await dlg.getByPlaceholder('e.g. AXELOS').fill('E2E Awarding Body');
  await dlg.locator('input[type="file"]').setInputFiles(tinyPdf());
  await expect(dlg.getByText('Ready to send.')).toBeVisible();
  await dlg.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(learner.getByText(/^Sent to .*Manager Tester/)).toBeVisible();
  const claim = learner.locator('[data-slot="card"]', { hasText: course });
  await expect(claim.getByText('Waiting for your manager')).toBeVisible();

  // 2. The manager confirms it from My Team.
  const manager = await as(browser, f.A.manager);
  await manager.goto('/team-learning');
  const mCard = manager.locator('[data-slot="card"]', { hasText: course });
  await expect(mCard).toBeVisible();
  await mCard.getByRole('button', { name: 'Confirm' }).click();
  const mDlg = manager.getByRole('dialog');
  await expect(mDlg.getByText(/Nothing is added to their record yet/)).toBeVisible();
  await mDlg.getByRole('button', { name: 'Approve' }).click();
  await expect(manager.getByText(`"${course}" approved.`)).toBeVisible();

  await learner.reload();
  await expect(claim.getByText('Waiting for L&D')).toBeVisible();

  // 3. The admin approves it on Certificates.
  const admin = await as(browser, f.A.admin);
  await admin.goto('/admin/certificates');
  const aCard = admin.locator('[data-slot="card"]', { hasText: course });
  await expect(aCard).toBeVisible();
  await expect(aCard.getByText(/Learner Tester/).first()).toBeVisible();
  await aCard.getByRole('button', { name: 'Approve' }).click();
  const aDlg = admin.getByRole('dialog');
  await expect(aDlg.getByText(/adds this to their My Courses as completed externally/)).toBeVisible();
  await aDlg.getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByText(`"${course}" approved.`)).toBeVisible();

  // 4. The learner sees Approved.
  await learner.reload();
  await expect(claim.getByText('Approved', { exact: true })).toBeVisible();

  // Ground truth: approved, a companion course completed, and no points paid.
  const [row] = await db('SELECT id, status FROM external_certifications WHERE course_name = $1', [course]);
  expect(row.status).toBe('approved');
  const [c] = await db('SELECT id FROM courses WHERE external_certification_id = $1', [row.id]);
  expect(c).toBeTruthy();
  const after = await (await learnerApi.get('/api/learner/achievements')).json();
  expect(after.summary.points).toBe(pointsBefore);
  expect(JSON.stringify(after.pointsHistory)).not.toContain(course);
});
