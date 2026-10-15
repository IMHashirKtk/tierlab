import { execFileSync, spawn } from "child_process";

const PG_HOST = process.env.PG_HOST || "127.0.0.1";
const PG_PORT = process.env.PG_PORT || "54388";
const PG_USER = process.env.PG_USER || "postgres";
const PG_DATABASE = process.env.PG_DATABASE || "postgres";

// Determine psql path
const possiblePsqlPaths = [
  process.env.PSQL_PATH,
  "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
  "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
  "psql"
].filter(Boolean);

let PSQL_BIN = null;
for (const p of possiblePsqlPaths) {
  try {
    execFileSync(p, ["--version"], { stdio: "ignore" });
    PSQL_BIN = p;
    break;
  } catch {}
}

if (!PSQL_BIN) {
  console.error("Fatal: psql executable not found in known paths.");
  process.exit(1);
}

console.log(`Using psql: ${PSQL_BIN} against ${PG_HOST}:${PG_PORT}/${PG_DATABASE}`);

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

function runSql(sql, asRole = null, jwtSub = null) {
  let fullSql = "";
  if (asRole) {
    fullSql += `SET ROLE ${asRole};\n`;
  }
  if (jwtSub) {
    fullSql += `SET "request.jwt.claim.sub" = '${jwtSub}';\n`;
  }
  fullSql += sql;

  try {
    const output = execFileSync(
      PSQL_BIN,
      ["-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", PG_DATABASE, "-t", "-A", "-c", fullSql],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return { success: true, output: output.trim() };
  } catch (err) {
    return {
      success: false,
      output: (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : ""),
      error: err.message
    };
  }
}

function runSqlFile(filePath) {
  try {
    const output = execFileSync(
      PSQL_BIN,
      ["-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", PG_DATABASE, "-f", filePath],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return { success: true, output: output.trim() };
  } catch (err) {
    return {
      success: false,
      output: (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : ""),
      error: err.message
    };
  }
}

async function runConcurrentVotes(targetType, targetId, userCount, desiredVote) {
  const promises = [];
  for (let i = 1; i <= userCount; i++) {
    const voterId = `concurrent_voter_${i}`;
    const p = new Promise((resolve) => {
      const sql = `SELECT public.set_vote('${targetType}', '${targetId}', ${desiredVote});`;
      const child = spawn(
        PSQL_BIN,
        [
          "-h", PG_HOST,
          "-p", PG_PORT,
          "-U", PG_USER,
          "-d", PG_DATABASE,
          "-t", "-A",
          "-c", `SET ROLE authenticated; SET "request.jwt.claim.sub" = '${voterId}'; ${sql}`
        ],
        { stdio: ["pipe", "pipe", "pipe"] }
      );
      let out = "";
      let errOut = "";
      child.stdout.on("data", (d) => { out += d.toString(); });
      child.stderr.on("data", (d) => { errOut += d.toString(); });
      child.on("close", (code) => {
        resolve({ code, out: out.trim(), err: errOut.trim() });
      });
    });
    promises.push(p);
  }
  return await Promise.all(promises);
}

// ---------------------------------------------------------------------
// TEST SETUP: Initialize Database & Base Permissions
// ---------------------------------------------------------------------
function setupDatabase() {
  console.log("\n==================================================");
  console.log("SETTING UP TEST DATABASE ENVIRONMENT");
  console.log("==================================================");

  // 1. Auth schema & roles
  const resAuth = runSqlFile("tests/setup-test-db.sql");
  if (!resAuth.success) {
    console.error("Failed to run setup-test-db.sql:", resAuth.output);
    process.exit(1);
  }

  // 2. Schema
  const resSchema = runSqlFile("supabase/schema.sql");
  if (!resSchema.success) {
    console.error("Failed to run schema.sql:", resSchema.output);
    process.exit(1);
  }

  // 3. Corrective Migration
  const resMig = runSqlFile("supabase/migrations/20261015_fix_counter_protection.sql");
  if (!resMig.success) {
    console.error("Failed to run 20261015_fix_counter_protection.sql:", resMig.output);
    process.exit(1);
  }

  // 4. Standard Supabase-like base grants for anon & authenticated
  const baseGrants = `
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT SELECT, INSERT ON public.templates TO authenticated;
    GRANT SELECT ON public.templates TO anon;
    GRANT SELECT, INSERT, DELETE ON public.tier_lists TO authenticated;
    GRANT SELECT ON public.tier_lists TO anon;
    GRANT SELECT, INSERT ON public.comments TO authenticated;
    GRANT SELECT ON public.comments TO anon;
    GRANT SELECT, INSERT, DELETE ON public.upvotes TO authenticated;
    GRANT SELECT ON public.upvotes TO anon;

    -- Re-apply explicit column-level restrictions from migration
    REVOKE UPDATE ON public.templates FROM public, anon, authenticated;
    GRANT UPDATE (title, description, category, cover_url, items, default_tiers, author_name, updated_at) ON public.templates TO authenticated;

    REVOKE UPDATE ON public.tier_lists FROM public, anon, authenticated;
    GRANT UPDATE (template_id, title, author_name, tiers, unranked) ON public.tier_lists TO authenticated;

    REVOKE UPDATE ON public.comments FROM public, anon, authenticated;
  `;
  const resGrants = runSql(baseGrants);
  if (!resGrants.success) {
    console.error("Failed to set base grants:", resGrants.output);
    process.exit(1);
  }

  // Clean existing tables for test run
  runSql("TRUNCATE TABLE public.upvotes, public.comments, public.tier_lists, public.templates CASCADE;");

  pass("Database Environment Initialized", "Tables, RLS policies, column grants, triggers, and RPCs configured");
}

// ---------------------------------------------------------------------
// TEST SUITE: Requirement A - Direct Client Update Protection
// ---------------------------------------------------------------------
function testRequirementA_DirectClientProtection() {
  console.log("\n--- REQUIREMENT A: Direct Client Update Protection ---");

  // Step 1: Alice creates template
  const insertTemplateSql = `
    INSERT INTO public.templates (id, title, description, category, author_name, author_id, upvotes, rank_count)
    VALUES ('tmpl_a1', 'Alice Best RPGs', 'Top RPG games', 'gaming', 'Alice', 'user_alice', 0, 0);
  `;
  const insertRes = runSql(insertTemplateSql, "authenticated", "user_alice");
  if (insertRes.success) {
    pass("Create Template as Owner", "Alice created tmpl_a1 with upvotes=0, rank_count=0");
  } else {
    fail("Create Template as Owner", insertRes.output);
  }

  // Step 2: Alice attempts direct update on upvotes
  const attackUpvotesSql = `UPDATE public.templates SET upvotes = 999 WHERE id = 'tmpl_a1';`;
  const attackUpvotesRes = runSql(attackUpvotesSql, "authenticated", "user_alice");
  const checkUpvotes = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';");
  if (
    (!attackUpvotesRes.success && attackUpvotesRes.output.includes("permission denied")) ||
    checkUpvotes.output === "0"
  ) {
    pass("Direct UPDATE on upvotes Blocked", `Permission denied or counter restored (Current count: ${checkUpvotes.output})`);
  } else {
    fail("Direct UPDATE on upvotes Blocked", `Counter changed to: ${checkUpvotes.output}`);
  }

  // Step 3: Alice attempts direct update on rank_count
  const attackRankSql = `UPDATE public.templates SET rank_count = 500 WHERE id = 'tmpl_a1';`;
  const attackRankRes = runSql(attackRankSql, "authenticated", "user_alice");
  const checkRank = runSql("SELECT rank_count FROM public.templates WHERE id = 'tmpl_a1';");
  if (
    (!attackRankRes.success && attackRankRes.output.includes("permission denied")) ||
    checkRank.output === "0"
  ) {
    pass("Direct UPDATE on rank_count Blocked", `Permission denied or counter restored (Current count: ${checkRank.output})`);
  } else {
    fail("Direct UPDATE on rank_count Blocked", `Counter changed to: ${checkRank.output}`);
  }

  // Step 4: Alice attempts to tamper with author_id (ownership hijack)
  const attackAuthorSql = `UPDATE public.templates SET author_id = 'user_mallory' WHERE id = 'tmpl_a1';`;
  const attackAuthorRes = runSql(attackAuthorSql, "authenticated", "user_alice");
  const checkAuthor = runSql("SELECT author_id FROM public.templates WHERE id = 'tmpl_a1';");
  if (
    (!attackAuthorRes.success && attackAuthorRes.output.includes("permission denied")) ||
    checkAuthor.output === "user_alice"
  ) {
    pass("Direct UPDATE on author_id Blocked", `Author preserved: ${checkAuthor.output}`);
  } else {
    fail("Direct UPDATE on author_id Blocked", `Author changed to: ${checkAuthor.output}`);
  }

  // Step 5: Alice attempts to tamper with created_at (timestamp spoofing)
  const attackCreatedAtSql = `UPDATE public.templates SET created_at = '2001-01-01 00:00:00+00' WHERE id = 'tmpl_a1';`;
  const attackCreatedRes = runSql(attackCreatedAtSql, "authenticated", "user_alice");
  const checkCreated = runSql("SELECT created_at < '2020-01-01'::timestamptz FROM public.templates WHERE id = 'tmpl_a1';");
  if (
    (!attackCreatedRes.success && attackCreatedRes.output.includes("permission denied")) ||
    checkCreated.output === "f"
  ) {
    pass("Direct UPDATE on created_at Blocked", "Timestamp immutability preserved");
  } else {
    fail("Direct UPDATE on created_at Blocked", `Timestamp was modified to spoofed date`);
  }

  // Step 6: Legitimate permitted update by owner (title & description)
  const legitUpdateSql = `UPDATE public.templates SET title = 'Alice Best RPGs (Updated)', description = 'New description' WHERE id = 'tmpl_a1';`;
  const legitUpdateRes = runSql(legitUpdateSql, "authenticated", "user_alice");
  const checkTitle = runSql("SELECT title FROM public.templates WHERE id = 'tmpl_a1';");
  if (legitUpdateRes.success && checkTitle.output === "Alice Best RPGs (Updated)") {
    pass("Legitimate Column UPDATE Allowed", `Owner successfully updated title to: "${checkTitle.output}"`);
  } else {
    fail("Legitimate Column UPDATE Allowed", `Failed: ${legitUpdateRes.output}`);
  }

  // Step 7: Non-owner attempts to update Alice's template (RLS defense)
  const nonOwnerUpdateSql = `UPDATE public.templates SET title = 'Bob Overwrite' WHERE id = 'tmpl_a1';`;
  runSql(nonOwnerUpdateSql, "authenticated", "user_bob");
  const checkTitleAfterBob = runSql("SELECT title FROM public.templates WHERE id = 'tmpl_a1';");
  if (checkTitleAfterBob.output === "Alice Best RPGs (Updated)") {
    pass("Non-Owner UPDATE Denied by RLS", "Bob's update did not affect Alice's template");
  } else {
    fail("Non-Owner UPDATE Denied by RLS", `Title unexpectedly changed to: ${checkTitleAfterBob.output}`);
  }
}

// ---------------------------------------------------------------------
// TEST SUITE: Requirement B.1 - Authorized Voting RPC & Idempotency
// ---------------------------------------------------------------------
function testRequirementB1_VotingRpc() {
  console.log("\n--- REQUIREMENT B.1: Authorized Voting RPC & Idempotency ---");

  // 1. Initial upvotes on tmpl_a1
  const initialVotes = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';").output;
  if (initialVotes === "0") {
    pass("Initial Template Upvotes is 0");
  } else {
    fail("Initial Template Upvotes is 0", `Got ${initialVotes}`);
  }

  // 2. Bob upvotes tmpl_a1 (0 -> 1)
  const vote1 = runSql(
    "SELECT public.set_vote('template', 'tmpl_a1', true);",
    "authenticated",
    "user_bob"
  );
  const countAfterVote1 = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';").output;
  const rowsInUpvotes1 = runSql("SELECT count(*) FROM public.upvotes WHERE item_type = 'template' AND item_id = 'tmpl_a1' AND voter_hash = 'user_bob';").output;
  if (vote1.success && countAfterVote1 === "1" && rowsInUpvotes1 === "1") {
    pass("Vote Increment (0 -> 1)", `Template upvotes = ${countAfterVote1}, record created in public.upvotes`);
  } else {
    fail("Vote Increment (0 -> 1)", `Expected 1, got ${countAfterVote1}. Details: ${vote1.output}`);
  }

  // 3. Bob upvotes tmpl_a1 AGAIN (idempotent duplicate vote)
  const voteDup = runSql(
    "SELECT public.set_vote('template', 'tmpl_a1', true);",
    "authenticated",
    "user_bob"
  );
  const countAfterVoteDup = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';").output;
  const rowsInUpvotesDup = runSql("SELECT count(*) FROM public.upvotes WHERE item_type = 'template' AND item_id = 'tmpl_a1' AND voter_hash = 'user_bob';").output;
  if (voteDup.success && countAfterVoteDup === "1" && rowsInUpvotesDup === "1") {
    pass("Duplicate Upvote Idempotency", `Counter remains 1, exactly 1 vote record exists`);
  } else {
    fail("Duplicate Upvote Idempotency", `Expected 1, got ${countAfterVoteDup}`);
  }

  // 4. Bob unvotes tmpl_a1 (1 -> 0)
  const unvote1 = runSql(
    "SELECT public.set_vote('template', 'tmpl_a1', false);",
    "authenticated",
    "user_bob"
  );
  const countAfterUnvote1 = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';").output;
  const rowsInUpvotesAfterUnvote = runSql("SELECT count(*) FROM public.upvotes WHERE item_type = 'template' AND item_id = 'tmpl_a1' AND voter_hash = 'user_bob';").output;
  if (unvote1.success && countAfterUnvote1 === "0" && rowsInUpvotesAfterUnvote === "0") {
    pass("Vote Decrement / Unvote (1 -> 0)", `Template upvotes = ${countAfterUnvote1}, vote record removed`);
  } else {
    fail("Vote Decrement / Unvote (1 -> 0)", `Expected 0, got ${countAfterUnvote1}. Details: ${unvote1.output}`);
  }

  // 5. Bob unvotes tmpl_a1 AGAIN (idempotent duplicate remove)
  const unvoteDup = runSql(
    "SELECT public.set_vote('template', 'tmpl_a1', false);",
    "authenticated",
    "user_bob"
  );
  const countAfterUnvoteDup = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';").output;
  if (unvoteDup.success && countAfterUnvoteDup === "0") {
    pass("Duplicate Unvote Idempotency", `Counter remains 0 without going negative`);
  } else {
    fail("Duplicate Unvote Idempotency", `Expected 0, got ${countAfterUnvoteDup}`);
  }

  // 6. Tier List Target Voting
  const insertTierList = `
    INSERT INTO public.tier_lists (id, template_id, title, author_name, author_id, upvotes)
    VALUES ('tl_a1', 'tmpl_a1', 'Alice Personal Tier List', 'Alice', 'user_alice', 0);
  `;
  runSql(insertTierList, "authenticated", "user_alice");
  const voteTl = runSql("SELECT public.set_vote('tier_list', 'tl_a1', true);", "authenticated", "user_bob");
  const countTl = runSql("SELECT upvotes FROM public.tier_lists WHERE id = 'tl_a1';").output;
  if (voteTl.success && countTl === "1") {
    pass("Vote on tier_list Target", `tier_lists upvotes successfully incremented to 1`);
  } else {
    fail("Vote on tier_list Target", `Expected 1, got ${countTl}. Error: ${voteTl.output}`);
  }

  // 7. Comment Target Voting
  const insertComment = `
    INSERT INTO public.comments (id, tier_list_id, author_name, author_id, content, upvotes)
    VALUES ('cm_a1', 'tl_a1', 'Alice', 'user_alice', 'Great list!', 0);
  `;
  runSql(insertComment, "authenticated", "user_alice");
  const voteCm = runSql("SELECT public.set_vote('comment', 'cm_a1', true);", "authenticated", "user_bob");
  const countCm = runSql("SELECT upvotes FROM public.comments WHERE id = 'cm_a1';").output;
  if (voteCm.success && countCm === "1") {
    pass("Vote on comment Target", `comments upvotes successfully incremented to 1`);
  } else {
    fail("Vote on comment Target", `Expected 1, got ${countCm}. Error: ${voteCm.output}`);
  }

  // 8. Unauthenticated vote attempt (anon)
  const anonVote = runSql("SELECT public.set_vote('template', 'tmpl_a1', true);", "anon");
  if (!anonVote.success && (anonVote.output.includes("42501") || anonVote.output.includes("permission denied") || anonVote.output.includes("Authentication required"))) {
    pass("Unauthenticated Voting Rejected", `Anon role correctly rejected`);
  } else {
    fail("Unauthenticated Voting Rejected", `Expected rejection, got: ${anonVote.output}`);
  }
}

// ---------------------------------------------------------------------
// TEST SUITE: Requirement B.2 - Template Ranking Count Lifecycle
// ---------------------------------------------------------------------
function testRequirementB2_RankCountLifecycle() {
  console.log("\n--- REQUIREMENT B.2: Template Ranking Count Lifecycle ---");

  // Step 1: Initial rank_count
  const rankCount0 = runSql("SELECT rank_count FROM public.templates WHERE id = 'tmpl_a1';").output;
  // Notice in previous test we inserted tl_a1 pointing to tmpl_a1, so rank_count should already be 1!
  if (rankCount0 === "1") {
    pass("Ranking Creation Increments rank_count", `Inserting tl_a1 incremented tmpl_a1 rank_count to 1`);
  } else {
    fail("Ranking Creation Increments rank_count", `Expected 1, got ${rankCount0}`);
  }

  // Step 2: Insert a second ranking pointing to tmpl_a1
  const insertTl2 = `
    INSERT INTO public.tier_lists (id, template_id, title, author_name, author_id, upvotes)
    VALUES ('tl_bob_rank', 'tmpl_a1', 'Bob Personal Ranking', 'Bob', 'user_bob', 0);
  `;
  runSql(insertTl2, "authenticated", "user_bob");
  const rankCountAfterSecond = runSql("SELECT rank_count FROM public.templates WHERE id = 'tmpl_a1';").output;
  if (rankCountAfterSecond === "2") {
    pass("Second Ranking Increments rank_count", `tmpl_a1 rank_count is now 2`);
  } else {
    fail("Second Ranking Increments rank_count", `Expected 2, got ${rankCountAfterSecond}`);
  }

  // Step 3: Edit ranking title (template_id unchanged)
  const editRankingTitle = `
    UPDATE public.tier_lists SET title = 'Bob Renamed List' WHERE id = 'tl_bob_rank';
  `;
  runSql(editRankingTitle, "authenticated", "user_bob");
  const rankCountAfterEdit = runSql("SELECT rank_count FROM public.templates WHERE id = 'tmpl_a1';").output;
  if (rankCountAfterEdit === "2") {
    pass("Ranking Edit (Same Template) Leaves Counter Intact", `tmpl_a1 rank_count remains 2`);
  } else {
    fail("Ranking Edit (Same Template) Leaves Counter Intact", `Expected 2, got ${rankCountAfterEdit}`);
  }

  // Step 4: Reassign ranking to another template (Charlie's template)
  const insertCharlieTmpl = `
    INSERT INTO public.templates (id, title, description, category, author_name, author_id, upvotes, rank_count)
    VALUES ('tmpl_charlie', 'Charlie Strategy Games', 'Strategy games', 'gaming', 'Charlie', 'user_charlie', 0, 0);
  `;
  runSql(insertCharlieTmpl, "authenticated", "user_charlie");

  // Bob moves tl_bob_rank from tmpl_a1 to tmpl_charlie
  const reassignRanking = `
    UPDATE public.tier_lists SET template_id = 'tmpl_charlie' WHERE id = 'tl_bob_rank';
  `;
  runSql(reassignRanking, "authenticated", "user_bob");
  const aliceRankAfterMove = runSql("SELECT rank_count FROM public.templates WHERE id = 'tmpl_a1';").output;
  const charlieRankAfterMove = runSql("SELECT rank_count FROM public.templates WHERE id = 'tmpl_charlie';").output;

  if (aliceRankAfterMove === "1" && charlieRankAfterMove === "1") {
    pass("Ranking Template Reassignment", `Old template decremented (2 -> 1), New template incremented (0 -> 1)`);
  } else {
    fail("Ranking Template Reassignment", `Alice: ${aliceRankAfterMove} (exp 1), Charlie: ${charlieRankAfterMove} (exp 1)`);
  }

  // Step 5: Delete ranking
  const deleteRanking = `DELETE FROM public.tier_lists WHERE id = 'tl_bob_rank';`;
  runSql(deleteRanking, "authenticated", "user_bob");
  const charlieRankAfterDelete = runSql("SELECT rank_count FROM public.templates WHERE id = 'tmpl_charlie';").output;
  if (charlieRankAfterDelete === "0") {
    pass("Ranking Deletion Decrements rank_count", `Charlie template rank_count correctly decremented back to 0`);
  } else {
    fail("Ranking Deletion Decrements rank_count", `Expected 0, got ${charlieRankAfterDelete}`);
  }
}

// ---------------------------------------------------------------------
// TEST SUITE: Requirement B.3 - Counter Reconciliation
// ---------------------------------------------------------------------
function testRequirementB3_Reconciliation() {
  console.log("\n--- REQUIREMENT B.3: Counter Reconciliation ---");

  // Step 1: Deliberately corrupt counters as DBA/admin
  const corruptCountersSql = `
    UPDATE public.templates SET upvotes = 999, rank_count = 888 WHERE id = 'tmpl_a1';
    UPDATE public.tier_lists SET upvotes = 777 WHERE id = 'tl_a1';
    UPDATE public.comments SET upvotes = 666 WHERE id = 'cm_a1';
  `;
  runSql(corruptCountersSql);

  const corruptedTmpl = runSql("SELECT json_build_object('upvotes', upvotes, 'rank_count', rank_count) FROM public.templates WHERE id = 'tmpl_a1';").output;
  console.log(`Injected corrupted counter values: ${corruptedTmpl}`);

  // Step 2: Authenticated client cannot execute reconcile_counters()
  const unauthReconcile = runSql("SELECT public.reconcile_counters();", "authenticated", "user_alice");
  if (!unauthReconcile.success && unauthReconcile.output.includes("permission denied")) {
    pass("Client Blocked from Executing Reconciliation RPC", "Ordinary users cannot invoke reconcile_counters()");
  } else {
    fail("Client Blocked from Executing Reconciliation RPC", `Expected permission denied, got: ${unauthReconcile.output}`);
  }

  // Step 3: Run reconciliation as authorized role / migration
  const reconRes = runSql("SELECT public.reconcile_counters();");
  if (!reconRes.success) {
    fail("Execute reconcile_counters()", reconRes.output);
    return;
  }
  pass("Execute reconcile_counters() RPC", `Returned: ${reconRes.output}`);

  // Step 4: Verify restored counters
  // For tmpl_a1:
  // - tier_lists referencing tmpl_a1: tl_a1 exists (count = 1)
  // - upvotes on tmpl_a1: Bob unvoted earlier (count = 0)
  // For tl_a1:
  // - upvotes on tl_a1: Bob voted earlier (count = 1)
  // For cm_a1:
  // - upvotes on cm_a1: Bob voted earlier (count = 1)
  const tmplAfter = JSON.parse(runSql("SELECT json_build_object('upvotes', upvotes, 'rank_count', rank_count) FROM public.templates WHERE id = 'tmpl_a1';").output);
  const tlAfter = runSql("SELECT upvotes FROM public.tier_lists WHERE id = 'tl_a1';").output;
  const cmAfter = runSql("SELECT upvotes FROM public.comments WHERE id = 'cm_a1';").output;

  if (tmplAfter.upvotes === 0 && tmplAfter.rank_count === 1) {
    pass("Template Counters Restored", `tmpl_a1 upvotes: ${tmplAfter.upvotes} (was 999), rank_count: ${tmplAfter.rank_count} (was 888)`);
  } else {
    fail("Template Counters Restored", `Expected upvotes=0, rank_count=1; got ${JSON.stringify(tmplAfter)}`);
  }

  if (tlAfter === "1") {
    pass("Tier List Counters Restored", `tl_a1 upvotes: ${tlAfter} (was 777)`);
  } else {
    fail("Tier List Counters Restored", `Expected 1, got ${tlAfter}`);
  }

  if (cmAfter === "1") {
    pass("Comment Counters Restored", `cm_a1 upvotes: ${cmAfter} (was 666)`);
  } else {
    fail("Comment Counters Restored", `Expected 1, got ${cmAfter}`);
  }
}

// ---------------------------------------------------------------------
// TEST SUITE: Concurrency - Race-Condition-Free Voting
// ---------------------------------------------------------------------
async function testConcurrency() {
  console.log("\n--- CONCURRENCY: Parallel Votes Serialization ---");

  const NUM_VOTERS = 10;
  console.log(`Firing ${NUM_VOTERS} concurrent upvotes from distinct users...`);
  const voteResults = await runConcurrentVotes("template", "tmpl_a1", NUM_VOTERS, true);
  const successVotes = voteResults.filter((r) => r.code === 0);
  console.log(`Concurrent votes resolved: ${successVotes.length}/${NUM_VOTERS} succeeded`);

  const finalUpvotes = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';").output;
  const totalVoteRows = runSql("SELECT count(*) FROM public.upvotes WHERE item_type = 'template' AND item_id = 'tmpl_a1';").output;

  if (finalUpvotes === String(NUM_VOTERS) && totalVoteRows === String(NUM_VOTERS)) {
    pass("Concurrent Upvoting Integrity", `Exactly ${NUM_VOTERS} votes recorded in both counter and public.upvotes table without race conditions`);
  } else {
    fail("Concurrent Upvoting Integrity", `Expected ${NUM_VOTERS}, got counter=${finalUpvotes}, records=${totalVoteRows}`);
  }

  // Now concurrently unvote
  console.log(`Firing ${NUM_VOTERS} concurrent unvotes...`);
  await runConcurrentVotes("template", "tmpl_a1", NUM_VOTERS, false);
  const finalUpvotesAfterRemove = runSql("SELECT upvotes FROM public.templates WHERE id = 'tmpl_a1';").output;
  const totalVoteRowsAfterRemove = runSql("SELECT count(*) FROM public.upvotes WHERE item_type = 'template' AND item_id = 'tmpl_a1';").output;

  if (finalUpvotesAfterRemove === "0" && totalVoteRowsAfterRemove === "0") {
    pass("Concurrent Unvoting Integrity", `Counter cleanly returned to 0 and all vote records removed`);
  } else {
    fail("Concurrent Unvoting Integrity", `Expected 0, got counter=${finalUpvotesAfterRemove}, records=${totalVoteRowsAfterRemove}`);
  }
}

// ---------------------------------------------------------------------
// MAIN RUNNER
// ---------------------------------------------------------------------
async function runAll() {
  console.log("==================================================");
  console.log("STARTING DATABASE COUNTER & IMMUTABILITY AUDIT");
  console.log("==================================================");

  setupDatabase();
  testRequirementA_DirectClientProtection();
  testRequirementB1_VotingRpc();
  testRequirementB2_RankCountLifecycle();
  testRequirementB3_Reconciliation();
  await testConcurrency();

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
