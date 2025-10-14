import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * Feature 015: Dashboard Canvas System
 *
 * Prerequisites:
 * - Backend running: docker-compose up
 * - Frontend dev server: npm run dev (from frontend/)
 * - Keycloak: http://localhost:8080
 * - Frontend: http://localhost:3000
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI, // Fail CI if test.only is left in
  retries: process.env.CI ? 2 : 0, // Retry on CI
  workers: process.env.CI ? 1 : 1, // Single worker to avoid state conflicts
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Optionally run dev server before tests (if not already running)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },

  // Output directories
  outputDir: 'tests/screenshots',
});
