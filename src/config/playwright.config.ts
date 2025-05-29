import { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';

const config: PlaywrightTestConfig = {
  testDir: './src/tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      maxDiffPixels: 10000,
      threshold: 0.02,
    }
  },
  use: {
    viewport: {
      width: 1024,
      height: 768,
    },
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    baseURL: 'https://dolomed.ch',
    actionTimeout: 2000,
    navigationTimeout: 30000,
  },
  snapshotDir: './snapshots',
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-report' }],
    ['allure-playwright', { 
      outputFolder: './allure-results',
      detail: true,
      suiteTitle: false,
      environmentInfo: {
        'Test Environment': 'Jenkins CI',
        'Framework': 'Playwright',
        'Language': 'TypeScript',
        'Browser': 'Chromium',
        'Viewport': '1024x768'
      }
    }]
  ],
  testMatch: '**/*.spec.ts',
  preserveOutput: 'always',
  workers: 4
};

export default config;