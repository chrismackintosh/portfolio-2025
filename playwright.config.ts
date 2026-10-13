import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHROME_CHANNEL || undefined } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], launchOptions: { executablePath: process.env.PW_WEBKIT_EXECUTABLE || undefined } } },
  ],
  webServer: { command: 'npm run preview -- --port 4175', url: 'http://127.0.0.1:4175', reuseExistingServer: !process.env.CI },
});
