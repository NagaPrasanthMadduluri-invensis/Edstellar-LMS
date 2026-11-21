/**
 * Helpers shared by worker-2's journeys (people, team, privacy, community,
 * platform, AI). Kept beside support.mjs, never inside it.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { expect, db, signIn } from './support.mjs';
import { RUNTIME_DIR } from '../playwright.config.mjs';

export const PASSWORD = 'E2e-Passw0rd!';

/** The server's password format: scrypt(password, hexSalt, 64) as `<hex>.<salt>`. */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${crypto.scryptSync(password, salt, 64).toString('hex')}.${salt}`;
}

export function uniq(prefix = 'T') {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A throwaway person created the way an admin creates one (the API), then
 * given a known password in the database so a browser can sign in as them.
 */
export async function newPerson(adminApi, { slug, roleId, first = uniq('T'), last = 'Temp', manager_id } = {}) {
  const email = `${first.toLowerCase()}@${slug}.e2e.test`;
  const res = await adminApi.post('/api/admin/users', {
    first_name: first, last_name: last, email, role_id: roleId, department: 'Engineering',
    ...(manager_id ? { manager_id } : {}),
  });
  if (res.status() >= 300) throw new Error(`newPerson ${email}: ${res.status()} ${await res.text()}`);
  const [u] = await db('UPDATE users SET password = $2 WHERE email = $1 RETURNING id', [email, hashPassword(PASSWORD)]);
  return { id: u.id, email, password: PASSWORD, firstName: first, lastName: last };
}

/** A fresh browser context signed in as `who`, so several people can act in one test. */
export async function as(browser, who) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, who);
  return page;
}

/**
 * The API as whoever is signed in on `page` (its cookie), for setup and
 * ground-truth reads without spending another sign-in on the rate limit.
 */
export function apiFrom(page) {
  const env = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'env.json'), 'utf8'));
  const base = `http://localhost:${env.PORT}`;
  const r = page.context().request;
  return {
    get: (p) => r.get(`${base}${p}`),
    post: (p, data) => r.post(`${base}${p}`, { data }),
    patch: (p, data) => r.patch(`${base}${p}`, { data }),
  };
}

/** Open the bell and expect a notification whose title matches. */
export async function expectInBell(page, title) {
  await page.getByRole('button', { name: /^Notifications/ }).click();
  await expect(page.getByRole('menu').getByText(title).first()).toBeVisible();
  await page.keyboard.press('Escape');
}

/** Pick an option in a Base UI Select opened from `trigger`. */
export async function choose(page, trigger, option) {
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

/** A minimal, valid one-page PDF on disk (for upload fields). */
export function tinyPdf(name = 'certificate.pdf') {
  const dir = path.join(RUNTIME_DIR, 'e2e-files');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  const objs = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [];
  for (const o of objs) { offsets.push(body.length); body += o; }
  const xref = body.length;
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, '0')} 00000 n \n`;
  body += `trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(file, body);
  return file;
}
