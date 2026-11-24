/**
 * Admin course preview: an admin opens any course, draft or published, and sees
 * it as a learner does (course page, lessons with the playlist, a gradable
 * assessment), and nothing is recorded.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, pageAs, uniq } from './helpers-1.mjs';

test('admin previews a draft course as a learner and nothing is recorded', async ({ browser }) => {
  const A = fx().A;
  const admin = await api(A.admin);
  const name = uniq('Preview course');
  const question = `Capital of France? ${uniq('Q')}`;

  // ── Setup (not the subject): a DRAFT course, two lessons, one live assessment ──
  const { course } = await admin.post('/api/admin/courses', { name, category: 'Technical', is_active: false });
  const { module } = await admin.post(`/api/admin/courses/${course.id}/modules`, { title: 'Module 1' });
  const lessonIds = [];
  for (const n of [1, 2]) {
    const l = await admin.post(`/api/admin/modules/${module.id}/lessons`, {
      title: `Lesson ${n}`, content_type: 'link', content_url: `https://example.test/l${n}`, duration_minutes: 10,
    });
    lessonIds.push(l.lesson.id);
  }
  const { assessment } = await admin.post(`/api/admin/courses/${course.id}/assessments`, { title: uniq('Preview check') });
  await admin.post(`/api/admin/assessments/${assessment.id}/questions`, {
    question_text: question, question_type: 'mcq',
    options: [{ option_text: 'Paris', is_correct: true }, { option_text: 'Lyon' }],
  });
  await admin.post(`/api/admin/assessments/${assessment.id}/attach`);
  const [{ public_id: publicId }] = await db('SELECT public_id FROM courses WHERE id = $1', [course.id]);

  // ── The admin opens the course and chooses "Preview as learner" ──
  const page = await pageAs(browser, A.admin);
  await page.goto(`/admin/courses/${publicId}`);
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.getByRole('link', { name: 'Preview as learner' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/courses/${publicId}/preview$`));

  // The banner says what this is, and that the course is still a draft.
  await expect(page.getByText('Nothing you do here is recorded.')).toBeVisible();
  await expect(page.getByTestId('preview-course-state')).toHaveText('Draft');
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('Complete all lessons to unlock')).toHaveCount(0);

  // ── Lesson 1: its content and the playlist, then on to lesson 2 ──
  await page.getByRole('link', { name: /Lesson 1/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/courses/${publicId}/preview/lessons/`));
  await expect(page.getByRole('heading', { name: 'Lesson 1' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Lesson 2/ })).toBeVisible();
  await page.getByRole('button', { name: 'Next lesson' }).first().click();
  await expect(page.getByRole('heading', { name: 'Lesson 2' })).toBeVisible();

  // ── The assessment can be taken and is graded ──
  await page.getByRole('button', { name: 'Back to Course', exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/courses/${publicId}/preview$`));
  await page.getByRole('link', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/preview\/assessments\//);
  await expect(page.getByText(question)).toBeVisible();
  await page.getByRole('radio', { name: 'Paris' }).click();
  await page.getByRole('button', { name: 'Submit Assessment' }).click();
  await expect(page.getByText('Congratulations!')).toBeVisible();

  // ── Nothing was written for the admin ──
  const done = await db('SELECT 1 FROM user_lesson_completions WHERE user_id = $1', [A.admin.id]);
  expect(done).toHaveLength(0);
  const attempts = await db('SELECT 1 FROM user_assessment_attempts WHERE user_id = $1', [A.admin.id]);
  expect(attempts).toHaveLength(0);

  // ── The way back: the banner returns to the course editor ──
  await page.getByRole('link', { name: 'Back to course editor' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/courses/${publicId}$`));
  await page.context().close();
});
