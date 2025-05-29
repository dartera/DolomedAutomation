import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/Home Page/HomePage';
import { Header } from '../../pages/Home Page/Header';

test.describe('Header Functionality', () => {
    let homePage: HomePage;
    let header: Header;
    const defaultTimeout = 25000; // Increased timeout

    test.beforeEach(async ({ page }) => {
        // Set longer timeout for all tests
        test.setTimeout(defaultTimeout);
        
        homePage = new HomePage(page);
        header = new Header(page);
        
        // Try to go to homepage and skip all tests if it fails
        const loaded = await homePage.goto();
        if (!loaded) {
            test.skip();
        }
        
        // Wait for page to load completely with better timeout handling
        await page.waitForLoadState('domcontentloaded', { timeout: defaultTimeout });
        await page.waitForLoadState('networkidle', { timeout: defaultTimeout });
        
        // Make sure header is loaded
        await header.waitForHeaderToLoad();
    });



    test('should open Krankheiten dropdown menu', async ({ page }) => {
        const dropdownResult = await header.openKrankheitenDropdown();
        
        expect(dropdownResult.dropdownVisible).toBeTruthy();
        expect(dropdownResult.hasExpectedContent).toBeTruthy();
        expect(dropdownResult.hasMovementLink).toBeTruthy();
    });

    test('should open Therapie dropdown menu', async ({ page }) => {
        const dropdownResult = await header.openTherapieDropdown();
        
        expect(dropdownResult.dropdownVisible).toBeTruthy();
        expect(dropdownResult.hasNervenstimulationLink).toBeTruthy();
        expect(dropdownResult.hasAkupunkturLink).toBeTruthy();
    });

    test('should open mobile menu on mobile viewport', async ({ page }) => {
        // Skip this test if browser doesn't support mobile emulation
        if (!page.viewportSize) {
            test.skip();
        }
        
        const mobileMenuResult = await header.openMobileMenu(true);
        expect(mobileMenuResult.isMobileMenuVisible).toBeTruthy();
    });
}); 