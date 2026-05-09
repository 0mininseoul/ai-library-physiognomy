import { defineConfig, devices } from "@playwright/test";

const defaultBaseURL = "http://127.0.0.1:3000";
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: externalBaseURL ?? defaultBaseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "pnpm dev",
        url: defaultBaseURL,
        reuseExistingServer: true,
      },
});
