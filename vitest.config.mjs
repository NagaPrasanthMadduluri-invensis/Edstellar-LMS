import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

// Client unit tests (Vitest + React Testing Library). Co-located as
// *.test.js / *.test.jsx next to the lib helper or component under test.
export default defineConfig({
  plugins: [react()],
  // Mirror the Next `@/*` -> `./*` alias so lib imports resolve in tests.
  resolve: { alias: { '@': root } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['{lib,components,hooks}/**/*.test.{js,jsx}'],
    coverage: { provider: 'v8', reportsDirectory: './coverage' },
    // The gate must not fail a package that has no tests yet.
    passWithNoTests: true,
  },
});
