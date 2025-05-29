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
}

// Dolomed website configuration
export const dolomedConfig: SiteConfig = {
  name: 'Dolomed',
  languages: [
    { url: 'https://dolomed.ch', code: 'de', name: 'German (Default)', isDefault: true },
    { url: 'https://dolomed.ch/fr', code: 'fr', name: 'France' },
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
  defaultViewport: { width: 1024, height: 768 },
  defaultDiffThreshold: 2.0
};

// Common visual test configurations
export const visualTestDefaults = {
  scrollToBottom: true,
  waitAfterScroll: 1000,
  waitForLoadState: 'networkidle' as const,
  diffThreshold: 2.0
};