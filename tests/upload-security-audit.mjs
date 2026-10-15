import { NextRequest } from "next/server";
import { POST } from "../src/app/api/upload/route.ts";
import { uploadItemsToCloud } from "../src/lib/upload.ts";
import * as r2Module from "../src/lib/r2.ts";
import * as adminModule from "../src/lib/server/supabase-admin.ts";
import * as supabaseModule from "../src/lib/supabase.ts";
import fs from "fs";
import path from "path";

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

// Generate valid 32x32 PNG base64
function makeValidPngBase64() {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12);
  buf.writeUInt32BE(32, 16);
  buf.writeUInt32BE(32, 20);
  buf[24] = 8;
  buf[25] = 2;
  return "data:image/png;base64," + buf.toString("base64");
}

let r2WriteCount = 0;
const originalUploadBufferToR2 = r2Module.uploadBufferToR2;
const originalIsR2Configured = r2Module.isR2Configured;

function spyR2() {
  r2WriteCount = 0;
  r2Module.setMockR2Uploader(async ({ buffer, contentType }) => {
    r2WriteCount++;
    return {
      url: `https://pub-cdn.test/mock-${r2WriteCount}.png`,
      key: `mock-${r2WriteCount}.png`,
      size: buffer.length
    };
  });
}

function restoreR2() {
  r2Module.resetMockR2Uploader();
}

// ---------------------------------------------------------------------
// TEST 1: Missing or Invalid Token (HTTP 401, Zero R2 Writes)
// ---------------------------------------------------------------------
async function testAuthValidation() {
  console.log("\n--- TEST 1: Authentication & Token Verification ---");
  spyR2();

  // Mock admin client with token validation
  const mockAdmin = {
    auth: {
      getUser: async (token) => {
        if (token === "valid_user_jwt") {
          return { data: { user: { id: "verified_user_123" } }, error: null };
        }
        return { data: { user: null }, error: new Error("Invalid JWT signature") };
      }
    },
    rpc: async () => ({ data: { allowed: true }, error: null })
  };
  adminModule.setMockSupabaseAdmin(mockAdmin);

  // 1. Missing Authorization Header
  const reqNoAuth = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ id: "1", name: "test", dataUrl: makeValidPngBase64() }] })
  });
  const resNoAuth = await POST(reqNoAuth);
  if (resNoAuth.status === 401 && r2WriteCount === 0) {
    pass("Missing Auth Header Rejection", `HTTP 401, zero R2 writes (writes: ${r2WriteCount})`);
  } else {
    fail("Missing Auth Header Rejection", `Status: ${resNoAuth.status}, writes: ${r2WriteCount}`);
  }

  // 2. Malformed Header (not Bearer)
  const reqBasicAuth = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic 123456" },
    body: JSON.stringify({ items: [{ id: "1", name: "test", dataUrl: makeValidPngBase64() }] })
  });
  const resBasicAuth = await POST(reqBasicAuth);
  if (resBasicAuth.status === 401 && r2WriteCount === 0) {
    pass("Malformed Auth Header Rejection", `HTTP 401, zero R2 writes (writes: ${r2WriteCount})`);
  } else {
    fail("Malformed Auth Header Rejection", `Status: ${resBasicAuth.status}, writes: ${r2WriteCount}`);
  }

  // 3. Invalid/Forged Bearer Token
  const reqBadToken = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer forged_or_expired_jwt" },
    body: JSON.stringify({ items: [{ id: "1", name: "test", dataUrl: makeValidPngBase64() }] })
  });
  const resBadToken = await POST(reqBadToken);
  if (resBadToken.status === 401 && r2WriteCount === 0) {
    pass("Invalid/Expired Token Rejection", `HTTP 401, zero R2 writes (writes: ${r2WriteCount})`);
  } else {
    fail("Invalid/Expired Token Rejection", `Status: ${resBadToken.status}, writes: ${r2WriteCount}`);
  }
}

