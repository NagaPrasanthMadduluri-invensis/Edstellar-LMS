/**
 * Helpers for journey worker 4 (sign-in recovery, two-step setup, change
 * password in every portal, learner record pages, calendars, public pages).
 * Kept beside support.mjs, never inside it.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { request as pwRequest, expect } from '@playwright/test';
import { RUNTIME_DIR } from '../playwright.config.mjs';
import { db, fx } from './support.mjs';
import { api } from './helpers-1.mjs';

const require = createRequire(import.meta.url);
const SERVER_DIR = path.join(RUNTIME_DIR, '..', '..');
export const PASSWORD = 'E2e-Passw0rd!';

export function apiBase() {
  const env = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'env.json'), 'utf8'));
  return `http://localhost:${env.PORT}`;
}

export function totp(secret) {
  const { authenticator } = require(path.join(SERVER_DIR, 'node_modules', 'otplib'));
  return authenticator.generate(secret);
}

/** The server's password format: scrypt(password, hexSalt, 64) as `<hex>.<salt>`. */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${crypto.scryptSync(pw, salt, 64).toString('hex')}.${salt}`;
}

const tag = () => Math.random().toString(36).slice(2, 8);

/**
 * A throwaway person of any role in a tenant org, created the way an admin
 * creates one (the admin API), then given a known password.
 */
export async function newPersonAs(orgKey, roleKey, first = 'W4') {
  const org = fx()[orgKey];
  const admin = await api(org.admin);
  const firstName = `${first}${tag()}`;
  const email = `w4-${firstName.toLowerCase()}-${Date.now().toString(36)}@${org.slug}.e2e.test`;
  await admin.post('/api/admin/users', {
    first_name: firstName, last_name: 'Journey', email, role_id: org.roles[roleKey], department: 'Engineering',
  });
  const [u] = await db('UPDATE users SET password = $2 WHERE email = $1 RETURNING id', [email, hashPassword(PASSWORD)]);
  return { id: u.id, email, password: PASSWORD, firstName, lastName: 'Journey', name: `${firstName} Journey` };
}

/**
 * A throwaway platform admin (the platform org's admin role), written the way
 * create-platform-admin does, with an authenticator enrolled through the real
 * two-step API so the browser can sign in with a TOTP like any admin.
 */
export async function newPlatformAdmin() {
  const platformId = fx().platform.id;
  const [role] = await db("SELECT id FROM roles WHERE organization_id = $1 AND key = 'admin'", [platformId]);
  const firstName = `Plat${tag()}`;
  const email = `w4-${firstName.toLowerCase()}@platform.e2e.test`;
  const [u] = await db(
    "INSERT INTO users (first_name, last_name, email, password, role, organization_id, role_id) VALUES ($1,'Journey',$2,$3,'admin',$4,$5) RETURNING id",
    [firstName, email, hashPassword(PASSWORD), platformId, role.id],
  );
  const ctx = await pwRequest.newContext({ baseURL: apiBase() });
  try {
    const login = await ctx.post('/api/auth/login', { data: { email, password: PASSWORD } });
    if (!login.ok()) throw new Error(`platform login: ${login.status()} ${await login.text()}`);
    const setup = await ctx.post('/api/auth/mfa/setup', { data: { method: 'totp' } });
    if (!setup.ok()) throw new Error(`platform mfa setup: ${setup.status()} ${await setup.text()}`);
    const { secret } = await setup.json();
    const en = await ctx.post('/api/auth/mfa/enable', { data: { code: totp(secret) } });
    if (!en.ok()) throw new Error(`platform mfa enable: ${en.status()} ${await en.text()}`);
    return { id: u.id, email, password: PASSWORD, firstName, totp: secret };
  } finally {
    await ctx.dispose();
  }
}

/**
 * Whether `password` signs `email` in, asked of the real login endpoint in a
 * fresh cookie jar. True when the API accepts it (with or without a second
 * step still owed), false on a refusal.
 */
export async function passwordWorks(email, password) {
  const ctx = await pwRequest.newContext({ baseURL: apiBase() });
  try {
    const r = await ctx.post('/api/auth/login', { data: { email, password } });
    return r.ok();
  } finally {
    await ctx.dispose();
  }
}

/** Today's date in this machine's local time, as YYYY-MM-DD. */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * A new admin's first sign-in through the real pages: password, then the
 * owed gates in whatever order the app presents them (the privacy notice and
 * the two-step setup with an authenticator), ending in the admin portal.
 * Returns the authenticator secret the setup page showed.
 */
export async function firstAdminSignIn(page, admin, { onSetupPage } = {}) {
  await page.goto('/login');
  await page.locator('#email').fill(admin.email);
  await page.locator('#password').fill(admin.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => /\/(consent|mfa-setup)$/.test(u.pathname));
  if (/\/consent$/.test(new URL(page.url()).pathname)) {
    await page.getByRole('button', { name: 'I have read this notice, continue' }).click();
  }
  await expect(page).toHaveURL(/\/mfa-setup$/);
  await expect(page.getByText('Set up two-step sign-in')).toBeVisible();
  if (onSetupPage) await onSetupPage();
  await page.getByRole('button', { name: 'Authenticator app' }).click();
  await expect(page.getByRole('img', { name: 'Authenticator QR code' })).toBeVisible();
  const secret = (await page.getByText('Or enter this key manually').locator('xpath=following-sibling::*[1]').innerText()).trim();
  const enable = page.getByRole('button', { name: 'Enable' });
  await expect(enable).toBeDisabled();
  await page.getByLabel('6-digit code').fill(totp(secret));
  await enable.click();
  await expect(page.getByText('Save these recovery codes now.')).toBeVisible();
  await page.getByRole('button', { name: 'I have saved them' }).click();
  await page.waitForURL((u) => !/\/mfa-setup/.test(u.pathname));
  if (/\/consent$/.test(new URL(page.url()).pathname)) {
    await page.getByRole('button', { name: 'I have read this notice, continue' }).click();
  }
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  return secret;
}
