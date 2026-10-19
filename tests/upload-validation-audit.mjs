import { uploadItemsToCloud, validatePersistentImageUrl } from "../src/lib/upload.ts";
import * as supabaseModule from "../src/lib/supabase.ts";

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

function makeValidDataUrl(label = "img") {
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==#${label}`;
}

const originalFetch = global.fetch;

// Helper to snapshot items for immutability checking
function snapshot(items) {
  return JSON.stringify(items);
}

// ---------------------------------------------------------------------
// TEST 1: Empty results for a non-empty batch
// ---------------------------------------------------------------------
async function testEmptyResultsForNonEmptyBatch() {
  console.log("\n--- TEST 1: Empty results for a non-empty batch ---");
  const input = [
    { id: "item-1", name: "One", imageUrl: makeValidDataUrl("1") },
    { id: "item-2", name: "Two", imageUrl: makeValidDataUrl("2") }
  ];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  global.fetch = async () =>
    new Response(JSON.stringify({ success: true, items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  try {
    await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));
    fail("Empty results for non-empty batch", "Expected helper to reject");
  } catch (err) {
    const errorMatch = err.message.includes("Batch size mismatch");
    const noSuccessMsg = !progressCalls.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(input) === inputSnapshot;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("Empty results for non-empty batch", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("Empty results for non-empty batch", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST 2: Missing item in batch response
// ---------------------------------------------------------------------
async function testMissingItem() {
  console.log("\n--- TEST 2: Missing item ---");
  const input = [
    { id: "item-1", name: "One", imageUrl: makeValidDataUrl("1") },
    { id: "item-2", name: "Two", imageUrl: makeValidDataUrl("2") }
  ];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  // Return only item-1 (length 1 instead of 2)
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [{ id: "item-1", name: "One", imageUrl: "https://pub.r2.test/items/1.png" }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));
    fail("Missing item in batch", "Expected helper to reject");
  } catch (err) {
    const errorMatch = err.message.includes("Batch size mismatch") || err.message.includes("Missing item");
    const noSuccessMsg = !progressCalls.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(input) === inputSnapshot;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("Missing item in batch", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("Missing item in batch", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST 3: Extra item in batch response
// ---------------------------------------------------------------------
async function testExtraItem() {
  console.log("\n--- TEST 3: Extra item ---");
  const input = [{ id: "item-1", name: "One", imageUrl: makeValidDataUrl("1") }];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  // Return 2 items for 1 requested item
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [
          { id: "item-1", imageUrl: "https://pub.r2.test/items/1.png" },
          { id: "item-unrequested", imageUrl: "https://pub.r2.test/items/extra.png" }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));
    fail("Extra item in batch", "Expected helper to reject");
  } catch (err) {
    const errorMatch = err.message.includes("Batch size mismatch");
    const noSuccessMsg = !progressCalls.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(input) === inputSnapshot;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("Extra item in batch", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("Extra item in batch", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST 4: Duplicate ID in batch response
// ---------------------------------------------------------------------
async function testDuplicateId() {
  console.log("\n--- TEST 4: Duplicate ID ---");
  const input = [
    { id: "item-1", name: "One", imageUrl: makeValidDataUrl("1") },
    { id: "item-2", name: "Two", imageUrl: makeValidDataUrl("2") }
  ];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  // Return 2 items, but both have id "item-1"
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [
          { id: "item-1", imageUrl: "https://pub.r2.test/items/1a.png" },
          { id: "item-1", imageUrl: "https://pub.r2.test/items/1b.png" }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));
    fail("Duplicate ID in batch", "Expected helper to reject");
  } catch (err) {
    const errorMatch = err.message.includes("Duplicate item ID");
    const noSuccessMsg = !progressCalls.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(input) === inputSnapshot;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("Duplicate ID in batch", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("Duplicate ID in batch", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST 5: Wrong / Unexpected ID in batch response
// ---------------------------------------------------------------------
async function testWrongId() {
  console.log("\n--- TEST 5: Wrong ID ---");
  const input = [
    { id: "item-1", name: "One", imageUrl: makeValidDataUrl("1") },
    { id: "item-2", name: "Two", imageUrl: makeValidDataUrl("2") }
  ];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  // Return 2 items: item-1 and rogue item-999
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [
          { id: "item-1", imageUrl: "https://pub.r2.test/items/1.png" },
          { id: "item-999", imageUrl: "https://pub.r2.test/items/999.png" }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));
    fail("Wrong ID in batch", "Expected helper to reject");
  } catch (err) {
    const errorMatch = err.message.includes("unexpected item ID");
    const noSuccessMsg = !progressCalls.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(input) === inputSnapshot;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("Wrong ID in batch", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("Wrong ID in batch", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST 6: Missing image URL in batch response
// ---------------------------------------------------------------------
async function testMissingImageUrl() {
  console.log("\n--- TEST 6: Missing image URL ---");
  const input = [{ id: "item-1", name: "One", imageUrl: makeValidDataUrl("1") }];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  // Return item with empty string imageUrl
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [{ id: "item-1", name: "One", imageUrl: "" }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));
    fail("Missing image URL", "Expected helper to reject");
  } catch (err) {
    const errorMatch = err.message.includes("missing a persistent image URL");
    const noSuccessMsg = !progressCalls.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(input) === inputSnapshot;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("Missing image URL", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("Missing image URL", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST 7: data: and blob: result URLs
// ---------------------------------------------------------------------
async function testDataAndBlobResultUrls() {
  console.log("\n--- TEST 7: data: and blob: result URLs ---");

  // 7a: data: URL returned
  const inputData = [{ id: "item-1", name: "One", imageUrl: makeValidDataUrl("1") }];
  const snapshotData = snapshot(inputData);
  const progressCallsData = [];

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [{ id: "item-1", name: "One", imageUrl: makeValidDataUrl("re-returned") }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(inputData, (msg) => progressCallsData.push(msg));
    fail("data: URL rejection", "Expected helper to reject data: URL");
  } catch (err) {
    const errorMatch = err.message.includes("returned a data URL");
    const noSuccessMsg = !progressCallsData.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(inputData) === snapshotData;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("data: URL rejection", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("data: URL rejection", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }

  // 7b: blob: URL returned
  const inputBlob = [{ id: "item-2", name: "Two", imageUrl: makeValidDataUrl("2") }];
  const snapshotBlob = snapshot(inputBlob);
  const progressCallsBlob = [];

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [{ id: "item-2", name: "Two", imageUrl: "blob:http://localhost:3000/mock-blob-uuid" }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(inputBlob, (msg) => progressCallsBlob.push(msg));
    fail("blob: URL rejection", "Expected helper to reject blob: URL");
  } catch (err) {
    const errorMatch = err.message.includes("returned a blob URL");
    const noSuccessMsg = !progressCallsBlob.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(inputBlob) === snapshotBlob;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("blob: URL rejection", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("blob: URL rejection", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }

  // 7c: javascript: URL returned
  const inputJs = [{ id: "item-3", name: "Three", imageUrl: makeValidDataUrl("3") }];
  const snapshotJs = snapshot(inputJs);
  const progressCallsJs = [];

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [{ id: "item-3", name: "Three", imageUrl: "javascript:alert(1)" }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await uploadItemsToCloud(inputJs, (msg) => progressCallsJs.push(msg));
    fail("javascript: URL rejection", "Expected helper to reject javascript: URL");
  } catch (err) {
    const errorMatch = err.message.includes("insecure javascript URL");
    const noSuccessMsg = !progressCallsJs.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(inputJs) === snapshotJs;

    if (errorMatch && noSuccessMsg && inputUntouched) {
      pass("javascript: URL rejection", `Rejected: "${err.message}", zero success msg, inputs untouched`);
    } else {
      fail("javascript: URL rejection", `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST 8: Valid results returned in a different order
// ---------------------------------------------------------------------
async function testValidResultsDifferentOrder() {
  console.log("\n--- TEST 8: Valid results returned in a different order ---");
  const input = [
    { id: "item-A", name: "Alpha", color: "#ff0000", customMeta: "meta-A", imageUrl: makeValidDataUrl("A") },
    { id: "item-B", name: "Beta", color: "#00ff00", customMeta: "meta-B", imageUrl: makeValidDataUrl("B") }
  ];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  // Return items in reverse order: B then A
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        items: [
          { id: "item-B", name: "Beta (Server)", imageUrl: "https://pub.r2.test/items/b.png" },
          { id: "item-A", name: "Alpha (Server)", imageUrl: "/api/cdn/items/a.webp" }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  const results = await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));

  const orderPreserved = results[0].id === "item-A" && results[1].id === "item-B";
  const urlACorrect = results[0].imageUrl === "/api/cdn/items/a.webp";
  const urlBCorrect = results[1].imageUrl === "https://pub.r2.test/items/b.png";
  const metaAPreserved = results[0].color === "#ff0000" && results[0].customMeta === "meta-A";
  const metaBPreserved = results[1].color === "#00ff00" && results[1].customMeta === "meta-B";
  const successEmitted = progressCalls.includes("Assets successfully hosted on Cloud CDN!");
  const inputUntouched = snapshot(input) === inputSnapshot;

  if (orderPreserved && urlACorrect && urlBCorrect && metaAPreserved && metaBPreserved && successEmitted && inputUntouched) {
    pass("Valid results returned in different order", "Matched by ID, preserved metadata, position preserved, success emitted");
  } else {
    fail("Valid results returned in different order", `orderPreserved=${orderPreserved}, urlA=${urlACorrect}, urlB=${urlBCorrect}, metaA=${metaAPreserved}, metaB=${metaBPreserved}, successEmitted=${successEmitted}`);
  }
}

// ---------------------------------------------------------------------
// TEST 9: First batch succeeds but second batch fails
// ---------------------------------------------------------------------
async function testFirstBatchSucceedsSecondFails() {
  console.log("\n--- TEST 9: First batch succeeds but second batch fails ---");

  // Create 9 items needing upload (Batch 1: 8 items, Batch 2: 1 item)
  const input = [];
  for (let i = 1; i <= 9; i++) {
    input.push({
      id: `item-${i}`,
      name: `Item ${i}`,
      color: `#00000${i}`,
      imageUrl: makeValidDataUrl(`item-${i}`)
    });
  }
  const inputSnapshot = snapshot(input);
  const progressCalls = [];
  let callCount = 0;

  global.fetch = async (url, opts) => {
    callCount++;
    const body = JSON.parse(opts.body);

    if (callCount === 1) {
      // First batch (8 items) succeeds with valid CDN URLs
      const returnedItems = body.items.map((it) => ({
        id: it.id,
        name: it.name,
        imageUrl: `https://pub.r2.test/items/${it.id}.webp`
      }));
      return new Response(JSON.stringify({ success: true, items: returnedItems }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Second batch (1 item) fails with a server 500 error
    return new Response(JSON.stringify({ success: false, error: "Database outage on batch 2" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));
    fail("First batch succeeds but second fails", "Expected helper to reject on second batch");
  } catch (err) {
    const errorMatch = err.message.includes("Database outage on batch 2") || err.message.includes("500");
    const noSuccessMsg = !progressCalls.includes("Assets successfully hosted on Cloud CDN!");
    const inputUntouched = snapshot(input) === inputSnapshot;

    // Verify specifically that NO items in the original input array were mutated to CDN URLs
    const allInputItemsRetainBase64 = input.every((it) => it.imageUrl.startsWith("data:"));

    if (errorMatch && noSuccessMsg && inputUntouched && allInputItemsRetainBase64) {
      pass(
        "First batch succeeds but second fails",
        `Rejected on batch 2: "${err.message}", zero success msg, all 9 input items retain data URLs unchanged`
      );
    } else {
      fail(
        "First batch succeeds but second fails",
        `errorMatch=${errorMatch}, noSuccessMsg=${noSuccessMsg}, inputUntouched=${inputUntouched}, retainBase64=${allInputItemsRetainBase64}`
      );
    }
  }
}

// ---------------------------------------------------------------------
// TEST 10: Complete valid upload succeeds
// ---------------------------------------------------------------------
async function testCompleteValidUpload() {
  console.log("\n--- TEST 10: Complete valid upload succeeds ---");

  const input = [
    { id: "item-data-1", name: "Data 1", color: "#111", imageUrl: makeValidDataUrl("1") },
    { id: "item-already-cdn", name: "Already CDN", color: "#222", imageUrl: "https://cdn.example.com/existing.png" },
    { id: "item-text-only", name: "Text Only", color: "#333" },
    { id: "item-data-2", name: "Data 2", color: "#444", imageUrl: makeValidDataUrl("2") }
  ];
  const inputSnapshot = snapshot(input);
  const progressCalls = [];

  let uploadedBatchItems = [];
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    uploadedBatchItems = body.items;

    return new Response(
      JSON.stringify({
        success: true,
        items: [
          { id: "item-data-1", imageUrl: "/api/cdn/items/data-1.webp" },
          { id: "item-data-2", imageUrl: "https://pub.r2.test/items/data-2.png" }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const output = await uploadItemsToCloud(input, (msg) => progressCalls.push(msg));

  // Verify only items with data URLs were sent to server
  const onlyDataItemsSent =
    uploadedBatchItems.length === 2 &&
    uploadedBatchItems[0].id === "item-data-1" &&
    uploadedBatchItems[1].id === "item-data-2";

  // Verify results
  const item1Updated = output[0].imageUrl === "/api/cdn/items/data-1.webp" && output[0].color === "#111";
  const item2Untouched = output[1].imageUrl === "https://cdn.example.com/existing.png" && output[1].color === "#222";
  const item3Untouched = output[2].imageUrl === undefined && output[2].name === "Text Only";
  const item4Updated = output[3].imageUrl === "https://pub.r2.test/items/data-2.png" && output[3].color === "#444";

  const successEmitted = progressCalls.includes("Assets successfully hosted on Cloud CDN!");
  const inputUntouched = snapshot(input) === inputSnapshot;

  if (
    onlyDataItemsSent &&
    item1Updated &&
    item2Untouched &&
    item3Untouched &&
    item4Updated &&
    successEmitted &&
    inputUntouched
  ) {
    pass(
      "Complete valid upload succeeds",
      "Correct items uploaded, non-data items untouched, metadata preserved, success msg emitted"
    );
  } else {
    fail(
      "Complete valid upload succeeds",
      `onlyDataSent=${onlyDataItemsSent}, item1=${item1Updated}, item2=${item2Untouched}, item3=${item3Untouched}, item4=${item4Updated}, successEmitted=${successEmitted}`
    );
  }
}

// ---------------------------------------------------------------------
// TEST 11: Direct URL Validation Unit Tests
// ---------------------------------------------------------------------
function testUrlValidatorDirectly() {
  console.log("\n--- TEST 11: Direct validatePersistentImageUrl() Unit Tests ---");

  // Valid URLs
  const validCases = [
    "/api/cdn/items/sample-hash.webp",
    "/api/cdn/items/nested/image.png",
    "https://pub-abc.r2.dev/items/image.jpg",
    "https://images.tierlistmaker.app/cdn/photo.webp",
    "http://localhost:3000/api/cdn/items/test.png"
  ];

  for (const url of validCases) {
    try {
      const res = validatePersistentImageUrl("test-item", url);
      if (res === url) {
        pass(`Validate Valid URL: ${url}`);
      } else {
        fail(`Validate Valid URL: ${url}`, `Returned unexpected value: ${res}`);
      }
    } catch (err) {
      fail(`Validate Valid URL: ${url}`, `Threw unexpectedly: ${err.message}`);
    }
  }

  // Invalid URLs
  const invalidCases = [
    { url: "", expected: "missing a persistent image URL" },
    { url: "   ", expected: "missing a persistent image URL" },
    { url: null, expected: "missing a persistent image URL" },
    { url: undefined, expected: "missing a persistent image URL" },
    { url: "data:image/png;base64,abc", expected: "returned a data URL" },
    { url: "blob:https://app.test/123", expected: "returned a blob URL" },
    { url: "javascript:alert('xss')", expected: "returned an insecure javascript URL" },
    { url: "file:///etc/passwd", expected: "unsupported URL scheme" },
    { url: "/api/cdn/", expected: "malformed CDN path" },
    { url: "/api/cdn/../secret", expected: "malformed CDN path" },
    { url: "/api/cdn/invalid space", expected: "malformed CDN path" },
    { url: "not-a-url", expected: "invalid or unsupported image URL format" },
    { url: "ftp://example.com/pic.jpg", expected: "invalid or unsupported image URL format" }
  ];

  for (const { url, expected } of invalidCases) {
    try {
      validatePersistentImageUrl("test-item", url);
      fail(`Validate Invalid URL: "${url}"`, "Expected validator to throw");
    } catch (err) {
      if (err.message.includes(expected)) {
        pass(`Validate Invalid URL: "${url}"`, `Correctly rejected: "${err.message}"`);
      } else {
        fail(`Validate Invalid URL: "${url}"`, `Expected message containing "${expected}", got: "${err.message}"`);
      }
    }
  }
}

// ---------------------------------------------------------------------
// MAIN RUNNER
// ---------------------------------------------------------------------
async function runAll() {
  console.log("==================================================");
  console.log("STARTING UPLOAD RESPONSE VALIDATION AUDIT");
  console.log("==================================================");

  // Set mock authenticated session token so getAuthenticatedSessionToken() succeeds
  supabaseModule.setMockSessionToken("valid-test-access-token");

  try {
    await testEmptyResultsForNonEmptyBatch();
    await testMissingItem();
    await testExtraItem();
    await testDuplicateId();
    await testWrongId();
    await testMissingImageUrl();
    await testDataAndBlobResultUrls();
    await testValidResultsDifferentOrder();
    await testFirstBatchSucceedsSecondFails();
    await testCompleteValidUpload();
    testUrlValidatorDirectly();
  } finally {
    global.fetch = originalFetch;
    supabaseModule.resetMockSessionToken();
  }

  console.log("\n==================================================");
  console.log(`VALIDATION AUDIT COMPLETE: ${results.passed.length} PASSED, ${results.failed.length} FAILED`);
  console.log("==================================================");

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll();
