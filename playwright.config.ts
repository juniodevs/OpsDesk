import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      testDir: "./tests/e2e",
      testIgnore: /mobile-responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      testDir: "./tests/e2e",
      testMatch: /mobile-responsive\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "API Tests",
      testDir: "./tests/api",
      use: {
        baseURL: "http://127.0.0.1:3000",
      },
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
