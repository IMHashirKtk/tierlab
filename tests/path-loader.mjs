import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const basePath = path.join(process.cwd(), "src", rel);
    let resolvedPath = basePath;
    if (fs.existsSync(basePath + ".ts")) {
      resolvedPath = basePath + ".ts";
    } else if (fs.existsSync(basePath + ".tsx")) {
      resolvedPath = basePath + ".tsx";
    } else if (fs.existsSync(path.join(basePath, "index.ts"))) {
      resolvedPath = path.join(basePath, "index.ts");
    }
    return nextResolve(pathToFileURL(resolvedPath).href, context);
  }
  return nextResolve(specifier, context);
}
