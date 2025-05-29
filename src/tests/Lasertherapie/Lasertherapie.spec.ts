import { test, expect } from '@playwright/test';
import { LasertherapiePage } from '../../pages/LasertherapieHelpers/LasertherapiePage';

test.describe('Lasertherapie Page Tests', () => {
    let lasertherapiePage: LasertherapiePage;

    test.beforeEach(async ({ page }) => {
        lasertherapiePage = new LasertherapiePage(page);
        await lasertherapiePage.navigate();
        await lasertherapiePage.waitForPageLoad();
    });

    test('should display correct hero section content', async () => {
        const title = await lasertherapiePage.getHeroTitle();
        const subtitle = await lasertherapiePage.getHeroSubtitle();
        const description = await lasertherapiePage.getHeroDescription();

        expect(title).toBeTruthy();
        expect(subtitle).toBeTruthy();
        expect(description).toBeTruthy();
    });

    test('should have correct phone number', async () => {
        const phoneNumber = await lasertherapiePage.getPhoneNumber();
        // Check if the phone number matches any of the expected formats
        const expectedFormats = [
            '032 324 39 90',
            '0323243990',
            '+41 32 324 39 90',
            '+41323243990'
        ];
        expect(expectedFormats).toContain(phoneNumber);
    });

    test('should display FAQ section with items', async () => {
        const faqCount = await lasertherapiePage.getFAQCount();
        expect(faqCount).toBeGreaterThan(0);
    });

    test('should load in different languages', async () => {
        const languages = ['de', 'fr'];
        
        for (const lang of languages) {
            await lasertherapiePage.navigate(lang);
            await lasertherapiePage.waitForPageLoad();
            
            const title = await lasertherapiePage.getHeroTitle();
            expect(title).toBeTruthy();
        }
    });
}); 