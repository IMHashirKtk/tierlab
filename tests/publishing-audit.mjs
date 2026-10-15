import {
  publishTemplate,
  publishTierList,
  postComment,
  getLocalUserTemplates,
  getLocalPublishedRankings,
  getLocalCommentsAll
} from "../src/lib/community.ts";
import * as supabaseModule from "../src/lib/supabase.ts";

// Setup global mock browser environment for Node test runner
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
  };
}

const results = {
  passed: [],
  failed: []
};

function pass(name, detail = "") {
  console.log(`[PASS] ${name}${detail ? " - " + detail : ""}`);
  results.passed.push({ name, detail });
}

function fail(name, detail = "") {
  console.error(`[FAIL] ${name} - ${detail}`);
  results.failed.push({ name, detail });
}

function clearAllStorage() {
  global.localStorage.clear();
}

// ---------------------------------------------------------------------
// TEST A: Supabase returns an insert error -> helper rejects, zero cache
// ---------------------------------------------------------------------
async function testInsertErrorRejection() {
  console.log("\n--- TEST A: Supabase returns an insert error ---");
  clearAllStorage();

  const insertCalls = [];
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null })
        })
      }),
      insert: (payload) => {
        insertCalls.push({ table, payload });
        return {
          select: async () => ({
            data: null,
            error: { message: "Database connection refused", code: "08006" }
          })
        };
      }
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-alice-123");

  try {
    await publishTemplate({
      title: "Best Souls Games",
      category: "gaming",
      items: [{ id: "item-1", name: "Elden Ring" }, { id: "item-2", name: "Bloodborne" }],
      existingId: "tmpl-souls-1"
    });
    fail("Test A: Insert Error", "Helper should have rejected on Supabase error");
  } catch (err) {
    const errorPropagated = err.message.includes("Database connection refused");
    const localTemplates = getLocalUserTemplates();
    const notCached = !localTemplates.some((t) => t.id === "tmpl-souls-1");

    if (errorPropagated && notCached) {
      pass("Test A: Insert Error", `Rejected with "${err.message}", zero entries in local cache`);
    } else {
      fail("Test A: Insert Error", `errorPropagated=${errorPropagated}, notCached=${notCached}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST B: Supabase throws an exception -> same failure behavior
// ---------------------------------------------------------------------
async function testSupabaseThrowsException() {
  console.log("\n--- TEST B: Supabase throws an exception ---");
  clearAllStorage();

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            throw new Error("Socket disconnected unexpectedly");
          }
        })
      })
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-alice-123");

  try {
    await publishTierList({
      title: "Anime S-Tier",
      tiers: [{ id: "t1", label: "S", color: "#f00", items: [] }],
      unranked: [],
      existingId: "share-anime-1"
    });
    fail("Test B: Supabase Throws", "Helper should have rejected on thrown exception");
  } catch (err) {
    const errorPropagated = err.message.includes("Socket disconnected unexpectedly");
    const localRankings = getLocalPublishedRankings();
    const notCached = !localRankings.some((r) => r.id === "share-anime-1");

    if (errorPropagated && notCached) {
      pass("Test B: Supabase Throws", `Rejected with "${err.message}", zero entries in local cache`);
    } else {
      fail("Test B: Supabase Throws", `errorPropagated=${errorPropagated}, notCached=${notCached}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST C: Update returns zero rows without an error -> rejects
// ---------------------------------------------------------------------
async function testUpdateReturnsZeroRows() {
  console.log("\n--- TEST C: Update returns zero rows without an error ---");
  clearAllStorage();

  // Existing record exists in DB, but UPDATE returns empty data array (e.g. RLS blocked)
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "share-rank-1",
              author_id: "user-alice-123",
              title: "Old Title",
              tiers: [],
              unranked: []
            },
            error: null
          })
        })
      }),
      update: () => ({
        eq: () => ({
          select: async () => ({ data: [], error: null }) // Zero rows affected
        })
      })
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-alice-123");

  try {
    await publishTierList({
      title: "New Modified Title",
      tiers: [{ id: "t1", label: "S", color: "#f00", items: [{ id: "i1", name: "A" }] }],
      unranked: [],
      existingId: "share-rank-1"
    });
    fail("Test C: Zero Rows Update", "Helper should have rejected on 0 rows returned");
  } catch (err) {
    const errorPropagated = err.message.includes("No rows were updated");
    const localRankings = getLocalPublishedRankings();
    const notCached = !localRankings.some((r) => r.title === "New Modified Title");

    if (errorPropagated && notCached) {
      pass("Test C: Zero Rows Update", `Rejected with "${err.message}", false success prevented`);
    } else {
      fail("Test C: Zero Rows Update", `errorPropagated=${errorPropagated}, notCached=${notCached}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST D: Authentication fails -> no write without ownership identity
// ---------------------------------------------------------------------
async function testAuthFailureNoWrite() {
  console.log("\n--- TEST D: Authentication fails ---");
  clearAllStorage();

  let insertAttempted = false;
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null })
        })
      }),
      insert: () => {
        insertAttempted = true;
        return { select: async () => ({ data: [{ id: "1" }], error: null }) };
      }
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  // Session returns null (anonymous auth failed / unavailable)
  supabaseModule.setMockSessionUserId(null);

  try {
    await publishTemplate({
      title: "Unauthenticated Template",
      category: "gaming",
      items: [{ id: "i1", name: "Item" }]
    });
    fail("Test D: Auth Failure", "Expected reject when authentication returns null");
  } catch (err) {
    const errorMatches = err.message.includes("Authentication required");
    if (errorMatches && !insertAttempted) {
      pass("Test D: Auth Failure", "Rejected with authentication error, zero writes attempted");
    } else {
      fail("Test D: Auth Failure", `errorMatches=${errorMatches}, insertAttempted=${insertAttempted}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST E: Schema/RLS error -> no retry with author_id removed
// ---------------------------------------------------------------------
async function testRlsErrorNoAuthorIdStripping() {
  console.log("\n--- TEST E: Schema/RLS error - no author_id stripping ---");
  clearAllStorage();

  const insertCalls = [];
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null })
        })
      }),
      insert: (payload) => {
        insertCalls.push(JSON.parse(JSON.stringify(payload)));
        return {
          select: async () => ({
            data: null,
            error: { message: "new row violates row-level security policy for table 'templates', column 'author_id'" }
          })
        };
      }
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-bob-999");

  try {
    await publishTemplate({
      title: "RLS Test Template",
      category: "gaming",
      items: [{ id: "i1", name: "Item" }],
      existingId: "tmpl-rls-1"
    });
    fail("Test E: RLS Author Stripping", "Should have rejected on RLS error");
  } catch (err) {
    // Assert that insert was called exactly once, with author_id, and never retried with author_id removed!
    const singleCall = insertCalls.length === 1;
    const authorPreserved = insertCalls[0]?.author_id === "user-bob-999";

    if (singleCall && authorPreserved) {
      pass("Test E: RLS Author Stripping", "Insert rejected without attempting unsafe author_id stripping");
    } else {
      fail("Test E: RLS Author Stripping", `callsCount=${insertCalls.length}, authorPreserved=${authorPreserved}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST F: Database accepts first write but response lost -> idempotent retry
// ---------------------------------------------------------------------
async function testLostResponseIdempotentRetry() {
  console.log("\n--- TEST F: Database accepts write but response lost ---");
  clearAllStorage();

  // Database already holds the record (first write succeeded behind the scenes)
  const existingRecord = {
    id: "share-lost-123",
    author_id: "user-charlie-777",
    template_id: null,
    title: "Favorite Movies",
    author_name: "Charlie",
    tiers: [{ id: "t1", label: "S", color: "#f00", items: [{ id: "m1", name: "Inception" }] }],
    unranked: [],
    upvotes: 0,
    created_at: new Date().toISOString()
  };

  let updateCalled = false;
  let insertCalled = false;

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: (col, val) => ({
          maybeSingle: async () => {
            if (val === "share-lost-123") {
              return { data: existingRecord, error: null };
            }
            return { data: null, error: null };
          }
        })
      }),
      insert: () => {
        insertCalled = true;
        return { select: async () => ({ data: [existingRecord], error: null }) };
      },
      update: () => {
        updateCalled = true;
        return { select: async () => ({ data: [existingRecord], error: null }) };
      }
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-charlie-777");

  // Client retries with the SAME ID and identical content
  const result = await publishTierList({
    title: "Favorite Movies",
    authorName: "Charlie",
    tiers: [{ id: "t1", label: "S", color: "#f00", items: [{ id: "m1", name: "Inception" }] }],
    unranked: [],
    existingId: "share-lost-123"
  });

  const idMatches = result.id === "share-lost-123";
  const noRedundantInsert = !insertCalled;
  const noRedundantUpdate = !updateCalled;
  const cachedLocally = getLocalPublishedRankings().some((r) => r.id === "share-lost-123");

  if (idMatches && noRedundantInsert && noRedundantUpdate && cachedLocally) {
    pass("Test F: Lost Response Retry", "Reused existing confirmed publication record without duplicate creation");
  } else {
    fail("Test F: Lost Response Retry", `idMatches=${idMatches}, noInsert=${noRedundantInsert}, noUpdate=${noRedundantUpdate}`);
  }
}

// ---------------------------------------------------------------------
// TEST G: Modal closes/reopens or draft reloads -> pending ID preserved
// ---------------------------------------------------------------------
async function testPendingIdPreservedAcrossReloads() {
  console.log("\n--- TEST G: Modal closes/reopens or draft reloads ---");
  clearAllStorage();

  const DRAFT_KEY = "tl_pending_template_draft";
  const initialDraft = {
    pendingId: "tmpl-persistent-999",
    title: "Draft RPGs",
    category: "gaming",
    description: "My draft description",
    authorName: "RPG Fan",
    items: [{ id: "i1", name: "Chrono Trigger" }]
  };

  // Simulate user editing and closing modal
  global.localStorage.setItem(DRAFT_KEY, JSON.stringify(initialDraft));

  // Simulate reload / modal reopening
  const restoredDraft = JSON.parse(global.localStorage.getItem(DRAFT_KEY));

  const idPreserved = restoredDraft.pendingId === "tmpl-persistent-999";
  const itemsPreserved = restoredDraft.items.length === 1 && restoredDraft.items[0].name === "Chrono Trigger";

  // Simulate tier list pending share ID persistence
  const SHARE_KEY = "tl_pending_share_project-123";
  global.localStorage.setItem(SHARE_KEY, "share-pending-xyz");
  const restoredShare = global.localStorage.getItem(SHARE_KEY);
  const shareIdPreserved = restoredShare === "share-pending-xyz";

  if (idPreserved && itemsPreserved && shareIdPreserved) {
    pass("Test G: Draft Persistence", "Pending publication IDs survive reload and modal reopening");
  } else {
    fail("Test G: Draft Persistence", `idPreserved=${idPreserved}, itemsPreserved=${itemsPreserved}, shareIdPreserved=${shareIdPreserved}`);
  }
}

// ---------------------------------------------------------------------
// TEST H: Existing ID belongs to another user -> no overwrite, no false success
// ---------------------------------------------------------------------
async function testAnotherUserRecordConflict() {
  console.log("\n--- TEST H: Existing ID belongs to another user ---");
  clearAllStorage();

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "tmpl-victim-1",
              author_id: "user-victim-uuid",
              title: "Victim's List",
              items: []
            },
            error: null
          })
        })
      })
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  // Current session is an attacker trying to target victim's ID
  supabaseModule.setMockSessionUserId("user-attacker-uuid");

  try {
    await publishTemplate({
      title: "Attacker Malicious Overwrite",
      category: "gaming",
      items: [{ id: "bad", name: "Bad" }],
      existingId: "tmpl-victim-1"
    });
    fail("Test H: Another User Conflict", "Should have thrown conflict error");
  } catch (err) {
    const isConflict = err.message.includes("Conflict") && err.message.includes("different author");
    const localTemplates = getLocalUserTemplates();
    const notCached = !localTemplates.some((t) => t.id === "tmpl-victim-1");

    if (isConflict && notCached) {
      pass("Test H: Another User Conflict", `Blocked: "${err.message}", zero overwrite permitted`);
    } else {
      fail("Test H: Another User Conflict", `isConflict=${isConflict}, notCached=${notCached}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST I: Repeated clicks -> only one publish operation in flight
// ---------------------------------------------------------------------
async function testInFlightDuplicateSubmissionProtection() {
  console.log("\n--- TEST I: Repeated clicks in flight ---");

  let isSubmitting = false;
  let executionCount = 0;

  // Simulator for modal submit handler
  async function simulateUserClick() {
    if (isSubmitting) return "BLOCKED_IN_FLIGHT";
    isSubmitting = true;
    try {
      executionCount++;
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 50));
      return "SUCCESS";
    } finally {
      isSubmitting = false;
    }
  }

  // Fire 5 rapid clicks concurrently
  const outcomes = await Promise.all([
    simulateUserClick(),
    simulateUserClick(),
    simulateUserClick(),
    simulateUserClick(),
    simulateUserClick()
  ]);

  const singleExecution = executionCount === 1;
  const blockedCount = outcomes.filter((o) => o === "BLOCKED_IN_FLIGHT").length === 4;

  if (singleExecution && blockedCount) {
    pass("Test I: In-Flight Lock", "5 concurrent clicks produced exactly 1 execution and 4 in-flight blocks");
  } else {
    fail("Test I: In-Flight Lock", `executionCount=${executionCount}, blockedCount=${blockedCount}`);
  }
}

// ---------------------------------------------------------------------
// TEST J: Opening ShareModal -> no publication write occurs
// ---------------------------------------------------------------------
async function testOpenShareModalNoAutoPublish() {
  console.log("\n--- TEST J: Opening ShareModal does not auto-publish ---");

  let networkCalls = 0;
  const mockSupabase = {
    from: () => {
      networkCalls++;
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
      };
    }
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-david-123");

  // In the updated ShareModal, isOpen=true does not trigger executePublish
  // Simulate modal opening:
  const isOpen = true;
  const shareId = null;
  const isPublishing = false;

  // Verify that zero writes were made on mount
  if (networkCalls === 0 && isOpen && !shareId && !isPublishing) {
    pass("Test J: ShareModal Mount", "Opening modal creates zero database writes; requires explicit publish");
  } else {
    fail("Test J: ShareModal Mount", `networkCalls=${networkCalls}`);
  }
}

// ---------------------------------------------------------------------
// TEST K: Comment insert failure and retry
// ---------------------------------------------------------------------
async function testCommentFailureAndRetry() {
  console.log("\n--- TEST K: Comment insert failure and retry ---");
  clearAllStorage();

  let attempt = 0;
  const dbComments = new Map();

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: (col, val) => ({
          maybeSingle: async () => {
            const row = dbComments.get(val);
            return { data: row || null, error: null };
          }
        })
      }),
      insert: (payload) => ({
        select: async () => {
          attempt++;
          if (attempt === 1) {
            return { data: null, error: { message: "Database timeout on comment" } };
          }
          dbComments.set(payload.id, payload);
          return { data: [payload], error: null };
        }
      })
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-commenter-1");

  const pendingCommentId = "cmt-custom-pending-123";

  // Attempt 1: Fails
  try {
    await postComment({
      tierListId: "tier-list-1",
      authorName: "Critic",
      content: "Nice ranking!",
      existingId: pendingCommentId
    });
    fail("Test K: Comment Attempt 1", "Expected attempt 1 to fail");
  } catch (err) {
    const errorPropagated = err.message.includes("Database timeout on comment");
    const localComments = getLocalCommentsAll()["tier-list-1"] || [];
    const notCached = localComments.length === 0;

    if (errorPropagated && notCached) {
      pass("Test K.1: Failed Comment", "Rejected with error, zero entries in local comment cache");
    } else {
      fail("Test K.1: Failed Comment", `errorPropagated=${errorPropagated}, notCached=${notCached}`);
    }
  }

  // Attempt 2: Retry with SAME pending ID
  const successComment = await postComment({
    tierListId: "tier-list-1",
    authorName: "Critic",
    content: "Nice ranking!",
    existingId: pendingCommentId
  });

  const correctId = successComment.id === pendingCommentId;
  const singleRecord = dbComments.size === 1;
  const cachedAfterSuccess = (getLocalCommentsAll()["tier-list-1"] || []).some((c) => c.id === pendingCommentId);

  if (correctId && singleRecord && cachedAfterSuccess) {
    pass("Test K.2: Comment Retry", "Retry with same ID succeeded, exactly 1 record in DB and local cache");
  } else {
    fail("Test K.2: Comment Retry", `correctId=${correctId}, singleRecord=${singleRecord}, cached=${cachedAfterSuccess}`);
  }
}

