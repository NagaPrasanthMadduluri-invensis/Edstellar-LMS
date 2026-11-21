/**
 * Learning paths (CONTEXT.md §18.4): an admin builds a two-step path in
 * Learning paths and assigns it from Assign Learning; the learner sees step 2
 * Locked until step 1 is complete, and the Path gate refuses the step-2 lesson
 * until then.
 */
import { test, expect, fx, db } from './support.mjs';
import { choose, dbUntil, newLearner, pageAs, setupCourse, uniq } from './helpers-1.mjs';

test('a two-step path holds step 2 until step 1 is complete', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'Lp');
  // SETUP: the two published courses the path is built from.
  const step1 = await setupCourse('A', { name: uniq('Path step one') });
  const step2 = await setupCourse('A', { name: uniq('Path step two') });
  const pathTitle = uniq('Onboarding path');

  // ── Admin: create the path ──
  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/journeys');
  await admin.getByRole('button', { name: 'Create path' }).first().click();
  const dlg = admin.getByRole('dialog');
  await dlg.getByPlaceholder('e.g. First-Time Manager Path').fill(pathTitle);
  await dlg.getByPlaceholder('e.g. Certified People Manager').fill('Onboarded');
  await dlg.getByRole('button', { name: 'Create path' }).click();
  await expect(dlg).toBeHidden();

  // ── Admin: add the two courses in order ──
  await admin.getByPlaceholder('Search path title, tag…').fill(pathTitle);
  await expect(admin.getByRole('heading', { name: pathTitle })).toBeVisible();
  await admin.getByRole('button', { name: 'Manage courses' }).click();
  const courses = admin.getByRole('dialog');
  await expect(courses.getByRole('heading', { name: `Courses in ${pathTitle}` })).toBeVisible();
  for (const c of [step1, step2]) {
    await choose(admin, courses.getByRole('combobox'), c.name);
    await courses.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(courses.getByText(c.name)).toBeVisible();
  }
  await courses.getByRole('button', { name: 'Save order' }).click();
  await expect(courses).toBeHidden();

  const [journey] = await db('SELECT id FROM journeys WHERE title = $1', [pathTitle]);
  const steps = await db('SELECT course_id FROM journey_courses WHERE journey_id = $1 ORDER BY sort_order', [journey.id]);
  expect(steps.map((s) => s.course_id)).toEqual([step1.id, step2.id]);

  // ── Admin: assign the path to the learner ──
  await admin.goto('/admin/assign-learning');
  await choose(admin, admin.getByRole('combobox').nth(0), 'Learning path');
  await choose(admin, admin.getByRole('combobox').nth(1), pathTitle);
  await admin.getByRole('button', { name: 'Add', exact: true }).click();
  await admin.getByRole('button', { name: 'Specific people' }).click();
  await admin.getByPlaceholder('Search name, email, department…').fill(learner.firstName);
  await admin.getByRole('checkbox', { name: `Select ${learner.firstName} ${learner.lastName}` }).check();
  await admin.getByRole('button', { name: 'Assign learning' }).click();
  await admin.getByRole('alertdialog').getByRole('button', { name: 'Assign' }).click();
  await expect(admin.getByText(/Assigned\s*1\s*item to\s*1\s*learner/)).toBeVisible();
  await admin.context().close();

  // Both steps were assigned, and BY the path (that is what the gate reads).
  const rows = await dbUntil(
    'SELECT course_id, source_journey_id FROM user_course_assignments WHERE user_id = $1 ORDER BY course_id',
    [learner.id], (r) => r.length === 2, 'path assignments',
  );
  expect(rows.every((r) => r.source_journey_id === journey.id)).toBe(true);

  // ── Learner: open the path; step 2 is Locked ──
  const page = await pageAs(browser, learner);
  await page.goto('/learning-paths');
  await page.getByText(pathTitle).first().click();
  // A step card: the course name, its state chip and its one action (a link, or why it is locked).
  const stepRow = (name) => page.locator('div')
    .filter({ hasText: name })
    .filter({ has: page.getByRole('link').or(page.getByText('Finish the step before this one to unlock it.')) })
    .last();
  await expect(stepRow(step2.name)).toContainText('Locked');
  await expect(stepRow(step2.name)).toContainText('Finish the step before this one to unlock it.');
  await expect(stepRow(step1.name)).not.toContainText('Locked');

  // The gate is enforced, not just drawn: the step-2 lesson refuses to open.
  const [l2] = await db('SELECT public_id FROM lessons WHERE id = $1', [step2.lessonIds[0]]);
  await page.goto(`/my-courses/${step2.publicId}/lessons/${l2.public_id}`);
  await expect(page.getByText('Complete the earlier required courses in this journey first.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save & finish course' })).toHaveCount(0);

  // ── Learner: complete step 1 from the path ──
  await page.goto('/learning-paths');
  await page.getByText(pathTitle).first().click();
  await stepRow(step1.name).getByRole('link').click();
  await expect(page.getByRole('heading', { name: step1.name })).toBeVisible();
  await page.getByRole('link', { name: /Lesson 1/ }).first().click();
  await page.getByRole('button', { name: 'Save & finish course' }).first().click();
  await expect(page.getByText('You have completed this course')).toBeVisible();

  // ── Step 2 is now open ──
  await page.goto('/learning-paths');
  await page.getByText(pathTitle).first().click();
  await expect(stepRow(step1.name)).toContainText('Completed');
  await expect(stepRow(step2.name)).not.toContainText('Locked');
  await expect(stepRow(step2.name).getByRole('link')).toBeVisible();

  await page.goto(`/my-courses/${step2.publicId}/lessons/${l2.public_id}`);
  await expect(page.getByRole('button', { name: 'Save & finish course' }).first()).toBeVisible();
  await page.context().close();
});
