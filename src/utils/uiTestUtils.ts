import { BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
/**
 * Interface for viewport size
 */
interface ViewportSize {
    width: number;
    height: number;
}

/**
 * Handles cookie consent banner acceptance using multiple selectors and strategies
 */
export async function handleCookieConsent(page: Page): Promise<boolean> {
    try {
        // Wait for the cookie consent banner to appear with a timeout
        console.log('Checking for cookie consent banner...');
        
        // Multiple possible selectors for the cookie banner
        const consentSelectors = [
            'div.cky-consent-bar',
            '.cky-consent-container',
            '[data-cky-tag="notice"]',
            '.cky-btn-accept',
            'button.cky-btn.cky-btn-accept'
        ];
            
        // Try each selector with a short timeout
        let bannerFound = false;
        
        for (const selector of consentSelectors) {
            console.log(`Trying to find cookie banner with selector: ${selector}`);
            
            const isVisible = await page.waitForSelector(selector, { 
                state: 'visible',
                timeout: 5000  // Short timeout per selector
            }).then(() => true).catch(() => false);
            
            if (isVisible) {
                bannerFound = true;
                console.log(`Cookie banner found with selector: ${selector}`);
                break;
            }
        }
        
        if (bannerFound) {
            console.log('Cookie consent banner found, accepting cookies...');
            
            // Try different methods to accept cookies
            const acceptSelectors = [
                'button.cky-btn-accept',
                '.cky-btn-accept',
                'button.cky-btn.cky-btn-accept',
                '[data-cky-tag="accept-button"]',
                'button[aria-label="Allow"]'
            ];
            
            // Try each accept button with multiple attempts
            let accepted = false;
            
            for (const selector of acceptSelectors) {
                try {
                    console.log(`Trying to click accept button with selector: ${selector}`);
                    
                    // Try force click first
                    await page.evaluate((sel) => {
                        const element = document.querySelector(sel);
                        if (element) {
                            console.log('Force clicking element via JS');
                            (element as HTMLElement).click();
                            return true;
                        }
                        return false;
                    }, selector).catch(() => false);
                    
                    // Then try regular click
                    await page.click(selector, { timeout: 2000 }).catch(() => {});
                    
                    // Wait to see if banner disappears
                    const bannerGone = await page.waitForSelector('div.cky-consent-bar', { 
                        state: 'hidden',
                        timeout: 3000
                    }).then(() => true).catch(() => false);
                    
                    if (bannerGone) {
                        accepted = true;
                        console.log(`Successfully accepted cookies using selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    console.log(`Failed to click ${selector}: ${e.message}`);
                }
            }
            
            // Final fallback: try to remove the banner with JavaScript
            if (!accepted) {
                console.log('Attempting to remove cookie banner via JavaScript...');
                await page.evaluate(() => {
                    const banners = document.querySelectorAll('.cky-consent-bar, .cky-consent-container, [data-cky-tag="notice"]');
                    banners.forEach(banner => {
                        if (banner) {
                            console.log('Removing banner via JS');
                            banner.remove();
                        }
                    });
                });
            }
            
            // Additional wait to ensure banner animations are complete
            await page.waitForTimeout(2000);
            
            console.log('Cookie consent handling completed');
            return true;
        } else {
            console.log('No cookie consent banner found or it was already handled');
            return false;
        }
    } catch (error) {
        console.log('Error handling cookie consent:', error.message);
        
        // Last resort: try to remove any consent banners via JavaScript
        try {
            await page.evaluate(() => {
                document.querySelectorAll('.cky-consent-bar, .cky-consent-container, [data-cky-tag="notice"]')
                    .forEach(el => el.remove());
            });
        } catch (e) {
            console.log('Failed to remove cookie banner via JS:', e.message);
        }
        return false;
    }
}

/**
 * Optimized page scrolling with intelligent pauses for content loading
 */
export async function optimizedScrollPage(page: Page): Promise<void> {
    // Get page height
    const pageHeight = await page.evaluate(() => {
        return Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
    });
    
    console.log(`Page height: ${pageHeight}px, starting scrolling...`);
    
    // Scroll in smaller chunks for smoother experience
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const scrollStep = Math.floor(viewportHeight / 2); // Half viewport at a time for smoother scroll
    
    // Use a more efficient approach with fewer evaluate calls
    for (let position = 0; position < pageHeight; position += scrollStep) {
        await page.evaluate((pos) => {
            window.scrollTo({
                top: pos,
                behavior: 'auto' // Using 'auto' instead of 'smooth' for faster scrolling
            });
        }, position);
        
        // Brief pause to allow content to load, increased for slower scroll
        await page.waitForTimeout(600);
        
        // Check if we're at a position with likely lazy-loaded content (e.g., every 1000px)
        if (position % 1000 < scrollStep) {
            // Wait a bit longer every 1000px to ensure lazy content loads
            await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {
                // Ignore timeout errors from networkidle
            });
        }
    }
    
    // Final scroll to bottom to ensure everything is triggered
    await page.evaluate(() => {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'auto'
        });
    });
    
    // Brief wait for final network requests
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
        console.log('Final network idle wait timed out, continuing anyway');
    });
    
    console.log('Scrolling completed');
}

/**
 * Standard page setup with appropriate waiting
 */
export async function setupPage(
    page: Page, 
    url: string, 
    viewport?: ViewportSize, 
    options: {
        handleCookieConsent?: boolean;
        waitTime?: number;
        scrollPage?: boolean;
    } = { 
        handleCookieConsent: true,
        waitTime: 3000,
        scrollPage: true
    }
) {
    // Set viewport if provided
    if (viewport) {
        await page.setViewportSize(viewport);
    }
    
    // Navigate to URL
    await page.goto(url);
    
    // Handle cookie consent if needed
    if (options.handleCookieConsent) {
        await handleCookieConsent(page);
    }
    
    // Wait for initial loading
    await page.waitForLoadState('networkidle');
    
    // Wait for specified time
    const waitTime = options.waitTime ?? 3000;
    console.log(`Waiting ${waitTime}ms for page to fully render...`);
    await page.waitForTimeout(waitTime);
    
    // Scroll page if needed
    if (options.scrollPage) {
        await optimizedScrollPage(page);
        
        // Return to top of page
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(1000);
    }
}

/**
 * Sets up screenshot paths and directories
 */
export interface ScreenshotPaths {
    screenshotsDir: string;
    baselineDir: string;
    baselinePath: string;
    actualPath: string;
    diffPath: string;
}

export function setupScreenshotPaths(
    baseDir: string, 
    screenshotName: string
): ScreenshotPaths {
    const timestamp = Date.now();
    
    // Get the screenshots output directory from the test-results folder
    // This will be created by Playwright
    const screenshotsDir = path.join(process.cwd(), 'test-results');
    
    // Check for src/ScreenShots directory first (existing structure)
    let baselineDir = path.join(process.cwd(), 'src', 'ScreenShots', baseDir);
    
    // If that doesn't exist, use the screenshots/baseDir directory
    if (!fs.existsSync(baselineDir)) {
        baselineDir = path.join(screenshotsDir, baseDir);
    }
    
    // Create directories if they don't exist
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    if (!fs.existsSync(baselineDir)) {
        fs.mkdirSync(baselineDir, { recursive: true });
    }
    
    // Set up file paths - use existing naming pattern from src/ScreenShots/HomePage
    // Just the name without any suffix for baseline
    const baselineName = `${screenshotName}.png`;
    const baselinePath = path.join(baselineDir, baselineName);
    
    // Create a special output folder for the test results using proper naming
    const outputFileBase = `${screenshotName.replace(/-/g, '_')}`;
    
    // Use better naming that matches the screenshot content
    const actualName = `${outputFileBase}_actual.png`;
    const actualPath = path.join(screenshotsDir, actualName);
    
    const diffName = `${outputFileBase}_diff.png`;
    const diffPath = path.join(screenshotsDir, diffName);
    
    // Log paths for debugging
    console.log(`Screenshot paths:
        - Baseline directory: ${baselineDir}
        - Baseline: ${baselinePath}
        - Actual: ${actualPath}
        - Diff: ${diffPath}`);
    
    return {
        screenshotsDir,
        baselineDir,
        baselinePath,
        actualPath,
        diffPath
    };
}

/**
 * Takes a limited-height screenshot instead of a full-page screenshot
 * This is a simplified implementation that only captures the top portion of the page
 */
export async function takeLimitedHeightScreenshot(
    page: Page,
    outputPath: string,
    maxHeight: number = 10000
): Promise<void> {
    // Get viewport size
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    
    // Determine if this is a mobile view by viewport width or URL pattern
    const isMobileView = viewport.width <= 768 || 
                       page.url().includes('Mobile') || 
                       page.url().includes('mobile');
    
    // Set standardized heights for ALL environments to ensure consistency
    // These fixed heights will be the same in both local and CI environments
    const STANDARD_DESKTOP_HEIGHT = 4500;  // Standard height for desktop
    const STANDARD_MOBILE_HEIGHT = 8000;   // Standard height for mobile
    
    // Determine the standard height based on view type
    const standardHeight = isMobileView ? STANDARD_MOBILE_HEIGHT : STANDARD_DESKTOP_HEIGHT;
    
    console.log(`Taking screenshot with standardized height of ${standardHeight}px (${isMobileView ? 'mobile' : 'desktop'} view)`);
    
    try {
        // Scroll to top first to ensure we capture the top of the page
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        
        // First approach: Take a viewport-limited screenshot with fullPage:true
        // to capture more content, then we'll resize it to standard dimensions
        await page.screenshot({
            path: outputPath,
            fullPage: true, 
            type: 'png'
        });
        
        // Get dimensions of the saved screenshot
        const { PNG } = require('pngjs');
        const fs = require('fs');
        const initialImage = PNG.sync.read(fs.readFileSync(outputPath));
        console.log(`Initial screenshot saved with dimensions: ${initialImage.width}x${initialImage.height}px`);
        
        // Always normalize to standard height, regardless of environment
        console.log(`Normalizing screenshot to standard ${isMobileView ? 'mobile' : 'desktop'} height (${standardHeight}px)...`);
        try {
            // Try to use sharp for higher quality resizing
            try {
                const sharp = require('sharp');
                const tempNormalizedPath = outputPath + '.normalized.png';
                const initialScreenshotBuffer = fs.readFileSync(outputPath); // Read the full-page screenshot

                await sharp({ // Create the fixed-size canvas
                    create: {
                        width: viewport.width,
                        height: standardHeight,
                        channels: 4, // Assuming RGBA for PNG
                        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
                    }
                })
                .composite([{ input: initialScreenshotBuffer, gravity: 'northwest' }]) // Place full-page screenshot at top-left
                .png() // Ensure output is PNG
                .toFile(tempNormalizedPath);

                // Replace original with normalized version
                fs.unlinkSync(outputPath);
                fs.renameSync(tempNormalizedPath, outputPath);
                console.log(`Successfully normalized to standard height using sharp: ${viewport.width}x${standardHeight}px`);
            } catch (sharpError) {
                console.log(`Sharp not available or failed during processing: ${sharpError.message}`);
                console.log('Falling back to canvas resizing...');
                
                // Fallback to canvas resizing
                const { createCanvas, Image } = require('canvas');
                const canvas = createCanvas(viewport.width, standardHeight);
                const ctx = canvas.getContext('2d');
                
                // Fill with white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, viewport.width, standardHeight);
                
                // Draw the screenshot at the top
                const img = new Image();
                img.src = fs.readFileSync(outputPath);
                ctx.drawImage(img, 0, 0);
                
                // Save the normalized image
                fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
                console.log(`Used canvas to normalize to standard height: ${viewport.width}x${standardHeight}px`);
            }
            
            // Verify final dimensions
            const finalImage = PNG.sync.read(fs.readFileSync(outputPath));
            console.log(`Final screenshot dimensions: ${finalImage.width}x${finalImage.height}px`);
        } catch (error) {
            console.error(`Error normalizing screenshot height: ${error.message}.`);
            const initialImageForLog = PNG.sync.read(fs.readFileSync(outputPath)); // Read again for logging if needed
            console.warn(`WARNING: Screenshot normalization using both sharp and canvas failed. The original full-page screenshot at ${outputPath} will be used, which has dimensions ${initialImageForLog.width}x${initialImageForLog.height}px.`);
            // Continue with original screenshot if normalization fails
        }
        
        console.log(`Screenshot saved to ${outputPath}`);
    } catch (error) {
        console.error(`Error taking limited screenshot: ${error.message}`);
        console.error(error.stack);
        
        // Last resort - create a blank image of the standard height
        try {
            console.log('Creating blank image as fallback');
            const { createCanvas } = require('canvas');
            const standardHeight = isMobileView ? STANDARD_MOBILE_HEIGHT : STANDARD_DESKTOP_HEIGHT;
            const canvas = createCanvas(viewport.width, standardHeight);
            const ctx = canvas.getContext('2d');
            
            // Fill with white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, viewport.width, standardHeight);
            
            // Add text explaining the error
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText('Screenshot generation failed', 20, 30);
            ctx.fillText(`Error: ${error.message}`, 20, 60);
            
            // Save as PNG
            const fs = require('fs');
            fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
            console.log(`Created fallback image at ${outputPath}`);
        } catch (e) {
            console.error(`Even fallback image creation failed: ${e.message}`);
        }
    }
}

/**
 * Takes a full-page screenshot and attaches it to the test report
 */
export async function takeFullPageScreenshot(
    page: Page, 
    paths: ScreenshotPaths,
    testInfo: any
): Promise<string> {
    // Use our standardized screenshot function with fixed heights based on view type
    await takeLimitedHeightScreenshot(page, paths.actualPath);
    
    // Attach the screenshot to the test report
    await testInfo.attach('actual', {
        path: paths.actualPath,
        contentType: 'image/png'
    });
    
    return paths.actualPath;
}

/**
 * Interface for comparison options
 */
export interface ComparisonOptions {
    threshold: number;
    includeAA: boolean;
    alpha: number;
    diffColor: [number, number, number];
    diffMask: boolean;
    maxDiffPercentage: number;
}

/**
 * Interface for comparison result
 */
export interface ComparisonResult {
    diffPixels: number;
    percentDifferent: number;
    maxAcceptableDiffPixels: number;
    passed: boolean;
}

/**
 * Compare screenshots using Pixelmatch with configurable options
 */
export async function compareScreenshots(
    actualPath: string, 
    baselinePath: string, 
    diffPath: string,
    options: Partial<ComparisonOptions> = {}
): Promise<ComparisonResult> {
    // Dynamically import pixelmatch (ESM module)
    const pixelmatch = (await import('pixelmatch')).default;
    console.log('Successfully loaded pixelmatch module');
    
    // Read both PNG images
    const actualImg = PNG.sync.read(fs.readFileSync(actualPath));
    const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
    
    // Safety limits for image dimensions
    const MAX_SAFE_WIDTH = 5000;
    const MAX_SAFE_HEIGHT = 10000;
    
    // Check for excessively large images that could cause memory issues
    if (actualImg.width > MAX_SAFE_WIDTH || actualImg.height > MAX_SAFE_HEIGHT || 
        baselineImg.width > MAX_SAFE_WIDTH || baselineImg.height > MAX_SAFE_HEIGHT) {
        console.error(`Error: Image dimensions too large for safe comparison. Actual: ${actualImg.width}x${actualImg.height}, Baseline: ${baselineImg.width}x${baselineImg.height}`);
        createErrorDiffImage(diffPath, actualPath);
        
        return {
            diffPixels: 10000,
            percentDifferent: 50,
            maxAcceptableDiffPixels: 0,
            passed: false
        };
    }
    
    // Check if dimensions match
    if (baselineImg.width !== actualImg.width || baselineImg.height !== actualImg.height) {
        console.log('Image dimensions do not match. Normalizing both images to ensure consistent comparison.');
        console.log(`Actual: ${actualImg.width}x${actualImg.height}, Baseline: ${baselineImg.width}x${baselineImg.height}`);
        
        // Determine target dimensions - use the baseline width but choose the smaller height
        const targetWidth = baselineImg.width;
        const targetHeight = Math.min(baselineImg.height, actualImg.height);
        
        console.log(`Resizing both images to ${targetWidth}x${targetHeight} for comparison`);
        
        // Create normalized versions of both images
        const normalizedActual = new PNG({ width: targetWidth, height: targetHeight });
        const normalizedBaseline = new PNG({ width: targetWidth, height: targetHeight });
        const diff = new PNG({ width: targetWidth, height: targetHeight });
        
        try {
            // Try to use sharp for better quality resizing if available
            try {
                const sharp = require('sharp');
                
                // Resize actual image
                const actualResized = await sharp(actualPath)
                    .resize({ 
                        width: targetWidth, 
                        height: targetHeight,
                        fit: 'cover',
                        position: 'top'
                    })
                    .png()
                    .toBuffer();
                
                // Resize baseline image
                const baselineResized = await sharp(baselinePath)
                    .resize({ 
                        width: targetWidth, 
                        height: targetHeight,
                        fit: 'cover',
                        position: 'top'
                    })
                    .png()
                    .toBuffer();
                
                // Convert buffers to PNG objects
                const resizedActualImg = PNG.sync.read(actualResized);
                const resizedBaselineImg = PNG.sync.read(baselineResized);
                
                // Copy data to normalized PNGs
                normalizedActual.data = Buffer.from(resizedActualImg.data);
                normalizedBaseline.data = Buffer.from(resizedBaselineImg.data);
                
                console.log('Images successfully normalized using sharp library for better quality.');
            } 
            catch (sharpError) {
                console.log(`Sharp library not available, falling back to canvas: ${sharpError.message}`);
                
                // Create a canvas to help with the resize operation
                const { createCanvas, Image } = require('canvas');
                
                // Resize actual image
                const actualCanvas = createCanvas(targetWidth, targetHeight);
                const actualCtx = actualCanvas.getContext('2d');
                const actualImg = new Image();
                actualImg.src = fs.readFileSync(actualPath);
                actualCtx.drawImage(actualImg, 0, 0, targetWidth, targetHeight);
                const actualData = actualCtx.getImageData(0, 0, targetWidth, targetHeight).data;
                
                // Resize baseline image
                const baselineCanvas = createCanvas(targetWidth, targetHeight);
                const baselineCtx = baselineCanvas.getContext('2d');
                const baselineImg = new Image();
                baselineImg.src = fs.readFileSync(baselinePath);
                baselineCtx.drawImage(baselineImg, 0, 0, targetWidth, targetHeight);
                const baselineData = baselineCtx.getImageData(0, 0, targetWidth, targetHeight).data;
                
                // Copy data to normalized PNGs
                for (let y = 0; y < targetHeight; y++) {
                    for (let x = 0; x < targetWidth; x++) {
                        const idx = (targetWidth * y + x) << 2;
                        // Copy actual image data
                        normalizedActual.data[idx] = actualData[idx];
                        normalizedActual.data[idx + 1] = actualData[idx + 1];
                        normalizedActual.data[idx + 2] = actualData[idx + 2];
                        normalizedActual.data[idx + 3] = actualData[idx + 3];
                        
                        // Copy baseline image data
                        normalizedBaseline.data[idx] = baselineData[idx];
                        normalizedBaseline.data[idx + 1] = baselineData[idx + 1];
                        normalizedBaseline.data[idx + 2] = baselineData[idx + 2];
                        normalizedBaseline.data[idx + 3] = baselineData[idx + 3];
                    }
                }
                
                console.log('Images successfully normalized using canvas library.');
            }
            
            // Save the normalized images for debugging
            const normalizedActualPath = actualPath.replace('.png', '_normalized.png');
            const normalizedBaselinePath = baselinePath.replace('.png', '_normalized.png');
            fs.writeFileSync(normalizedActualPath, PNG.sync.write(normalizedActual));
            fs.writeFileSync(normalizedBaselinePath, PNG.sync.write(normalizedBaseline));
            console.log(`Saved normalized images to: ${normalizedActualPath} and ${normalizedBaselinePath}`);
            
            // Compare normalized images
            const diffPixels = pixelmatch(
                normalizedActual.data,
                normalizedBaseline.data,
                diff.data,
                targetWidth,
                targetHeight,
                {
                    threshold: options.threshold ?? 0.3,
                    includeAA: options.includeAA ?? true,
                    alpha: options.alpha ?? 0.3,
                    diffColor: options.diffColor ?? [255, 0, 0] as [number, number, number],
                    diffMask: options.diffMask ?? false
                }
            );
            
            // Write the diff image
            fs.writeFileSync(diffPath, PNG.sync.write(diff));
            
            // Calculate percentage different for better context
            const totalPixels = targetWidth * targetHeight;
            const percentDifferent = (diffPixels / totalPixels) * 100;
            
            // Set acceptable difference threshold (default 5%)
            const maxAcceptableDiffPercentage = options.maxDiffPercentage ?? 5.0;
            const maxAcceptableDiffPixels = Math.floor(totalPixels * (maxAcceptableDiffPercentage / 100));
            
            console.log(`Pixel difference count after normalizing: ${diffPixels} (${percentDifferent.toFixed(2)}% of total)`);
            console.log(`Maximum acceptable difference: ${maxAcceptableDiffPixels} pixels (${maxAcceptableDiffPercentage}%)`);
            
            return {
                diffPixels,
                percentDifferent,
                maxAcceptableDiffPixels,
                passed: diffPixels <= maxAcceptableDiffPixels
            };
            
        } catch (error) {
            console.error('Error during image normalization:', error);
            // Fallback to error diff if resizing fails
            createErrorDiffImage(diffPath, actualPath);
            
            return {
                diffPixels: 10000,
                percentDifferent: 50, // A high percentage but not 100% to differentiate from catastrophic failures
                maxAcceptableDiffPixels: 0,
                passed: false
            };
        }
    }
    
    // Create a PNG for the diff output if dimensions match
    const { width, height } = actualImg;
    const diff = new PNG({ width, height });
    
    // Default comparison settings with overrides from options
    const comparisonSettings = {
        threshold: options.threshold ?? 0.3,
        includeAA: options.includeAA ?? true,
        alpha: options.alpha ?? 0.3,
        diffColor: options.diffColor ?? [255, 0, 0] as [number, number, number],
        diffMask: options.diffMask ?? false
    };
    
    // Calculate pixels per image
    const totalPixels = width * height;
    
    // Compare the images - returns the number of different pixels
    const diffPixels = pixelmatch(
        actualImg.data,
        baselineImg.data,
        diff.data,
        width,
        height,
        comparisonSettings
    );
    
    // Force some difference in the diff image even if pixels are identical
    // This ensures the diff image is visually different from a blank image
    if (diffPixels === 0) {
        // Add a visible indicator that shows this was a perfect match
        // Use a frame around the image to indicate "perfect match"
        const borderWidth = 10;
        const blue = [0, 0, 255, 200];
        
        // Draw top and bottom borders
        for (let x = 0; x < width; x++) {
            // Top border
            for (let y = 0; y < borderWidth; y++) {
                const idx = (width * y + x) << 2;
                diff.data[idx] = blue[0];     // R
                diff.data[idx + 1] = blue[1]; // G
                diff.data[idx + 2] = blue[2]; // B
                diff.data[idx + 3] = blue[3]; // A
            }
            
            // Bottom border
            for (let y = height - borderWidth; y < height; y++) {
                const idx = (width * y + x) << 2;
                diff.data[idx] = blue[0];     // R
                diff.data[idx + 1] = blue[1]; // G
                diff.data[idx + 2] = blue[2]; // B
                diff.data[idx + 3] = blue[3]; // A
            }
        }
        
        // Draw left and right borders
        for (let y = 0; y < height; y++) {
            // Left border
            for (let x = 0; x < borderWidth; x++) {
                const idx = (width * y + x) << 2;
                diff.data[idx] = blue[0];     // R
                diff.data[idx + 1] = blue[1]; // G
                diff.data[idx + 2] = blue[2]; // B
                diff.data[idx + 3] = blue[3]; // A
            }
            
            // Right border
            for (let x = width - borderWidth; x < width; x++) {
                const idx = (width * y + x) << 2;
                diff.data[idx] = blue[0];     // R
                diff.data[idx + 1] = blue[1]; // G
                diff.data[idx + 2] = blue[2]; // B
                diff.data[idx + 3] = blue[3]; // A
            }
        }
        
        // Add "PERFECT MATCH" text in the center
        console.log('No differences found, adding visual indicator to diff image');
    }
    
    // Write the diff image to a file
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    
    // Calculate percentage different for better context
    const percentDifferent = (diffPixels / totalPixels) * 100;
    
    // Set acceptable difference threshold (default 5%)
    const maxAcceptableDiffPercentage = options.maxDiffPercentage ?? 5.0;
    const maxAcceptableDiffPixels = Math.floor(totalPixels * (maxAcceptableDiffPercentage / 100));
    
    console.log(`Pixel difference count: ${diffPixels} (${percentDifferent.toFixed(2)}% of total)`);
    console.log(`Maximum acceptable difference: ${maxAcceptableDiffPixels} pixels (${maxAcceptableDiffPercentage}%)`);
    
    // Determine if test passed
    const passed = diffPixels <= maxAcceptableDiffPixels;
    
    if (passed) {
        console.log(`Test passed: Difference of ${percentDifferent.toFixed(2)}% is within acceptable limit of ${maxAcceptableDiffPercentage}%`);
    } else {
        console.log(`Test failed: Difference of ${percentDifferent.toFixed(2)}% exceeds acceptable limit of ${maxAcceptableDiffPercentage}%`);
    }
    
    // Return results
    return {
        diffPixels,
        percentDifferent,
        maxAcceptableDiffPixels,
        passed
    };
}

/**
 * Creates an error diff image (red overlay) to use when dimensions don't match
 */
function createErrorDiffImage(diffPath: string, actualPath: string): void {
    try {
        // Read the actual image to get dimensions
        const actualImg = PNG.sync.read(fs.readFileSync(actualPath));
        const { width, height } = actualImg;
        
        // Create a new PNG with same dimensions
        const errorDiff = new PNG({ width, height });
        
        // Fill with a semi-transparent red to indicate error
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (width * y + x) << 2;
                
                // Red with medium opacity
                errorDiff.data[idx] = 255;    // R
                errorDiff.data[idx + 1] = 0;  // G
                errorDiff.data[idx + 2] = 0;  // B
                errorDiff.data[idx + 3] = 100; // A (semi-transparent)
            }
        }
        
        // Write the diff image to a file
        fs.writeFileSync(diffPath, PNG.sync.write(errorDiff));
        console.log(`Created error diff image: ${diffPath}`);
    } catch (error) {
        console.error('Error creating error diff image:', error);
    }
}

/**
 * Creates a desktop browser context with standard settings
 */
export async function createDesktopContext(
    browser: any, 
    options: {
        width?: number;
        height?: number;
        locale?: string;
    } = {}
): Promise<BrowserContext> {
    return await browser.newContext({
        viewport: { 
            width: options.width ?? 1920, 
            height: options.height ?? 1080 
        },
        locale: options.locale,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false
    });
}

/**
 * Creates a mobile browser context with standard settings
 */
export async function createMobileContext(
    browser: any,
    deviceName: string = 'iPhone 12',
    options: {
        locale?: string;
    } = {}
): Promise<BrowserContext> {
    const devices = require('@playwright/test').devices;
    
    return await browser.newContext({
        ...devices[deviceName],
        locale: options.locale,
        isMobile: true,
        hasTouch: true
    });
}

/**
 * Additional options for screenshot comparison including similarity-based methods
 */
export interface AdvancedComparisonOptions extends ComparisonOptions {
    useSimilarityComparison?: boolean;  // Whether to use perceptual hash and SSIM instead of pixel-by-pixel
    hashThreshold?: number;             // Maximum hash distance to consider similar (0-1)
    ssimThreshold?: number;             // Minimum SSIM score to consider similar (0-1)
}

/**
 * Creates an empty diff image (green transparent overlay) to use when no baseline exists
 */
function createEmptyDiffImage(diffPath: string, actualPath: string): void {
    try {
        // Read the actual image to get dimensions
        const actualImg = PNG.sync.read(fs.readFileSync(actualPath));
        const { width, height } = actualImg;
        
        // Create a new PNG with same dimensions
        const emptyDiff = new PNG({ width, height });
        
        // Fill with a semi-transparent green to indicate "new baseline"
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (width * y + x) << 2;
                
                // Very light green with low opacity
                emptyDiff.data[idx] = 0;      // R
                emptyDiff.data[idx + 1] = 255;  // G
                emptyDiff.data[idx + 2] = 0;    // B
                emptyDiff.data[idx + 3] = 30;   // A (mostly transparent)
            }
        }
        
        // Write the diff image to a file
        fs.writeFileSync(diffPath, PNG.sync.write(emptyDiff));
    } catch (error) {
    }
}
