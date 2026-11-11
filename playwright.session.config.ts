import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3500'
export default defineConfig({
  testDir: './e2e',
  testMatch: ['session.spec.ts', 'tree-map.spec.ts'],
  grepInvert: process.env.E2E_RUN_MUTATING_TESTS === '1' ? undefined : /@mutates/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    // Os fluxos reais incluem credenciais e tokens. Não os gravar em traces.
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    launchOptions: process.env.E2E_BROWSER_PATH
      ? { executablePath: process.env.E2E_BROWSER_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
