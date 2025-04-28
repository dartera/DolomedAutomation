import { defineConfig, devices } from '@playwright/test';
import CustomReporter from './src/utils/customReport';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

// Determine if running in CI environment
const isCI = !!process.env.CI;

// Adjust timeouts for CI environment
const ciTimeouts = {
  timeout: process.env.PLAYWRIGHT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TIMEOUT) : 30000,
  navigationTimeout: 30000,
  expect: {
    timeout: 30000
  }
};

// Local timeouts (faster)
const localTimeouts = {
  timeout: process.env.PLAYWRIGHT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TIMEOUT) : 30000,
  navigationTimeout: 30000,
  expect: {
    timeout: 15000
  }
};

// Select timeouts based on environment
const timeouts = isCI ? ciTimeouts : localTimeouts;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src/tests',
  snapshotDir: './src/tests/screenshots',
  
  // Test and navigation timeouts
  timeout: timeouts.timeout,
  
  expect: {
    timeout: timeouts.expect.timeout,
    toHaveScreenshot: {
      // Adjust threshold and max diff pixels for CI to be more tolerant
      maxDiffPixels: isCI ? 2000 : 100,  // More tolerant in CI
      threshold: isCI ? 0.6 : 0.2,       // Higher threshold in CI
      maxDiffPixelRatio: isCI ? 0.2 : 0.05 // Allow more diff pixels as a ratio in CI
    }
  },
  
  /* Run tests in files in parallel */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* No retries in CI to make failures more visible */
  retries: process.env.CI ? 0 : 0,
  
  /* Use single worker in CI for stability */
  workers: isCI ? 5 : 5,
  
  /* Enhanced Reporter Configuration */
  reporter: isCI 
    ? [
        ['list', { printSteps: true }],
        ['json', { outputFile: 'test-results/test-results.json' }],
        ['junit', { outputFile: 'test-results/junit-results.xml' }],
        ['allure-playwright'],
        ['html', { open: 'never' }]
      ] 
    : [
        ['list', { printSteps: true }],
        ['json', { outputFile: 'test-results/test-results.json' }],
        ['junit', { outputFile: 'test-results/junit-results.xml' }],
        ['allure-playwright'],
        ['html', { open: 'on-failure' }]
      ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://dolomed.ch',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',  // Only keep traces for failed tests in both environments
    screenshot: 'only-on-failure',
    
    // Set navigation timeout
    navigationTimeout: timeouts.navigationTimeout,
    
    // Additional test metadata
    testIdAttribute: 'data-testid',
    
    // Improved error handling
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for different viewports */
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        browserName: 'chromium',
        viewport: { width: 1600, height: 1080 },
        // Add more stable browser configuration for CI
        launchOptions: {
          args: isCI ? [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--headless=new',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ] : []
        }
      },
    },
    
    // {
    //   name: 'Mobile Chrome',
    //   use: { 
    //     ...devices['Pixel 5'],
    //     screenshot: 'on',
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { 
    //     ...devices['iPhone 12'],
    //     screenshot: 'on',
    //   },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
