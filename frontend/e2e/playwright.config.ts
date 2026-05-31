import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Pipelined E2E tests.
 *
 * Runs against a local backend (http://localhost:8000) and frontend (http://localhost:5173).
 * In CI, reporter is 'github'; locally, 'html' for interactive reports.
 * Retries: 2 in CI, 0 locally. Artifacts (screenshots/videos) on failure.
 */
export default defineConfig({
  testDir: './tests',

  /* Base URL for all tests — from env or default to Vite dev server. */
  baseURL: process.env.BASE_URL || 'http://localhost:5173',

  /* Fail on console errors / warnings (optional; set to false to ignore). */
  forbidOnly: !!process.env.CI,

  /* Retry strategy. */
  retries: process.env.CI ? 2 : 0,

  /* Workers: 1 in CI to avoid race conditions, default locally. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporters. */
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report' }]]
    : [['html', { outputFolder: 'playwright-report' }]],

  /* Shared timeout for all tests. */
  timeout: 30 * 1000,

  /* Expect assertions timeout. */
  expect: { timeout: 10 * 1000 },

  /* Global test setup (none needed here, but can hook auth if needed). */
  globalSetup: undefined,

  use: {
    /* Base URL for navigation. */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    /* Capture artifacts on failure. */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Trace on failure for debugging. */
    trace: 'on-first-retry',
  },

  /* Define projects — one Chromium project to keep CI fast. */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['desktop-chrome'],
        /* Headless in CI, non-headless locally for debugging. */
        headless: process.env.CI ? true : true,
      },
    },
  ],

  /* Output directories. */
  outputDir: 'test-results/',

  /* Web server (optional; can start frontend in CI via GitHub Actions). */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
