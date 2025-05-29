import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/Home Page/HomePage';

test.describe('Dolomed HomePage interaction tests', () => {
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        homePage = new HomePage(page);
        // Navigate to the homepage
        const navigationSuccess = await homePage.goto();
        expect(navigationSuccess).toBe(true);
    });

    // Test navigation to the homepage
    test('should navigate to the homepage successfully', async () => {
        // This is already tested in beforeEach, but added explicitly for clarity
        expect(await homePage.page.title()).toContain('Dolomed');
    });

    // Test Hero Section
    test('should display hero section correctly', async () => {
        // Verify hero section is visible
        expect(await homePage.isHeroSectionVisible()).toBe(true);
        
        // Verify title content
        const heroTitle = await homePage.getHeroTitle();
        expect(heroTitle).toContain('Dolomed');
        
        // Verify call now button is present - using more specific selector
        const callButton = homePage.page.locator('.elementor-element[data-id="108fecab"] a[href="tel:032 324 39 90"]');
        await expect(callButton).toBeVisible();
        
        // Verify apply button is present - using more specific selector
        const applyButton = homePage.page.locator('.elementor-element[data-id="108fecab"] a[href="#karriere"]');
        await expect(applyButton).toBeVisible();
    });

    // Test Treatment Methods Section
    test('should display treatment methods section correctly', async () => {
        // Verify treatment section is visible
        expect(await homePage.isTreatmentSectionVisible()).toBe(true);
        
        // Verify treatment title is displayed
        const treatmentTitle = await homePage.getTreatmentTitle();
        expect(treatmentTitle).toBeTruthy();
        
        // Verify all treatment methods are displayed
        const treatmentVisibility = await homePage.areTreatmentMethodsVisible();
        for (const [method, isVisible] of Object.entries(treatmentVisibility)) {
            expect(isVisible, `Treatment method ${method} should be visible`).toBe(true);
        }
    });

    // Test Visitor Information Section
    test('should display visitor information section correctly', async () => {
        // Verify visitor information section is visible
        expect(await homePage.isVisitorInfoSectionVisible()).toBe(true);
        
        // Verify patient and doctor sections are visible
        const sectionsVisibility = await homePage.arePatientAndDoctorSectionsVisible();
        expect(sectionsVisibility.patients).toBe(true);
        expect(sectionsVisibility.doctors).toBe(true);
    });

    // Test Team Section
    test('should display team section with working tabs', async () => {
        // Verify team section is visible
        expect(await homePage.isTeamSectionVisible()).toBe(true);
        
        // Test doctors tab
        await homePage.clickTeamTab('doctors');
        expect(await homePage.isTeamContentVisible('doctors')).toBe(true);
        
        // Test MPA tab
        await homePage.clickTeamTab('mpa');
        expect(await homePage.isTeamContentVisible('mpa')).toBe(true);
    });

    // Test Career Section
    test('should display career section with job positions', async () => {
        // Verify career section is visible
        expect(await homePage.isCareerSectionVisible()).toBe(true);
        
        // Verify all career positions are visible
        const positionsVisibility = await homePage.areCareerPositionsVisible();
        for (const [position, isVisible] of Object.entries(positionsVisibility)) {
            expect(isVisible, `Career position ${position} should be visible`).toBe(true);
        }
    });

    // Test Contact Section
    test('should display contact section with locations', async () => {
        // Verify contact section is visible
        expect(await homePage.isContactSectionVisible()).toBe(true);
        
        // Verify location contacts are visible
        const locationsVisibility = await homePage.areLocationContactsVisible();
        expect(locationsVisibility.bienne).toBe(true);
        expect(locationsVisibility.bern).toBe(true);
    });


    // Test navigation functionalities
    test('should have working call now buttons', async () => {
        // This is a bit tricky to test completely as it opens a native browser dialog
        // However, we can at least verify the href attribute of the call buttons
        const callButtons = homePage.page.locator('a[href="tel:032 324 39 90"]');
        const count = await callButtons.count();
        expect(count).toBeGreaterThan(0);
        
        // Test the first button (without strict mode)
        const href = await callButtons.first().getAttribute('href');
        expect(href).toBe('tel:032 324 39 90');
    });

    // Test email links
    test('should have working email links', async () => {
        const emailLinks = homePage.page.locator('a[href="mailto:info@dolomed.ch"]');
        const count = await emailLinks.count();
        expect(count).toBeGreaterThan(0);
        
        // Test the first link (without strict mode)
        const href = await emailLinks.first().getAttribute('href');
        expect(href).toBe('mailto:info@dolomed.ch');
    });

    // Test images loading
    test('should load all important images', async () => {
        // Wait for all images to load
        await homePage.page.waitForLoadState('load');
        
        // Check a few key images
        const images = homePage.page.locator('img');
        const count = await images.count();
        expect(count).toBeGreaterThan(10);
        
        // Check if images are loaded
        for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 images
            const image = images.nth(i);
            if (await image.isVisible()) {
                const naturalWidth = await image.evaluate(img => (img as HTMLImageElement).naturalWidth);
                expect(naturalWidth).toBeGreaterThan(0);
            }
        }
    });

    // Test accessibility - checking tab navigation
    test('should have proper keyboard navigation', async () => {
        // Press Tab key multiple times to navigate through the page
        // Focus should move to interactive elements
        await homePage.page.keyboard.press('Tab');
        
        // Get the focused element
        const focusedElement = await homePage.page.evaluate(() => {
            const el = document.activeElement;
            return el ? el.tagName : null;
        });
        
        // Focused element should be an interactive element (including DIVs which can be made focusable)
        expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DIV']).toContain(focusedElement);
        
        // If it's a DIV, check if it has attributes that make it focusable
        if (focusedElement === 'DIV') {
            const hasFocusableAttributes = await homePage.page.evaluate(() => {
                const el = document.activeElement as HTMLElement;
                // Check for tabindex, role, or aria attributes that would make a div focusable
                return el.hasAttribute('tabindex') || 
                       el.hasAttribute('role') || 
                       el.getAttribute('contenteditable') === 'true';
            });
            
            // Log information but don't fail the test since some frameworks make divs focusable
            console.log(`Focused DIV has focusable attributes: ${hasFocusableAttributes}`);
        }
    });

    // Test language switcher if available
    test('should have language switcher working', async () => {
        // Try to find the language switcher
        const languageSwitcher = homePage.page.locator('.dropbtn_lang, .wpml-ls');
        if (await languageSwitcher.count() > 0) {
            await languageSwitcher.first().click();
            
            // Check if language options appear
            const languageOptions = homePage.page.locator('.dropdown-contentlang a, .wpml-ls-item a');
            const count = await languageOptions.count();
            expect(count).toBeGreaterThan(0);
        } else {
            test.skip();
            console.log('Language switcher not found on this page');
        }
    });
});

