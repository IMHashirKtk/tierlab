async function runR2Audit() {
  console.log("==================================================");
  console.log("🚀 STARTING CLOUDFLARE R2 ASSET STORAGE AUDIT");
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

  try {
    // 1. Test 1x1 WebP Base64 upload to /api/upload
    console.log("\n--- Audit 1: /api/upload JSON Base64 Payload ---");
    // Minimal valid 1x1 WebP
    const sampleWebpBase64 =
      "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAA";

    const uploadRes = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            id: "test-item-r2-1",
            name: "Cloudflare R2 Test Item",
            dataUrl: sampleWebpBase64,
          },
        ],
      }),
    });

    assert(uploadRes.status === 200, "POST /api/upload returned HTTP 200");
    const uploadData = await uploadRes.json();
    assert(uploadData.success === true, "Upload response indicates success");
    assert(Array.isArray(uploadData.items) && uploadData.items.length === 1, "Returned 1 uploaded item");

    const uploadedUrl = uploadData.items[0].imageUrl;
    assert(
      uploadedUrl.startsWith("http") && uploadedUrl.includes("/items/"),
      `Uploaded URL format valid: ${uploadedUrl}`
    );

    // 2. Test Direct Fetch from Cloudflare R2 Public URL
    console.log("\n--- Audit 2: Direct Fetch from Cloudflare R2 URL ---");
    const directFetch = await fetch(uploadedUrl);
    assert(directFetch.status === 200, "Direct R2 fetch returned HTTP 200");
    const directContentType = directFetch.headers.get("content-type");
    assert(
      directContentType?.includes("image/webp"),
      `Content-Type is image/webp (${directContentType})`
    );

    // 3. Test Edge CDN Proxy Route (/api/cdn/items/...)
    console.log("\n--- Audit 3: Edge CDN Proxy Route Verification ---");
    // Extract key from URL
    const urlObj = new URL(uploadedUrl);
    const keyPath = urlObj.pathname.replace(/^\/+/, "");
    const proxyUrl = `http://localhost:3000/api/cdn/${keyPath}`;

    const proxyFetch = await fetch(proxyUrl);
    assert(proxyFetch.status === 200, "Proxy route GET /api/cdn/... returned HTTP 200");
    const proxyContentType = proxyFetch.headers.get("content-type");
    assert(
      proxyContentType?.includes("image/webp"),
      `Proxy Content-Type is image/webp (${proxyContentType})`
    );
    const cacheHeader = proxyFetch.headers.get("cache-control");
    assert(
      cacheHeader?.includes("immutable") && cacheHeader?.includes("31536000"),
      `Proxy Cache-Control header is 1-year immutable (${cacheHeader})`
    );

    // 4. Test Deduplication
    console.log("\n--- Audit 4: SHA-256 Deduplication Verification ---");
    const reuploadRes = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            id: "test-item-r2-duplicate",
            name: "Cloudflare R2 Duplicate Test",
            dataUrl: sampleWebpBase64,
          },
        ],
      }),
    });
    const reuploadData = await reuploadRes.json();
    const reuploadedUrl = reuploadData.items[0].imageUrl;
    assert(
      reuploadedUrl === uploadedUrl,
      "Identical image content resolves to identical deduplicated URL"
    );

  } catch (err) {
    console.error("Audit encountered error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runR2Audit();
