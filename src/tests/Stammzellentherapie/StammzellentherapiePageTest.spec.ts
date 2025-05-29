import { test, expect } from '@playwright/test';
import { StammzellentherapiePage } from '../../pages/Stammzellentherapie/StammzellentherapiePage';

test.describe('Dolomed Stammzellentherapie Page Tests', () => {
    let stammzellentherapiePage: StammzellentherapiePage;

    test.beforeEach(async ({ page }) => {
        stammzellentherapiePage = new StammzellentherapiePage(page);
        // Navigate to the Stammzellentherapie page
        await stammzellentherapiePage.navigate();
        await stammzellentherapiePage.waitForPageLoad();
    });

    // Test navigation to the Stammzellentherapie page
    test('should navigate to the Stammzellentherapie page successfully', async () => {
        expect(await stammzellentherapiePage.page.title()).toContain('Dolomed');
    });

    // Test Hero Section
    test('should display hero section correctly', async () => {
        // Verify hero title content
        const heroTitle = await stammzellentherapiePage.getHeroTitle();
        expect(heroTitle).toContain('Stammzellentherapie');
        
        // Verify hero subtitle content
        const heroSubtitle = await stammzellentherapiePage.getHeroSubtitle();
        expect(heroSubtitle).toContain('Moderne Heilungsmethoden mit Stammzellentherapie: Effektive Behandlungsmöglichkeiten bei Dolomed');
        
        // Verify hero description content
        const heroDescription = await stammzellentherapiePage.getHeroDescription();
        expect(heroDescription).toContain('Stammzellentherapie');
        
        // Verify buttons are present
        const appointmentButton = stammzellentherapiePage.page.locator(stammzellentherapiePage.appointmentButton);
        await expect(appointmentButton).toBeVisible();
        await expect(appointmentButton).toHaveText('Termin vereinbaren');
        
        const callButton = stammzellentherapiePage.page.locator(stammzellentherapiePage.callButton);
        await expect(callButton).toBeVisible();
        await expect(callButton).toHaveText('Jetzt anrufen');
    });

    // Test call buttons
    test('should have working call buttons', async () => {
        // Verify the href attribute of the call button
        const callButton = stammzellentherapiePage.page.locator(stammzellentherapiePage.callButton);
        const href = await callButton.getAttribute('href');
        expect(href).toBe('tel:032 324 39 90');
    });


}); 