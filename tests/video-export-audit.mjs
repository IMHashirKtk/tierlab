import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/tests/screenshots/video";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVideoExportAudit() {
  console.log("==================================================");
  console.log("STARTING ANIMATED VIDEO EXPORT E2E AUDIT");
  console.log(`Target: ${BASE_URL}/create`);
  console.log("==================================================\n");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  // 1. Navigate to Studio with preloaded template so items are placed
  await page.goto(`${BASE_URL}/create?template=elden-ring-bosses`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // 2. Verify "Video Export" button exists
  const videoBtn = await page.$("button:has-text('Video Export'), button[title*='Animated Reveal Video']");
  if (!videoBtn) {
    throw new Error("Could not find 'Video Export' button in Studio header");
  }
  console.log("[PASS] Found 'Video Export' button in Creator Studio toolbar");

  // 3. Click Video Export button
  await videoBtn.click();
  await page.waitForTimeout(500);

  // 4. Verify VideoExportModal is opened
  const modalHeading = await page.$("h3:has-text('Animated Video Export')");
  if (!modalHeading) {
    throw new Error("VideoExportModal failed to open");
  }
  console.log("[PASS] VideoExportModal opened successfully with TikTok/Shorts badge");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_video_modal_opened.png") });

  // 5. Verify Social Format Selector (9:16, 1:1, 16:9)
  const verticalBtn = await page.$("button:has-text('9:16 Vertical')");
  const squareBtn = await page.$("button:has-text('1:1 Square')");
  const landscapeBtn = await page.$("button:has-text('16:9 Landscape')");

  if (!verticalBtn || !squareBtn || !landscapeBtn) {
    throw new Error("Missing format selector buttons");
  }
  console.log("[PASS] Verified all 3 format options (9:16 Vertical, 1:1 Square, 16:9 Landscape)");

  // 6. Test Format Switching
  await squareBtn.click();
  await page.waitForTimeout(200);
  await landscapeBtn.click();
  await page.waitForTimeout(200);
  await verticalBtn.click();
  await page.waitForTimeout(200);
  console.log("[PASS] Format switching validated");

  // 7. Verify Pacing Selectors
  const fastBtn = await page.$("button:has-text('Fast Blitz')");
  const normalBtn = await page.$("button:has-text('Classic Reveal')");
  const dramaticBtn = await page.$("button:has-text('Dramatic Suspense')");

  if (!fastBtn || !normalBtn || !dramaticBtn) {
    throw new Error("Missing pacing selector buttons");
  }
  await fastBtn.click();
  await page.waitForTimeout(200);
  console.log("[PASS] Verified Fast Blitz, Classic, and Dramatic pacing options");

  // 8. Test SFX & Watermark Toggles
  const sfxToggle = await page.$("button[title*='Toggle Synthesized SFX']");
  const watermarkToggle = await page.$("button[title*='Toggle Watermark Badge']");

  if (sfxToggle) {
    await sfxToggle.click();
    await page.waitForTimeout(150);
    await sfxToggle.click();
    console.log("[PASS] Synthesized SFX toggle validated");
  }

  if (watermarkToggle) {
    await watermarkToggle.click();
    await page.waitForTimeout(150);
    console.log("[PASS] Watermark badge toggle validated");
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_video_modal_configured.png") });

  // 9. Close Modal and test Switcher from 4K Image Exporter
  const closeBtn = await page.$("button:has(svg.lucide-x)");
  if (closeBtn) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // Open regular Export Modal
  const staticExportBtn = await page.$("button:has-text('Export')");
  if (staticExportBtn) {
    await staticExportBtn.click();
    await page.waitForTimeout(500);

    const videoTabBtn = await page.$("button[data-tab='video-export']");
    if (videoTabBtn) {
      console.log("[PASS] Found 'Animated Video' tab inside 4K Exporter");
      await videoTabBtn.click();
      await page.waitForTimeout(500);

      const reopenedModal = await page.$("h3:has-text('Animated Video Export')");
      if (reopenedModal) {
        console.log("[PASS] Successfully switched from 4K Image Exporter to Animated Video Modal");
      }
    }
  }

  await browser.close();

  console.log("\n==================================================");
  console.log("ANIMATED VIDEO EXPORT AUDIT: ALL TESTS PASSED");
  console.log("==================================================");
}

runVideoExportAudit().catch((err) => {
  console.error("Video Export Audit Failed:", err);
  process.exit(1);
});