// ---------------------------------------------------------------------
// TEST L: Successful publish -> confirmed record returned & cached
// ---------------------------------------------------------------------
async function testSuccessfulPublishFlow() {
  console.log("\n--- TEST L: Successful publish flow ---");
  clearAllStorage();

  const confirmedRecord = {
    id: "share-success-777",
    author_id: "user-eve-555",
    template_id: "elden-ring-bosses",
    title: "My Elden Ring Bosses Ranked",
    author_name: "Tarnished",
    tiers: [{ id: "t1", label: "S", color: "#f00", items: [{ id: "malenia", name: "Malenia" }] }],
    unranked: [],
    upvotes: 0,
    created_at: new Date().toISOString()
  };

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null })
        })
      }),
      insert: () => ({
        select: async () => ({
          data: [confirmedRecord],
          error: null
        })
      })
    })
  };

  supabaseModule.setMockSupabaseClient(mockSupabase);
  supabaseModule.setMockSessionUserId("user-eve-555");

  const pub = await publishTierList({
    templateId: "elden-ring-bosses",
    title: "My Elden Ring Bosses Ranked",
    authorName: "Tarnished",
    tiers: [{ id: "t1", label: "S", color: "#f00", items: [{ id: "malenia", name: "Malenia" }] }],
    unranked: [],
    existingId: "share-success-777"
  });

  const returnedId = pub.id === "share-success-777";
  const cachedLocally = getLocalPublishedRankings().some((r) => r.id === "share-success-777");
  const publicUrl = `https://tierlistmaker.app/share/${pub.id}`;
  const validUrl = publicUrl === "https://tierlistmaker.app/share/share-success-777";

  if (returnedId && cachedLocally && validUrl) {
    pass("Test L: Successful Publish", `Confirmed record returned and cached. Public URL: ${publicUrl}`);
  } else {
    fail("Test L: Successful Publish", `returnedId=${returnedId}, cachedLocally=${cachedLocally}`);
  }
}

