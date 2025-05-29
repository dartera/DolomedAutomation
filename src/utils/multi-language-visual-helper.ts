import { test, Browser } from '@playwright/test';
import { VisualTestHelper, VisualTestConfig } from './visual-test-helper';
import { LanguageConfig, dolomedConfig } from '../config/test-config';

export interface MultiLanguageTestConfig extends Omit<VisualTestConfig, 'url' | 'testName'> {
  baseTestName: string;
  languages: LanguageConfig[];
  useLanguageSuffixForDefault?: boolean;
}

export class MultiLanguageVisualHelper {
  private visualTestHelper: VisualTestHelper;

  constructor() {
    this.visualTestHelper = new VisualTestHelper();
  }

  async setup(browser: Browser, viewport = { width: 1024, height: 768 }): Promise<void> {
    await this.visualTestHelper.setup(browser, viewport);
  }

  async cleanup(): Promise<void> {
    await this.visualTestHelper.cleanup();
  }

  async runMultiLanguageTest(config: MultiLanguageTestConfig): Promise<void> {
    const { baseTestName, languages, useLanguageSuffixForDefault = false, ...testConfig } = config;

    for (const { url, code, name, isDefault = false } of languages) {
      console.log(`\n=== Testing ${name} version (${code}) ===`);
      console.log(`URL: ${url}`);
      
      // Generate test name based on language and configuration
      const testName = this.generateTestName(baseTestName, code, isDefault, useLanguageSuffixForDefault);
      
      await this.visualTestHelper.runVisualTest({
        ...testConfig,
        url: url,
        testName: testName
      });
    }
  }

  async runIndividualLanguageTest(
    language: LanguageConfig, 
    baseTestName: string, 
    config: Omit<VisualTestConfig, 'url' | 'testName'>,
    useLanguageSuffixForDefault = false
  ): Promise<void> {
    const { url, code, name, isDefault = false } = language;
    
    console.log(`Testing ${name} version: ${url}`);
    
    const testName = this.generateTestName(baseTestName, code, isDefault, useLanguageSuffixForDefault);
    
    await this.visualTestHelper.runVisualTest({
      ...config,
      url: url,
      testName: testName
    });
  }

  private generateTestName(
    baseTestName: string, 
    languageCode: string, 
    isDefault: boolean, 
    useLanguageSuffixForDefault: boolean
  ): string {
    // If it's the default language and we don't want suffix for default, return base name
    if (isDefault && !useLanguageSuffixForDefault) {
      return baseTestName;
    }
    
    // Otherwise, add language suffix
    return `${baseTestName}-${languageCode}`;
  }

  // Static method to create common language configurations
  static createDolomedLanguageConfig(): LanguageConfig[] {
    return dolomedConfig.languages;
  }

  // Static method for common website patterns
  static createLanguageConfigFromBase(baseUrl: string, languages: Array<{code: string, name: string, isDefault?: boolean}>): LanguageConfig[] {
    return languages.map(lang => ({
      url: lang.isDefault ? baseUrl : `${baseUrl}${lang.code}/`,
      code: lang.code,
      name: lang.name,
      isDefault: lang.isDefault || false
    }));
  }

  // Getter to access the underlying visual test helper
  get visualTestHelperInstance(): VisualTestHelper {
    return this.visualTestHelper;
  }
} 