// ---------------------------------------------------------------------
// TEST 2: Exhausted Quota (HTTP 429 with Retry-After, Zero R2 Writes)
// ---------------------------------------------------------------------
async function testExhaustedQuota() {
  console.log("\n--- TEST 2: Exhausted Quota Enforcement ---");
  spyR2();

  const mockAdmin = {
    auth: {
      getUser: async (token) => {
        if (token === "valid_user_jwt") {
          return { data: { user: { id: "user_exhausted_quota" } }, error: null };
        }
        return { data: { user: null }, error: new Error("Invalid token") };
      }
    },
    rpc: async (func, args) => {
      if (func === "consume_upload_quota") {
        return {
          data: {
            allowed: false,
            remaining: 0,
            retry_after: 42,
            current_count: 30
          },
          error: null
        };
      }
      return { data: null, error: new Error("Unknown function") };
    }
  };
  adminModule.setMockSupabaseAdmin(mockAdmin);

  const req = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid_user_jwt"
    },
    body: JSON.stringify({ items: [{ id: "1", name: "test", dataUrl: makeValidPngBase64() }] })
  });
  const res = await POST(req);
  const json = await res.json();
  const retryAfter = res.headers.get("Retry-After");

  if (res.status === 429 && retryAfter === "42" && r2WriteCount === 0 && json.success === false) {
    pass("Exhausted Quota Returns 429", `HTTP 429 with Retry-After: ${retryAfter}s, zero R2 writes`);
  } else {
    fail("Exhausted Quota Returns 429", `Status: ${res.status}, Retry-After: ${retryAfter}, writes: ${r2WriteCount}`);
  }
}

// ---------------------------------------------------------------------
// TEST 3: Fail-Safe Error Handling (Limiter RPC Error, Exception, Missing Config)
// ---------------------------------------------------------------------
async function testFailSafeHandling() {
  console.log("\n--- TEST 3: Fail-Safe Error Handling (HTTP 503, Zero R2 Writes) ---");

  // 1. Returned Limiter Error
  spyR2();
  const mockAdminError = {
    auth: { getUser: async () => ({ data: { user: { id: "user_1" } }, error: null }) },
    rpc: async () => ({ data: null, error: { message: "database timeout or connection refused" } })
  };
  adminModule.setMockSupabaseAdmin(mockAdminError);

  const reqErr = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer valid_user_jwt" },
    body: JSON.stringify({ items: [{ id: "1", name: "test", dataUrl: makeValidPngBase64() }] })
  });
  const resErr = await POST(reqErr);
  if (resErr.status === 503 && r2WriteCount === 0) {
    pass("Limiter RPC Error Handled Safely", `HTTP 503 returned, zero R2 writes (writes: ${r2WriteCount})`);
  } else {
    fail("Limiter RPC Error Handled Safely", `Status: ${resErr.status}, writes: ${r2WriteCount}`);
  }

  // 2. Thrown Limiter Exception
  spyR2();
  const mockAdminThrows = {
    auth: { getUser: async () => ({ data: { user: { id: "user_1" } }, error: null }) },
    rpc: async () => { throw new Error("Socket disconnected unexpectedly"); }
  };
  adminModule.setMockSupabaseAdmin(mockAdminThrows);

  const reqThrow = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer valid_user_jwt" },
    body: JSON.stringify({ items: [{ id: "1", name: "test", dataUrl: makeValidPngBase64() }] })
  });
  const resThrow = await POST(reqThrow);
  if (resThrow.status === 503 && r2WriteCount === 0) {
    pass("Limiter Thrown Exception Handled Safely", `HTTP 503 returned, zero R2 writes (writes: ${r2WriteCount})`);
  } else {
    fail("Limiter Thrown Exception Handled Safely", `Status: ${resThrow.status}, writes: ${r2WriteCount}`);
  }

  // 3. Missing Privileged Server Configuration
  spyR2();
  adminModule.setMockSupabaseAdmin(null); // Unconfigured
  const reqUnconfigured = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer valid_user_jwt" },
    body: JSON.stringify({ items: [{ id: "1", name: "test", dataUrl: makeValidPngBase64() }] })
  });
  const resUnconf = await POST(reqUnconfigured);
  if (resUnconf.status === 503 && r2WriteCount === 0) {
    pass("Missing Privileged Configuration Handled Safely", `HTTP 503 returned, zero R2 writes`);
  } else {
    fail("Missing Privileged Configuration Handled Safely", `Status: ${resUnconf.status}, writes: ${r2WriteCount}`);
  }
}

