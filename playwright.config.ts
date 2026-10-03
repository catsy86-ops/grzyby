import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Na CI serwer deweloperski startuje zawsze na zimno - pierwsze wejście czeka na optymalizację
  // zależności Vite (pełny reload strony), co przy 4 równoległych workerach przekracza 30 s.
  // Jeden worker, dłuższy timeout i ponowienia tylko tam; lokalnie bez zmian.
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  timeout: process.env.CI ? 60_000 : 30_000,
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
    timeout: 120_000,
  },
})
