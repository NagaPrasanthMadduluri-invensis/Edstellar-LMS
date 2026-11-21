/**
 * Shared helpers for the browser journeys.
 *
 *   import { test, expect, fx, signIn } from './support.mjs';
 *   test('...', async ({ page }) => { await signIn(page, fx().A.learner); ... });
 *
 * Fixture people come from the e2e world the API prepared
 * (server/test/runtime-web/fixtures.json); admins sign in with real TOTP.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test as base, expect } from '@playwright/test';
import { RUNTIME_DIR } from '../playwright.config.mjs';

const require = createRequire(import.meta.url);
const SERVER_DIR = path.join(RUNTIME_DIR, '..', '..');

/**
 * Every journey's `test`. It records each page URL the browser lands on (in
 * every context, including ones a helper opens with browser.newContext) to
 * <runtime>/visited.jsonl, so `journey-presence` can list pages no journey
 * reaches. Recording never fails a test.
 */
const VISITED = path.join(RUNTIME_DIR, 'visited.jsonl');
function track(context) {
  const onPage = (page) =>
    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame()) return;
      try {
        const u = new URL(frame.url());
        if (u.protocol.startsWith('http')) fs.appendFileSync(VISITED, JSON.stringify({ p: u.pathname }) + '\n');
      } catch {}
    });
  context.pages().forEach(onPage);
  context.on('page', onPage);
}
export const test = base.extend({
  context: async ({ context }, use) => {
    track(context);
    await use(context);
  },
  browser: [
    async ({ browser }, use) => {
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args) => {
        const c = await newContext(...args);
        track(c);
        return c;
      };
      await use(browser);
    },
    { scope: 'worker' },
  ],
});
export { expect };

export function fx() {
  return JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fixtures.json'), 'utf8'));
}

function totp(secret) {
  const { authenticator } = require(path.join(SERVER_DIR, 'node_modules', 'otplib'));
  return authenticator.generate(secret);
}

/**
 * Sessions already signed in during this run, by email. The API allows 10
 * sign-ins per account per 15 minutes (a real product rule), and a full run
 * signs the same fixture admin in more often than that, so a person's session
 * cookie is reused across journeys. If it no longer works (signed out, or a
 * role change bumped perm_version), the real login page is used again.
 */
const SESSIONS = new Map();

/**
 * Sign in through the real login page (and the code step for an admin).
 * `{ fresh: true }` always uses the login form (sign-in-by-role.spec.mjs).
 */
export async function signIn(page, who, { fresh = false } = {}) {
  if (!fresh && SESSIONS.has(who.email)) {
    await page.context().addCookies(SESSIONS.get(who.email));
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    if (!/\/login(\?|$)/.test(new URL(page.url()).pathname)) {
      await passConsent(page);
      return;
    }
    await page.context().clearCookies();
  }
  await page.goto('/login');
  await page.locator('#email').fill(who.email);
  await page.locator('#password').fill(who.password);
  await page.locator('button[type="submit"]').click();
  if (who.totp) {
    await page.locator('#mfa-code').fill(totp(who.totp));
    await page.locator('button[type="submit"]').click();
  }
  await page.waitForURL((u) => !/\/login(\?|$)/.test(u.pathname + u.search), { timeout: 30_000 });
  SESSIONS.set(who.email, await page.context().cookies());
  await passConsent(page);
}

/** A first sign-in may owe the privacy acknowledgement. */
async function passConsent(page) {
  if (/\/consent/.test(page.url())) {
    const accept = page.getByRole('button', { name: /continue|acknowledge|accept|agree/i }).first();
    const box = page.getByRole('checkbox').first();
    if (await box.isVisible().catch(() => false)) await box.check().catch(() => {});
    await accept.click();
    await page.waitForURL((u) => !/\/consent/.test(u.pathname), { timeout: 30_000 });
  }
}

/** Direct database access to the e2e world (ground truth checks). */
export async function db(text, params = []) {
  const { Client } = require(path.join(SERVER_DIR, 'node_modules', 'pg'));
  const env = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'env.json'), 'utf8'));
  const c = new Client({ connectionString: env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(text, params)).rows;
  } finally {
    await c.end();
  }
}

/** Call the e2e API as a fixture person (cookie session), for setup steps. */
export async function apiAs(request, who) {
  const env = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'env.json'), 'utf8'));
  const base = `http://localhost:${env.PORT}`;
  const login = await request.post(`${base}/api/auth/login`, { data: { email: who.email, password: who.password } });
  const body = await login.json();
  if (body.mfa_required) await request.post(`${base}/api/auth/mfa/verify`, { data: { mfa_token: body.mfa_token, code: totp(who.totp) } });
  return {
    get: (p) => request.get(`${base}${p}`),
    post: (p, data) => request.post(`${base}${p}`, { data }),
    put: (p, data) => request.put(`${base}${p}`, { data }),
    patch: (p, data) => request.patch(`${base}${p}`, { data }),
  };
}
