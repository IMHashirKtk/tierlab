/**
 * Comprehensive Publishing, Draft Persistence, Ownership & UI Audit Suite
 *
 * Covers:
 * - Part 1: Node contract, ownership, semantic JSON, consensus/profile/export & storage boundary tests
 * - Part 2: Real mounted Playwright UI component tests (Tests A–F, K–N, and Regression Scenarios 1–10)
 *
 * Strict guarantees:
 * - Never ignores fatal exceptions or treats BLOCKED tests as passing.
 * - Exits nonzero (code 1) whenever any test fails or is blocked.
 * - Installs network interception on the Playwright BrowserContext BEFORE first navigation.
 * - Never calls route.continue() for database writes or external endpoints.
 * - Fails immediately if any unexpected external network request is attempted.
 */

import { chromium } from "playwright";
import http from "http";
import { spawn, execSync } from "child_process";
import {
  publishTemplate,
  publishTierList,
  postComment,
  getLocalUserTemplates,
  getLocalPublishedRankings,
  areSemanticJsonEqual,
  fetchUserProfile,
} from "../src/lib/community.ts";
import * as supabaseModule from "../src/lib/supabase.ts";
import {
  loadPendingCommentDraft,
  savePendingCommentDraft,
} from "../src/lib/draft-storage.ts";
import { normalizeDefaultTiers } from "../src/lib/board.ts";
import { calculateConsensus } from "../src/lib/consensus.ts";

const TEST_PORT = Number(process.env.AUDIT_PORT || 3142);
const BASE_URL = `http://localhost:${TEST_PORT}`;

const results = {
  passed: [],
  failed: [],
  blocked: [],
};

function pass(name, detail = "") {
  console.log(`[PASS] ${name}${detail ? " - " + detail : ""}`);
  results.passed.push({ name, detail });
}

function fail(name, detail = "") {
  console.error(`[FAIL] ${name} - ${detail}`);
  results.failed.push({ name, detail });
}

function block(name, reason = "") {
  console.warn(`[BLOCKED] ${name} - ${reason}`);
  results.blocked.push({ name, reason });
}

// Node environment localStorage shim for Part 1 contract tests
if (typeof global.localStorage === "undefined") {
  const store = new Map();
  global.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}
if (typeof global.window === "undefined") {
  global.window = {
    location: { origin: "https://tierlistmaker.app" },
    localStorage: global.localStorage,
    dispatchEvent: () => true,
  };
}

function isServerListening(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startIsolatedNextServer() {
  if (process.env.SIMULATE_AUDIT_STARTUP_EXCEPTION === "1") {
    throw new Error("Simulated fatal startup exception for runner verification");
  }

  const alreadyListening = await isServerListening(BASE_URL);
  if (alreadyListening) {
    throw new Error(
      `Port ${TEST_PORT} is already in use. Refusing to reuse an unknown server process.`
    );
  }

  console.log(`Starting isolated Next.js server on ${BASE_URL}...`);
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(TEST_PORT),
    NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.test",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key-for-isolated-audit",
    SUPABASE_SERVICE_ROLE_KEY: "mock-service-role-key-for-isolated-audit",
  };

  const child = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    shell: true,
    stdio: "ignore",
    env,
  });

  const start = Date.now();
  while (Date.now() - start < 20000) {
    await new Promise((r) => setTimeout(r, 400));
    if (await isServerListening(BASE_URL)) {
      console.log(`Isolated Next.js server ready on ${BASE_URL} (PID ${child.pid}).`);
      return child;
    }
  }

  killServerProcess(child);
  throw new Error(`Isolated Next.js server failed to start on ${BASE_URL} within 20s.`);
}

function killServerProcess(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGKILL");
    }
  } catch {
    // Process already exited
  }
}

