import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : undefined,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'small-phone-320', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 568 } } },
    { name: 'android-360', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } } },
    { name: 'iphone-390', use: { ...devices['iPhone 13'], reducedMotion: 'no-preference' } },
    { name: 'tablet-768', use: { browserName: 'webkit', viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: 'short-landscape', use: { ...devices['Pixel 5'], viewport: { width: 568, height: 320 } } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 13 landscape'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'node scripts/dev-server.mjs --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
