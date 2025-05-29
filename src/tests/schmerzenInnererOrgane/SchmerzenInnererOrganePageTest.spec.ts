import { test, expect } from '@playwright/test';
import { SchmerzenInnererOrganePage } from '../../pages/schmerzenInnererOrganeHelpers/SchmerzenInnererOrganePage';

test.describe('Dolomed Schmerzen Innerer Organe Page Tests', () => {
    let schmerzenInnererOrganePage: SchmerzenInnererOrganePage;

    test.beforeEach(async ({ page }) => {
        schmerzenInnererOrganePage = new SchmerzenInnererOrganePage(page);
        // Navigate to the Schmerzen Innerer Organe page
        const navigationSuccess = await schmerzenInnererOrganePage.goto();
        expect(navigationSuccess).toBe(true);
    });

    // Test navigation to the Schmerzen Innerer Organe page
    test('should navigate to the Schmerzen Innerer Organe page successfully', async () => {
        // This is already tested in beforeEach, but added explicitly for clarity
        expect(await schmerzenInnererOrganePage.page.title()).toContain('Dolomed');
    });

    // Test Hero Section
    test('should display hero section correctly', async () => {
        // Verify hero section is visible
        expect(await schmerzenInnererOrganePage.isHeroSectionVisible()).toBe(true);
        
        // Verify title content
        const heroTitle = await schmerzenInnererOrganePage.getHeroTitle();
        expect(heroTitle).toContain('Schmerzen innerer');
        
        // Verify subtitle content
        const heroSubTitle = await schmerzenInnererOrganePage.getHeroSubTitle();
        expect(heroSubTitle).toContain('Ganzheitliche Therapieansätze');
        
        // Verify buttons are present
        const appointmentButton = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="1287f22c"] a');
        await expect(appointmentButton).toBeVisible();
        
        const callButton = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="4a7016b"] a');
        await expect(callButton).toBeVisible();
    });

    // Test What Are Schmerzen Innerer Organe Section
    test('should display What Are Schmerzen Innerer Organe section correctly', async () => {
        // Verify section is visible
        expect(await schmerzenInnererOrganePage.isSectionVisible('whatAre')).toBe(true);
        
        // Verify section title
        const title = await schmerzenInnererOrganePage.getSectionTitle('whatAre');
        expect(title).toBe('Was sind Schmerzen innerer Organe?');
        
        // Verify text content
        const text = await schmerzenInnererOrganePage.getSectionText('whatAre');
        expect(text).toContain('Schmerzen innerer Organe entstehen durch Erkrankungen oder Funktionsstörungen');
    });

    // Test Chronische Pankreatitis Section
    test('should display Chronische Pankreatitis section correctly', async () => {
        // Scroll to section for visibility
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="37f0389"]').scrollIntoViewIfNeeded();
        
        // Verify section is visible
        expect(await schmerzenInnererOrganePage.isSectionVisible('pankreatitis')).toBe(true);
        
        // Verify section title
        const title = await schmerzenInnererOrganePage.getSectionTitle('pankreatitis');
        expect(title).toBe('Chronische Pankreatitis');
        
        // Verify text content
        const text = await schmerzenInnererOrganePage.getSectionText('pankreatitis');
        expect(text).toContain('Chronische Pankreatitis ist eine langfristige Entzündung');
        
        // Verify treatments are visible
        expect(await schmerzenInnererOrganePage.areTreatmentsVisible('pankreatitis')).toBe(true);
        
        // Verify treatments count
        const treatmentsCount = await schmerzenInnererOrganePage.getTreatmentsCount('pankreatitis');
        expect(treatmentsCount).toBeGreaterThan(0);
    });

    // Test Endometriose Section
    test('should display Endometriose section correctly', async () => {
        // Scroll to section for visibility
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="1d695aaf"]').scrollIntoViewIfNeeded();
        
        // Verify section is visible
        expect(await schmerzenInnererOrganePage.isSectionVisible('endometriose')).toBe(true);
        
        // Verify section title
        const title = await schmerzenInnererOrganePage.getSectionTitle('endometriose');
        expect(title).toBe('Endometriose');
        
        // Verify text content
        const text = await schmerzenInnererOrganePage.getSectionText('endometriose');
        expect(text).toContain('Endometriose ist eine Erkrankung');
        
        // Verify treatments are visible
        expect(await schmerzenInnererOrganePage.areTreatmentsVisible('endometriose')).toBe(true);
        
        // Verify treatments count
        const treatmentsCount = await schmerzenInnererOrganePage.getTreatmentsCount('endometriose');
        expect(treatmentsCount).toBeGreaterThan(0);
    });

    // Test Pelvic Pain Section
    test('should display Pelvic Pain section correctly', async () => {
        // Scroll to section for visibility
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="2892ea96"]').scrollIntoViewIfNeeded();
        
        // Verify section is visible
        expect(await schmerzenInnererOrganePage.isSectionVisible('pelvicPain')).toBe(true);
        
        // Verify section title
        const title = await schmerzenInnererOrganePage.getSectionTitle('pelvicPain');
        expect(title).toBe('Pelvic Pain');
        
        // Verify text content
        const text = await schmerzenInnererOrganePage.getSectionText('pelvicPain');
        expect(text).toContain('Pelvic Pain, oder Beckenschmerzen');
        
        // Verify treatments are visible
        expect(await schmerzenInnererOrganePage.areTreatmentsVisible('pelvicPain')).toBe(true);
        
        // Verify treatments count
        const treatmentsCount = await schmerzenInnererOrganePage.getTreatmentsCount('pelvicPain');
        expect(treatmentsCount).toBeGreaterThan(0);
    });

    // Test Angina Pectoris Section
    test('should display Angina Pectoris section correctly', async () => {
        // Scroll to section for visibility
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="41f81d5"]').scrollIntoViewIfNeeded();
        
        // Verify section is visible
        expect(await schmerzenInnererOrganePage.isSectionVisible('anginaPectoris')).toBe(true);
        
        // Verify section title
        const title = await schmerzenInnererOrganePage.getSectionTitle('anginaPectoris');
        expect(title).toBe('Angina Pectoris');
        
        // Verify text content
        const text = await schmerzenInnererOrganePage.getSectionText('anginaPectoris');
        expect(text).toContain('Angina Pectoris ist ein Symptom');
        
        // Verify treatments are visible
        expect(await schmerzenInnererOrganePage.areTreatmentsVisible('anginaPectoris')).toBe(true);
        
        // Verify treatments count
        const treatmentsCount = await schmerzenInnererOrganePage.getTreatmentsCount('anginaPectoris');
        expect(treatmentsCount).toBeGreaterThan(0);
    });

    // Test WieWeiter Section
    test('should display Wie Weiter section correctly', async () => {
        // Scroll to section for visibility
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="a10eaeb"]').scrollIntoViewIfNeeded();
        
        // Verify WieWeiter section is visible
        expect(await schmerzenInnererOrganePage.isWieWeiterSectionVisible()).toBe(true);
        
        // Verify appointment button is visible
        const appointmentButton = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="60dd449"] a');
        await expect(appointmentButton).toBeVisible();
    });



    // Test call buttons
    test('should have working call buttons', async () => {
        // Verify the href attribute of the call button in hero section
        const callButton = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="4a7016b"] a');
        const href = await callButton.getAttribute('href');
        expect(href).toBe('tel:032 324 39 90');
        
        // Verify call buttons in contact section
        const contactCallButton = schmerzenInnererOrganePage.page.locator('a[href="tel:+41%2032%20324%2039%2090"]').first();
        const contactHref = await contactCallButton.getAttribute('href');
        // URL-encoded spaces (%20) are present in the actual href attribute
        expect(contactHref).toBe('tel:+41%2032%20324%2039%2090');
    });

    // Test email links
    test('should have working email links', async () => {
        // Scroll to the contact section to make email links visible
        await schmerzenInnererOrganePage.page.locator('.elementor-section[data-id="fb3726c"]').scrollIntoViewIfNeeded();
        
        // Verify email links are present
        const emailLinks = schmerzenInnererOrganePage.page.locator('a[href="mailto:info@dolomed.ch"]');
        expect(await emailLinks.count()).toBeGreaterThan(0);
        
        // Verify the first email link href attribute
        const href = await emailLinks.first().getAttribute('href');
        expect(href).toBe('mailto:info@dolomed.ch');
    });

    // Test images loading
    test('should load all important images', async () => {
        // Wait for all images to load
        await schmerzenInnererOrganePage.page.waitForLoadState('load');
        
        // Check hero image
        const heroImage = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="7301e908"] img');
        expect(await heroImage.isVisible()).toBe(true);
        
        // Check What Are Schmerzen Innerer Organe image
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="5fe61570"]').scrollIntoViewIfNeeded();
        const whatAreImage = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="250d3950"] img');
        expect(await whatAreImage.isVisible()).toBe(true);
        
        // Check Chronische Pankreatitis image
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="37f0389"]').scrollIntoViewIfNeeded();
        const pankreatitisImage = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="23e84613"] img');
        expect(await pankreatitisImage.isVisible()).toBe(true);
        
        // Check Endometriose image
        await schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="1d695aaf"]').scrollIntoViewIfNeeded();
        const endometrioseImage = schmerzenInnererOrganePage.page.locator('.elementor-element[data-id="5e35f65c"] img');
        expect(await endometrioseImage.isVisible()).toBe(true);
    });

    
}); 