// ---------------------------------------------------------------------
// TEST 4: Approved Request & Client Parameter Immunity
// ---------------------------------------------------------------------
async function testApprovedUploadAndParamImmunity() {
  console.log("\n--- TEST 4: Approved Upload & Client Parameter Immunity ---");
  spyR2();

  let capturedRpcArgs = null;
  const mockAdmin = {
    auth: {
      getUser: async (token) => {
        if (token === "valid_user_jwt") {
          return { data: { user: { id: "server_verified_user_abc" } }, error: null };
        }
        return { data: { user: null }, error: new Error("Invalid token") };
      }
    },
    rpc: async (func, args) => {
      capturedRpcArgs = args;
      return {
        data: {
          allowed: true,
          remaining: 29,
          retry_after: 0,
          current_count: 1
        },
        error: null
      };
    }
  };
  adminModule.setMockSupabaseAdmin(mockAdmin);

  // Client attempts to spoof quota parameters in the request body
  const req = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid_user_jwt"
    },
    body: JSON.stringify({
      items: [{ id: "item-1", name: "Test Hero", dataUrl: makeValidPngBase64() }],
      // Client tampering attempt:
      userId: "spoofed_admin_id",
      rateKey: "upload:bypass",
      window_seconds: -999,
      max_count: 99999
    })
  });

  const res = await POST(req);
  const json = await res.json();

  if (res.status === 200 && json.success === true && r2WriteCount === 1) {
    pass("Approved Request Reaches R2", `HTTP 200, successfully wrote 1 item to R2`);
  } else {
    fail("Approved Request Reaches R2", `Status: ${res.status}, success: ${json.success}, writes: ${r2WriteCount}`);
  }

  // Verify that server ignored spoofed body parameters and called RPC with verified user id ONLY
  if (
    capturedRpcArgs &&
    capturedRpcArgs.v_user_id === "server_verified_user_abc" &&
    capturedRpcArgs.userId === undefined &&
    capturedRpcArgs.window_seconds === undefined
  ) {
    pass("Client Cannot Override Rate Limiter Parameters", `RPC called strictly with server_verified_user_abc`);
  } else {
    fail("Client Cannot Override Rate Limiter Parameters", `Captured args: ${JSON.stringify(capturedRpcArgs)}`);
  }
}

// ---------------------------------------------------------------------
// TEST 5: Browser Bundle Security (No Server Secret Leaks)
// ---------------------------------------------------------------------
function testBrowserBundleSecurity() {
  console.log("\n--- TEST 5: Browser Bundle Security ---");

  const clientFiles = [
    "src/lib/supabase.ts",
    "src/lib/upload.ts",
    "src/components/PublishModal.tsx",
    "src/app/page.tsx"
  ];

  for (const f of clientFiles) {
    const filePath = path.resolve(f);
    if (!fs.existsSync(filePath)) {
      fail(`Check ${f}`, "File not found");
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      fail(`Secret Leak Check - ${f}`, "Found SUPABASE_SERVICE_ROLE_KEY referenced in client file!");
    } else if (content.includes("supabase-admin")) {
      fail(`Secret Leak Check - ${f}`, "Found import of supabase-admin in client file!");
    } else {
      pass(`Secret Leak Check - ${f}`, "Zero references to service role secret or server admin module");
    }
  }

  const adminFile = path.resolve("src/lib/server/supabase-admin.ts");
  const adminContent = fs.readFileSync(adminFile, "utf8");
  if (adminContent.includes("typeof window !== \"undefined\"")) {
    pass("Server Module Guard", "supabase-admin.ts contains window runtime guard preventing browser execution");
  } else {
    fail("Server Module Guard", "Missing window check in supabase-admin.ts");
  }
}

