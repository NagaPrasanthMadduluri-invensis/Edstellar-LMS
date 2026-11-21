/**
 * Course lifecycle (CONTEXT.md §18.2, §18.3): an admin builds a course on the
 * Course page (module, a link lesson with a declared duration), publishes it
 * and assigns it from Assign Learning; the learner finds it in My Courses,
 * completes the lesson, sees the course Completed and holds a certificate.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, choose, dbUntil, newLearner, pageAs, setSwitch, uniq } from './helpers-1.mjs';

test('admin builds, publishes and assigns a course; the learner completes it and holds a certificate', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'Cl');
  const courseName = uniq('Lifecycle course');
  const moduleTitle = 'Getting started';
  const lessonTitle = 'Read the field guide';

  // ── Admin: create a draft course in the Course Library ──
  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/courses');
  await admin.getByRole('button', { name: 'Add course' }).click();
  const create = admin.getByRole('dialog');
  await expect(create.getByRole('heading', { name: 'Add course' })).toBeVisible();
  await create.getByPlaceholder('e.g. Data Analytics Fundamentals').fill(courseName);
  await choose(admin, create.getByRole('combobox').first(), 'Technical');
  // Start as a draft: published once it has content.
  const publishedRow = create.getByText('Draft courses are hidden from learners.').locator('xpath=../..');
  await setSwitch(publishedRow.getByRole('switch'), false);
  await create.getByRole('button', { name: 'Create course' }).click();
  await expect(create).toBeHidden();

  const [course] = await dbUntil('SELECT id, public_id, is_active FROM courses WHERE name = $1', [courseName], (r) => r.length === 1);
  expect(course.is_active).toBeFalsy();

  // ── Admin: open the Course page from the library card ──
  await admin.getByPlaceholder('Search title, category, tags…').fill(courseName);
  await admin.getByRole('button', { name: 'Manage modules & lessons' }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/courses/${course.public_id}$`));
  await expect(admin.getByRole('heading', { name: courseName })).toBeVisible();
  await expect(admin.getByText('Draft', { exact: true })).toBeVisible();

  // Module
  await admin.getByRole('button', { name: 'Modules', exact: true }).click();
  await admin.getByRole('button', { name: 'Add module' }).click();
  const modDialog = admin.getByRole('dialog');
  await modDialog.getByPlaceholder('e.g. Planning & Scheduling').fill(moduleTitle);
  await modDialog.getByRole('button', { name: 'Add module' }).click();
  await expect(modDialog).toBeHidden();
  await expect(admin.getByText(moduleTitle).first()).toBeVisible();

  // Link lesson with a declared duration, placed in the module
  await admin.getByRole('button', { name: 'Lessons', exact: true }).click();
  await admin.getByRole('button', { name: 'Add lesson' }).click();
  const lesDialog = admin.getByRole('dialog');
  await lesDialog.getByPlaceholder('e.g. Introduction to phishing').fill(lessonTitle);
  await choose(admin, lesDialog.getByRole('combobox').nth(0), 'External link');
  await lesDialog.getByPlaceholder('e.g. 10').fill('15');
  await lesDialog.getByPlaceholder('https://…').fill('https://example.test/field-guide');
  await choose(admin, lesDialog.getByRole('combobox').nth(1), moduleTitle);
  await lesDialog.getByRole('button', { name: 'Add lesson' }).click();
  await expect(lesDialog).toBeHidden();
  await expect(admin.getByText(lessonTitle).first()).toBeVisible();

  const lessons = await db(
    'SELECT l.id, l.content_type, l.duration_minutes, m.title FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE l.course_id = $1',
    [course.id],
  );
  expect(lessons).toEqual([expect.objectContaining({ content_type: 'link', duration_minutes: 15, title: moduleTitle })]);

  // ── Admin: publish from the library card ──
  await admin.goto('/admin/courses');
  await admin.getByPlaceholder('Search title, category, tags…').fill(courseName);
  await admin.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(admin.getByText('Published', { exact: true }).first()).toBeVisible();
  await dbUntil('SELECT is_active FROM courses WHERE id = $1', [course.id], (r) => Boolean(r[0]?.is_active), 'course published');

  // ── Admin: Assign Learning to one person ──
  await admin.goto('/admin/assign-learning');
  await choose(admin, admin.getByRole('combobox').nth(1), courseName);
  await admin.getByRole('button', { name: 'Add', exact: true }).click();
  await admin.getByRole('button', { name: 'Specific people' }).click();
  await admin.getByPlaceholder('Search name, email, department…').fill(learner.firstName);
  await admin.getByRole('checkbox', { name: `Select ${learner.firstName} ${learner.lastName}` }).check();
  await admin.getByRole('button', { name: 'Assign learning' }).click();
  await admin.getByRole('alertdialog').getByRole('button', { name: 'Assign' }).click();
  await expect(admin.getByText(/Assigned\s*1\s*item to\s*1\s*learner/)).toBeVisible();
  await dbUntil('SELECT 1 FROM user_course_assignments WHERE user_id = $1 AND course_id = $2', [learner.id, course.id], (r) => r.length === 1, 'assignment row');
  await admin.context().close();

  // ── Learner: My Courses -> Course page -> lesson -> complete ──
  const page = await pageAs(browser, learner);
  await page.goto('/my-courses');
  const card = page.getByRole('link', { name: new RegExp(courseName) });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/my-courses/${course.public_id}$`));
  await expect(page.getByRole('heading', { name: courseName })).toBeVisible();
  await expect(page.getByText('Not started', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: new RegExp(lessonTitle) }).first().click();
  await expect(page).toHaveURL(new RegExp(`/my-courses/${course.public_id}/lessons/`));
  await page.getByRole('button', { name: 'Save & finish course' }).first().click();

  // Back on the Course page, the course reads Completed.
  await expect(page).toHaveURL(new RegExp(`/my-courses/${course.public_id}$`));
  await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('You have completed this course')).toBeVisible();

  const done = await db('SELECT 1 FROM user_lesson_completions WHERE user_id = $1 AND lesson_id = $2', [learner.id, lessons[0].id]);
  expect(done).toHaveLength(1);

  // My Courses shows it complete at 100%.
  await page.goto('/my-courses');
  const doneCard = page.getByRole('link', { name: new RegExp(courseName) });
  await expect(doneCard).toContainText('Completed');
  await expect(doneCard).toContainText('100%');

  // The certificate was issued (best effort, so poll) and is on Certificates.
  const [cert] = await dbUntil(
    'SELECT certificate_code, organization_id FROM certificates WHERE user_id = $1 AND course_id = $2',
    [learner.id, course.id], (r) => r.length === 1, 'certificate issued',
  );
  expect(cert.organization_id).toBe(A.id);
  await page.goto('/certifications');
  await expect(page.getByText(courseName).first()).toBeVisible();

  await page.context().close();
});

test('"Edit course" on the Course page opens the course editor', async ({ browser }) => {
  // course-manager.jsx links to /admin/courses?edit=<courseId>, where courseId is
  // the URL's public_id (a UUID); course-library.jsx matches it to the course.
  const A = fx().A;
  const name = uniq('Edit link course');
  const created = await (await api(A.admin)).post('/api/admin/courses', { name, category: 'Technical' });
  const [row] = await db('SELECT public_id FROM courses WHERE id = $1', [created.course.id]);
  const admin = await pageAs(browser, A.admin);
  await admin.goto(`/admin/courses/${row.public_id}`);
  await admin.getByRole('link', { name: 'Edit course' }).click();
  await expect(admin.getByRole('dialog').getByRole('heading', { name: 'Edit course' })).toBeVisible();
  await admin.context().close();
});