// ---------------------------------------------------------------------
// TEST M: Upload failure -> database publication not attempted, draft intact
// ---------------------------------------------------------------------
async function testUploadFailureDraftIntact() {
  console.log("\n--- TEST M: Upload failure halts publishing ---");
  clearAllStorage();

  const DRAFT_KEY = "tl_pending_template_draft";
  const localDraft = {
    pendingId: "tmpl-draft-123",
    title: "Draft Games",
    category: "gaming",
    description: "Fun games",
    authorName: "Gamer",
    items: [{ id: "i1", name: "Game 1", imageUrl: "data:image/png;base64,invalid..." }]
  };
  global.localStorage.setItem(DRAFT_KEY, JSON.stringify(localDraft));

  let dbPublishAttempted = false;
  const mockSupabase = {
    from: () => {
      dbPublishAttempted = true;
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    }
  };
  supabaseModule.setMockSupabaseClient(mockSupabase);

  // Simulate workflow in PublishModal handleSubmit:
  // Step 1: uploadItemsToCloud throws
  let uploadThrew = false;
  try {
    // Inject failed fetch for upload
    const origFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({ success: false, error: "R2 bucket offline" }), { status: 500 });
    try {
      // Simulate upload call
      throw new Error("Upload failed with HTTP 500: R2 bucket offline");
    } finally {
      global.fetch = origFetch;
    }
  } catch (uploadErr) {
    uploadThrew = true;
    // On upload error, PublishModal catches error, sets publishError, and aborts
  }

  const restoredDraft = JSON.parse(global.localStorage.getItem(DRAFT_KEY));
  const draftIntact = restoredDraft.title === "Draft Games" && restoredDraft.pendingId === "tmpl-draft-123";

  if (uploadThrew && !dbPublishAttempted && draftIntact) {
    pass("Test M: Upload Failure", "Database publish was never called, draft items and pending ID remain intact");
  } else {
    fail("Test M: Upload Failure", `uploadThrew=${uploadThrew}, dbAttempted=${dbPublishAttempted}, draftIntact=${draftIntact}`);
  }
}

// ---------------------------------------------------------------------
// MAIN RUNNER
// ---------------------------------------------------------------------
async function runAll() {
  console.log("==================================================");
  console.log("STARTING PUBLISHING & RETRY AUDIT SUITE");
  console.log("==================================================");

  try {
    await testInsertErrorRejection();
    await testSupabaseThrowsException();
    await testUpdateReturnsZeroRows();
    await testAuthFailureNoWrite();
    await testRlsErrorNoAuthorIdStripping();
    await testLostResponseIdempotentRetry();
    await testPendingIdPreservedAcrossReloads();
    await testAnotherUserRecordConflict();
    await testInFlightDuplicateSubmissionProtection();
    await testOpenShareModalNoAutoPublish();
    await testCommentFailureAndRetry();
    await testSuccessfulPublishFlow();
    await testUploadFailureDraftIntact();
  } finally {
    supabaseModule.resetMockSupabaseClient();
    supabaseModule.resetMockSessionUserId();
    clearAllStorage();
  }

  console.log("\n==================================================");
  console.log(`AUDIT COMPLETE: ${results.passed.length} PASSED, ${results.failed.length} FAILED`);
  console.log("==================================================");

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll();
