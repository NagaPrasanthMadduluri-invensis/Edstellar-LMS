/**
 * Session details (2026-11-24, BACKEND_STRUCTURE §10.63): the admin sees every
 * sitting's schedule and seats, every learner's feedback, and downloads the
 * session report as Excel and as a printable PDF. Since 0076 a batch is one time
 * slot on one date: each date has its own batches (BACKEND_STRUCTURE §10.67), and
 * a batch is added on a date from the Dates and batches dialog.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, newLearner, pageAs, uniq } from './helpers-1.mjs';

test('session details: schedule with seats, learner feedback, Excel and PDF report, a batch added on a date', async ({ browser }) => {
  const A = fx().A;
  const admin = await api(A.admin);
  const title = uniq('Report session');

  // ── Setup (not the subject): a two-day session (Batch 1 on each date) plus
  //    Morning and Afternoon batches on the first date ──
  const created = await admin.post('/api/admin/sessions', {
    title, session_type: 'ILT', capacity: 10, trainer: 'x', trainer_user_id: A.trainer.id,
    venue_url: 'Room 4', date: '2030-06-01', end_date: '2030-06-02', start_time: '09:00', end_time: '12:00',
    enroll_mode: 'assigned',
  });
  const sessionId = Number(created.session.id);
  const am = (await admin.post(`/api/admin/sessions/${sessionId}/batches`, { label: 'Morning', date: '2030-06-01', start_time: '09:00', end_time: '12:00', capacity: 1 })).batch;
  const pm = (await admin.post(`/api/admin/sessions/${sessionId}/batches`, { label: 'Afternoon', date: '2030-06-01', start_time: '14:00', end_time: '17:00', capacity: 3 })).batch;
  const l1 = await newLearner('A', 'Rpt');
  const l2 = await newLearner('A', 'Rpt');
  await admin.post(`/api/admin/sessions/${sessionId}/roster`, { user_id: l1.id, batch_id: am.id });
  await admin.post(`/api/admin/sessions/${sessionId}/roster`, { user_id: l2.id, batch_id: pm.id });
  await admin.put(`/api/admin/sessions/${sessionId}/attendance`, { records: [{ user_id: l1.id, status: 'present' }, { user_id: l2.id, status: 'late' }] });
  const comment = `Very hands-on ${uniq('C')}`;
  await db(
    'INSERT INTO session_feedback (organization_id, session_id, user_id, rating_content, rating_trainer, rating_delivery, comment) VALUES ($1, $2, $3, 5, 4, 4, $4)',
    [A.id, sessionId, l1.id, comment],
  );

  // ── The admin opens the session's details from its card ──
  const page = await pageAs(browser, A.admin);
  await page.goto(`/admin/sessions?session=${sessionId}`);
  const card = page.locator('div', { hasText: title }).filter({ has: page.getByRole('button', { name: 'Mark attendance' }) }).last();
  await card.getByRole('button', { name: 'Mark attendance' }).click();

  // Schedule: both batches, each with its own seats; the 1-seat morning is full.
  await expect(page.getByRole('heading', { name: 'Batches (4)' })).toBeVisible();
  const morning = page.locator('tr', { hasText: 'Batch 2 · Morning' });
  await expect(morning).toContainText('1 / 1');
  await expect(morning).toContainText('Full');
  const afternoon = page.locator('tr', { hasText: 'Batch 3 · Afternoon' });
  await expect(afternoon).toContainText('14:00 to 17:00');
  await expect(afternoon).toContainText('1 / 3');

  // Feedback: who, which batch, the ratings and the comment.
  const fb = page.locator('[data-slot="card"]', { has: page.getByRole('heading', { name: 'Learner feedback' }) });
  await expect(fb.getByText('1 response')).toBeVisible();
  await expect(fb.getByText(comment)).toBeVisible();
  await expect(fb.getByText(`${l1.firstName} Journey`)).toBeVisible();
  await expect(fb.getByText('Batch 2 · Morning (1 Jun)')).toBeVisible();
  await expect(fb.getByText('4.3 / 5').first()).toBeVisible();

  // Excel download, named for the session.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Excel' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^session-report-.*-2030-06-01\.xlsx$/);

  // PDF: a printable report opens with the session, batches and feedback.
  const [popup] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'PDF' }).click(),
  ]);
  await popup.waitForLoadState();
  await expect(popup.getByRole('heading', { name: title })).toBeVisible();
  await expect(popup.getByText('Batches and schedule')).toBeVisible();
  await expect(popup.getByText(comment)).toBeVisible();
  await popup.close();

  // ── Dates and batches: add a batch on the second date ──
  await page.goto(`/admin/sessions?session=${sessionId}`);
  await page.getByRole('button', { name: 'Dates and batches' }).first().click();
  const dlg = page.getByRole('dialog');
  const second = dlg.getByTestId('date-batches-2030-06-02');
  await second.getByRole('button', { name: 'Add batch' }).click();
  await second.getByLabel('Batch label').fill('Evening');
  await second.getByLabel('Batch start').fill('18:00');
  await second.getByLabel('Batch end').fill('20:00');
  await second.getByLabel('Batch capacity').fill('4');
  await second.getByRole('button', { name: 'Add batch' }).last().click();
  await expect(second.getByText('Batch 2 · Evening')).toBeVisible();
  const [row] = await db('SELECT b.date, b.start_time, b.capacity FROM session_batches b WHERE b.session_id = $1 AND b.label = $2', [sessionId, 'Evening']);
  expect(row).toEqual({ date: '2030-06-02', start_time: '18:00', capacity: 4 });
  // With a choice on that date, the admin places each learner there.
  await expect(dlg.getByTestId('placements-2030-06-02')).toContainText(l1.firstName);
});
