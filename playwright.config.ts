import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    // "localhost" zamiast 127.0.0.1 wisi bez końca w Chromium na niektórych maszynach z lokalnym
    // przechwytywaniem ruchu (antywirus) - 127.0.0.1 jawnie omija rozwiązywanie nazwy.
    baseURL: 'http://127.0.0.1:5173',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
})
