/**
 * Server-Side Network & Environment Guard for Test Isolation
 * Preloaded into Node.js via NODE_OPTIONS="--import tests/server-network-guard.mjs"
 *
 * Guarantees:
 * 1. Blocks reading of production secrets from .env.local or .env.production.
 * 2. Intercepts and blocks any outbound HTTP/HTTPS/fetch requests to external non-loopback hosts.
 */

import http from "node:http";
import https from "node:https";
import fs from "node:fs";

// 1. Prevent Next.js from loading production secrets from .env.local / .env.production
const origReadFileSync = fs.readFileSync;
const origExistsSync = fs.existsSync;
const origStatSync = fs.statSync;

fs.readFileSync = function (path, ...args) {
  if (typeof path === "string" && (path.endsWith(".env.local") || path.endsWith(".env.production"))) {
    const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
    err.code = "ENOENT";
    throw err;
  }
  return origReadFileSync.call(this, path, ...args);
};

fs.existsSync = function (path) {
  if (typeof path === "string" && (path.endsWith(".env.local") || path.endsWith(".env.production"))) {
    return false;
  }
  return origExistsSync.call(this, path);
};

fs.statSync = function (path, ...args) {
  if (typeof path === "string" && (path.endsWith(".env.local") || path.endsWith(".env.production"))) {
    const err = new Error(`ENOENT: no such file or directory, stat '${path}'`);
    err.code = "ENOENT";
    throw err;
  }
  return origStatSync.call(this, path, ...args);
};

// 2. Intercept and block outbound external network requests
function isLoopbackHost(hostname) {
  if (!hostname) return true;
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

// Guard global fetch
if (typeof globalThis.fetch === "function") {
  const origFetch = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    try {
      const urlStr = typeof input === "string" ? input : input?.url || "";
      if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
        const parsed = new URL(urlStr);
        if (!isLoopbackHost(parsed.hostname)) {
          console.error(`[SERVER_EXTERNAL_TRAFFIC_BLOCKED] Fetch to ${parsed.href}`);
          throw new Error(`[SERVER_NETWORK_GUARD] Blocked external request to: ${parsed.hostname}`);
        }
      }
    } catch (err) {
      if (err.message.includes("[SERVER_NETWORK_GUARD]")) throw err;
    }
    return origFetch.call(this, input, init);
  };
}

// Guard http.request
const origHttpRequest = http.request;
http.request = function (url, options, callback) {
  let hostname = "";
  if (typeof url === "string") {
    try {
      hostname = new URL(url).hostname;
    } catch {}
  } else if (url && typeof url === "object") {
    hostname = url.hostname || url.host || "";
  }
  if (!hostname && options && typeof options === "object") {
    hostname = options.hostname || options.host || "";
  }
  if (hostname && !isLoopbackHost(hostname)) {
    console.error(`[SERVER_EXTERNAL_TRAFFIC_BLOCKED] HTTP request to ${hostname}`);
    throw new Error(`[SERVER_NETWORK_GUARD] Blocked external HTTP request to: ${hostname}`);
  }
  return origHttpRequest.call(this, url, options, callback);
};

// Guard https.request
const origHttpsRequest = https.request;
https.request = function (url, options, callback) {
  let hostname = "";
  if (typeof url === "string") {
    try {
      hostname = new URL(url).hostname;
    } catch {}
  } else if (url && typeof url === "object") {
    hostname = url.hostname || url.host || "";
  }
  if (!hostname && options && typeof options === "object") {
    hostname = options.hostname || options.host || "";
  }
  if (hostname && !isLoopbackHost(hostname)) {
    console.error(`[SERVER_EXTERNAL_TRAFFIC_BLOCKED] HTTPS request to ${hostname}`);
    throw new Error(`[SERVER_NETWORK_GUARD] Blocked external HTTPS request to: ${hostname}`);
  }
  return origHttpsRequest.call(this, url, options, callback);
};
