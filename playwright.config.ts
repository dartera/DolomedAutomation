import { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';

const config: PlaywrightTestConfig = {
  testDir: './src/tests',
  timeout: 120000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixels: 10000,
      threshold: 0.02,
    }
  },
  use: {
    viewport: {
      width: 1366,
      height: 768,
    },
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    baseURL: 'https://dolomed.ch/',
    actionTimeout: 10000,
    navigationTimeout: 60000,
  },
  snapshotDir: './snapshots',
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-report' }]
  ],
  testMatch: '**/*.spec.ts',
  preserveOutput: 'always',
  workers: 4
};

export default config;