// ---------------------------------------------------------------------
// TEST 6: Client Upload Helper Error Propagation & No False Success
// ---------------------------------------------------------------------
async function testUploadClientHelperFailures() {
  console.log("\n--- TEST 6: Client Upload Helper Error Propagation ---");

  const originalFetch = global.fetch;
  supabaseModule.setMockSessionToken("mock_valid_token_for_helper");

  // 1. Fetch returns 401
  const progressCalls401 = [];
  global.fetch = async () =>
    new Response(JSON.stringify({ error: "Unauthorized token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });

  try {
    await uploadItemsToCloud(
      [{ id: "1", name: "Test Item", imageUrl: makeValidPngBase64() }],
      (msg) => progressCalls401.push(msg)
    );
    fail("Client Helper 401 Propagation", "Should have thrown on 401");
  } catch (err) {
    if (
      err.message.includes("401") &&
      !progressCalls401.includes("Assets successfully hosted on Cloud CDN!")
    ) {
      pass("Client Helper 401 Propagation", "Correctly rejected with 401 without emitting success message");
    } else {
      fail("Client Helper 401 Propagation", `Unexpected error or progress: ${err.message}`);
    }
  }

  // 2. Fetch returns 429
  const progressCalls429 = [];
  global.fetch = async () =>
    new Response(JSON.stringify({ error: "Upload rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "37" }
    });

  try {
    await uploadItemsToCloud(
      [{ id: "1", name: "Test Item", imageUrl: makeValidPngBase64() }],
      (msg) => progressCalls429.push(msg)
    );
    fail("Client Helper 429 Propagation", "Should have thrown on 429");
  } catch (err) {
    if (
      err.message.includes("rate limit") &&
      err.message.includes("37s") &&
      !progressCalls429.includes("Assets successfully hosted on Cloud CDN!")
    ) {
      pass("Client Helper 429 Propagation", `Correctly rejected with rate limit & Retry-After (msg: ${err.message})`);
    } else {
      fail("Client Helper 429 Propagation", `Unexpected error or progress: ${err.message}`);
    }
  }

  // 3. Fetch returns 503
  const progressCalls503 = [];
  global.fetch = async () =>
    new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });

  try {
    await uploadItemsToCloud(
      [{ id: "1", name: "Test Item", imageUrl: makeValidPngBase64() }],
      (msg) => progressCalls503.push(msg)
    );
    fail("Client Helper 503 Propagation", "Should have thrown on 503");
  } catch (err) {
    if (
      err.message.includes("503") &&
      !progressCalls503.includes("Assets successfully hosted on Cloud CDN!")
    ) {
      pass("Client Helper 503 Propagation", "Correctly rejected with 503 without emitting success message");
    } else {
      fail("Client Helper 503 Propagation", `Unexpected error or progress: ${err.message}`);
    }
  }

  // 4. Anonymous auth failure / disabled in Supabase
  supabaseModule.setMockSessionToken(null);
  try {
    await uploadItemsToCloud([
      { id: "1", name: "Test Item", imageUrl: makeValidPngBase64() }
    ]);
    fail("Anonymous Auth Disabled Handling", "Should have thrown when anonymous auth fails");
  } catch (err) {
    if (err.message.includes("Anonymous authentication failed or is disabled")) {
      pass("Anonymous Auth Disabled Handling", "Actionable error surfaced when anonymous auth is unavailable");
    } else {
      fail("Anonymous Auth Disabled Handling", `Unexpected error message: ${err.message}`);
    }
  }

  global.fetch = originalFetch;
  supabaseModule.resetMockSessionToken();
}

// ---------------------------------------------------------------------
// MAIN RUNNER
// ---------------------------------------------------------------------
async function runAll() {
  console.log("==================================================");
  console.log("STARTING UPLOAD SECURITY & RATE LIMIT ROUTE AUDIT");
  console.log("==================================================");

  try {
    await testAuthValidation();
    await testExhaustedQuota();
    await testFailSafeHandling();
    await testApprovedUploadAndParamImmunity();
    testBrowserBundleSecurity();
    await testUploadClientHelperFailures();
  } finally {
    restoreR2();
    adminModule.resetMockSupabaseAdmin();
    supabaseModule.resetMockSessionToken();
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
