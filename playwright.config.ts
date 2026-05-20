import { defineConfig } from "@playwright/test";

const apiUrl = process.env.NEXUS_API_URL ?? "http://localhost:3001";
const webUrl = process.env.NEXUS_WEB_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: apiUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: webUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
