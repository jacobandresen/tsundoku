import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'iPhone SE',
      use: {...devices['iPhone SE']},
    },
    {
      name: 'iPhone 14',
      use: {...devices['iPhone 14']},
    },
  ],
  webServer: {
    command: './node_modules/.bin/vite --port 5173',
    url: 'http://localhost:5173/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
