import { test, expect } from '@playwright/test';
import { GefaesserkrankungenPage } from '../../pages/gefaesserkrankungenHelpers/GefaesserkrankungenPage';

test.describe('Dolomed Gefässerkrankungen Page Tests', () => {
    let gefaesserkrankungenPage: GefaesserkrankungenPage;

    test.beforeEach(async ({ page }) => {
        gefaesserkrankungenPage = new GefaesserkrankungenPage(page);
        // Navigate to the Gefässerkrankungen page
        const navigationSuccess = await gefaesserkrankungenPage.goto();
        expect(navigationSuccess).toBe(true);
    });

    // Test navigation to the Gefässerkrankungen page
    test('should navigate to the Gefässerkrankungen page successfully', async () => {
        expect(await gefaesserkrankungenPage.page.title()).toContain('Dolomed');
    });

    // Test Hero Section
    test('should display hero section correctly', async () => {
        // Verify hero section is visible
        expect(await gefaesserkrankungenPage.isHeroSectionVisible()).toBe(true);
        
        // Verify title content
        const heroTitle = await gefaesserkrankungenPage.getHeroTitle();
        expect(heroTitle).toContain('Schmerzen bei Gefässerkrankungen');
        
        // Verify buttons are present
        const appointmentButton = gefaesserkrankungenPage.page.locator('.elementor-element[data-id="51d38406"] a');
        await expect(appointmentButton).toBeVisible();
        
        const callButton = gefaesserkrankungenPage.page.locator('.elementor-element[data-id="15733c56"] a');
        await expect(callButton).toBeVisible();
    });

    // Test What Is Section
    test('should display What Is section correctly', async () => {
        // Verify What Is section is visible
        expect(await gefaesserkrankungenPage.isSectionVisible('what-is')).toBe(true);
        
        // Verify section title
        const title = await gefaesserkrankungenPage.getSectionTitle('what-is');
        expect(title).toContain('Was sind Schmerzen bei Gefässerkrankungen?');
        
        // Verify text content
        const text = await gefaesserkrankungenPage.getSectionText('what-is');
        expect(text).toContain('Schmerzen bei Gefässerkrankungen entstehen durch verminderte Durchblutung');
    });

    // Test PAVK Section
    test('should display PAVK section correctly', async () => {
        // Verify PAVK section is visible
        expect(await gefaesserkrankungenPage.isSectionVisible('pavk')).toBe(true);
        
        // Verify section title
        const title = await gefaesserkrankungenPage.getSectionTitle('pavk');
        expect(title).toContain('Periphere arterielle Verschlusskrankheit (PAVK)');
        
        // Verify text content
        const text = await gefaesserkrankungenPage.getSectionText('pavk');
        expect(text).toContain('Die periphere arterielle Verschlusskrankheit ist eine chronische Erkrankung');
        
        // Verify treatments are visible
        expect(await gefaesserkrankungenPage.areTreatmentsVisible('pavk')).toBe(true);
    });

    // Test Angina Section
    test('should display Angina section correctly', async () => {
        // Verify Angina section is visible
        expect(await gefaesserkrankungenPage.isSectionVisible('angina')).toBe(true);
        
        // Verify section title
        const title = await gefaesserkrankungenPage.getSectionTitle('angina');
        expect(title).toContain('Angina Pectoris');
        
        // Verify text content
        const text = await gefaesserkrankungenPage.getSectionText('angina');
        expect(text).toContain('Angina Pectoris ist ein Symptom der koronaren Herzkrankheit');
        
        // Verify treatments are visible
        expect(await gefaesserkrankungenPage.areTreatmentsVisible('angina')).toBe(true);
    });


    // Test call buttons
    test('should have working call buttons', async () => {
        // Verify the href attribute of the call button in hero section
        const callButton = gefaesserkrankungenPage.page.locator('.elementor-element[data-id="15733c56"] a');
        const href = await callButton.getAttribute('href');
        expect(href).toBe('tel:032 324 39 90');
    });

    // Test email links
    test('should have working email links', async () => {
        // Verify email links are present and have correct href
        const emailLinks = gefaesserkrankungenPage.page.locator('a[href="mailto:info@dolomed.ch"]');
        expect(await emailLinks.count()).toBeGreaterThan(0);
        
        // Verify the first email link href attribute
        const href = await emailLinks.first().getAttribute('href');
        expect(href).toBe('mailto:info@dolomed.ch');
    });
}); 