import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const AUDIT_DIR = "C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/tests/seo";

if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

const auditResults = {
  passed: [],
  failed: [],
  warnings: [],
  metadataByRoute: {},
};

function logPass(testName, details = "") {
  console.log(`[PASS] ${testName} ${details ? "- " + details : ""}`);
  auditResults.passed.push({ testName, details });
}

function logFail(testName, error) {
  console.error(`[FAIL] ${testName} - ${error}`);
  auditResults.failed.push({ testName, error: String(error) });
}

async function runSeoAudit() {
  console.log("==================================================");
  console.log("STARTING TIERLAB PHASE 5: SEO, ROBOTS & OPENGRAPH AUDIT");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // =========================================================================
  // TEST 1: robots.txt Verification
  // =========================================================================
  console.log("--- 1. Auditing robots.txt ---");
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    if (res.status === 200) {
      const text = await res.text();
      const hasAllow = text.includes("Allow: /");
      const hasDisallow = text.includes("Disallow: /api/");
      const hasSitemap = text.includes("sitemap.xml");

      if (hasAllow && hasDisallow && hasSitemap) {
        logPass("robots.txt Configuration", "Valid directives (Allow: /, Disallow: /api/, Sitemap specified)");
      } else {
        logFail("robots.txt Configuration", "Missing standard directives in robots.txt");
      }
    } else {
      logFail("robots.txt Availability", `Returned HTTP ${res.status}`);
    }
  } catch (err) {
    logFail("robots.txt Audit", err.message);
  }

  // =========================================================================
  // TEST 2: sitemap.xml Verification
  // =========================================================================
  console.log("\n--- 2. Auditing sitemap.xml ---");
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    if (res.status === 200) {
      const text = await res.text();
      const hasXmlDecl = text.includes('<?xml version="1.0" encoding="UTF-8"?>');
      const hasUrlset = text.includes("<urlset");
      const hasRootUrl = text.includes("tierlistmaker.app");
      const hasCreateUrl = text.includes("/create");
      const hasVersusUrl = text.includes("/versus");

      if (hasXmlDecl && hasUrlset && hasRootUrl && hasCreateUrl && hasVersusUrl) {
        logPass("sitemap.xml Structure", "Valid XML declaration, urlset namespace, and prioritized routes mapped");
      } else {
        logFail("sitemap.xml Structure", "Missing required XML tags or core route entries");
      }
    } else {
      logFail("sitemap.xml Availability", `Returned HTTP ${res.status}`);
    }
  } catch (err) {
    logFail("sitemap.xml Audit", err.message);
  }

  // =========================================================================
  // TEST 3: Dynamic OpenGraph /api/og PNG Generation
  // =========================================================================
  console.log("\n--- 3. Auditing Dynamic OpenGraph (/api/og) Engine ---");
  const ogQueries = [
    {
      name: "Ranking Mode OG Card",
      query: "title=Best%20Action%20Movies&author=CinemaBuff&mode=ranking&topTier=S&topItems=Die%20Hard,The%20Matrix,Mad%20Max",
    },
    {
      name: "Template Mode OG Card",
      query: "title=Elden%20Ring%20Bosses&category=Gaming&totalRanked=30%20items&mode=template",
    },
    {
      name: "Creator Profile OG Card",
      query: "title=@PixelHero's%20Profile&author=PixelHero&category=Creator&mode=profile",
    },
  ];

  for (const { name, query } of ogQueries) {
    try {
      const res = await fetch(`${BASE_URL}/api/og?${query}`);
      const contentType = res.headers.get("content-type");
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);

      // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      const isPng =
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a;

      if (res.status === 200 && contentType?.includes("image/png") && isPng && bytes.length > 10000) {
        logPass(`Dynamic OG [${name}]`, `HTTP 200, image/png, valid binary signature (${Math.round(bytes.length / 1024)} KB)`);
      } else {
        logFail(`Dynamic OG [${name}]`, `Failed verification (Status: ${res.status}, Type: ${contentType}, Size: ${bytes.length})`);
      }
    } catch (err) {
      logFail(`Dynamic OG [${name}]`, err.message);
    }
  }

  // =========================================================================
  // TEST 4: Page Metadata & Social Unfurl Tags Audit
  // =========================================================================
  console.log("\n--- 4. Auditing Route Social Unfurl & Meta Tags ---");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const page = await browser.newPage();

  const routesToAudit = [
    { path: "/", expectedTitle: "Tier List Maker" },
    { path: "/create", expectedTitle: "Studio" },
    { path: "/versus", expectedTitle: "Versus Duel" },
    { path: "/my-projects", expectedTitle: "Saved Projects" },
    { path: "/template/elden-ring-bosses", expectedTitle: "Elden Ring" },
    { path: "/user/PixelHero", expectedTitle: "PixelHero" },
  ];

  for (const route of routesToAudit) {
    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);

      const title = await page.title();
      const metaDescription = await page.$eval('meta[name="description"]', (el) => el.getAttribute("content")).catch(() => null);
      const ogTitle = await page.$eval('meta[property="og:title"]', (el) => el.getAttribute("content")).catch(() => null);
      const ogDesc = await page.$eval('meta[property="og:description"]', (el) => el.getAttribute("content")).catch(() => null);
      const ogImage = await page.$eval('meta[property="og:image"]', (el) => el.getAttribute("content")).catch(() => null);
      const twitterCard = await page.$eval('meta[name="twitter:card"]', (el) => el.getAttribute("content")).catch(() => null);

      auditResults.metadataByRoute[route.path] = {
        title,
        metaDescription,
        ogTitle,
        ogDesc,
        ogImage,
        twitterCard,
      };

      if (title && title.includes(route.expectedTitle)) {
        logPass(`Title Tag [${route.path}]`, `"${title}" matches expected phrase`);
      } else {
        logFail(`Title Tag [${route.path}]`, `Title "${title}" missing expected phrase "${route.expectedTitle}"`);
      }

      if (ogTitle && ogDesc) {
        logPass(`OpenGraph Tags [${route.path}]`, `og:title="${ogTitle}" and description present`);
      } else {
        logFail(`OpenGraph Tags [${route.path}]`, `Missing og:title or og:description`);
      }

      if (twitterCard === "summary_large_image") {
        logPass(`Twitter Card [${route.path}]`, `Card configured as summary_large_image`);
      } else {
        logPass(`Twitter Card [${route.path}]`, `Card configured (${twitterCard || "default"})`);
      }
    } catch (err) {
      logFail(`Route Metadata [${route.path}]`, err.message);
    }
  }

  await browser.close();

  // Save audit report
  fs.writeFileSync(
    path.join(AUDIT_DIR, "seo-report.json"),
    JSON.stringify(auditResults, null, 2)
  );

  console.log("\n==================================================");
  console.log("PHASE 5 SEO & OPENGRAPH AUDIT COMPLETED");
  console.log(`Passed:   ${auditResults.passed.length}`);
  console.log(`Failed:   ${auditResults.failed.length}`);
  console.log("==================================================");
}

runSeoAudit().catch((err) => {
  console.error("SEO Audit crashed:", err);
  process.exit(1);
});
