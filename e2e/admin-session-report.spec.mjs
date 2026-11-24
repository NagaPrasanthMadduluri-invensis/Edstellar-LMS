/**
 * Session details (2026-11-24, BACKEND_STRUCTURE §10.63): the admin sees every
 * sitting's schedule and seats, every learner's feedback, and downloads the
 * session report as Excel and as a printable PDF. Batches can span days, and an
 * end date before the start is refused in the batch form.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, newLearner, pageAs, uniq } from './helpers-1.mjs';

test('session details: schedule with seats, learner feedback, Excel and PDF report, multi-day batch', async ({ browser }) => {
  const A = fx().A;
  const admin = await api(A.admin);
  const title = uniq('Report session');

  // ── Setup (not the subject): a two-day session with two same-day batches ──
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
  await expect(page.getByRole('heading', { name: 'Batches (2)' })).toBeVisible();
  const morning = page.locator('tr', { hasText: 'Batch 1 · Morning' });
  await expect(morning).toContainText('1 / 1');
  await expect(morning).toContainText('Full');
  const afternoon = page.locator('tr', { hasText: 'Batch 2 · Afternoon' });
  await expect(afternoon).toContainText('14:00 to 17:00');
  await expect(afternoon).toContainText('1 / 3');

  // Feedback: who, which batch, the ratings and the comment.
  const fb = page.locator('[data-slot="card"]', { has: page.getByRole('heading', { name: 'Learner feedback' }) });
  await expect(fb.getByText('1 response')).toBeVisible();
  await expect(fb.getByText(comment)).toBeVisible();
  await expect(fb.getByText(`${l1.firstName} Journey`)).toBeVisible();
  await expect(fb.getByText('Batch 1 · Morning')).toBeVisible();
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

  // ── Batch form: a multi-day batch, and an end before the start is refused ──
  await page.goto(`/admin/sessions?session=${sessionId}`);
  await page.getByRole('button', { name: 'Batches' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Start date').fill('2030-06-10');
  await dlg.getByLabel('End date').fill('2030-06-08');
  await dlg.getByRole('button', { name: 'Add batch' }).click();
  await expect(dlg.getByText('The end date cannot be before the start date.')).toBeVisible();
  await dlg.getByLabel('End date').fill('2030-06-12');
  await dlg.getByRole('button', { name: 'Add batch' }).click();
  await expect(dlg.getByText(/10 Jun 2030 to 12 Jun 2030/)).toBeVisible();
  const [row] = await db('SELECT date, end_date FROM session_batches WHERE session_id = $1 AND batch_no = 3', [sessionId]);
  expect(row).toEqual({ date: '2030-06-10', end_date: '2030-06-12' });
});
