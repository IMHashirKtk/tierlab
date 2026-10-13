import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const BENCHMARK_DIR = "C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/tests/benchmarks";

if (!fs.existsSync(BENCHMARK_DIR)) {
  fs.mkdirSync(BENCHMARK_DIR, { recursive: true });
}

async function measureRoute(page, routePath, routeName) {
  console.log(`\nMeasuring performance for [${routeName}] (${routePath})...`);

  let requestCount = 0;
  let totalTransferredBytes = 0;
  let jsBytes = 0;
  let cssBytes = 0;
  let imgBytes = 0;

  const responseHandler = (response) => {
    requestCount++;
    const headers = response.headers();
    const len = parseInt(headers["content-length"] || "0", 10);
    totalTransferredBytes += len;

    const url = response.url();
    if (url.endsWith(".js") || url.includes("/_next/static/chunks/")) {
      jsBytes += len;
    } else if (url.endsWith(".css") || url.includes("/_next/static/css/")) {
      cssBytes += len;
    } else if (url.match(/\.(png|jpg|jpeg|webp|svg|ico)$/i)) {
      imgBytes += len;
    }
  };

  page.on("response", responseHandler);

  const startTs = Date.now();
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(1000);
  const totalNavMs = Date.now() - startTs;

  page.off("response", responseHandler);

  // Extract Navigation Timing & Performance Metrics
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    const fp = paint.find((p) => p.name === "first-paint")?.startTime || 0;
    const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime || 0;

    const mem = performance.memory
      ? {
          usedJSHeapSizeMB: +(performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
          totalJSHeapSizeMB: +(performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
        }
      : null;

    const domNodes = document.querySelectorAll("*").length;

    return {
      ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
      loadCompleteMs: nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0,
      firstPaintMs: Math.round(fp),
      firstContentfulPaintMs: Math.round(fcp),
      domNodes,
      memory: mem,
    };
  });

  const result = {
    routeName,
    routePath,
    totalNavMs,
    ...metrics,
    transferredStats: {
      requestCount,
      totalTransferredKB: +(totalTransferredBytes / 1024).toFixed(1),
      jsKB: +(jsBytes / 1024).toFixed(1),
      cssKB: +(cssBytes / 1024).toFixed(1),
      imgKB: +(imgBytes / 1024).toFixed(1),
    },
  };

  console.log(`  - Navigation Time:      ${totalNavMs} ms`);
  console.log(`  - TTFB (Server Response): ${metrics.ttfbMs} ms`);
  console.log(`  - DOM Content Loaded:     ${metrics.domContentLoadedMs} ms`);
  console.log(`  - First Contentful Paint: ${metrics.firstContentfulPaintMs} ms`);
  console.log(`  - DOM Node Count:         ${metrics.domNodes}`);
  if (metrics.memory) {
    console.log(`  - JS Heap Memory:         ${metrics.memory.usedJSHeapSizeMB} MB`);
  }
  console.log(`  - Network Requests:       ${requestCount}`);
  console.log(`  - Total JS Transferred:   ${result.transferredStats.jsKB} KB`);

  return result;
}

async function runPerformanceAudit() {
  console.log("==================================================");
  console.log("STARTING TIERLAB PHASE 3: PERFORMANCE & BUNDLE AUDIT");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const auditReport = [];

  // 1. Audit Homepage (/)
  auditReport.push(await measureRoute(page, "/", "Homepage"));

  // 2. Audit Studio (/template/elden-ring-bosses)
  auditReport.push(await measureRoute(page, "/template/elden-ring-bosses", "Studio"));

  // 3. Audit Versus Duel (/versus)
  auditReport.push(await measureRoute(page, "/versus", "Versus Arena"));

  // 4. Audit User Profile (/user/hashir)
  auditReport.push(await measureRoute(page, "/user/hashir", "Creator Profile"));

  // 5. Audit Local Projects (/my-projects)
  auditReport.push(await measureRoute(page, "/my-projects", "My Projects"));

  await browser.close();

  // Save report
  fs.writeFileSync(
    path.join(BENCHMARK_DIR, "performance-report.json"),
    JSON.stringify(auditReport, null, 2)
  );

  console.log("\n==================================================");
  console.log("PHASE 3 PERFORMANCE BENCHMARK COMPLETED");
  console.log(`Audit saved to ${path.join(BENCHMARK_DIR, "performance-report.json")}`);
  console.log("==================================================");
}

runPerformanceAudit().catch((e) => {
  console.error("PERFORMANCE AUDIT FAILED:", e);
  process.exit(1);
});
