export interface LanguageConfig {
  url: string;
  code: string;
  name: string;
  isDefault?: boolean;
}

export interface SiteConfig {
  name: string;
  languages: LanguageConfig[];
  commonStyles?: string;
  defaultViewport?: { width: number; height: number };
  defaultDiffThreshold?: number;
  sizeMismatchTolerance?: {
    maxHeightDiff?: number;  // Maximum height difference in pixels before auto-resize
    maxWidthDiff?: number;   // Maximum width difference in pixels before auto-resize
    autoResize?: boolean;    // Whether to automatically resize mismatched images
  };
}

// Dolomed website configuration
export const dolomedConfig: SiteConfig = {
  name: 'Dolomed',
  languages: [
    { url: 'https://dolomed.ch/', code: 'de', name: 'Deutsch (Default)', isDefault: true },
    { url: 'https://dolomed.ch/fr/', code: 'fr', name: 'Französisch' },
  ],
  commonStyles: `
    * {
      max-width: 100% !important;
      overflow-x: hidden !important;
    }
    body {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
    }
  `,
  defaultViewport: { width: 1366, height: 768 },
  defaultDiffThreshold: 0.7,
  sizeMismatchTolerance: {
    maxHeightDiff: 10,     // Allow up to 10px height difference before auto-resize
    maxWidthDiff: 5,       // Allow up to 5px width difference before auto-resize
    autoResize: true       // Enable automatic resizing for mismatched images
  }
};

// Common visual test configurations
export const visualTestDefaults = {
  scrollToBottom: true,
  waitAfterScroll: 1000,
  waitForLoadState: 'networkidle' as const,
  diffThreshold: 0.7
};
