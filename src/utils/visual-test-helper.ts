import { test, expect, Page, Browser } from '@playwright/test';
import { ImageComparison, DiffResult } from './image-diff';
import config from '../config/playwright.config';

export interface VisualTestConfig {
  url: string;
  testName: string;
  diffThreshold?: number;
  viewport?: { width: number; height: number };
  waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  customStyles?: string;
  scrollToBottom?: boolean;
  waitAfterScroll?: number;
}

export class VisualTestHelper {
  private imageComparison: ImageComparison;
  private page!: Page;
  private timestamp: string;
  private currentUser: string;

  constructor() {
    this.imageComparison = new ImageComparison();
    this.timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    this.currentUser = process.env.USER || process.env.USERNAME || 'unknown';
  }

  async setup(browser: Browser, viewport = { width: 1024, height: 768 }): Promise<void> {
    const context = await browser.newContext({ viewport });
    this.page = await context.newPage();
    console.log(`Test setup initialized at ${this.timestamp} by ${this.currentUser}`);
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
  }

  async runVisualTest(configInput: VisualTestConfig): Promise<DiffResult> {
    const {
      url,
      testName,
      diffThreshold = 0.1,
      waitForLoadState = 'networkidle',
      customStyles,
      scrollToBottom = true,
      waitAfterScroll = 1000
    } = configInput;

    console.log(`Starting visual test at ${this.timestamp}`);
    console.log(`Test running by user: ${this.currentUser}`);
    console.log('Page dimensions:', await this.page.viewportSize());

    try {
      // Prepend baseURL if url is relative
      const finalUrl = url.startsWith('http') ? url : ((config.use?.baseURL || '') + url);
      // Navigate to the page
      await this.page.goto(finalUrl);
      await this.page.waitForLoadState(waitForLoadState);

      // Apply custom styles if provided
      if (customStyles) {
        await this.page.addStyleTag({ content: customStyles });
      }

      // Auto-scroll if enabled
      if (scrollToBottom) {
        await this.autoScroll(waitAfterScroll);
      }

      // Perform image comparison
      const diffResult = await this.imageComparison.compareScreenshots(this.page, testName);
      const reportPath = this.imageComparison.generateDiffReport(testName, diffResult);
      
      console.log(`
        Test Results:
        - Timestamp: ${this.timestamp}
        - User: ${this.currentUser}
        - Report Path: ${reportPath}
        - Diff Percentage: ${diffResult.diffPercentage.toFixed(2)}%
      `);

      // Assert the diff percentage
      expect(diffResult.diffPercentage).toBeLessThanOrEqual(diffThreshold);

      return diffResult;

    } catch (error) {
      console.error(`
        Test failed at ${this.timestamp}
        User: ${this.currentUser}
        Error: ${error}
      `);
      throw error;
    }
  }

  private async autoScroll(waitAfterScroll: number = 1000): Promise<void> {
    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.documentElement.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, scrollHeight);
            resolve();
          }
        }, 100);
      });
    });

    await this.page.waitForTimeout(waitAfterScroll);
  }

  // Getter method for accessing the image comparison instance if needed
  get imageComparisonInstance(): ImageComparison {
    return this.imageComparison;
  }

  // Getter method for accessing the page instance if needed
  getPage(): Page {
    return this.page;
  }
} 