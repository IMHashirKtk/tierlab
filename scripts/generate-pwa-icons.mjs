import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

// The SVG is the single source for the website mark, favicon, and app icons.
const iconsDir = new URL("../public/icons/", import.meta.url);
const svg = await readFile(new URL("icon.svg", iconsDir), "utf8");
const png = (size, source = svg) => sharp(Buffer.from(source)).resize(size, size).png().toBuffer();

for (const size of [192, 512]) {
  await writeFile(new URL(`icon-${size}.png`, iconsDir), await png(size));
}
await writeFile(new URL("apple-touch-icon.png", iconsDir), await png(180));

// A full-bleed background and inset mark keep all artwork inside the
// maskable icon's central 80%-diameter safe circle.
const maskable = svg
  .replace('<rect width="64" height="64" rx="16" fill="#09090b"/>', '<rect width="64" height="64" fill="#09090b"/><g transform="translate(6.4 6.4) scale(.8)">')
  .replace('<rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="#6366f1" stroke-width="2"/>', "")
  .replace("</svg>", "</g></svg>");
await writeFile(new URL("icon-maskable.png", iconsDir), await png(512, maskable));

// PNG-backed ICO entries support browsers requesting the conventional URL.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => png(size)));
const directory = Buffer.alloc(6 + images.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(images.length, 4);
let offset = directory.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(image.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL("../src/app/favicon.ico", import.meta.url), Buffer.concat([directory, ...images]));
console.log("Generated tier-board app icons (180, 192, 512px) and favicon (16, 32, 48px).");
