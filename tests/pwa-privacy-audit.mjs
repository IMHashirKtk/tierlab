import { chromium } from "playwright";

async function runAudit() {
  console.log("==================================================");
  console.log("🚀 STARTING PWA & LOCAL-FIRST PRIVACY HUB E2E AUDIT");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
  });
  const page = await context.newPage();

  try {
    // 1. Web App Manifest Audit
    console.log("\n--- Audit 1: Web App Manifest ---");
    const manifestRes = await page.goto("http://localhost:3000/manifest.webmanifest");
    assert(manifestRes.status() === 200, "Manifest route returns HTTP 200");
    const manifestJson = JSON.parse(await manifestRes.text());
    assert(manifestJson.name.includes("Tier List Maker"), `Manifest name is '${manifestJson.name}'`);
    assert(manifestJson.short_name === "TierListMaker", `Manifest short_name is '${manifestJson.short_name}'`);
    assert(manifestJson.display === "standalone", `Manifest display is standalone`);
    assert(manifestJson.start_url === "/", `Manifest start_url is /`);
    assert(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 4, "Manifest specifies 4+ icons");

    const has192 = manifestJson.icons.some((i) => i.sizes === "192x192");
    const has512 = manifestJson.icons.some((i) => i.sizes === "512x512");
    const hasMaskable = manifestJson.icons.some((i) => i.purpose === "maskable");
    assert(has192 && has512 && hasMaskable, "Manifest has 192x192, 512x512, and maskable icons");

    // 2. Icon Assets Audit
    console.log("\n--- Audit 2: Icon Assets Verification ---");
    for (const iconPath of ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable.png", "/icons/icon.svg"]) {
      const res = await page.goto(`http://localhost:3000${iconPath}`);
      assert(res.status() === 200, `Icon asset accessible: ${iconPath}`);
    }

    // 3. Service Worker Asset Audit
    console.log("\n--- Audit 3: Service Worker File Verification ---");
    const swRes = await page.goto("http://localhost:3000/sw.js");
    assert(swRes.status() === 200, "Service worker /sw.js accessible HTTP 200");
    const swText = await swRes.text();
    assert(swText.includes("tierlistmaker-pwa"), "Service worker contains tierlistmaker cache name");
    assert(swText.includes("PRECACHE_ASSETS"), "Service worker contains precache list");

    // 4. Homepage & Navbar Privacy Hub Trigger
    console.log("\n--- Audit 4: Homepage & Navbar UI Trigger ---");
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("networkidle");

    const localFirstBtn = page.locator("header button:has-text('Local-First')");
    await localFirstBtn.waitFor({ state: "visible", timeout: 5000 });
    assert(await localFirstBtn.isVisible(), "Navbar 'Local-First' button is visible");

    // Click Local-First button
    await localFirstBtn.click();
    const modal = page.locator("div[aria-labelledby='privacy-modal-title']");
    await modal.waitFor({ state: "visible", timeout: 5000 });
    assert(await modal.isVisible(), "Privacy & Device Storage Modal opened");

    const modalTitle = page.locator("#privacy-modal-title");
    assert((await modalTitle.textContent()).includes("Privacy & Device Storage Hub"), "Modal title verified");

    const localFirstPill = modal.locator("text=100% Local-First");
    assert(await localFirstPill.isVisible(), "'100% Local-First' trust badge visible in modal");

    // 5. Storage Inspection & Portability
    console.log("\n--- Audit 5: Storage Metrics & Backup Portability ---");
    const exportBtn = modal.locator("button:has-text('Export Backup (.json)')");
    assert(await exportBtn.isVisible(), "Export Backup button is visible");

    // Test JSON export download
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      exportBtn.click(),
    ]);
    const downloadName = download.suggestedFilename();
    assert(downloadName.startsWith("tierlistmaker-backup-") && downloadName.endsWith(".json"), `Export filename valid: ${downloadName}`);

    // Read exported json
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const jsonStr = Buffer.concat(chunks).toString("utf-8");
    const backupData = JSON.parse(jsonStr);
    assert(backupData.generator === "tierlistmaker.app", "Backup generator identifier is tierlistmaker.app");
    assert(Array.isArray(backupData.projects), "Backup contains projects array");

    // Close modal
    const doneBtn = modal.locator("button:has-text('Done')");
    await doneBtn.click();
    await modal.waitFor({ state: "hidden", timeout: 3000 });
    assert(await modal.isHidden(), "Modal closes cleanly via Done button");

    // 6. Studio Live Save Status & Storage Trigger
    console.log("\n--- Audit 6: Studio Integration ---");
    await page.goto("http://localhost:3000/create");
    await page.waitForLoadState("networkidle");

    const studioSaveIndicator = page.locator("button:has-text('Saved to device')");
    await studioSaveIndicator.waitFor({ state: "visible", timeout: 5000 });
    assert(await studioSaveIndicator.isVisible(), "Studio 'Saved to device' indicator button visible");

    // Click save indicator to open Privacy modal
    await studioSaveIndicator.click();
    await modal.waitFor({ state: "visible", timeout: 5000 });
    assert(await modal.isVisible(), "Studio save indicator opened Privacy Storage Modal");

    // Close via X button
    const closeXBtn = modal.locator("button[aria-label='Close']");
    await closeXBtn.click();
    await modal.waitFor({ state: "hidden", timeout: 3000 });
    assert(await modal.isHidden(), "Modal closes cleanly via X button in Studio");

    // 7. My Projects Hub Trigger
    console.log("\n--- Audit 7: My Projects Integration ---");
    await page.goto("http://localhost:3000/my-projects");
    await page.waitForLoadState("networkidle");

    const myProjectsStorageBtn = page.locator("button:has-text('Backup & Storage')");
    await myProjectsStorageBtn.waitFor({ state: "visible", timeout: 5000 });
    assert(await myProjectsStorageBtn.isVisible(), "My Projects 'Backup & Storage' button is visible");

    await myProjectsStorageBtn.click();
    await modal.waitFor({ state: "visible", timeout: 5000 });
    assert(await modal.isVisible(), "My Projects button opened Privacy Storage Modal");
    await modal.locator("button:has-text('Done')").click();
    await modal.waitFor({ state: "hidden", timeout: 3000 });

    // 8. Offline Mode Banner Simulation
    console.log("\n--- Audit 8: Offline Mode Banner Simulation ---");
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("networkidle");

    // Trigger offline event
    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });

    const offlineBanner = page.locator("div[role='status']");
    await offlineBanner.waitFor({ state: "visible", timeout: 3000 });
    assert(await offlineBanner.isVisible(), "Offline Mode banner appears when network drops");
    assert((await offlineBanner.textContent()).includes("Offline Mode Active"), "Offline banner contains alert copy");

    // Trigger online event to clear
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });
    await offlineBanner.waitFor({ state: "hidden", timeout: 3000 });
    assert(await offlineBanner.isHidden(), "Offline banner disappears when network resumes");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log("\n==================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
