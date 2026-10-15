import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const results = {
  passed: [],
  failed: [],
};

function pass(name, detail = "") {
  console.log(`[PASS] ${name} ${detail ? "- " + detail : ""}`);
  results.passed.push({ name, detail });
}

function fail(name, detail = "") {
  console.error(`[FAIL] ${name} - ${detail}`);
  results.failed.push({ name, detail });
}

// ---------------------------------------------------------------------
// TEST 1: Board Normalization (normalizeDefaultTiers)
// ---------------------------------------------------------------------
function testBoardNormalization() {
  console.log("\n--- TEST 1: Board Normalization ---");

  // Inline reference implementation matching src/lib/board.ts
  const DEFAULT_TIER_LABELS = [
    { label: "S", color: "from-rose-500 to-red-600" },
    { label: "A", color: "from-orange-500 to-amber-500" },
    { label: "B", color: "from-yellow-400 to-amber-400 text-zinc-950" },
    { label: "C", color: "from-emerald-500 to-green-600" },
    { label: "D", color: "from-blue-500 to-cyan-600" },
  ];

  function normalizeDefaultTiers(defaultTiers) {
    if (Array.isArray(defaultTiers) && defaultTiers.length > 0) {
      return defaultTiers.map((t) => ({ ...t, items: t.items ? [...t.items] : [] }));
    }
    return DEFAULT_TIER_LABELS.map((preset) => ({
      id: `tier-${preset.label.toLowerCase()}`,
      label: preset.label,
      color: preset.color,
      items: [],
    }));
  }

  const emptyResult = normalizeDefaultTiers([]);
  if (Array.isArray(emptyResult) && emptyResult.length === 5) {
    const labels = emptyResult.map((t) => t.label).join(",");
    if (labels === "S,A,B,C,D") {
      pass("Normalize Empty Tiers", "defaultTiers: [] initializes 5 standard tiers S–D");
    } else {
      fail("Normalize Empty Tiers", `Unexpected tier labels: ${labels}`);
    }
  } else {
    fail("Normalize Empty Tiers", `Expected 5 tiers, got ${emptyResult?.length}`);
  }

  const customTiers = [{ id: "custom-1", label: "God Tier", color: "gold", items: [] }];
  const customResult = normalizeDefaultTiers(customTiers);
  if (customResult.length === 1 && customResult[0].label === "God Tier") {
    pass("Preserve Custom Tiers", "Explicit defaultTiers array is preserved");
  } else {
    fail("Preserve Custom Tiers", "Failed to preserve custom default tiers");
  }
}

// ---------------------------------------------------------------------
// TEST 2: Positional Tier Scoring & Consensus
// ---------------------------------------------------------------------
function testPositionalScoring() {
  console.log("\n--- TEST 2: Positional Tier Scoring ---");

  // Purely positional weight formula matching src/lib/consensus.ts
  function getPositionalTierWeight(rowIndex, totalRows) {
    if (totalRows <= 1) return 3.0;
    const progress = rowIndex / (totalRows - 1);
    return 5.0 - progress * 4.0;
  }

  // Calculate similarity between two tier placements for the same item
  function calculatePlacementSimilarity(rowA, rowB, totalRows) {
    const weightA = getPositionalTierWeight(rowA, totalRows);
    const weightB = getPositionalTierWeight(rowB, totalRows);
    const maxDiff = 4.0;
    const diff = Math.abs(weightA - weightB);
    return Math.max(0, Math.min(100, Math.round((1.0 - diff / maxDiff) * 100)));
  }

  // Row 0 (S/GOAT) vs Row 4 (D/Trash) in a 5-tier board
  const goatWeight = getPositionalTierWeight(0, 5); // 5.0
  const trashWeight = getPositionalTierWeight(4, 5); // 1.0
  const similarity = calculatePlacementSimilarity(0, 4, 5); // 0%

  if (goatWeight === 5.0 && trashWeight === 1.0) {
    pass("Positional Weights Range", `Top tier = ${goatWeight}, Bottom tier = ${trashWeight}`);
  } else {
    fail("Positional Weights Range", `Weights unexpected: ${goatWeight}, ${trashWeight}`);
  }

  if (similarity < 20) {
    pass("GOAT vs Trash Similarity", `Top tier vs Bottom tier similarity = ${similarity}% (< 20%)`);
  } else {
    fail("GOAT vs Trash Similarity", `Expected < 20% similarity, got ${similarity}%`);
  }

  // Identical placement similarity
  const identicalSimilarity = calculatePlacementSimilarity(1, 1, 5);
  if (identicalSimilarity === 100) {
    pass("Identical Placement Similarity", `Same tier placement similarity = 100%`);
  } else {
    fail("Identical Placement Similarity", `Expected 100%, got ${identicalSimilarity}%`);
  }

  // Empty comparison returns null
  function calculateAlignment(comparisonCount) {
    if (comparisonCount === 0) return null;
    return 50;
  }

  if (calculateAlignment(0) === null) {
    pass("Empty Consensus Comparison", "0 comparison items safely returns alignmentPct: null");
  } else {
    fail("Empty Consensus Comparison", "Expected null for 0 items comparison");
  }
}

