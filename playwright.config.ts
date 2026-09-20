import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-dark',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      },
    },
  ],
  webServer: [
    {
      command: 'node --experimental-strip-types tests/gateway-fixture.ts',
      url: 'http://127.0.0.1:18080/health',
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec next dev --port 3100',
      url: 'http://localhost:3100/login',
      reuseExistingServer: false,
      timeout: 120000,
      env: { GATEWAY_API_URL: 'http://127.0.0.1:18080', NEXT_TELEMETRY_DISABLED: '1' },
    },
  ],
})
