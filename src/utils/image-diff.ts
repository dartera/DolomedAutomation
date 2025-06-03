import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface DiffResult {
  diffCount: number;
  diffPercentage: number;
  diffPath: string;
}

export interface SizeMismatchTolerance {
  maxHeightDiff?: number;
  maxWidthDiff?: number;
  autoResize?: boolean;
}

export class ImageComparison {
  constructor(
    private readonly snapshotsDir: string = './snapshots',
    private readonly resultsDir: string = './test-results',
    private readonly diffDir: string = './test-results/diff'
  ) {
    // Create directories if they don't exist
    [this.snapshotsDir, this.resultsDir, this.diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private resizeImageToMatch(sourceImage: PNG, targetWidth: number, targetHeight: number): PNG {
    const resized = new PNG({ width: targetWidth, height: targetHeight });
    
    // Calculate scaling ratios
    const scaleX = sourceImage.width / targetWidth;
    const scaleY = sourceImage.height / targetHeight;
    
    // Simple nearest-neighbor resampling for image resizing
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const sourceX = Math.floor(x * scaleX);
        const sourceY = Math.floor(y * scaleY);
        
        // Ensure source coordinates are within bounds
        const clampedSourceX = Math.min(sourceX, sourceImage.width - 1);
        const clampedSourceY = Math.min(sourceY, sourceImage.height - 1);
        
        const sourceIdx = (sourceImage.width * clampedSourceY + clampedSourceX) << 2;
        const targetIdx = (targetWidth * y + x) << 2;
        
        // Copy RGBA values
        resized.data[targetIdx] = sourceImage.data[sourceIdx];         // R
        resized.data[targetIdx + 1] = sourceImage.data[sourceIdx + 1]; // G
        resized.data[targetIdx + 2] = sourceImage.data[sourceIdx + 2]; // B
        resized.data[targetIdx + 3] = sourceImage.data[sourceIdx + 3]; // A
      }
    }
    
    // Copy metadata properties to match expected type
    Object.setPrototypeOf(resized, PNG.prototype);
    
    return resized;
  }

