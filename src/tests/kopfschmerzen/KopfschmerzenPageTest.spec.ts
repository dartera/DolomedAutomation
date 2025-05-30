import { test, expect } from '@playwright/test';
import { KopfschmerzenPage } from '../../pages/kopfschmerzenHelpers/KopfschmerzenPage';

test.describe('Dolomed Kopfschmerzen Page Tests', () => {
    let kopfschmerzenPage: KopfschmerzenPage;

    test.beforeEach(async ({ page }) => {
        kopfschmerzenPage = new KopfschmerzenPage(page);
        // Navigate to the Kopfschmerzen page
        const navigationSuccess = await kopfschmerzenPage.goto();
        expect(navigationSuccess).toBe(true);
    });

    // Test navigation to the Kopfschmerzen page
    test('should navigate to the Kopfschmerzen page successfully', async () => {
        expect(await kopfschmerzenPage.page.title()).toContain('Dolomed');
    });

    // Test Hero Section
    test('should display hero section correctly', async () => {
        // Verify hero section is visible
        expect(await kopfschmerzenPage.isHeroSectionVisible()).toBe(true);
        
        // Verify title content
        const heroTitle = await kopfschmerzenPage.getHeroTitle();
        expect(heroTitle).toContain('Mehr Lebensqualität bei Kopfschmerzen: Unser ganzheitlicher Ansatz zur Behandlung von Kopfschmerzen und Gesichtsschmerzen');
        
        // Verify buttons are present
        const appointmentButton = kopfschmerzenPage.page.locator('.elementor-element[data-id="18a76c5f"] a');
        await expect(appointmentButton).toBeVisible();
        
        const callButton = kopfschmerzenPage.page.locator('.elementor-element[data-id="25b0ac1d"] a');
        await expect(callButton).toBeVisible();
    });

    // Test Migraine Section
    test('should display Migraine section correctly', async () => {
        // Verify Migraine section is visible
        expect(await kopfschmerzenPage.isSectionVisible('migraine')).toBe(true);
        
        // Verify section title
        const title = await kopfschmerzenPage.getSectionTitle('migraine');
        expect(title).toContain('Migräne');
        
        // Verify text content
        const text = await kopfschmerzenPage.getSectionText('migraine');
        expect(text).toContain('Bei der Migräne handelt es sich um primäre Kopfschmerzen und eine neurologische Erkrankung');
        
        // Verify treatments are visible
        expect(await kopfschmerzenPage.areTreatmentsVisible('migraine')).toBe(true);
    });

    // Test Cluster Headaches Section
    test('should display Cluster Headaches section correctly', async () => {
        // Verify Cluster section is visible
        expect(await kopfschmerzenPage.isSectionVisible('cluster')).toBe(true);
        
        // Verify section title
        const title = await kopfschmerzenPage.getSectionTitle('cluster');
        expect(title).toContain('Clusterkopfschmerzen');
        
        // Verify text content
        const text = await kopfschmerzenPage.getSectionText('cluster');
        expect(text).toContain('Clusterkopfschmerzen sind extrem starke, einseitige Kopfschmerzen, die in Episoden auftreten');
        
        // Verify treatments are visible
        expect(await kopfschmerzenPage.areTreatmentsVisible('cluster')).toBe(true);
    });

    // Test Post-Puncture Headache Section
    test('should display Post-Puncture Headache section correctly', async () => {
        // Verify Post-Puncture section is visible
        expect(await kopfschmerzenPage.isSectionVisible('postpuncture')).toBe(true);
        
        // Verify section title
        const title = await kopfschmerzenPage.getSectionTitle('postpuncture');
        expect(title).toContain('Postpunktioneller Kopfschmerz');
        
        // Verify text content
        const text = await kopfschmerzenPage.getSectionText('postpuncture');
        expect(text).toContain('Der postpunktionelle Kopfschmerz tritt häufig nach einer Lumbalpunktion oder Epiduralanästhesie auf');
        
        // Verify treatments are visible
        expect(await kopfschmerzenPage.areTreatmentsVisible('postpuncture')).toBe(true);
    });

    // Test Facial Pain Section
    test('should display Facial Pain section correctly', async () => {
        // Verify Facial Pain section is visible
        expect(await kopfschmerzenPage.isSectionVisible('facial')).toBe(true);
        
        // Verify section title
        const title = await kopfschmerzenPage.getSectionTitle('facial');
        expect(title).toContain('Gesichtsschmerzen');
        
        // Verify text content
        const text = await kopfschmerzenPage.getSectionText('facial');
        expect(text).toContain('Gesichtsschmerzen können durch');
        
        // Verify treatments are visible
        expect(await kopfschmerzenPage.areTreatmentsVisible('facial')).toBe(true);
    });

    // Test Trigeminal Neuralgia Section
    test('should display Trigeminal Neuralgia section correctly', async () => {
        // Verify Trigeminal section is visible
        expect(await kopfschmerzenPage.isSectionVisible('trigeminal')).toBe(true);
        
        // Verify section title
        const title = await kopfschmerzenPage.getSectionTitle('trigeminal');
        expect(title).toContain('Trigeminusneuralgie');
        
        // Verify text content
        const text = await kopfschmerzenPage.getSectionText('trigeminal');
        expect(text).toContain('Trigeminusneuralgie verursacht');
        
        // Verify treatments are visible
        expect(await kopfschmerzenPage.areTreatmentsVisible('trigeminal')).toBe(true);
    });


    // Test call buttons
    test('should have working call buttons', async () => {
        // Verify the href attribute of the call button in hero section
        const callButton = kopfschmerzenPage.page.locator('.elementor-element[data-id="25b0ac1d"] a');
        const href = await callButton.getAttribute('href');
        expect(href).toBe('tel:032 324 39 90');
    });

    // Test email links
    test('should have working email links', async () => {
        // Verify email links are present and have correct href
        const emailLinks = kopfschmerzenPage.page.locator('a[href="mailto:info@dolomed.ch"]');
        expect(await emailLinks.count()).toBeGreaterThan(0);
        
        // Verify the first email link href attribute
        const href = await emailLinks.first().getAttribute('href');
        expect(href).toBe('mailto:info@dolomed.ch');
    });
}); 