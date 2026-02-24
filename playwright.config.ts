import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load test credentials from tests/.env.test
dotenv.config({ path: path.resolve(__dirname, 'tests/.env.test') })

export default defineConfig({
  testDir: './tests',
  outputDir: './tests/screenshots',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
  projects: [
    // Auth setup — runs once before all authenticated tests
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Public pages (no auth needed)
    {
      name: 'iPhone',
      testMatch: /responsive\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: 'iPad',
      testMatch: /responsive\.spec\.ts/,
      use: { viewport: { width: 820, height: 1180 } },
    },
    {
      name: 'Desktop',
      testMatch: /responsive\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 } },
    },

    // Authenticated tests — depend on setup, run on all viewports
    {
      name: 'iPhone-auth',
      testMatch: /ui-audit\.spec\.ts|gig-dialog-screenshots\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        viewport: { width: 390, height: 844 },
        storageState: 'tests/.auth/state.json',
      },
    },
    {
      name: 'iPad-auth',
      testMatch: /ui-audit\.spec\.ts|gig-dialog-screenshots\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        viewport: { width: 820, height: 1180 },
        storageState: 'tests/.auth/state.json',
      },
    },
    {
      name: 'iPad-landscape-auth',
      testMatch: /ui-audit\.spec\.ts|gig-dialog-screenshots\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        viewport: { width: 1180, height: 820 },
        storageState: 'tests/.auth/state.json',
      },
    },
    {
      name: 'Desktop-auth',
      testMatch: /ui-audit\.spec\.ts|gig-dialog-screenshots\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        viewport: { width: 1440, height: 900 },
        storageState: 'tests/.auth/state.json',
      },
    },
  ],
})