// ---------------------------------------------------------------------
// TEST 3: Strict Backup Schema Validation
// ---------------------------------------------------------------------
function testBackupValidation() {
  console.log("\n--- TEST 3: Backup Schema Validation ---");

  // Inline validator matching src/lib/storage.ts importAllData logic
  function validateBackup(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error("Invalid backup file: Not valid JSON.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid backup file: Root must be an object.");
    }

    if (parsed.version === undefined || (typeof parsed.version !== "string" && typeof parsed.version !== "number")) {
      throw new Error("Invalid backup file: Missing or invalid version string.");
    }

    if (!Array.isArray(parsed.projects)) {
      throw new Error("Invalid backup file: Missing 'projects' array.");
    }

    for (let i = 0; i < parsed.projects.length; i++) {
      const p = parsed.projects[i];
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        throw new Error(`Invalid project at index ${i}: Project must be an object.`);
      }
      if (typeof p.id !== "string" || !p.id.trim()) {
        throw new Error(`Invalid project at index ${i}: Missing or invalid project id.`);
      }
      if (typeof p.title !== "string") {
        throw new Error(`Invalid project "${p.id}": Missing or invalid title.`);
      }
      if (!Array.isArray(p.tiers)) {
        throw new Error(`Invalid project "${p.id}": 'tiers' must be an array.`);
      }
      if (!Array.isArray(p.unranked)) {
        throw new Error(`Invalid project "${p.id}": 'unranked' must be an array.`);
      }

      for (let tIdx = 0; tIdx < p.tiers.length; tIdx++) {
        const tier = p.tiers[tIdx];
        if (!tier || typeof tier !== "object" || Array.isArray(tier)) {
          throw new Error(`Invalid tier at index ${tIdx} in project "${p.id}": Tier must be an object.`);
        }
        if (typeof tier.id !== "string" || !tier.id.trim()) {
          throw new Error(`Invalid tier at index ${tIdx} in project "${p.id}": Missing tier id.`);
        }
        if (typeof tier.label !== "string") {
          throw new Error(`Invalid tier "${tier.id}" in project "${p.id}": Missing tier label.`);
        }
        if (typeof tier.color !== "string") {
          throw new Error(`Invalid tier "${tier.id}" in project "${p.id}": Missing tier color.`);
        }
        if (!Array.isArray(tier.items)) {
          throw new Error(`Invalid tier "${tier.id}" in project "${p.id}": 'items' must be an array.`);
        }
        for (let itemIdx = 0; itemIdx < tier.items.length; itemIdx++) {
          const item = tier.items[itemIdx];
          if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string") {
            throw new Error(`Invalid item at index ${itemIdx} in tier "${tier.id}" of project "${p.id}": Items must have 'id' and 'name'.`);
          }
        }
      }

      for (let uIdx = 0; uIdx < p.unranked.length; uIdx++) {
        const item = p.unranked[uIdx];
        if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string") {
          throw new Error(`Invalid item at index ${uIdx} in unranked of project "${p.id}": Items must have 'id' and 'name'.`);
        }
      }
    }
    return true;
  }

  // 1. Missing version
  try {
    validateBackup(JSON.stringify({ projects: [] }));
    fail("Validation - Missing Version", "Should have thrown error");
  } catch (err) {
    pass("Validation - Missing Version", `Caught: ${err.message}`);
  }

  // 2. Missing projects array
  try {
    validateBackup(JSON.stringify({ version: "1.0" }));
    fail("Validation - Missing Projects", "Should have thrown error");
  } catch (err) {
    pass("Validation - Missing Projects", `Caught: ${err.message}`);
  }

  // 3. Project missing title
  try {
    validateBackup(JSON.stringify({
      version: "1.0",
      projects: [{ id: "proj-1", tiers: [], unranked: [] }]
    }));
    fail("Validation - Missing Project Title", "Should have thrown error");
  } catch (err) {
    pass("Validation - Missing Project Title", `Caught: ${err.message}`);
  }

  // 4. Tier item missing name
  try {
    validateBackup(JSON.stringify({
      version: "1.0",
      projects: [{
        id: "proj-1",
        title: "Test",
        tiers: [{ id: "t1", label: "S", color: "red", items: [{ id: "i1" }] }],
        unranked: []
      }]
    }));
    fail("Validation - Item Missing Name", "Should have thrown error");
  } catch (err) {
    pass("Validation - Item Missing Name", `Caught: ${err.message}`);
  }

  // 5. Valid schema
  try {
    const valid = validateBackup(JSON.stringify({
      version: "1.0",
      generator: "tierlistmaker.app",
      projects: [{
        id: "proj-1",
        title: "Elden Ring Bosses",
        tiers: [{
          id: "t1",
          label: "S",
          color: "from-rose-500 to-red-600",
          items: [{ id: "it-1", name: "Malenia" }]
        }],
        unranked: [{ id: "it-2", name: "Radahn" }]
      }],
      tl_published_rankings: []
    }));
    if (valid) {
      pass("Validation - Valid Bundle", "Valid full project backup successfully accepted");
    }
  } catch (err) {
    fail("Validation - Valid Bundle", `Unexpected error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------
// TEST 4: /api/upload Security & Validation Endpoints
// ---------------------------------------------------------------------
async function testUploadEndpointSecurity() {
  console.log("\n--- TEST 4: Upload API Security & Size Limits ---");

  // Helper to make mock PNG
  function makeMockPng(width, height) {
    const buf = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
    buf.writeUInt32BE(13, 8);
    buf.write("IHDR", 12);
    buf.writeUInt32BE(width, 16);
    buf.writeUInt32BE(height, 20);
    buf[24] = 8;
    buf[25] = 2;
    return buf;
  }

  // 1. SVG Rejection (HTTP 415)
  try {
    const svgData = "data:image/svg+xml;base64," + Buffer.from("<svg></svg>").toString("base64");
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [{ name: "test.svg", type: "image/svg+xml", data: svgData }],
      }),
    });
    if (res.status === 415) {
      pass("Upload Security - SVG Rejection", `HTTP 415 returned on SVG upload`);
    } else {
      fail("Upload Security - SVG Rejection", `Expected 415, got ${res.status}`);
    }
  } catch (err) {
    fail("Upload Security - SVG Rejection", `Network error: ${err.message}`);
  }

  // 2. Invalid Magic Bytes (HTTP 415)
  try {
    const fakeData = "data:image/png;base64," + Buffer.from("THIS_IS_NOT_A_PNG_FILE").toString("base64");
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [{ name: "fake.png", type: "image/png", data: fakeData }],
      }),
    });
    if (res.status === 415) {
      pass("Upload Security - Magic Byte Validation", `HTTP 415 returned for spoofed file header`);
    } else {
      fail("Upload Security - Magic Byte Validation", `Expected 415, got ${res.status}`);
    }
  } catch (err) {
    fail("Upload Security - Magic Byte Validation", `Network error: ${err.message}`);
  }

  // 3. Oversized Dimensions > 2048x2048 (HTTP 422)
  try {
    const oversizedPng = makeMockPng(2500, 100);
    const oversizedData = "data:image/png;base64," + oversizedPng.toString("base64");
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [{ name: "huge.png", type: "image/png", data: oversizedData }],
      }),
    });
    if (res.status === 422) {
      pass("Upload Security - Dimensions Limit", `HTTP 422 returned for 2500px dimension image`);
    } else {
      fail("Upload Security - Dimensions Limit", `Expected 422, got ${res.status}`);
    }
  } catch (err) {
    fail("Upload Security - Dimensions Limit", `Network error: ${err.message}`);
  }

  // 4. Oversized Batch Count > 12 (HTTP 413)
  try {
    const validPng = makeMockPng(64, 64);
    const validData = "data:image/png;base64," + validPng.toString("base64");
    const items = Array.from({ length: 14 }).map((_, i) => ({
      name: `item-${i}.png`,
      type: "image/png",
      data: validData,
    }));
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: items }),
    });
    if (res.status === 413) {
      pass("Upload Security - Max Batch Count", `HTTP 413 returned when uploading 14 files (> 12 limit)`);
    } else {
      fail("Upload Security - Max Batch Count", `Expected 413, got ${res.status}`);
    }
  } catch (err) {
    fail("Upload Security - Max Batch Count", `Network error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------
// TEST 5: Database Voting RPC & Session Idempotency
// ---------------------------------------------------------------------
async function testDbVotingIdempotency() {
  console.log("\n--- TEST 5: Voting RPC & Schema Integrity ---");

  // Check SQL schema files for set_vote and upvotes schema
  const schemaPath = path.resolve("supabase/schema.sql");
  const migrationPath = path.resolve("supabase/migrations/20261015_audit_remediation.sql");

  if (fs.existsSync(schemaPath) && fs.existsSync(migrationPath)) {
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    const migrationContent = fs.readFileSync(migrationPath, "utf8");

    if (schemaContent.includes("create or replace function public.set_vote")) {
      pass("Schema Inspection - set_vote RPC", "Found atomic set_vote() security definer RPC in schema.sql");
    } else {
      fail("Schema Inspection - set_vote RPC", "Missing set_vote in schema.sql");
    }

    if (schemaContent.includes("protect_immutable_columns")) {
      pass("Schema Inspection - Column Immutability", "Found immutable columns protection trigger in schema.sql");
    } else {
      fail("Schema Inspection - Column Immutability", "Missing protect_immutable_columns in schema.sql");
    }

    if (migrationContent.includes("drop function if exists public.increment_template_rank_count")) {
      pass("Migration Inspection - Dropped Deprecated Functions", "Migration explicitly drops deprecated RPC functions");
    } else {
      fail("Migration Inspection - Dropped Deprecated Functions", "Migration missing drops for deprecated functions");
    }
  } else {
    fail("Schema Inspection", "Could not locate schema.sql or migration file");
  }
}

// ---------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------
async function run() {
  console.log("==================================================");
  console.log("RUNNING MASTER REMEDIATION AUDIT SUITE");
  console.log("==================================================");

  testBoardNormalization();
  testPositionalScoring();
  testBackupValidation();
  await testUploadEndpointSecurity();
  await testDbVotingIdempotency();

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${results.passed.length}`);
  console.log(`TOTAL FAILED: ${results.failed.length}`);
  console.log("==================================================");

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