  private async _normalizeScreenshotHeightToMax(page: Page, imagePath: string): Promise<void> {
    const viewport = page.viewportSize();
    if (!viewport) {
        console.warn(`[ImageComparison] Viewport size not available for ${imagePath}. Skipping max height normalization.`);
        return;
    }

    const isMobileView = viewport.width <= 768; // Consistent with common practice

    const MAX_DESKTOP_HEIGHT = 7500;
    const MAX_MOBILE_HEIGHT = 11000;
    const targetMaxHeight = isMobileView ? MAX_MOBILE_HEIGHT : MAX_DESKTOP_HEIGHT;
    const targetWidth = viewport.width;

    try {
        const initialImageBuffer = fs.readFileSync(imagePath);
        const initialImage = PNG.sync.read(initialImageBuffer);

        console.log(`[ImageComparison] Initial screenshot for ${imagePath}: ${initialImage.width}x${initialImage.height}. Max height normalization target: ${targetWidth}x${targetMaxHeight} (${isMobileView ? 'mobile' : 'desktop'}).`);

        // If actual height is already less than or equal to max target height, and width matches, no processing needed.
        if (initialImage.width === targetWidth && initialImage.height <= targetMaxHeight) {
            console.log(`[ImageComparison] Screenshot ${imagePath} (${initialImage.height}px) is already within max target height (${targetMaxHeight}px). No normalization needed.`);
            return;
        }
        
        let success = false;
        // Try Sharp first
        try {
            const sharp = require('sharp');
            const tempNormalizedPath = imagePath + '.normalized_max_h.png';

            // Create a new canvas of targetWidth and targetMaxHeight, white background.
            // Composite the (potentially larger) original screenshot onto this canvas, aligned top-left.
            // This effectively crops if the original is larger, or pads with white if smaller (though padding isn't expected here as we check initialImage.height <= targetMaxHeight).
            await sharp({
                create: {
                    width: targetWidth,
                    height: targetMaxHeight,
                    channels: 4, // RGBA
                    background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
                }
            })
            .composite([{ input: initialImageBuffer, gravity: 'northwest' }]) // Place top-left of input at top-left
            .png()
            .toFile(tempNormalizedPath);
            
            fs.unlinkSync(imagePath);
            fs.renameSync(tempNormalizedPath, imagePath);
            console.log(`[ImageComparison] Screenshot ${imagePath} normalized to max height ${targetMaxHeight}px (output ${targetWidth}x${targetMaxHeight}) using sharp.`);
            success = true;
        } catch (sharpError: any) {
            console.warn(`[ImageComparison] Sharp processing for max height normalization failed for ${imagePath}: ${sharpError.message}. Falling back to canvas.`);
        }

        // Fallback to Canvas if Sharp failed
        if (!success) {
            const { createCanvas, Image } = require('canvas');
            const canvas = createCanvas(targetWidth, targetMaxHeight);
            const ctx = canvas.getContext('2d');

            // Fill with white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, targetWidth, targetMaxHeight);
            
            const img = new Image();
            img.src = initialImageBuffer; 
            
            // Draw the source image, taking the top part.
            // The canvas itself (targetWidth x targetMaxHeight) will clip the image.
            ctx.drawImage(img, 0, 0, initialImage.width, initialImage.height); 
                                  
            fs.writeFileSync(imagePath, canvas.toBuffer('image/png'));
            console.log(`[ImageComparison] Screenshot ${imagePath} normalized to max height ${targetMaxHeight}px (output ${targetWidth}x${targetMaxHeight}) using canvas.`);
        }

        const finalImage = PNG.sync.read(fs.readFileSync(imagePath));
        if (finalImage.width !== targetWidth || finalImage.height !== targetMaxHeight) {
            console.warn(`[ImageComparison] Post-max-height-normalization dimensions for ${imagePath} are ${finalImage.width}x${finalImage.height}, expected ${targetWidth}x${targetMaxHeight}.`);
        } else {
            console.log(`[ImageComparison] Final screenshot dimensions after max height normalization for ${imagePath}: ${finalImage.width}x${finalImage.height}.`);
        }

    } catch (error: any) {
        console.error(`[ImageComparison] Error during max height screenshot normalization for ${imagePath}: ${error.message}. Original screenshot will be used if processing failed before overwriting.`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

  async compareScreenshots(
    page: Page,
    testName: string,
    threshold: number = 0.7,
    sizeMismatchTolerance?: SizeMismatchTolerance
  ): Promise<DiffResult> {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const baselinePath = path.join(this.snapshotsDir, `${testName}.png`);
    const currentPath = path.join(this.resultsDir, `${testName}.png`);
    const diffPath = path.join(this.diffDir, `${testName}-diff.png`);

    // Take current screenshot
    await page.screenshot({
      path: currentPath,
      fullPage: true
    });

    // Normalize screenshot to max height BEFORE reading it for comparison or size checks
    await this._normalizeScreenshotHeightToMax(page, currentPath);

    // If no baseline exists, throw an error instead of creating one
    if (!fs.existsSync(baselinePath)) {
      const errorMessage = `
        ❌ No baseline image found for test: ${testName}
        Expected baseline at: ${baselinePath}
        Current screenshot saved at: ${currentPath}
        
        To create the baseline, run: npx playwright test --update-snapshots
        Or manually copy the current screenshot to the baseline location.
      `;
      console.error(errorMessage);
      throw new Error(`No baseline image found for test: ${testName}. Run with --update-snapshots to create baseline.`);
    }

    // Read images
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    let normalizedBaseline = baseline;
    let normalizedCurrent = current;
    let targetWidth = baseline.width;
    let targetHeight = baseline.height;

    // Check if image sizes match
    if (baseline.width !== current.width || baseline.height !== current.height) {
      const widthDiff = Math.abs(baseline.width - current.width);
      const heightDiff = Math.abs(baseline.height - current.height);
      
      // Check if differences are within tolerance
      const maxWidthDiff = sizeMismatchTolerance?.maxWidthDiff ?? 5;
      const maxHeightDiff = sizeMismatchTolerance?.maxHeightDiff ?? 10;
      const autoResize = sizeMismatchTolerance?.autoResize ?? true;
      
      // Calculate percentage differences for both dimensions
      const heightDiffPercentage = (heightDiff / baseline.height) * 100;
      const widthDiffPercentage = (widthDiff / baseline.width) * 100;
      const isExtremeMismatch = heightDiffPercentage > 50 || widthDiffPercentage > 50;
      
      if (isExtremeMismatch) {
        console.error(`
          ❌ Extreme size mismatch detected for ${testName}:
          - Baseline: ${baseline.width}x${baseline.height}
          - Current: ${current.width}x${current.height}
          - Width difference: ${widthDiff}px (${widthDiffPercentage.toFixed(1)}%)
          - Height difference: ${heightDiff}px (${heightDiffPercentage.toFixed(1)}%)
          
          This suggests fundamentally different content.
          Skipping pixel-level comparison as resizing would mask real differences.
          Creating visual report for manual inspection.
        `);
        
        // Create a visual report without resizing/comparison for extreme mismatches
        const reportPath = this.generateSizeMismatchReport(testName, baseline, current, {
          widthDiff,
          heightDiff,
          widthDiffPercentage,
          heightDiffPercentage
        });
        
        throw new Error(`Extreme size mismatch (${Math.max(widthDiffPercentage, heightDiffPercentage).toFixed(1)}% size diff) for test: ${testName}. Visual report: ${reportPath}`);
      }
      
      const withinTolerance = widthDiff <= maxWidthDiff && heightDiff <= maxHeightDiff;
      
      if (withinTolerance && !autoResize) {
        console.log(`
          ℹ️ Minor size difference for ${testName} (within tolerance):
          - Width diff: ${widthDiff}px (max: ${maxWidthDiff}px)
          - Height diff: ${heightDiff}px (max: ${maxHeightDiff}px)
          - Proceeding without resize as autoResize is disabled
        `);
      } else if (!autoResize) {
        console.error(`
          ❌ Size mismatch exceeds tolerance for ${testName}:
          - Baseline: ${baseline.width}x${baseline.height}
          - Current: ${current.width}x${current.height}
          - Width diff: ${widthDiff}px (max: ${maxWidthDiff}px)
          - Height diff: ${heightDiff}px (max: ${maxHeightDiff}px)
          
          Auto-resize is disabled. Enable autoResize or update baseline.
        `);
        throw new Error(`Size mismatch exceeds tolerance for test: ${testName}. Enable autoResize or run with --update-snapshots.`);
      } else {
        console.log(`
          ⚠️ Size mismatch detected for ${testName}:
          - Baseline: ${baseline.width}x${baseline.height}
          - Current: ${current.width}x${current.height}
          - Width diff: ${widthDiff}px (tolerance: ${maxWidthDiff}px)
          - Height diff: ${heightDiff}px (tolerance: ${maxHeightDiff}px)
          
          🔧 Auto-resizing images to match baseline dimensions for comparison...
        `);
        
        // Use baseline dimensions as target (preserve baseline size)
        targetWidth = baseline.width;
        targetHeight = baseline.height;
        
        // If current image has different dimensions, resize it to match baseline
        if (current.width !== targetWidth || current.height !== targetHeight) {
          console.log(`Resizing current image from ${current.width}x${current.height} to ${targetWidth}x${targetHeight}`);
          normalizedCurrent = this.resizeImageToMatch(current, targetWidth, targetHeight) as any;
          
          // Save the resized current image for debugging
          const resizedCurrentPath = currentPath.replace('.png', '_resized.png');
          fs.writeFileSync(resizedCurrentPath, PNG.sync.write(normalizedCurrent));
          console.log(`Resized current image saved at: ${resizedCurrentPath}`);
        }
        
        // If baseline image needs resizing (shouldn't normally happen, but for consistency)
        if (baseline.width !== targetWidth || baseline.height !== targetHeight) {
          console.log(`Resizing baseline image from ${baseline.width}x${baseline.height} to ${targetWidth}x${targetHeight}`);
          normalizedBaseline = this.resizeImageToMatch(baseline, targetWidth, targetHeight) as any;
        }
        
        console.log(`✅ Images normalized to ${targetWidth}x${targetHeight} for comparison`);
      }
    }

    // Create diff PNG
    const { width, height } = normalizedBaseline;
    const diff = new PNG({ width, height });

    // Compare normalized images
    const diffCount = pixelmatch(
      normalizedBaseline.data,
      normalizedCurrent.data,
      diff.data,
      width,
      height,
      { threshold }
    );

    // Calculate diff percentage
    const totalPixels = width * height;
    const diffPercentage = (diffCount / totalPixels) * 100;

    // Save diff image
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    console.log(`
      Image comparison at ${timestamp}:
      - Normalized dimensions: ${width}x${height}
      - Diff pixels: ${diffCount}
      - Diff percentage: ${diffPercentage.toFixed(2)}%
      - Diff image saved to: ${diffPath}
    `);

    return { diffCount, diffPercentage, diffPath };
  }

  generateSizeMismatchReport(
    testName: string, 
    baseline: PNG, 
    current: PNG, 
    mismatchInfo: {
      widthDiff: number;
      heightDiff: number;
      widthDiffPercentage: number;
      heightDiffPercentage: number;
    }
  ): string {
    const reportPath = path.join(this.resultsDir, `${testName}-size-mismatch-report.html`);
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const currentUser = process.env.USER || process.env.USERNAME || 'unknown';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Size Mismatch Report - ${testName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .error-info { 
            background: #ffe6e6;
            color: #d63384;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 4px solid #d63384;
          }
          .image-container { display: flex; gap: 20px; margin-top: 20px; }
          .image-box { flex: 1; }
          .image-box img { max-width: 100%; border: 1px solid #ccc; }
          .size-info { 
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
          }
          .diff-table {
            background: #fff3cd;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f8f9fa; }
        </style>
      </head>
      <body>
        <h1>Size Mismatch Report</h1>
        <div class="error-info">
          <h3>🚫 Extreme Size Mismatch Detected</h3>
          <p>The current screenshot differs significantly from the baseline, suggesting fundamentally different content.</p>
          <p><strong>Test:</strong> ${testName}</p>
          <p><strong>Timestamp:</strong> ${timestamp}</p>
          <p><strong>User:</strong> ${currentUser}</p>
        </div>
        
        <div class="diff-table">
          <h3>Size Comparison</h3>
          <table>
            <tr>
              <th>Dimension</th>
              <th>Baseline</th>
              <th>Current</th>
              <th>Difference</th>
              <th>Percentage</th>
            </tr>
            <tr>
              <td>Width</td>
              <td>${baseline.width}px</td>
              <td>${current.width}px</td>
              <td>${mismatchInfo.widthDiff}px</td>
              <td>${mismatchInfo.widthDiffPercentage.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Height</td>
              <td>${baseline.height}px</td>
              <td>${current.height}px</td>
              <td>${mismatchInfo.heightDiff}px</td>
              <td>${mismatchInfo.heightDiffPercentage.toFixed(1)}%</td>
            </tr>
          </table>
        </div>
        
        <div class="image-container">
          <div class="image-box">
            <h3>Baseline Image</h3>
            <div class="size-info">Size: ${baseline.width}x${baseline.height}</div>
            <img src="../snapshots/${testName}.png" alt="Baseline">
          </div>
          <div class="image-box">
            <h3>Current Screenshot</h3>
            <div class="size-info">Size: ${current.width}x${current.height}</div>
            <img src="${testName}.png" alt="Current">
          </div>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 4px;">
          <h3>🔧 Recommendations</h3>
          <ul>
            <li>Verify that your test is navigating to the correct page</li>
            <li>Check if viewport settings match between baseline and current test</li>
            <li>If the current screenshot is correct, update the baseline with: <code>npx playwright test --update-snapshots</code></li>
            <li>If this is a different page/content, check your test configuration</li>
          </ul>
        </div>
      </body>
      </html>
    `;

    fs.writeFileSync(reportPath, html);
    console.log(`📊 Size mismatch report created: ${reportPath}`);
    return reportPath;
  }

  generateDiffReport(testName: string, diffResult: DiffResult): string {
    const reportPath = path.join(this.resultsDir, `${testName}-report.html`);
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const currentUser = process.env.USER || process.env.USERNAME || 'unknown';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Visual Regression Test Report - ${testName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .image-container { display: flex; gap: 20px; margin-top: 20px; }
          .image-box { flex: 1; }
          img { max-width: 100%; border: 1px solid #ccc; }
          .diff-info { 
            background: ${diffResult.diffPercentage > 0 ? '#ffe6e6' : '#e6ffe6'};
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .warning { 
            background: #fff3cd;
            color: #856404;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Visual Regression Test Report</h1>
        <div class="diff-info">
          <p>Test: ${testName}</p>
          <p>Timestamp: ${timestamp}</p>
          <p>User: ${currentUser}</p>
          <p>Diff Pixels: ${diffResult.diffCount}</p>
          <p>Diff Percentage: ${diffResult.diffPercentage.toFixed(2)}%</p>
        </div>
        <div class="image-container">
          <div class="image-box">
            <h3>Baseline</h3>
            <img src="../snapshots/${testName}.png" alt="Baseline">
          </div>
          <div class="image-box">
            <h3>Current</h3>
            <img src="${testName}.png" alt="Current">
          </div>
          <div class="image-box">
            <h3>Diff</h3>
            <img src="diff/${testName}-diff.png" alt="Diff">
          </div>
        </div>
      </body>
      </html>
    `;

    fs.writeFileSync(reportPath, html);
    return reportPath;
  }
}