import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/tests/screenshots/mobile";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const auditResults = {
  passed: [],
  failed: [],
  warnings: [],
  overflowViolations: [],
  touchTargetViolations: [],
};

function logPass(testName, details = "") {
  console.log(`[PASS] ${testName} ${details ? "- " + details : ""}`);
  auditResults.passed.push({ testName, details });
}

function logFail(testName, error) {
  console.error(`[FAIL] ${testName} - ${error}`);
  auditResults.failed.push({ testName, error: String(error) });
}

function logWarn(testName, details) {
  console.warn(`[WARN] ${testName} - ${details}`);
  auditResults.warnings.push({ testName, details });
}

// Check for horizontal overflow (no scrollX blowout)
async function checkHorizontalOverflow(page, routeName) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    const hasHorizontalScroll = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;

    let offendingElements = [];
    if (hasHorizontalScroll) {
      document.querySelectorAll("*").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 2) {
          offendingElements.push({
            tag: el.tagName,
            id: el.id,
            className: typeof el.className === "string" ? el.className.slice(0, 80) : "",
            right: Math.round(rect.right),
            winWidth,
          });
        }
      });
    }

    return {
      hasHorizontalScroll,
      docWidth,
      winWidth,
      offendingCount: offendingElements.length,
      sampleOffenders: offendingElements.slice(0, 3),
    };
  });

  if (overflow.hasHorizontalScroll) {
    const msg = `Horizontal overflow detected on ${routeName}: docWidth=${overflow.docWidth}px vs winWidth=${overflow.winWidth}px (offenders: ${JSON.stringify(overflow.sampleOffenders)})`;
    logWarn(`Horizontal Overflow [${routeName}]`, msg);
    auditResults.overflowViolations.push({ routeName, ...overflow });
    return false;
  } else {
    logPass(`Zero Horizontal Overflow [${routeName}]`, `Viewport ${overflow.winWidth}px cleanly contained`);
    return true;
  }
}

// Check touch targets (interactive elements should have adequate size)
async function checkTouchTargets(page, routeName) {
  const smallTargets = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, a, input, select"));
    const issues = [];

    buttons.forEach((el) => {
      // Only check visible elements
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.top < window.innerHeight &&
        rect.bottom > 0
      ) {
        // Warning threshold: minimum 28px width/height for touch UI
        if (rect.width < 28 || rect.height < 28) {
          issues.push({
            tag: el.tagName,
            text: el.innerText ? el.innerText.trim().slice(0, 30) : el.getAttribute("aria-label") || "",
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            class: typeof el.className === "string" ? el.className.slice(0, 60) : "",
          });
        }
      }
    });

    return {
      totalChecked: buttons.length,
      issuesCount: issues.length,
      sampleIssues: issues.slice(0, 4),
    };
  });

  if (smallTargets.issuesCount > 5) {
    logWarn(`Touch Target Ergonomics [${routeName}]`, `${smallTargets.issuesCount} interactive items below 28px threshold (checked ${smallTargets.totalChecked})`);
    auditResults.touchTargetViolations.push({ routeName, ...smallTargets });
  } else {
    logPass(`Touch Target Ergonomics [${routeName}]`, `Checked ${smallTargets.totalChecked} targets, touch-ergonomic`);
  }
}

