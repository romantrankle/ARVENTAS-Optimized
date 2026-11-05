import { defineConfig, devices } from '@playwright/test'

// Läuft gegen den Produktions-Build (npm run build) über scripts/serve-dist.mjs.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: process.env.BASE_URL || 'http://localhost:4174' },
  webServer: process.env.BASE_URL ? undefined : { command: 'node scripts/serve-dist.mjs 4174', url: 'http://localhost:4174/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet-1024', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } },
    { name: 'tablet-768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
})
