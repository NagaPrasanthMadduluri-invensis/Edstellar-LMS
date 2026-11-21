/**
 * Helpers for journey worker 1 (course lifecycle, assessment, learning path,
 * sessions, catalogue waitlist).
 *
 * - `api(who)` is an API session in its OWN cookie jar (the `request` fixture
 *   shares one jar per test, so two people would overwrite each other). Admin
 *   sessions are cached per worker process: every admin login spends a TOTP
 *   verify from the per-IP budget (30 / 15 min), so they are signed in once.
 * - `newLearner(org)` creates a throwaway learner through the real admin API
 *   and gives them a known password (the server's scrypt format), so a journey
 *   never changes a fixture person and always starts from a clean record.
 * - `pageAs(browser, who)` opens a browser page signed in as `who`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { request as pwRequest, expect } from '@playwright/test';
import { RUNTIME_DIR } from '../playwright.config.mjs';
import { db, fx, signIn } from './support.mjs';

const require = createRequire(import.meta.url);
const SERVER_DIR = path.join(RUNTIME_DIR, '..', '..');
export const PASSWORD = 'E2e-Passw0rd!';

export const uniq = (p) => `${p} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function apiBase() {
  const env = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'env.json'), 'utf8'));
  return `http://localhost:${env.PORT}`;
}

function totp(secret) {
  const { authenticator } = require(path.join(SERVER_DIR, 'node_modules', 'otplib'));
  return authenticator.generate(secret);
}

const apiCache = new Map();

/** An API session for one person, in its own cookie jar. Throws on a failed call. */
export async function api(who) {
  if (who.totp && apiCache.has(who.email)) return apiCache.get(who.email);
  const base = apiBase();
  const ctx = await pwRequest.newContext({ baseURL: base });
  const login = await ctx.post('/api/auth/login', { data: { email: who.email, password: who.password } });
  if (!login.ok()) throw new Error(`login ${who.email}: ${login.status()} ${await login.text()}`);
  const body = await login.json();
  if (body.mfa_required) {
    const v = await ctx.post('/api/auth/mfa/verify', { data: { mfa_token: body.mfa_token, code: totp(who.totp) } });
    if (!v.ok()) throw new Error(`mfa ${who.email}: ${v.status()} ${await v.text()}`);
  }
  const call = (method) => async (p, data) => {
    const r = await ctx.fetch(p, { method, ...(data !== undefined ? { data } : {}) });
    const text = await r.text();
    if (r.status() >= 300) throw new Error(`${method} ${p}: ${r.status()} ${text}`);
    return text ? JSON.parse(text) : {};
  };
  const client = { ctx, get: call('GET'), post: call('POST'), put: call('PUT'), patch: call('PATCH'), del: call('DELETE') };
  if (who.totp) apiCache.set(who.email, client);
  return client;
}

/** scrypt(password, salt, 64) stored as `<keyHex>.<saltHex>` (password.util.ts). */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${crypto.scryptSync(pw, salt, 64).toString('hex')}.${salt}`;
}

/** A throwaway learner in an organization, created through the real admin API. */
export async function newLearner(orgKey = 'A', first = 'Tmp') {
  const org = fx()[orgKey];
  const admin = await api(org.admin);
  const tag = Math.random().toString(36).slice(2, 8);
  const firstName = `${first}${tag}`;
  const email = `w1-${tag}-${Date.now().toString(36)}@${org.slug}.e2e.test`;
  await admin.post('/api/admin/users', { first_name: firstName, last_name: 'Journey', email, role_id: org.roles.learner, department: 'Engineering' });
  const [u] = await db('UPDATE users SET password = $2 WHERE email = $1 RETURNING id', [email, hashPassword(PASSWORD)]);
  return { id: u.id, email, password: PASSWORD, firstName, lastName: 'Journey', name: `${firstName} Journey` };
}

/**
 * A new browser page signed in as `who`. A learner or trainer signs in through
 * the real login page. An admin reuses the cached API session's cookie (the
 * same HttpOnly `lms_token` the login page would set): each admin sign-in
 * spends a TOTP verify and a per-account login attempt, and the sign-in page
 * itself is covered by sign-in-by-role.spec.mjs.
 */
export async function pageAs(browser, who) {
  if (who.totp) {
    const { ctx, get, post } = await api(who);
    // The privacy acknowledgement the login page would have walked them through.
    const me = await get('/api/auth/me');
    if ((me.user ?? me).consent_required) await post('/api/auth/consent', {});
    const context = await browser.newContext({ storageState: await ctx.storageState() });
    return context.newPage();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, who);
  return page;
}

/** Pick an option in a shadcn Select whose trigger is `trigger`. */
export async function choose(page, trigger, option) {
  await trigger.click();
  await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click();
}

/** Poll the database until `ok(rows)` holds (best-effort side effects). */
export async function dbUntil(sql, params, ok, label = sql) {
  await expect.poll(async () => ok(await db(sql, params)), { message: label, timeout: 15_000 }).toBe(true);
  return db(sql, params);
}

/**
 * SETUP ONLY: a published course with one module and `lessons` link lessons
 * (10 minutes each), built through the admin API, optionally assigned.
 */
export async function setupCourse(orgKey, { name = uniq('Setup course'), lessons = 1, assignTo = [], extra = {} } = {}) {
  const admin = await api(fx()[orgKey].admin);
  const c = await admin.post('/api/admin/courses', { name, category: 'Technical', ...extra });
  const id = c.course.id;
  const m = await admin.post(`/api/admin/courses/${id}/modules`, { title: 'Module 1' });
  const lessonIds = [];
  for (let i = 0; i < lessons; i++) {
    const l = await admin.post(`/api/admin/modules/${m.module.id}/lessons`, {
      title: `Lesson ${i + 1}`, content_type: 'link', content_url: `https://example.test/l${i + 1}`, duration_minutes: 10,
    });
    lessonIds.push(l.lesson.id);
  }
  if (assignTo.length) await admin.post(`/api/admin/courses/${id}/assignments/bulk`, { user_ids: assignTo });
  const [row] = await db('SELECT public_id FROM courses WHERE id = $1', [id]);
  return { id, publicId: row.public_id, moduleId: m.module.id, lessonIds, name };
}

/** Put a switch into the wanted state (re-checks, since a dialog may still be settling). */
export async function setSwitch(sw, on) {
  await expect(async () => {
    if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', String(on), { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}
