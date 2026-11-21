/**
 * A learner's record after finishing a course (CONTEXT.md §7, §8, §9):
 * a throwaway learner finishes an assigned Technical course whose one lesson
 * declares 600 minutes. Then:
 *   - My Progress shows the course completed in Learning history and 10h this month;
 *   - Learning Hours shows the monthly Goal band "Goal Reached!" (10h is the
 *     whole monthly goal, measured against the part of the month so far) and
 *     "Behind" for the year;
 *   - Surveys & Feedback has the course's feedback pending; they rate it and it
 *     moves to Already submitted;
 *   - the public /verify page, signed out, shows their certificate as genuine
 *     with their name, and an unknown code as not found.
 */
import { test, expect, db, fx } from './support.mjs';
import { api, dbUntil, newLearner, pageAs, uniq } from './helpers-1.mjs';

async function technicalCourse(orgKey, learnerId, minutes) {
  const admin = await api(fx()[orgKey].admin);
  const name = uniq('Record course');
  const c = await admin.post('/api/admin/courses', { name, category: 'Technical' });
  const m = await admin.post(`/api/admin/courses/${c.course.id}/modules`, { title: 'Module 1' });
  const l = await admin.post(`/api/admin/modules/${m.module.id}/lessons`, {
    title: 'The long lesson', content_type: 'link', content_url: 'https://example.test/long', duration_minutes: minutes,
  });
  await admin.post(`/api/admin/courses/${c.course.id}/assignments/bulk`, { user_ids: [learnerId] });
  const [row] = await db('SELECT public_id, is_active FROM courses WHERE id = $1', [c.course.id]);
  if (!row.is_active) await admin.patch(`/api/admin/courses/${c.course.id}`, { is_active: true });
  return { id: c.course.id, publicId: row.public_id, name, lessonId: l.lesson.id };
}

test('after finishing a course the learner sees it on My Progress, Learning Hours, Surveys and a public verify page', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'Rec');
  const course = await technicalCourse('A', learner.id, 600);

  // ── Finish the course the way a learner does ──
  const page = await pageAs(browser, learner);
  await page.goto('/my-courses');
  await page.getByRole('link', { name: new RegExp(course.name) }).click();
  await expect(page).toHaveURL(new RegExp(`/my-courses/${course.publicId}$`));
  await page.getByRole('link', { name: /The long lesson/ }).first().click();
  await page.getByRole('button', { name: 'Save & finish course' }).first().click();
  await expect(page.getByText('You have completed this course')).toBeVisible();

  // ── My Progress: learning history and hours ──
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: /Lifetime learning/ })).toBeVisible();
  const historyRow = page.getByRole('row').filter({ hasText: course.name });
  await expect(historyRow).toBeVisible();
  await expect(historyRow).toContainText('completed');
  await expect(page.getByText('This month', { exact: true }).first().locator('xpath=..')).toContainText('10h');
  await expect(page.getByText('Monthly goal', { exact: true }).first().locator('xpath=..')).toContainText('10h');
  const credited = await db(
    'SELECT 1 FROM user_lesson_completions WHERE user_id = $1 AND lesson_id = $2', [learner.id, course.lessonId],
  );
  expect(credited).toHaveLength(1);

  // ── Learning Hours: the goal band, decided by the server ──
  await page.goto('/learning-hours');
  await expect(page.getByRole('heading', { name: /Learning\s*hours/ })).toBeVisible();
  await expect(page.getByText(/Everything below is shown/)).toContainText('monthly');
  const goalCard = page.locator('[data-slot="card"]').filter({ hasText: /Goal for/ }).first();
  await expect(goalCard).toContainText('Goal Reached!');
  await expect(goalCard).toContainText(/10h of \d+(\.\d+)?h/);
  await page.getByRole('button', { name: 'Yearly', exact: true }).click();
  await expect(page.getByText(/Everything below is shown/)).toContainText('yearly');
  await expect(page.locator('[data-slot="card"]').filter({ hasText: /Goal for/ }).first()).toContainText('Behind');

  // ── Surveys & Feedback: the course's form is owed, then submitted ──
  await page.goto('/surveys');
  await expect(page.getByText('Pending course feedback')).toBeVisible();
  const owed = page.locator('[data-slot="card"]').filter({ hasText: course.name });
  await expect(owed).toContainText('Optional');
  await owed.getByRole('button', { name: /Rate course/ }).click();

  const form = page.getByRole('dialog');
  await expect(form).toBeVisible();
  const [tpl] = await db(
    "SELECT id FROM feedback_templates WHERE organization_id = $1 AND key = 'technical'", [A.id],
  );
  const questions = await db(
    'SELECT question_type, prompt FROM feedback_template_questions WHERE template_id = $1 ORDER BY sort_order, id', [tpl.id],
  );
  expect(questions.length).toBeGreaterThan(0);
  for (const q of questions) {
    const block = form.locator('p').filter({ hasText: q.prompt }).first().locator('xpath=..');
    if (q.question_type === 'rating') await block.getByRole('button', { name: '4 out of 5' }).click();
    else if (['likert', 'choice', 'yesno'].includes(q.question_type)) await block.getByRole('button').first().click();
    else await block.locator('textarea').fill('Clear examples, would recommend.');
  }
  await form.getByRole('button', { name: 'Send feedback' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText('Already submitted')).toBeVisible();
  await expect(page.locator('[data-slot="card"]').filter({ hasText: course.name })).toContainText('Submitted');
  const saved = await db('SELECT template_id, answers FROM course_feedback WHERE user_id = $1 AND course_id = $2', [learner.id, course.id]);
  expect(saved).toHaveLength(1);
  expect(saved[0].template_id).toBe(tpl.id);
  expect(Object.keys(saved[0].answers).length).toBe(questions.length);
  await page.context().close();

  // ── The public verify page, signed out ──
  const [cert] = await dbUntil(
    'SELECT certificate_code FROM certificates WHERE user_id = $1 AND course_id = $2',
    [learner.id, course.id], (r) => r.length === 1, 'certificate issued',
  );
  const anon = await browser.newContext();
  const pub = await anon.newPage();
  await pub.goto(`/verify/${cert.certificate_code}`);
  await expect(pub.getByText(/Verified .* this certificate is genuine/)).toBeVisible();
  await expect(pub.getByRole('heading', { name: course.name })).toBeVisible();
  await expect(pub.getByText('Awarded to').locator('xpath=..')).toContainText(learner.name);
  await expect(pub.getByText(cert.certificate_code, { exact: true })).toBeVisible();

  await pub.goto('/verify/EDSNOTREAL0');
  await expect(pub.getByText('No certificate found')).toBeVisible();
  await expect(pub.getByText(/No certificate matches the ID EDSNOTREAL0/)).toBeVisible();
  await expect(pub.getByText('Awarded to')).toBeHidden();
  await anon.close();
});
