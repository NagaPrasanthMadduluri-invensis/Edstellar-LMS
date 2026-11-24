/**
 * AI Insights (CONTEXT.md §12; BACKEND_STRUCTURE §10.54, §10.56; client rule
 * §10.3.1.41): the learner presses the coach button and gets structured
 * sections from the (fake) model; the admin's page shows the briefing and the
 * real-data Learning Intelligence figures, which match the API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, fx, db } from './support.mjs';
import { as, apiFrom } from './helpers-2.mjs';
import { RUNTIME_DIR } from '../playwright.config.mjs';

function aiRequests() {
  try {
    return fs.readFileSync(path.join(RUNTIME_DIR, 'ai-requests.jsonl'), 'utf8').trim().split('\n').filter(Boolean);
  } catch { return []; }
}

test('learner generates their coach guidance and sees structured sections', async ({ browser }) => {
  const f = fx();
  const learner = await as(browser, f.A.learner);
  await learner.getByRole('link', { name: 'AI Insights' }).click();
  await expect(learner).toHaveURL(/\/ai-insights$/);
  await expect(learner.getByRole('heading', { name: 'Your learning coach' })).toBeVisible();

  const before = aiRequests().length;
  await learner.getByRole('button', { name: /^(Guide my learning|View my guidance)$/ }).click();
  // The model's sections: a heading and points, with the marked words in bold.
  await expect(learner.getByText('e2e sample text with').first()).toBeVisible({ timeout: 30_000 });
  await expect(learner.locator('strong', { hasText: 'bold' }).first()).toBeVisible();

  // Ground truth: the insight is stored for this learner, and what went to the
  // model did not carry their email address.
  const rows = await db(
    "SELECT payload FROM ai_insights WHERE organization_id = $1 AND subject_type = 'learner' AND subject_id = $2",
    [f.A.id, f.A.learner.id],
  );
  expect(rows.length).toBeGreaterThan(0);
  const sent = aiRequests().slice(before).join('\n');
  expect(sent).not.toContain(f.A.learner.email);
});

test('"Courses chosen for you" is matched to the job role: an engineer is never offered a sales course', async ({ browser }) => {
  const f = fx();
  const stamp = Date.now().toString(36);
  const salesCourse = `Consultative Selling ${stamp}`;
  const techCourse = `Secure Coding for Developers ${stamp}`;

  // Setup (not the subject): two new published courses, one built for sales and
  // one for engineers, and the learner's job role set to Software engineer.
  const admin = await as(browser, f.A.admin);
  const adminApi = apiFrom(admin);
  for (const [name, category, tags] of [[salesCourse, 'Soft Skills', 'sales, negotiation'], [techCourse, 'Technical', 'software']]) {
    const r = await adminApi.post('/api/admin/courses', { name, category, tags, is_active: true });
    expect(r.status()).toBeLessThan(300);
  }
  await db("UPDATE users SET job_role = 'Software engineer' WHERE id = $1", [f.A.learner2.id]);

  const learner = await as(browser, f.A.learner2);
  await learner.goto('/ai-insights');
  const before = aiRequests().length;
  await learner.getByRole('button', { name: /^(Find my best courses|View .*)$/ }).first().click();
  await expect(learner.getByText('Matched to your role:')).toBeVisible({ timeout: 30_000 });
  await expect(learner.getByText('Software engineer', { exact: true })).toBeVisible();
  await expect(learner.getByText(techCourse)).toBeVisible();
  await expect(learner.getByText('For your role').first()).toBeVisible();
  await expect(learner.getByText(salesCourse)).toHaveCount(0);

  // Ground truth: the sales course never even reached the model.
  const sent = aiRequests().slice(before).join('\n');
  expect(sent).toContain(techCourse);
  expect(sent).not.toContain(salesCourse);
});

test('admin sees the AI briefing and Learning Intelligence figures', async ({ browser }) => {
  const f = fx();
  const admin = await as(browser, f.A.admin);
  await expect(admin).toHaveURL(/\/admin\/dashboard$/);
  await admin.getByRole('link', { name: 'AI Insights' }).click();
  await expect(admin).toHaveURL(/\/admin\/ai-insights$/);

  // Learning Intelligence: real figures, the same the API computes.
  const intel = await (await apiFrom(admin).get('/api/admin/ai/intelligence')).json();
  await expect(admin.getByRole('heading', { name: 'Learning Intelligence' })).toBeVisible();
  const learnersTile = admin.locator('div.rounded-lg', { has: admin.getByText('Learners', { exact: true }) }).first();
  await expect(learnersTile).toContainText(String(intel.headline?.totalLearners ?? 0));
  await expect(admin.getByRole('heading', { name: 'Learning Health Score' })).toBeVisible();

  // The organisation briefing, generated on request.
  await expect(admin.getByRole('heading', { name: 'Organisation briefing' })).toBeVisible();
  await admin.getByRole('button', { name: /^(Analyze my organisation|View the briefing)$/ }).click();
  await expect(admin.getByText('e2e sample text with').first()).toBeVisible({ timeout: 30_000 });
  const rows = await db(
    "SELECT 1 FROM ai_insights WHERE organization_id = $1 AND subject_type = 'org' AND kind = 'org_overview'",
    [f.A.id],
  );
  expect(rows.length).toBe(1);
});
