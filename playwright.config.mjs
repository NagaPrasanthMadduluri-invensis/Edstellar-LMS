/**
 * Browser journeys (client/e2e). Drives the REAL web app against a REAL API in
 * a separate world: its own Postgres (Docker locally, a service container in
 * CI), its own API on :3201 (server/test/web-api.ts) and its own production
 * build of this app on :3200 (built into .next-e2e). The dev servers on
 * :3000/:3001 and the dev database are never touched.
 *
 * Uses the installed Google Chrome (channel: 'chrome'): no browser download.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = process.env.E2E_SERVER_DIR || path.join(HERE, '..', 'server');
const API_PORT = process.env.E2E_API_PORT || '3201';
const WEB_PORT = process.env.E2E_WEB_PORT || '3200';
export const RUNTIME_DIR = path.join(SERVER_DIR, 'test', process.env.E2E_WEB_RUNTIME || 'runtime-web');

const apiEnv = {
  E2E_RUNTIME_DIR: path.relative(SERVER_DIR, RUNTIME_DIR),
  E2E_COVERAGE_DIR: `test/.coverage-${process.env.E2E_WEB_RUNTIME || 'runtime-web'}`,
  E2E_DB_PORT: process.env.E2E_DB_PORT || '5438',
  E2E_FAKE_AI_PORT: process.env.E2E_FAKE_AI_PORT || '3298',
  E2E_API_PORT: API_PORT,
  E2E_WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
  ...(process.env.E2E_DATABASE_URL ? { E2E_DATABASE_URL: process.env.E2E_DATABASE_URL } : {}),
};

export default defineConfig({
  testDir: './e2e',
  // Per-run output (traces, screenshots) so parallel runs never clear each other's.
  outputDir: process.env.E2E_OUTPUT_DIR || 'test-results',
  testMatch: /.*\.spec\.mjs$/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // Prepares the e2e world (database, fixtures, fake AI) and serves the API.
      command: 'npm run -s e2e:web-api',
      cwd: SERVER_DIR,
      url: `http://localhost:${API_PORT}/api/health`,
      env: { ...process.env, ...apiEnv },
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npx next build --no-lint && npx next start -p ${WEB_PORT}`,
      cwd: HERE,
      url: `http://localhost:${WEB_PORT}/login`,
      env: {
        ...process.env,
        NEXT_DIST_DIR: process.env.E2E_NEXT_DIST || '.next-e2e',
        NEXT_PUBLIC_SERVER_URL: `http://localhost:${API_PORT}`,
        SERVER_API_URL: `http://127.0.0.1:${API_PORT}`,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      timeout: 600_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