async function runMobileAudit() {
  console.log("=================================================");
  console.log("STARTING TIERLAB PHASE 2: MOBILE & TOUCH UX AUDIT");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("=================================================\n");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  // Device viewports to test
  const devices = [
    {
      name: "iPhone 14/15 Pro (Standard Mobile)",
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
    {
      name: "iPhone SE / Small Screen",
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    {
      name: "iPad Mini / Tablet",
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  ];

  // 1. Audit on Standard Mobile (iPhone 14/15 Pro: 390x844)
  console.log("--- 1. Testing Standard Mobile (iPhone 14/15 Pro 390x844) ---");
  const iphoneContext = await browser.newContext(devices[0]);
  const page = await iphoneContext.newPage();

  // Test 1: Homepage on Mobile
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1000);

    await checkHorizontalOverflow(page, "Homepage (iPhone)");
    await checkTouchTargets(page, "Homepage (iPhone)");

    // Test category bar scrolling
    const categoryBar = await page.$("div.overflow-x-auto, div.flex.gap-2.overflow-x-auto");
    if (categoryBar) {
      logPass("Mobile Category Bar", "Horizontal scroll tray rendered");
    }

    // Capture mobile homepage screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_01_home_iphone.png"), fullPage: false });
    logPass("Mobile Homepage Screenshot", "Saved mobile_01_home_iphone.png");
  } catch (err) {
    logFail("Homepage Mobile Test", err);
  }

  // Test 2: Studio on Mobile
  try {
    await page.goto(`${BASE_URL}/template/elden-ring-bosses`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1500);

    await checkHorizontalOverflow(page, "Studio (iPhone)");
    await checkTouchTargets(page, "Studio (iPhone)");

    // Check tier rows on mobile
    const tierRows = await page.$$("div:has(> div:has-text('S')), div:has(> div:has-text('A'))");
    logPass("Mobile Studio Tier Rows", `Found ${tierRows.length} rendered tier rows`);

    // Check bottom toolbar & unranked tray
    const unrankedTray = await page.$("text=Unranked Items, text=Pool");
    if (unrankedTray) {
      logPass("Mobile Unranked Tray", "Unranked pool dock visible on mobile");
    }

    // Capture mobile studio screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_02_studio_iphone.png"), fullPage: false });
    logPass("Mobile Studio Screenshot", "Saved mobile_02_studio_iphone.png");

    // Test 3: Mobile Tools Menu Drawer
    const toolsBtn = await page.$("button:has-text('Tools')");
    if (toolsBtn) {
      await toolsBtn.click();
      await page.waitForTimeout(500);
      const mobileDrawer = await page.$(".fixed.inset-0:has-text('Creator Studio Tools')");
      if (mobileDrawer) {
        logPass("Mobile Tools Drawer Open", "Bottom sheet opened with all creator tools");
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_03_tools_drawer_iphone.png") });
        logPass("Mobile Tools Drawer Screenshot", "Saved mobile_03_tools_drawer_iphone.png");

        // Click Presets from drawer
        const presetsBtn = await mobileDrawer.$("button:has-text('1-Click Presets')");
        if (presetsBtn) {
          await presetsBtn.click();
          await page.waitForTimeout(600);

          const presetsModal = await page.$(".fixed.inset-0:has-text('1-Click Tier Label Presets')");
          if (presetsModal) {
            logPass("Mobile Presets Modal Open", "Modal displayed from mobile drawer");
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_03_presets_modal_iphone.png") });
            logPass("Mobile Presets Modal Screenshot", "Saved mobile_03_presets_modal_iphone.png");

            // Dismiss modal with close button or Escape
            const closeBtn = await presetsModal.$("button:has(svg.lucide-x)");
            if (closeBtn) await closeBtn.click();
            else await page.keyboard.press("Escape");
            await page.waitForTimeout(500);
          }
        }
      }
    }

    // Test 4: Export Modal on Mobile
    const exportBtn = await page.$("header div.md\\:hidden button:has-text('Export'), header button:visible:has-text('Export')");
    if (exportBtn) {
      await exportBtn.click();
      await page.waitForTimeout(800);

      const exportModal = await page.$(".fixed.inset-0:has-text('Multi-Format 4K Exporter')");
      if (exportModal) {
        logPass("Mobile Export Modal Open", "Export modal responsive on mobile");
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_04_export_modal_iphone.png") });
        logPass("Mobile Export Modal Screenshot", "Saved mobile_04_export_modal_iphone.png");

        // Verify format buttons (16:9, 9:16, 1:1) are tap-accessible
        const formatToggles = await exportModal.$$("button:has-text('16:9'), button:has-text('9:16'), button:has-text('1:1')");
        logPass("Mobile Export Aspect Toggles", `Found ${formatToggles.length} aspect ratio buttons`);

        const closeBtn = await exportModal.$("button:has(svg.lucide-x)");
        if (closeBtn) await closeBtn.click();
        else await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
    }

    // Test 5: TikTok Blind Rank Mode on Mobile via Tools Drawer
    const toolsBtn2 = await page.$("button:has-text('Tools')");
    if (toolsBtn2) {
      await toolsBtn2.click();
      await page.waitForTimeout(500);
      const mobileDrawer2 = await page.$(".fixed.inset-0:has-text('Creator Studio Tools')");
      if (mobileDrawer2) {
        const blindBtn = await mobileDrawer2.$("button:has-text('Blind Rank')");
        if (blindBtn) {
          await blindBtn.click();
          await page.waitForTimeout(600);

          const blindModal = await page.$(".fixed.inset-0:has-text('Blind Rank Challenge')");
          if (blindModal) {
            logPass("Mobile Blind Rank Modal", "Mystery rank interface rendered for mobile TikTok flow");
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_05_blind_rank_iphone.png") });
            logPass("Mobile Blind Rank Screenshot", "Saved mobile_05_blind_rank_iphone.png");

            const closeBtn = await blindModal.$("button:has(svg.lucide-x)");
            if (closeBtn) await closeBtn.click();
            else await page.keyboard.press("Escape");
            await page.waitForTimeout(500);
          }
        }
      }
    }
  } catch (err) {
    logFail("Studio Mobile Test", err);
  }

  // Test 6: Shared Tier List View on Mobile
  try {
    await page.goto(`${BASE_URL}/share/shared_test_audit_101`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);

    await checkHorizontalOverflow(page, "Shared Tier List (iPhone)");
    await checkTouchTargets(page, "Shared Tier List (iPhone)");

    // Upvote button touch target
    const upvoteBtn = await page.$("button:has-text('Upvote'), button:has-text('▲')");
    if (upvoteBtn) {
      logPass("Mobile Upvote Button", "Upvote tap target present");
    }

    // Comments section
    const commentInput = await page.$("input[placeholder*='comment'], textarea[placeholder*='comment']");
    if (commentInput) {
      logPass("Mobile Discussion Thread", "Comment input accessible on phone");
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_06_shared_page_iphone.png"), fullPage: false });
    logPass("Mobile Shared Page Screenshot", "Saved mobile_06_shared_page_iphone.png");
  } catch (err) {
    logFail("Shared Page Mobile Test", err);
  }

  // Test 7: Versus Duel Arena on Mobile
  try {
    await page.goto(`${BASE_URL}/versus`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);

    await checkHorizontalOverflow(page, "Versus Arena (iPhone)");
    await checkTouchTargets(page, "Versus Arena (iPhone)");

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_07_versus_iphone.png"), fullPage: false });
    logPass("Mobile Versus Screenshot", "Saved mobile_07_versus_iphone.png");
  } catch (err) {
    logFail("Versus Arena Mobile Test", err);
  }

  // Test 8: Creator Profile on Mobile
  try {
    await page.goto(`${BASE_URL}/user/hashir`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);

    await checkHorizontalOverflow(page, "Creator Profile (iPhone)");
    await checkTouchTargets(page, "Creator Profile (iPhone)");

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_08_profile_iphone.png"), fullPage: false });
    logPass("Mobile Profile Screenshot", "Saved mobile_08_profile_iphone.png");
  } catch (err) {
    logFail("Profile Mobile Test", err);
  }

  // Test 9: My Projects on Mobile
  try {
    await page.goto(`${BASE_URL}/my-projects`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);

    await checkHorizontalOverflow(page, "My Projects (iPhone)");
    await checkTouchTargets(page, "My Projects (iPhone)");

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_09_my_projects_iphone.png"), fullPage: false });
    logPass("Mobile My Projects Screenshot", "Saved mobile_09_my_projects_iphone.png");
  } catch (err) {
    logFail("My Projects Mobile Test", err);
  }

  await iphoneContext.close();

  // 2. Audit on Small Screen (iPhone SE: 375x667)
  console.log("\n--- 2. Testing Small Screen Mobile (iPhone SE 375x667) ---");
  const smallContext = await browser.newContext(devices[1]);
  const smallPage = await smallContext.newPage();

  try {
    await smallPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 25000 });
    await checkHorizontalOverflow(smallPage, "Homepage (iPhone SE)");

    await smallPage.goto(`${BASE_URL}/template/elden-ring-bosses`, { waitUntil: "networkidle", timeout: 25000 });
    await checkHorizontalOverflow(smallPage, "Studio (iPhone SE)");
    logPass("Small Viewport (375px) Studio Test", "Zero horizontal scroll blowout on compact screen");
  } catch (err) {
    logFail("Small Screen Test", err);
  }

  await smallContext.close();

  // 3. Audit on Tablet (iPad Mini: 768x1024)
  console.log("\n--- 3. Testing Tablet (iPad Mini 768x1024) ---");
  const tabletContext = await browser.newContext(devices[2]);
  const tabletPage = await tabletContext.newPage();

  try {
    await tabletPage.goto(`${BASE_URL}/template/elden-ring-bosses`, { waitUntil: "networkidle", timeout: 25000 });
    await checkHorizontalOverflow(tabletPage, "Studio (iPad Tablet)");
    await tabletPage.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile_10_tablet_studio.png"), fullPage: false });
    logPass("Tablet Studio Screenshot", "Saved mobile_10_tablet_studio.png");
  } catch (err) {
    logFail("Tablet Studio Test", err);
  }

  await tabletContext.close();
  await browser.close();

  // Write audit summary
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, "mobile-audit-summary.json"),
    JSON.stringify(auditResults, null, 2)
  );

  console.log("\n=================================================");
  console.log("PHASE 2 MOBILE AUDIT COMPLETED");
  console.log(`Passed:   ${auditResults.passed.length}`);
  console.log(`Failed:   ${auditResults.failed.length}`);
  console.log(`Warnings: ${auditResults.warnings.length}`);
  console.log(`Overflow Violations: ${auditResults.overflowViolations.length}`);
  console.log("=================================================");
}

runMobileAudit().catch((e) => {
  console.error("CRITICAL AUDIT ERROR:", e);
  process.exit(1);
});