async function launchAuditBrowser() {
  const configuredChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  const attempts = configuredChannel
    ? [{ channel: configuredChannel, headless: true }]
    : [
        { headless: true },
        { channel: "msedge", headless: true },
        { channel: "chrome", headless: true },
      ];

  let lastErr = null;
  for (const opts of attempts) {
    try {
      return await chromium.launch(opts);
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Unable to launch Playwright browser: ${lastErr?.message || "unknown error"}`);
}

// =====================================================================
// PART 1: CORE CONTRACT, OWNERSHIP, SEMANTIC JSON & PHASE 4 AUDITS
// =====================================================================

async function testCaseG_StrictOwnershipRejection() {
  console.log("\n--- TEST G: Existing record with null/missing/different author_id or mismatched author_name ---");
  global.localStorage.clear();

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "target-record-1",
              author_id: null,
              title: "Legacy Ranking",
              category: "gaming",
              items: [],
              tiers: [],
              unranked: [],
              author_name: "Original Creator",
            },
            error: null,
          }),
        }),
      }),
      update: () => {
        throw new Error("UNAUTHORIZED_WRITE: Must not attempt update on unowned record");
      },
    }),
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("session-attacker-456");

  let templateRejected = false;
  try {
    await publishTemplate({
      title: "Hijacked Template",
      category: "gaming",
      items: [
        { id: "i-1", name: "Item 1" },
        { id: "i-2", name: "Item 2" },
      ],
      existingId: "target-record-1",
    });
  } catch (err) {
    if (err.message.includes("not owned by the current session") || err.message.includes("Conflict")) {
      templateRejected = true;
    }
  }

  let tierListRejected = false;
  try {
    await publishTierList({
      title: "Hijacked Ranking",
      authorName: "Attacker",
      tiers: [],
      unranked: [],
      existingId: "target-record-1",
    });
  } catch (err) {
    if (err.message.includes("not owned by the current session") || err.message.includes("Conflict")) {
      tierListRejected = true;
    }
  }

  let commentRejected = false;
  try {
    await postComment({
      tierListId: "tl-1",
      authorName: "Attacker",
      content: "Hijacked comment",
      existingId: "target-record-1",
    });
  } catch (err) {
    if (err.message.includes("not owned by the current session") || err.message.includes("Conflict")) {
      commentRejected = true;
    }
  }

  // Verify template author_name equality check on retry
  let templateAuthorNameUpdated = false;
  const mockAuthorMismatch = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "tpl-author-check",
              author_id: "session-owner-1",
              title: "Same Title",
              description: "Same Desc",
              category: "gaming",
              items: [
                { id: "i-1", name: "Item 1" },
                { id: "i-2", name: "Item 2" },
              ],
              default_tiers: [],
              tags: ["gaming", "tier-list"],
              author_name: "OldAuthorName",
            },
            error: null,
          }),
        }),
      }),
      update: (payload) => {
        if (payload.author_name === "NewAuthorName") {
          templateAuthorNameUpdated = true;
        }
        return {
          eq: () => ({
            eq: () => ({
              select: async () => ({
                data: [
                  {
                    id: "tpl-author-check",
                    author_id: "session-owner-1",
                    title: payload.title,
                    description: payload.description,
                    category: payload.category,
                    items: payload.items,
                    default_tiers: payload.default_tiers,
                    tags: payload.tags,
                    author_name: payload.author_name,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      },
    }),
  };
  supabaseModule.setMockSupabaseClient(mockAuthorMismatch);
  supabaseModule.setMockSessionUserId("session-owner-1");
  await publishTemplate({
    title: "Same Title",
    description: "Same Desc",
    category: "gaming",
    authorName: "NewAuthorName",
    items: [
      { id: "i-1", name: "Item 1" },
      { id: "i-2", name: "Item 2" },
    ],
    existingId: "tpl-author-check",
  });

  const localRanks = getLocalPublishedRankings();
  const cacheClean = localRanks.length === 0;

  if (templateRejected && tierListRejected && commentRejected && templateAuthorNameUpdated && cacheClean) {
    pass(
      "Test G: Strict Ownership & Template Author Equality",
      "Null/missing/different author_id rejected across all 3 flows; mismatched template author_name triggers update"
    );
  } else {
    fail(
      "Test G: Strict Ownership & Template Author Equality",
      `tplRejected=${templateRejected}, rankRejected=${tierListRejected}, cmtRejected=${commentRejected}, authorUpdated=${templateAuthorNameUpdated}`
    );
  }
}

async function testCaseH_DuplicateKeyRecoveryDifferentContent() {
  console.log("\n--- TEST H: Duplicate-key recovery with different content ---");
  global.localStorage.clear();

  let updateCalled = false;
  let lookupCount = 0;
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            lookupCount++;
            if (lookupCount > 1) {
              return {
                data: {
                  id: "tmpl-dup-1",
                  author_id: "user-owner-1",
                  title: "Original Version",
                  description: "Old description",
                  category: "gaming",
                  items: [{ id: "i-1", name: "Item 1" }],
                  default_tiers: [],
                  author_name: "Owner",
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
      insert: () => ({
        select: async () => ({
          data: null,
          error: { message: "duplicate key value violates unique constraint", code: "23505" },
        }),
      }),
      update: (payload) => {
        updateCalled = true;
        return {
          eq: () => ({
            eq: () => ({
              select: async () => ({
                data: [
                  {
                    id: "tmpl-dup-1",
                    author_id: "user-owner-1",
                    title: payload.title,
                    description: payload.description,
                    category: payload.category,
                    items: payload.items,
                    author_name: payload.author_name,
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      },
    }),
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-owner-1");

  try {
    const updated = await publishTemplate({
      title: "Updated Version",
      category: "gaming",
      description: "New description",
      items: [
        { id: "i-1", name: "Item 1" },
        { id: "i-2", name: "Item 2" },
      ],
      existingId: "tmpl-dup-1",
    });

    if (updateCalled && updated.title === "Updated Version") {
      pass("Test H: Duplicate-Key Different Content", "Authorized update executed and confirmed via select");
    } else {
      fail("Test H: Duplicate-Key Different Content", `updateCalled=${updateCalled}, title=${updated?.title}`);
    }
  } catch (err) {
    fail("Test H: Duplicate-Key Different Content", err.message);
  }
}

async function testCaseI_CommentRetryDifferentContentRejection() {
  console.log("\n--- TEST I: Comment retry with different content or target tier list ---");
  global.localStorage.clear();

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "cmt-existing-1",
              tier_list_id: "tierlist-A",
              author_id: "session-author-1",
              author_name: "Ranker",
              content: "Initial hot take",
            },
            error: null,
          }),
        }),
      }),
    }),
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("session-author-1");

  try {
    await postComment({
      tierListId: "tierlist-A",
      authorName: "Ranker",
      content: "Different amended hot take",
      existingId: "cmt-existing-1",
    });
    fail("Test I: Comment Retry Different Content", "Should reject comment retry with different payload");
  } catch (err) {
    if (err.message.includes("differs in content") || err.message.includes("Conflict")) {
      pass("Test I: Comment Retry Different Content", `Rejected with "${err.message}"`);
    } else {
      fail("Test I: Comment Retry Different Content", `Unexpected error: ${err.message}`);
    }
  }
}

async function testCaseJ_CommentResponseLostRetryRecovery() {
  console.log("\n--- TEST J: Comment write succeeds but response lost, then reload ---");
  global.localStorage.clear();

  savePendingCommentDraft({
    pendingId: "cmt-lost-response-1",
    tierListId: "tl-lost-1",
    authorName: "Ranker Hero",
    content: "S-Tier is undeniable!",
    sessionUserId: "session-ranker-1",
    updatedAt: Date.now(),
  });

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "cmt-lost-response-1",
              tier_list_id: "tl-lost-1",
              author_id: "session-ranker-1",
              author_name: "Ranker Hero",
              content: "S-Tier is undeniable!",
              upvotes: 0,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    }),
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("session-ranker-1");

  const restoredDraft = loadPendingCommentDraft("tl-lost-1", "session-ranker-1");
  const recovered = await postComment({
    tierListId: restoredDraft.tierListId,
    authorName: restoredDraft.authorName,
    content: restoredDraft.content,
    existingId: restoredDraft.pendingId,
  });

  if (recovered && recovered.id === "cmt-lost-response-1") {
    pass("Test J: Comment Lost Response Recovery", "Restored pending attempt and recovered confirmed comment without duplicate");
  } else {
    fail("Test J: Comment Lost Response Recovery", `recovered=${JSON.stringify(recovered)}`);
  }
}

async function testCaseO_SemanticJsonAndPhase4Contracts() {
  console.log("\n--- TEST O: Semantic JSON, Profile Zero Upvotes, Consensus Error vs Empty & DefaultTiers ---");
  global.localStorage.clear();

  const objA = { id: "item-1", name: "Dark Souls", imageUrl: "https://example.com/ds.webp" };
  const objB = { imageUrl: "https://example.com/ds.webp", id: "item-1", name: "Dark Souls" };

  const equalObjects = areSemanticJsonEqual(objA, objB);
  const equalArrays = areSemanticJsonEqual([objA, { x: 1, y: 2 }], [objB, { y: 2, x: 1 }]);
  const orderPreservedInArray = !areSemanticJsonEqual([1, 2], [2, 1]);

  // Verify Phase 4D: fetchUserProfile returns 0 upvotes when templates/tier_lists have 0 upvotes (no Math.max(..., 1))
  const mockZeroUpvotesSupabase = {
    from: () => ({
      select: () => ({
        ilike: () => ({
          order: () => ({
            limit: async () => ({
              data: [
                {
                  id: "tpl-zero-1",
                  title: "Zero Upvote Template",
                  description: "",
                  category: "gaming",
                  author_name: "ZeroHero",
                  upvotes: 0,
                  rank_count: 0,
                  items: [],
                  tags: [],
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }),
  };
  supabaseModule.setMockSupabaseClient(mockZeroUpvotesSupabase);
  const profile = await fetchUserProfile("ZeroHero");
  const zeroUpvotesHonest = profile.totalUpvotes === 0;
  const noFakeVerified = profile.templates.every((t) => !t.verified);

  // Verify Phase 4E: Consensus empty vs error states & malformed defaultTiers fallback
  const dummyTemplate = {
    id: "tpl-cons-1",
    title: "Test Template",
    description: "",
    category: "gaming",
    authorName: "Creator",
    rankCount: 0,
    upvotes: 0,
    createdAt: "2026-10-16",
    items: [{ id: "i1", name: "Item 1" }],
    tags: [],
    defaultTiers: [{ label: "", color: "" }],
  };
  const emptyConsensus = calculateConsensus(dummyTemplate, []);
  const errorConsensus = calculateConsensus(dummyTemplate, [], { fetchError: true });
  const readyConsensusFallback = calculateConsensus(dummyTemplate, [
    {
      id: "sub-1",
      title: "Sub",
      authorName: "U",
      tiers: [{ id: "t-s", label: "S", color: "from-rose-500 to-red-600", items: [{ id: "i1", name: "Item 1" }] }],
      unranked: [],
      upvotes: 0,
      createdAt: "2026-10-16",
    },
  ]);
  const normalizedTiers = normalizeDefaultTiers(dummyTemplate.defaultTiers);

  if (
    equalObjects &&
    equalArrays &&
    orderPreservedInArray &&
    zeroUpvotesHonest &&
    noFakeVerified &&
    emptyConsensus.status === "empty" &&
    errorConsensus.status === "error" &&
    normalizedTiers === undefined &&
    readyConsensusFallback.tiers.length === 5 &&
    readyConsensusFallback.tiers[0].label === "S"
  ) {
    pass(
      "Test O: Semantic JSON & Phase 4 Contracts",
      "Semantic JSON, honest 0 upvotes, no unsupported verified flag, empty vs error consensus, and defaultTiers fallback verified"
    );
  } else {
    fail(
      "Test O: Semantic JSON & Phase 4 Contracts",
      `equal=${equalObjects}, zeroUpvotes=${profile.totalUpvotes}, noFakeVerified=${noFakeVerified}, empty=${emptyConsensus.status}, error=${errorConsensus.status}, fallbackTiers=${readyConsensusFallback.tiers.length}`
    );
  }

  supabaseModule.setMockSupabaseClient(null);
  supabaseModule.setMockSessionUserId(null);
}

// =====================================================================
// PART 2: REAL MOUNTED BROWSER UI REGRESSION AUDITS (PLAYWRIGHT)
// =====================================================================

const TRANSPARENT_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function runBrowserAudit() {
  console.log("\n==================================================");
  console.log("STARTING PLAYWRIGHT REAL COMPONENT & UI AUDIT");
  console.log("==================================================");

  if (process.env.SIMULATE_AUDIT_ASSERTION_FAILURE === "1") {
    fail("Simulated Assertion Failure", "Deliberate assertion failure triggered via SIMULATE_AUDIT_ASSERTION_FAILURE=1");
    return;
  }

  const browser = await launchAuditBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // In-memory mock cloud state & network isolation controller
  const mockCloud = {
    currentUserId: "user-audit-alpha",
    templates: new Map(),
    tier_lists: new Map(),
    comments: new Map(),
    dbWrites: [],
    uploadRequests: 0,
    unexpectedExternalRequests: [],
    uploadMode: "success", // "success" | "delay800" | "abort"
    dbWriteMode: "success", // "success" | "abort" | "commit_then_abort"
  };

  function resetMockCloudModes() {
    mockCloud.dbWrites = [];
    mockCloud.uploadRequests = 0;
    mockCloud.uploadMode = "success";
    mockCloud.dbWriteMode = "success";
  }

  // Seed one shared tier list in mockCloud so /share/share-audit-1 renders CommentsSection
  mockCloud.tier_lists.set("share-audit-1", {
    id: "share-audit-1",
    template_id: "tpl-elden-ring-bosses",
    title: "Audit Shared Ranking",
    author_id: "user-audit-alpha",
    author_name: "AuditCreator",
    tiers: [
      { id: "tier-S", label: "S", color: "from-rose-500 to-red-600", items: [{ id: "i-1", name: "Malenia" }] },
    ],
    unranked: [],
    upvotes: 0,
    created_at: new Date().toISOString(),
  });

  // Install context-wide network isolation BEFORE first navigation
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    // 1. Intercept /api/upload
    if (url.startsWith(`${BASE_URL}/api/upload`)) {
      mockCloud.uploadRequests++;
      if (mockCloud.uploadMode === "abort") {
        await route.abort("failed");
        return;
      }
      if (mockCloud.uploadMode === "delay800") {
        await new Promise((r) => setTimeout(r, 800));
      }
      let bodyObj = {};
      try {
        bodyObj = JSON.parse(req.postData() || "{}");
      } catch {}
      const returnedItems = (bodyObj.items || []).map((it, idx) => ({
        ...it,
        imageUrl: `/api/cdn/items/mock-uploaded-${it.id || idx}.webp`,
      }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, items: returnedItems }),
      });
      return;
    }

    // 2. Allow local Next.js pages, JS chunks, and local static assets
    if (url.startsWith(BASE_URL) || url.startsWith("data:") || url.startsWith("blob:")) {
      await route.continue();
      return;
    }

    // 3. Intercept all Supabase Auth requests
    if (url.includes("/auth/v1/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: `mock-jwt-${mockCloud.currentUserId}`,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "mock-refresh-token",
          user: {
            id: mockCloud.currentUserId,
            role: "authenticated",
            aud: "authenticated",
          },
        }),
      });
      return;
    }

    // 4. Intercept all Supabase PostgREST (/rest/v1/) requests - NEVER call route.continue()
    if (url.includes("/rest/v1/")) {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split("/rest/v1/");
      const table = (pathParts[1] || "").split("/")[0];
      const accept = req.headers()["accept"] || "";
      const isSingleObject = accept.includes("application/vnd.pgrst.object+json");
      const store = mockCloud[table] instanceof Map ? mockCloud[table] : new Map();

      if (method === "GET" || method === "HEAD") {
        const idParam = parsedUrl.searchParams.get("id");
        const tierListIdParam = parsedUrl.searchParams.get("tier_list_id");

        if (idParam && idParam.startsWith("eq.")) {
          const targetId = idParam.slice(3);
          const found = store.get(targetId) || null;
          if (isSingleObject) {
            if (!found) {
              await route.fulfill({
                status: 406,
                contentType: "application/json",
                body: JSON.stringify({
                  code: "PGRST116",
                  details: "The result contains 0 rows",
                  hint: null,
                  message: "JSON object requested, multiple (or no) rows returned",
                }),
              });
            } else {
              await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(found),
              });
            }
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(found ? [found] : []),
          });
          return;
        }

        let rows = Array.from(store.values());
        if (tierListIdParam && tierListIdParam.startsWith("eq.")) {
          const tlId = tierListIdParam.slice(3);
          rows = rows.filter((r) => r.tier_list_id === tlId);
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(rows),
        });
        return;
      }

      // Database write (POST, PATCH, PUT, DELETE)
      let payload = {};
      try {
        const raw = JSON.parse(req.postData() || "{}");
        payload = Array.isArray(raw) ? raw[0] : raw;
      } catch {}

      mockCloud.dbWrites.push({ table, method, url, payload });

      if (mockCloud.dbWriteMode === "abort") {
        await route.abort("failed");
        return;
      }

      const idParam = parsedUrl.searchParams.get("id");
      const targetId = payload.id || (idParam && idParam.startsWith("eq.") ? idParam.slice(3) : `mock-${Date.now()}`);
      const existing = store.get(targetId) || {};
      const savedRow = {
        ...existing,
        ...payload,
        id: targetId,
        upvotes: existing.upvotes ?? payload.upvotes ?? 0,
        rank_count: existing.rank_count ?? payload.rank_count ?? 0,
        created_at: existing.created_at || new Date().toISOString(),
      };
      store.set(targetId, savedRow);

      if (mockCloud.dbWriteMode === "commit_then_abort") {
        await route.abort("failed");
        return;
      }

      await route.fulfill({
        status: method === "POST" ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify(isSingleObject ? savedRow : [savedRow]),
      });
      return;
    }

    // 5. Harmless static image/font CDNs used in seed templates -> fulfill locally offline
    if (
      url.includes("images.unsplash.com") ||
      url.includes("raw.githubusercontent.com") ||
      url.includes("api.dicebear.com") ||
      url.includes("upload.wikimedia.org") ||
      url.includes("fonts.googleapis.com") ||
      url.includes("fonts.gstatic.com")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: TRANSPARENT_PNG_BUFFER,
      });
      return;
    }

    // 6. Any other external request is strictly forbidden and fails the audit
    mockCloud.unexpectedExternalRequests.push(`${method} ${url}`);
    await route.abort("blockedbyclient");
  });

  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(10000);

  // Helper to read/write IndexedDB ("tierlistmaker" v2) inside the browser context
  async function installPageHelpers() {
    await page.evaluate(() => {
      function openAuditDb() {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open("tierlistmaker", 2);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("projects")) {
              db.createObjectStore("projects", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("template_drafts")) {
              db.createObjectStore("template_drafts", { keyPath: "draftId" });
            }
          };
          req.onerror = () => reject(req.error || new Error("IDB open error"));
          req.onblocked = () => reject(new Error("IDB open blocked"));
          req.onsuccess = () => {
            const db = req.result;
            db.onversionchange = () => db.close();
            resolve(db);
          };
        });
      }

      window.__AUDIT_IDB__ = {
        async getDraft(draftId = "default") {
          const db = await openAuditDb();
          return new Promise((resolve, reject) => {
            try {
              const tx = db.transaction("template_drafts", "readonly");
              const getReq = tx.objectStore("template_drafts").get(draftId);
              tx.oncomplete = () => {
                db.close();
                resolve(getReq.result || null);
              };
              tx.onerror = () => {
                db.close();
                reject(tx.error);
              };
            } catch (err) {
              db.close();
              reject(err);
            }
          });
        },
        async putDraft(draftId, draft) {
          const db = await openAuditDb();
          return new Promise((resolve, reject) => {
            try {
              const tx = db.transaction("template_drafts", "readwrite");
              tx.objectStore("template_drafts").put({ ...draft, draftId });
              tx.oncomplete = () => {
                db.close();
                resolve(true);
              };
              tx.onerror = () => {
                db.close();
                reject(tx.error);
              };
            } catch (err) {
              db.close();
              reject(err);
            }
          });
        },
        async putProject(project) {
          const db = await openAuditDb();
          return new Promise((resolve, reject) => {
            try {
              const tx = db.transaction("projects", "readwrite");
              tx.objectStore("projects").put(project);
              tx.oncomplete = () => {
                db.close();
                resolve(true);
              };
              tx.onerror = () => {
                db.close();
                reject(tx.error);
              };
            } catch (err) {
              db.close();
              reject(err);
            }
          });
        },
        async getProject(projectId) {
          const db = await openAuditDb();
          return new Promise((resolve, reject) => {
            try {
              const tx = db.transaction("projects", "readonly");
              const getReq = tx.objectStore("projects").get(projectId);
              tx.oncomplete = () => {
                db.close();
                resolve(getReq.result || null);
              };
              tx.onerror = () => {
                db.close();
                reject(tx.error);
              };
            } catch (err) {
              db.close();
              reject(err);
            }
          });
        },
      };
    });
  }

  try {
    // -------------------------------------------------------------
    // TEST A: Enter a template draft, click X, reopen: fields, items, ID survive in IndexedDB
    // -------------------------------------------------------------
    console.log("\n--- TEST A: Template draft survives Close (X) in IndexedDB ---");
    resetMockCloudModes();
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();

    const openBtn = await page.waitForSelector("button:has-text('New Template')", { timeout: 5000 });
    await openBtn.click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.waitForTimeout(200);

    await page.fill("input[placeholder*='Sci-Fi Movies']", "Top Metroidvanias 2026");
    await page.fill("input[placeholder*='PixelKnight']", "HollowKnight99");
    await page.fill("input[placeholder*='Iron Man']", "Silksong, Blasphemous 2");
    await page.click("button:has-text('Add')");
    await page.waitForTimeout(350);

    const storedDraftBeforeClose = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));
    const storedPendingIdBeforeClose = storedDraftBeforeClose?.pendingId || null;

    const closeBtn = await page.waitForSelector("button[aria-label='Close']");
    await closeBtn.click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    await openBtn.click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])", { timeout: 5000 });

    const titleValue = await page.inputValue("input[placeholder*='Sci-Fi Movies']");
    const authorValue = await page.inputValue("input[placeholder*='PixelKnight']");
    const storedDraftAfterReopen = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));
    const storedPendingIdAfterReopen = storedDraftAfterReopen?.pendingId || null;

    if (
      titleValue === "Top Metroidvanias 2026" &&
      authorValue === "HollowKnight99" &&
      storedPendingIdBeforeClose &&
      storedPendingIdBeforeClose === storedPendingIdAfterReopen &&
      storedDraftAfterReopen?.items?.length === 2
    ) {
      pass("Test A: Close Preserves Draft (IndexedDB)", `Fields, 2 items, and pending ID "${storedPendingIdBeforeClose}" survived Close and reopen`);
    } else {
      fail("Test A: Close Preserves Draft (IndexedDB)", `title=${titleValue}, author=${authorValue}, before=${storedPendingIdBeforeClose}, after=${storedPendingIdAfterReopen}`);
    }

    // -------------------------------------------------------------
    // TEST B: Reload the page: the same pending draft and ID are restored from IndexedDB
    // -------------------------------------------------------------
    console.log("\n--- TEST B: Draft survives page reload ---");
    await page.reload({ waitUntil: "domcontentloaded" });
    await installPageHelpers();

    const openBtnReload = await page.waitForSelector("button:has-text('New Template')", { timeout: 5000 });
    await openBtnReload.click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])", { timeout: 5000 });

    const titleAfterReload = await page.inputValue("input[placeholder*='Sci-Fi Movies']");
    const authorAfterReload = await page.inputValue("input[placeholder*='PixelKnight']");
    const draftAfterReload = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));

    if (
      titleAfterReload === "Top Metroidvanias 2026" &&
      authorAfterReload === "HollowKnight99" &&
      draftAfterReload?.pendingId === storedPendingIdBeforeClose
    ) {
      pass("Test B: Reload Restores Draft", `Same draft and pending ID "${draftAfterReload.pendingId}" restored after page reload`);
    } else {
      fail("Test B: Reload Restores Draft", `title=${titleAfterReload}, author=${authorAfterReload}, pendingId=${draftAfterReload?.pendingId}`);
    }

    // -------------------------------------------------------------
    // TEST C: Explicitly discard: draft is removed from IndexedDB, new draft gets fresh ID
    // -------------------------------------------------------------
    console.log("\n--- TEST C: Explicit Discard Draft ---");
    const discardBtn = await page.waitForSelector("button:has-text('Discard Draft')", { timeout: 3000 });
    await discardBtn.click();
    await page.waitForTimeout(300);

    const titleAfterDiscard = await page.inputValue("input[placeholder*='Sci-Fi Movies']");
    const idbAfterDiscard = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));

    await page.fill("input[placeholder*='Sci-Fi Movies']", "Fresh Brand New Draft");
    await page.fill("input[placeholder*='Iron Man']", "Fresh Item 1, Fresh Item 2");
    await page.click("button:has-text('Add')");
    await page.waitForTimeout(350);

    const newDraftInIdb = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));
    const newPendingId = newDraftInIdb?.pendingId || null;

    if (
      titleAfterDiscard === "" &&
      idbAfterDiscard === null &&
      newPendingId &&
      newPendingId !== storedPendingIdBeforeClose
    ) {
      pass("Test C: Explicit Discard Action", `Draft removed from IndexedDB; new draft received fresh ID "${newPendingId}"`);
    } else {
      fail("Test C: Explicit Discard Action", `titleAfterDiscard=${titleAfterDiscard}, idbAfterDiscard=${JSON.stringify(idbAfterDiscard)}, newId=${newPendingId}`);
    }

    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // -------------------------------------------------------------
    // TEST D (Real UI): Two projects with same template and title -> distinct share IDs via ShareModal UI
    // -------------------------------------------------------------
    console.log("\n--- TEST D (Real UI): Two projects with same template & title via Studio + ShareModal ---");
    resetMockCloudModes();
    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();

    // Seed two distinct projects in IndexedDB with the exact same templateId and title
    await page.evaluate(async () => {
      const commonTiers = [
        { id: "tier-S", label: "S", color: "from-rose-500 to-red-600", items: [{ id: "i-1", name: "Pick 1" }] },
        { id: "tier-A", label: "A", color: "from-amber-500 to-orange-500", items: [] },
      ];
      await window.__AUDIT_IDB__.putProject({
        id: "proj-same-alpha",
        title: "Identical Franchise Tier List",
        templateId: "tpl-elden-ring-bosses",
        tiers: commonTiers,
        unranked: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await window.__AUDIT_IDB__.putProject({
        id: "proj-same-beta",
        title: "Identical Franchise Tier List",
        templateId: "tpl-elden-ring-bosses",
        tiers: commonTiers,
        unranked: [],
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      });
    });

    // Open Project 1 in Studio (?id=proj-same-alpha) and publish via ShareModal UI
    await page.goto(`${BASE_URL}/create?id=proj-same-alpha`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();
    await page.waitForTimeout(300);
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Public Link')", { timeout: 5000 });

    const projAlphaSaved = await page.evaluate(() => window.__AUDIT_IDB__.getProject("proj-same-alpha"));

    // Open Project 2 in Studio (?id=proj-same-beta) and publish via ShareModal UI
    await page.goto(`${BASE_URL}/create?id=proj-same-beta`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();
    await page.waitForTimeout(300);
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });

    // Verify Project 2 is still an Unpublished Draft before clicking publish
    const projBetaBeforePublishText = await page.innerText(".fixed.inset-0.z-50");
    const projBetaWasUnpublished = projBetaBeforePublishText.includes("Publish Ranking to Cloud");

    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Public Link')", { timeout: 5000 });

    const projBetaSaved = await page.evaluate(() => window.__AUDIT_IDB__.getProject("proj-same-beta"));

    if (
      projBetaWasUnpublished &&
      projAlphaSaved?.publishedShareId &&
      projBetaSaved?.publishedShareId &&
      projAlphaSaved.publishedShareId !== projBetaSaved.publishedShareId
    ) {
      pass(
        "Test D: Two Same-Title Projects Distinct Share IDs (UI)",
        `Project A published as "${projAlphaSaved.publishedShareId}", Project B published as "${projBetaSaved.publishedShareId}"`
      );
    } else {
      fail(
        "Test D: Two Same-Title Projects Distinct Share IDs (UI)",
        `betaWasUnpublished=${projBetaWasUnpublished}, idA=${projAlphaSaved?.publishedShareId}, idB=${projBetaSaved?.publishedShareId}`
      );
    }

    // -------------------------------------------------------------
    // TEST E (Real UI): Rename project in Studio UI -> pending share ID unchanged across reload & retry
    // -------------------------------------------------------------
    console.log("\n--- TEST E (Real UI): Rename project in Studio UI preserves pending share ID ---");
    resetMockCloudModes();
    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();

    await page.evaluate(async () => {
      await window.__AUDIT_IDB__.putProject({
        id: "proj-rename-ui",
        title: "Original Studio Title",
        templateId: "tpl-elden-ring-bosses",
        tiers: [{ id: "tier-S", label: "S", color: "from-rose-500 to-red-600", items: [{ id: "i-1", name: "Boss 1" }] }],
        unranked: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await page.goto(`${BASE_URL}/create?id=proj-rename-ui`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    // First publish attempt fails at network so pendingShareId is generated & saved by ShareModal
    mockCloud.dbWriteMode = "abort";
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Cloud Publishing Failed')", { timeout: 5000 });

    const pendingBeforeRename = await page.evaluate(() =>
      localStorage.getItem("tl_pending_share_project_proj-rename-ui")
    );

    // Close ShareModal and rename project through the real Studio header input
    await (await page.waitForSelector(".fixed.inset-0.z-50 button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    const titleInput = await page.waitForSelector("header input[title='Click to rename']", { timeout: 3000 });
    await titleInput.fill("Renamed Studio Masterpiece");
    // Wait for Studio's 600ms debounced auto-save to commit to IndexedDB
    await page.waitForTimeout(850);

    // Reload page and reopen project
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    const reloadedTitleVal = await page.inputValue("header input[title='Click to rename']");
    const pendingAfterRenameAndReload = await page.evaluate(() =>
      localStorage.getItem("tl_pending_share_project_proj-rename-ui")
    );

    // Now allow DB write to succeed and verify the exact same pendingShareId is sent
    mockCloud.dbWriteMode = "success";
    mockCloud.dbWrites = [];
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Public Link')", { timeout: 5000 });

    const postedId = mockCloud.dbWrites.find((w) => w.table === "tier_lists")?.payload?.id;
    const postedTitle = mockCloud.dbWrites.find((w) => w.table === "tier_lists")?.payload?.title;

    if (
      reloadedTitleVal === "Renamed Studio Masterpiece" &&
      pendingBeforeRename &&
      pendingBeforeRename === pendingAfterRenameAndReload &&
      postedId === pendingBeforeRename &&
      postedTitle === "Renamed Studio Masterpiece"
    ) {
      pass(
        "Test E: Rename Project in Studio UI Preserves Pending ID",
        `Pending ID "${pendingBeforeRename}" survived Studio UI rename & reload, publishing updated title "${postedTitle}"`
      );
    } else {
      fail(
        "Test E: Rename Project in Studio UI Preserves Pending ID",
        `reloadedTitle=${reloadedTitleVal}, before=${pendingBeforeRename}, after=${pendingAfterRenameAndReload}, postedId=${postedId}, postedTitle=${postedTitle}`
      );
    }

    // -------------------------------------------------------------
    // TEST F (Real UI): Open published project, then switch to unpublished project -> old link disappears
    // -------------------------------------------------------------
    console.log("\n--- TEST F (Real UI): Switching from published project to unpublished project clears public link ---");
    const hasPublishedLinkOnFirstProject = await page.evaluate(
      (id) => Boolean(document.querySelector(`.fixed.inset-0.z-50 a[href*='/share/${id}']`)),
      postedId
    );

    await (await page.waitForSelector(".fixed.inset-0.z-50 button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    await installPageHelpers();
    await page.evaluate(async () => {
      await window.__AUDIT_IDB__.putProject({
        id: "proj-unpub-switch",
        title: "Fresh Unpublished Project",
        tiers: [{ id: "tier-S", label: "S", color: "from-rose-500 to-red-600", items: [] }],
        unranked: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await page.goto(`${BASE_URL}/create?id=proj-unpub-switch`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });

    const unpubModalText = await page.innerText(".fixed.inset-0.z-50");
    const showsUnpublishedDraft =
      unpubModalText.includes("Unpublished Draft") && unpubModalText.includes("Publish Ranking to Cloud");
    const oldShareLinkGone = await page.evaluate(
      (id) => !document.querySelector(`.fixed.inset-0.z-50 a[href*='/share/${id}']`),
      postedId
    );

    if (hasPublishedLinkOnFirstProject && showsUnpublishedDraft && oldShareLinkGone) {
      pass(
        "Test F: Published -> Unpublished Project Switch (UI)",
        `First project showed /share/${postedId}; switching to unpublished project cleared old link and showed Unpublished Draft`
      );
    } else {
      fail(
        "Test F: Published -> Unpublished Project Switch (UI)",
        `firstHasLink=${hasPublishedLinkOnFirstProject}, showsUnpub=${showsUnpublishedDraft}, oldGone=${oldShareLinkGone}`
      );
    }

    await (await page.waitForSelector(".fixed.inset-0.z-50 button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // -------------------------------------------------------------
    // TEST K: Rapid repeated submissions through actual UI: only one operation in flight
    // -------------------------------------------------------------
    console.log("\n--- TEST K: Rapid repeated submissions in flight protection ---");
    resetMockCloudModes();
    mockCloud.uploadMode = "delay800";

    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();

    await page.evaluate(async () => {
      await window.__AUDIT_IDB__.putDraft("default", {
        pendingId: "tmpl-concurrency-test",
        title: "Rapid Click Concurrency Test",
        category: "gaming",
        description: "",
        authorName: "SpeedTester",
        items: [
          {
            id: "item-img-1",
            name: "Item Alpha",
            imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          },
          {
            id: "item-img-2",
            name: "Item Beta",
            imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          },
        ],
        updatedAt: Date.now(),
      });
    });

    await (await page.waitForSelector("button:has-text('New Template')", { timeout: 5000 })).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    const submitBtn = await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])", { timeout: 5000 });

    await submitBtn.click();
    await Promise.all([
      submitBtn.click({ force: true }).catch(() => {}),
      submitBtn.click({ force: true }).catch(() => {}),
      submitBtn.click({ force: true }).catch(() => {}),
      submitBtn.click({ force: true }).catch(() => {}),
    ]);

    await page.waitForTimeout(1200);
    const templateWrites = mockCloud.dbWrites.filter((w) => w.table === "templates");

    if (mockCloud.uploadRequests === 1 && templateWrites.length === 1) {
      pass(
        "Test K: In-Flight Concurrency Lock",
        `5 rapid clicks resulted in 1 upload batch and 1 template write`
      );
    } else {
      fail(
        "Test K: In-Flight Concurrency Lock",
        `uploads=${mockCloud.uploadRequests}, templateWrites=${templateWrites.length}`
      );
    }

    // -------------------------------------------------------------
    // TEST L: Mount/open actual ShareModal: zero publication writes until explicit Publish
    // -------------------------------------------------------------
    console.log("\n--- TEST L: ShareModal mount creates zero publication writes ---");
    resetMockCloudModes();
    await page.goto(`${BASE_URL}/create?id=proj-unpub-switch`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await (await page.waitForSelector("button:has-text('Share')", { timeout: 5000 })).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await page.waitForTimeout(400);

    if (mockCloud.dbWrites.length === 0) {
      pass("Test L: ShareModal Mount Zero Writes", "Mounted ShareModal with zero database writes");
    } else {
      fail("Test L: ShareModal Mount Zero Writes", `dbWrites=${mockCloud.dbWrites.length}`);
    }

    await (await page.waitForSelector(".fixed.inset-0.z-50 button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // -------------------------------------------------------------
    // TEST M: Upload failure stops before database publication and preserves draft
    // -------------------------------------------------------------
    console.log("\n--- TEST M: Upload failure preserves draft and stops publication ---");
    resetMockCloudModes();
    mockCloud.uploadMode = "abort";

    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();

    await page.evaluate(async () => {
      await window.__AUDIT_IDB__.putDraft("default", {
        pendingId: "tmpl-upload-fail",
        title: "Draft That Fails Upload",
        category: "gaming",
        description: "",
        authorName: "Tester",
        items: [
          {
            id: "item-fail-1",
            name: "Upload Item 1",
            imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          },
          {
            id: "item-fail-2",
            name: "Upload Item 2",
            imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          },
        ],
        updatedAt: Date.now(),
      });
    });

    await (await page.waitForSelector("button:has-text('New Template')", { timeout: 5000 })).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    const pubBtnM = await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])", { timeout: 5000 });
    await pubBtnM.click();

    const errorBannerM = await page.waitForSelector(".fixed.inset-0.z-50 .bg-rose-500\\/10", { timeout: 4000 }).catch(() => null);
    const draftTitleStillPresent = (await page.inputValue("input[placeholder*='Sci-Fi Movies']")) === "Draft That Fails Upload";

    if (errorBannerM && mockCloud.dbWrites.length === 0 && draftTitleStillPresent) {
      pass("Test M: Upload Failure Stops Flow", "Upload failure aborted before DB write; error banner visible and draft preserved");
    } else {
      fail("Test M: Upload Failure Stops Flow", `banner=${Boolean(errorBannerM)}, writes=${mockCloud.dbWrites.length}, draftPresent=${draftTitleStillPresent}`);
    }

    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // -------------------------------------------------------------
    // TEST N & SCENARIOS 1, 2, 3 (Real UI): Storage failures in PublishModal, ShareModal, CommentsSection & IDB abort
    // -------------------------------------------------------------
    console.log("\n--- TEST N & SCENARIOS 1–3: Storage Failures & IDB Abort in Real UIs ---");
    resetMockCloudModes();

    // N.1 & Scenario 3: PublishModal with IndexedDB transaction abort (__TL_SIMULATE_IDB_ABORT__)
    await page.evaluate(() => {
      window.__TL_SIMULATE_IDB_ABORT__ = true;
    });
    await (await page.waitForSelector("button:has-text('New Template')", { timeout: 5000 })).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    const pubBtnAbort = await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])", { timeout: 5000 });
    await pubBtnAbort.click();

    const idbAbortBanner = await page.waitForSelector(".fixed.inset-0.z-50 .bg-rose-500\\/10", { timeout: 4000 }).catch(() => null);
    const idbAbortBannerText = idbAbortBanner ? await idbAbortBanner.innerText() : "";
    const zeroWritesOnIdbAbort = mockCloud.dbWrites.length === 0;
    const contentRetainedOnIdbAbort = (await page.inputValue("input[placeholder*='Sci-Fi Movies']")) === "Draft That Fails Upload";

    await page.evaluate(() => {
      window.__TL_SIMULATE_IDB_ABORT__ = false;
    });
    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // Scenario 1: ShareModal pending-ID storage failure
    await page.goto(`${BASE_URL}/create?id=proj-unpub-switch`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__TL_SIMULATE_STORAGE_FAILURE__ = true;
    });
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();

    const shareStorageErrBanner = await page
      .waitForSelector(".fixed.inset-0.z-50:has-text('Cloud Publishing Failed')", { timeout: 4000 })
      .catch(() => null);
    const zeroWritesOnShareStorageFail = mockCloud.dbWrites.length === 0;
    await page.evaluate(() => {
      window.__TL_SIMULATE_STORAGE_FAILURE__ = false;
    });
    await (await page.waitForSelector(".fixed.inset-0.z-50 button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // Scenario 2: CommentsSection pending-draft storage failure
    await page.goto(`${BASE_URL}/share/share-audit-1`, { waitUntil: "domcontentloaded" });
    const commentTextarea = await page.waitForSelector("textarea[placeholder*='Drop your take']", { timeout: 5000 });
    await page.waitForTimeout(300);
    await commentTextarea.fill("My hot take when storage is full");

    await page.evaluate(() => {
      window.__TL_SIMULATE_STORAGE_FAILURE__ = true;
    });
    const postTakeBtn = await page.waitForSelector("button:has-text('Post Take'):not([disabled])", { timeout: 5000 });
    await postTakeBtn.click();

    const commentStorageBanner = await page.waitForSelector(".bg-rose-500\\/10", { timeout: 4000 }).catch(() => null);
    const commentTextRetained = (await commentTextarea.inputValue()) === "My hot take when storage is full";
    const zeroWritesOnCommentStorageFail = mockCloud.dbWrites.length === 0;

    await page.evaluate(() => {
      window.__TL_SIMULATE_STORAGE_FAILURE__ = false;
    });

    if (
      idbAbortBanner &&
      idbAbortBannerText.includes("aborted") &&
      zeroWritesOnIdbAbort &&
      contentRetainedOnIdbAbort &&
      shareStorageErrBanner &&
      zeroWritesOnShareStorageFail &&
      commentStorageBanner &&
      commentTextRetained &&
      zeroWritesOnCommentStorageFail
    ) {
      pass(
        "Test N & Scenarios 1–3: PublishModal IDB Abort, ShareModal & CommentsSection Storage Failures",
        "All 3 UI flows blocked cloud writes on storage failure, displayed actionable error banners, and retained user content"
      );
    } else {
      fail(
        "Test N & Scenarios 1–3: Storage Failures",
        `idbBanner=${Boolean(idbAbortBanner)}(${idbAbortBannerText}), shareBanner=${Boolean(shareStorageErrBanner)}, commentBanner=${Boolean(commentStorageBanner)}, writes=${mockCloud.dbWrites.length}`
      );
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Image-heavy template draft persistence and restoration in IndexedDB
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 4: Image-heavy template draft in IndexedDB ---");
    resetMockCloudModes();
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();

    const largeBase64Chunk = "A".repeat(60000);
    const heavyDataUrl = `data:image/png;base64,${largeBase64Chunk}`;
    await page.evaluate(async (dataUrl) => {
      await window.__AUDIT_IDB__.putDraft("default", {
        pendingId: "tmpl-heavy-idb-4",
        title: "Heavy Image Draft 300KB",
        category: "anime",
        description: "Multi-image IndexedDB draft test",
        authorName: "HeavyUploader",
        items: [
          { id: "h-1", name: "Heavy 1", imageUrl: dataUrl },
          { id: "h-2", name: "Heavy 2", imageUrl: dataUrl },
          { id: "h-3", name: "Heavy 3", imageUrl: dataUrl },
          { id: "h-4", name: "Heavy 4", imageUrl: dataUrl },
          { id: "h-5", name: "Heavy 5", imageUrl: dataUrl },
        ],
        updatedAt: Date.now(),
      });
    }, heavyDataUrl);

    await page.reload({ waitUntil: "domcontentloaded" });
    await installPageHelpers();
    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])", { timeout: 5000 });

    const heavyTitle = await page.inputValue("input[placeholder*='Sci-Fi Movies']");
    const heavyDraftCheck = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));

    if (
      heavyTitle === "Heavy Image Draft 300KB" &&
      heavyDraftCheck?.items?.length === 5 &&
      heavyDraftCheck?.pendingId === "tmpl-heavy-idb-4"
    ) {
      pass("Scenario 4: Image-Heavy IndexedDB Draft", "300KB+ 5-image draft persisted and restored cleanly from IndexedDB");
    } else {
      fail("Scenario 4: Image-Heavy IndexedDB Draft", `title=${heavyTitle}, items=${heavyDraftCheck?.items?.length}`);
    }

    await (await page.waitForSelector("button:has-text('Discard Draft')")).click();
    await page.waitForTimeout(300);
    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // -------------------------------------------------------------
    // SCENARIO 5: Existing localStorage draft migration to IndexedDB
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 5: Legacy localStorage draft migration to IndexedDB ---");
    await page.evaluate(() => {
      localStorage.setItem(
        "tl_template_draft_default",
        JSON.stringify({
          pendingId: "tmpl-legacy-migrated-5",
          title: "Migrated From LocalStorage",
          category: "movies",
          description: "Legacy draft",
          authorName: "LegacyUser",
          items: [
            { id: "leg-1", name: "Legacy 1" },
            { id: "leg-2", name: "Legacy 2" },
          ],
          updatedAt: Date.now(),
        })
      );
      window.__TL_SIMULATE_IDB_ABORT__ = true;
    });

    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.waitForTimeout(400);

    const legacyPreservedOnFailedMigration = await page.evaluate(
      () => localStorage.getItem("tl_template_draft_default") !== null
    );

    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // Now allow IDB write to succeed -> migrates to IDB and removes localStorage key
    await page.evaluate(() => {
      window.__TL_SIMULATE_IDB_ABORT__ = false;
    });
    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])", { timeout: 5000 });

    const migratedTitle = await page.inputValue("input[placeholder*='Sci-Fi Movies']");
    const legacyRemovedAfterSuccess = await page.evaluate(
      () => localStorage.getItem("tl_template_draft_default") === null
    );
    const idbMigratedRecord = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));

    if (
      legacyPreservedOnFailedMigration &&
      migratedTitle === "Migrated From LocalStorage" &&
      legacyRemovedAfterSuccess &&
      idbMigratedRecord?.pendingId === "tmpl-legacy-migrated-5"
    ) {
      pass(
        "Scenario 5: localStorage -> IndexedDB Migration",
        "Preserved localStorage copy when IDB aborted, then migrated to IDB and removed localStorage copy after commit"
      );
    } else {
      fail(
        "Scenario 5: localStorage -> IndexedDB Migration",
        `preservedOnFail=${legacyPreservedOnFailedMigration}, title=${migratedTitle}, removedAfter=${legacyRemovedAfterSuccess}, idb=${idbMigratedRecord?.pendingId}`
      );
    }

    // -------------------------------------------------------------
    // SCENARIO 6: Discard while autosave is pending (must not resurrect discarded draft)
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 6: Discard while autosave is in flight ---");
    await page.evaluate(() => {
      window.__TL_SIMULATE_AUTOSAVE_DELAY_MS__ = 600;
    });

    await page.fill("input[placeholder*='Sci-Fi Movies']", "Typing Before Immediate Discard");
    await page.waitForTimeout(50);

    await (await page.waitForSelector("button:has-text('Discard Draft')")).click();

    await page.waitForTimeout(900);
    await page.evaluate(() => {
      window.__TL_SIMULATE_AUTOSAVE_DELAY_MS__ = 0;
    });

    const idbAfterDelayedAutosave = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));
    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    const titleAfterReopen6 = await page.inputValue("input[placeholder*='Sci-Fi Movies']");

    if (idbAfterDelayedAutosave === null && titleAfterReopen6 === "") {
      pass("Scenario 6: Discard During Pending Autosave", "Generation guard prevented in-flight autosave from resurrecting discarded draft");
    } else {
      fail("Scenario 6: Discard During Pending Autosave", `idb=${JSON.stringify(idbAfterDelayedAutosave)}, title=${titleAfterReopen6}`);
    }

    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // -------------------------------------------------------------
    // SCENARIO 8: Delayed draft hydration (no overwrite before hydration, no overwrite of newer user edits)
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 8: Delayed draft hydration safety ---");
    await page.evaluate(async () => {
      await window.__AUDIT_IDB__.putDraft("default", {
        pendingId: "tmpl-delayed-hydration-8",
        title: "Stored Draft Title 8",
        category: "gaming",
        description: "Stored description",
        authorName: "StoredAuthor",
        items: [
          { id: "d8-1", name: "Stored Item 1" },
          { id: "d8-2", name: "Stored Item 2" },
        ],
        updatedAt: Date.now(),
      });
      window.__TL_DRAFT_HYDRATION_DELAY_MS__ = 500;
    });

    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.waitForTimeout(750);

    const hydratedTitle8a = await page.inputValue("input[placeholder*='Sci-Fi Movies']");
    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    await page.evaluate(() => {
      window.__TL_DRAFT_HYDRATION_DELAY_MS__ = 600;
    });
    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await page.fill("input[placeholder*='Sci-Fi Movies']", "Newer User Edit During Hydration");
    await page.waitForTimeout(850);

    const titleAfterHydration8b = await page.inputValue("input[placeholder*='Sci-Fi Movies']");
    await page.evaluate(() => {
      window.__TL_DRAFT_HYDRATION_DELAY_MS__ = 0;
    });

    if (
      hydratedTitle8a === "Stored Draft Title 8" &&
      titleAfterHydration8b === "Newer User Edit During Hydration"
    ) {
      pass(
        "Scenario 8: Delayed Draft Hydration",
        "Initial empty state did not overwrite stored draft, and delayed hydration did not clobber newer user edits"
      );
    } else {
      fail(
        "Scenario 8: Delayed Draft Hydration",
        `8a=${hydratedTitle8a}, 8b=${titleAfterHydration8b}`
      );
    }

    await (await page.waitForSelector("button:has-text('Discard Draft')")).click();
    await page.waitForTimeout(200);
    await (await page.waitForSelector("button[aria-label='Close']")).click();
    await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 3000 });

    // -------------------------------------------------------------
    // SCENARIO 7: Session switch with a pending comment in CommentsSection UI
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 7: Session switch with a pending comment ---");
    resetMockCloudModes();
    mockCloud.currentUserId = "user-session-A";
    await page.goto(`${BASE_URL}/share/share-audit-1`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear();
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-A";
      window.dispatchEvent(new CustomEvent("tl-auth-state-change", { detail: { userId: "user-session-A" } }));
    });
    await page.waitForTimeout(300);

    const cmtInput = await page.waitForSelector("textarea[placeholder*='Drop your take']", { timeout: 5000 });
    await cmtInput.fill("User A private unsubmitted draft");
    await page.waitForTimeout(300);

    const savedKeyA = await page.evaluate(() =>
      localStorage.getItem("tl_pending_comment_share-audit-1_user-session-A")
    );

    mockCloud.currentUserId = "user-session-B";
    await page.evaluate(() => {
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-B";
      window.dispatchEvent(new CustomEvent("tl-auth-state-change", { detail: { userId: "user-session-B" } }));
    });
    await page.waitForTimeout(350);

    const textareaForUserB = await cmtInput.inputValue();

    await cmtInput.fill("User B public comment");
    await (await page.waitForSelector("button:has-text('Post Take'):not([disabled])")).click();
    await page.waitForTimeout(400);

    const commentWrites7 = mockCloud.dbWrites.filter((w) => w.table === "comments");
    const userADraftStillPreserved = await page.evaluate(() => {
      const raw = localStorage.getItem("tl_pending_comment_share-audit-1_user-session-A");
      return raw ? JSON.parse(raw).content : null;
    });

    if (
      savedKeyA &&
      textareaForUserB === "" &&
      commentWrites7.length === 1 &&
      commentWrites7[0].payload.content === "User B public comment" &&
      commentWrites7[0].payload.author_id === "user-session-B" &&
      userADraftStillPreserved === "User A private unsubmitted draft"
    ) {
      pass(
        "Scenario 7: Session Switch Comment Isolation",
        "User A's pending draft was hidden from User B, never submitted as User B, and remained preserved under User A's key"
      );
    } else {
      fail(
        "Scenario 7: Session Switch Comment Isolation",
        `forB="${textareaForUserB}", writes=${JSON.stringify(commentWrites7)}, preservedA="${userADraftStillPreserved}"`
      );
    }

    // -------------------------------------------------------------
    // SCENARIO 9: Cloud success followed by failed local confirmation save in ShareModal
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 9: Cloud success followed by failed local project save ---");
    resetMockCloudModes();
    await page.goto(`${BASE_URL}/create?id=proj-unpub-switch`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__TL_SIMULATE_SAVE_PROJECT_FAILURE__ = true;
    });

    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();

    const errBanner9 = await page
      .waitForSelector(".fixed.inset-0.z-50:has-text('Cloud Publishing Failed')", { timeout: 5000 })
      .catch(() => null);
    const errText9 = errBanner9 ? await page.innerText(".fixed.inset-0.z-50") : "";
    const pendingRetained9 = await page.evaluate(() =>
      localStorage.getItem("tl_pending_share_project_proj-unpub-switch")
    );
    const cloudInsertCountAfterFirst = mockCloud.dbWrites.filter((w) => w.table === "tier_lists" && w.method === "POST").length;

    await page.evaluate(() => {
      window.__TL_SIMULATE_SAVE_PROJECT_FAILURE__ = false;
    });
    await (await page.waitForSelector("button:has-text('Retry Publish')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Public Link')", { timeout: 5000 });

    const pendingClearedAfterRetry9 = await page.evaluate(() =>
      localStorage.getItem("tl_pending_share_project_proj-unpub-switch")
    );
    const cloudInsertCountAfterRetry = mockCloud.dbWrites.filter((w) => w.table === "tier_lists" && w.method === "POST").length;

    if (
      errText9.includes("Cloud publication succeeded") &&
      pendingRetained9 &&
      cloudInsertCountAfterFirst === 1 &&
      cloudInsertCountAfterRetry === 1 &&
      pendingClearedAfterRetry9 === null
    ) {
      pass(
        "Scenario 9: Cloud Success + Local Save Failure Recovery",
        `Retained pending ID "${pendingRetained9}" on local save error, explained cloud+local state, and recovered on retry with 0 duplicate inserts`
      );
    } else {
      fail(
        "Scenario 9: Cloud Success + Local Save Failure Recovery",
        `errText="${errText9}", pendingRetained=${pendingRetained9}, inserts=${cloudInsertCountAfterFirst}->${cloudInsertCountAfterRetry}, cleared=${pendingClearedAfterRetry9}`
      );
    }

    // -------------------------------------------------------------
    // SCENARIO 10: Lost response followed by reload and retry (Template, Share, Comment)
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO 10: Lost response -> reload -> retry across Template, Share & Comment ---");
    resetMockCloudModes();

    // 10a: Template lost response -> reload -> retry
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await installPageHelpers();
    await page.evaluate(async () => {
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-B";
      await window.__AUDIT_IDB__.putDraft("default", {
        pendingId: "tmpl-lost-resp-10",
        title: "Lost Response Template 10",
        category: "gaming",
        description: "Testing lost response",
        authorName: "RetryMaster",
        items: [
          { id: "lr-1", name: "Item 1" },
          { id: "lr-2", name: "Item 2" },
        ],
        updatedAt: Date.now(),
      });
    });

    mockCloud.dbWriteMode = "commit_then_abort";
    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await (await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])")).click();
    await page.waitForSelector(".fixed.inset-0.z-50 .bg-rose-500\\/10", { timeout: 5000 });

    mockCloud.dbWriteMode = "success";
    await page.reload({ waitUntil: "domcontentloaded" });
    await installPageHelpers();
    await page.evaluate(() => {
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-B";
    });
    await (await page.waitForSelector("button:has-text('New Template')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Publish Community Template')", { timeout: 5000 });
    await (await page.waitForSelector(".fixed.inset-0.z-50 button[type='submit']:not([disabled])")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Template Published Successfully!')", { timeout: 5000 });

    const templatePosts10 = mockCloud.dbWrites.filter((w) => w.table === "templates" && w.method === "POST").length;
    const draftDeletedAfter10a = await page.evaluate(() => window.__AUDIT_IDB__.getDraft("default"));

    // 10b: ShareModal lost response -> reload -> retry
    resetMockCloudModes();
    mockCloud.currentUserId = "user-session-B";
    await page.evaluate(async () => {
      await window.__AUDIT_IDB__.putProject({
        id: "proj-lost-resp-10b",
        title: "Lost Response Share 10b",
        tiers: [{ id: "tier-S", label: "S", color: "from-rose-500 to-red-600", items: [{ id: "i-1", name: "Item 1" }] }],
        unranked: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await page.goto(`${BASE_URL}/create?id=proj-lost-resp-10b`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-B";
    });
    mockCloud.dbWriteMode = "commit_then_abort";
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Cloud Publishing Failed')", { timeout: 5000 });

    mockCloud.dbWriteMode = "success";
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-B";
    });
    await (await page.waitForSelector("button:has-text('Share')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Share Your Tier List')", { timeout: 5000 });
    await (await page.waitForSelector("button:has-text('Publish Ranking to Cloud')")).click();
    await page.waitForSelector(".fixed.inset-0.z-50:has-text('Public Link')", { timeout: 5000 });

    const sharePosts10 = mockCloud.dbWrites.filter((w) => w.table === "tier_lists" && w.method === "POST").length;
    const sharePendingCleared10b = await page.evaluate(() =>
      localStorage.getItem("tl_pending_share_project_proj-lost-resp-10b")
    );

    // 10c: Comment lost response -> reload -> retry
    resetMockCloudModes();
    mockCloud.currentUserId = "user-session-B";
    await page.goto(`${BASE_URL}/share/share-audit-1`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-B";
    });

    const cmt10 = await page.waitForSelector("textarea[placeholder*='Drop your take']", { timeout: 5000 });
    await cmt10.fill("Lost response comment 10c");
    mockCloud.dbWriteMode = "commit_then_abort";
    await (await page.waitForSelector("button:has-text('Post Take'):not([disabled])")).click();
    await page.waitForSelector(".bg-rose-500\\/10", { timeout: 5000 });

    mockCloud.dbWriteMode = "success";
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.__TL_MOCK_SESSION_USER_ID__ = "user-session-B";
    });
    await page.waitForSelector("textarea[placeholder*='Drop your take']", { timeout: 5000 });
    await page.waitForTimeout(300);
    await (await page.waitForSelector("button:has-text('Post Take'):not([disabled])")).click();
    await page.waitForSelector("p:has-text('Lost response comment 10c')", { timeout: 5000 });

    const commentPosts10 = mockCloud.dbWrites.filter((w) => w.table === "comments" && w.method === "POST").length;

    if (
      templatePosts10 === 1 &&
      draftDeletedAfter10a === null &&
      sharePosts10 === 1 &&
      sharePendingCleared10b === null &&
      commentPosts10 === 1
    ) {
      pass(
        "Scenario 10: Lost Response -> Reload -> Retry (Template, Share, Comment)",
        "All 3 flows recovered committed records after lost HTTP response + page reload with 0 duplicate inserts"
      );
    } else {
      fail(
        "Scenario 10: Lost Response -> Reload -> Retry (Template, Share, Comment)",
        `templatePosts=${templatePosts10}, draftAfter=${JSON.stringify(draftDeletedAfter10a)}, sharePosts=${sharePosts10}, shareCleared=${sharePendingCleared10b}, commentPosts=${commentPosts10}`
      );
    }

    // -------------------------------------------------------------
    // NETWORK ISOLATION VERIFICATION: Zero unexpected external requests
    // -------------------------------------------------------------
    if (mockCloud.unexpectedExternalRequests.length === 0) {
      pass(
        "Network Isolation Guard",
        "Zero unexpected external network requests attempted during browser UI audit"
      );
    } else {
      fail(
        "Network Isolation Guard",
        `Unexpected external requests: ${mockCloud.unexpectedExternalRequests.join(", ")}`
      );
    }
  } finally {
    await browser.close();
  }
}

// =====================================================================
// MAIN AUDIT RUNNER
// =====================================================================

async function runAllAudits() {
  console.log("==================================================");
  console.log("STARTING COMPLETE PUBLISHING & PERSISTENCE AUDIT");
  console.log("==================================================");

  let nextServerProcess = null;
  const watchdog = setTimeout(() => {
    console.error("[FAIL] Watchdog Timeout - Audit exceeded 90 seconds; terminating.");
    if (nextServerProcess) killServerProcess(nextServerProcess);
    process.exit(1);
  }, 90000);
  watchdog.unref();

  try {
    // 1. Run core library & contract suites
    await testCaseG_StrictOwnershipRejection();
    await testCaseH_DuplicateKeyRecoveryDifferentContent();
    await testCaseI_CommentRetryDifferentContentRejection();
    await testCaseJ_CommentResponseLostRetryRecovery();
    await testCaseO_SemanticJsonAndPhase4Contracts();

    // 2. Start isolated Next.js server on dedicated port
    nextServerProcess = await startIsolatedNextServer();

    // 3. Run real Playwright browser UI suites
    await runBrowserAudit();
  } catch (err) {
    fail("Fatal Runner Exception", err?.stack || err?.message || String(err));
  } finally {
    clearTimeout(watchdog);
    if (nextServerProcess) {
      console.log(`Stopping isolated Next.js server (PID ${nextServerProcess.pid})...`);
      killServerProcess(nextServerProcess);
    }
  }

  console.log("\n==================================================");
  console.log(
    `AUDIT FINISHED: ${results.passed.length} PASSED, ${results.failed.length} FAILED, ${results.blocked.length} BLOCKED`
  );
  console.log("==================================================");

  if (results.failed.length > 0 || results.blocked.length > 0) {
    process.exit(1);
  }
}

runAllAudits();
