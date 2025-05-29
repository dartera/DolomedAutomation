import { test } from '@playwright/test';
import { MultiLanguageVisualHelper } from '../../utils/multi-language-visual-helper';
import { visualTestDefaults } from '../../config/test-config';

// Define language configs for the Bewegungstherapie und Faszientraining page
const bewegungstherapieLanguages = [
  {
    url: '/bewegungstherapie-und-faszientraining/',
    code: 'de',
    name: 'German (Default)',
    isDefault: true
  },
  {
    url: '/fr/bewegungstherapie-und-faszientraining/',
    code: 'fr',
    name: 'French'
  }
];

// Desktop visual regression (one test per language)
test.describe('Visual Regression - Bewegungstherapie und Faszientraining Page (Desktop)', () => {
  let visualHelper: MultiLanguageVisualHelper;

  test.beforeAll(async ({ browser }) => {
    visualHelper = new MultiLanguageVisualHelper();
    await visualHelper.setup(browser, { width: 1024, height: 768 });
  });

  test.afterAll(async () => {
    await visualHelper.cleanup();
  });

  for (const lang of bewegungstherapieLanguages) {
    test(`bewegungstherapie-visual-desktop-${lang.code}`, async () => {
      await visualHelper.runIndividualLanguageTest(
        lang,
        'bewegungstherapie-visual',
        {
          diffThreshold: visualTestDefaults.diffThreshold,
          customStyles: `* { max-width: 100% !important; overflow-x: hidden !important; } body { width: 100% !important; margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }`,
          scrollToBottom: visualTestDefaults.scrollToBottom,
          waitAfterScroll: visualTestDefaults.waitAfterScroll,
          waitForLoadState: visualTestDefaults.waitForLoadState
        }
      );
    });
  }
});

// Mobile visual regression (one test per language)
test.describe('Visual Regression - Bewegungstherapie und Faszientraining Page (Mobile)', () => {
  let visualHelper: MultiLanguageVisualHelper;

  test.beforeAll(async ({ browser }) => {
    visualHelper = new MultiLanguageVisualHelper();
    await visualHelper.setup(browser, { width: 390, height: 844 }); // iPhone 12 Pro
  });

  test.afterAll(async () => {
    await visualHelper.cleanup();
  });

  for (const lang of bewegungstherapieLanguages) {
    test(`bewegungstherapie-visual-mobile-${lang.code}`, async () => {
      await visualHelper.runIndividualLanguageTest(
        lang,
        'bewegungstherapie-visual-mobile',
        {
          diffThreshold: visualTestDefaults.diffThreshold,
          customStyles: `* { max-width: 100% !important; overflow-x: hidden !important; } body { width: 100% !important; margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }`,
          scrollToBottom: visualTestDefaults.scrollToBottom,
          waitAfterScroll: visualTestDefaults.waitAfterScroll,
          waitForLoadState: visualTestDefaults.waitForLoadState,
          viewport: { width: 390, height: 844 }
        }
      );
    });
  }
}); 