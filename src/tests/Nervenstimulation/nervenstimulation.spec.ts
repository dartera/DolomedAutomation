import { test, expect } from '@playwright/test';
import { NervenstimulationPage } from '../../pages/nervenstimulationHelpers/NervenstimulationPage';

test.describe('Nervenstimulation Page Tests', () => {
    let nervenstimulationPage: NervenstimulationPage;

    test.beforeEach(async ({ page }) => {
        nervenstimulationPage = new NervenstimulationPage(page);
        await nervenstimulationPage.goto();
    });

    test('should navigate to Nervenstimulation page', async () => {
        const success = await nervenstimulationPage.goto();
        expect(success).toBeTruthy();
    });

    test('should display hero section correctly', async () => {
        const isHeroVisible = await nervenstimulationPage.isHeroSectionVisible();
        expect(isHeroVisible).toBeTruthy();

        const heroTitle = await nervenstimulationPage.getHeroTitle();
        expect(heroTitle).toBe(' Nervenstimulation');

        const heroSubtitle = await nervenstimulationPage.getHeroSubtitle();
        expect(heroSubtitle).toBe('Effektive Schmerzlinderung durch moderne Nervenstimulationstechniken');
    });

    test('should display all main sections', async () => {
        const sections = ['was-ist', 'tens', 'periphere', 'zentrale'];
        
        for (const section of sections) {
            const isVisible = await nervenstimulationPage.isSectionVisible(section);
            expect(isVisible).toBeTruthy();
        }
    });

    test('should display correct section titles', async () => {
        const sectionTitles = {
            'was-ist': 'Was ist Nervenstimulation?',
            'tens': 'TENS Geräte (Transkutane Elektrische Nervenstimulation)',
            'periphere': 'Periphere Neurostimulation',
            'zentrale': 'Zentrale Neurostimulation'
        };

        for (const [section, expectedTitle] of Object.entries(sectionTitles)) {
            const title = await nervenstimulationPage.getSectionTitle(section);
            expect(title).toBe(expectedTitle);
        }
    });

    test('should display FAQ section', async () => {
        const isFAQVisible = await nervenstimulationPage.isFAQSectionVisible();
        expect(isFAQVisible).toBeTruthy();

        const faqCount = await nervenstimulationPage.getFAQCount();
        expect(faqCount).toBeGreaterThan(0);
    });

}); 