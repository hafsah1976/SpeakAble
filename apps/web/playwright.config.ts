import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never", outputFolder: "../../artifacts/playwright-report" }]],
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry"
  },
  webServer: {
    command: "cd ../.. && npm --workspace @speakable/web run dev -- --port 3002",
    url: "http://localhost:3002",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
