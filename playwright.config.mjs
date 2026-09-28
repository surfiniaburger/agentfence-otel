import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.mjs/,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Desktop Chrome"],
    // WebMCP consequentialHint is implemented in current branded Chrome;
    // bundled Playwright Chromium can expose WebMCP without the latest
    // annotation surface. Keep the E2E browser target explicit.
    channel: process.env.WEBMCP_BROWSER_CHANNEL || "chrome",
    headless: false,
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--enable-experimental-web-platform-features",
        "--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport",
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_AGENTFENCE_E2E: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
