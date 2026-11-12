import { readFile, readdir, stat } from "node:fs/promises";

const assetsDirectory = new URL("../dist/assets/", import.meta.url);
const assetNames = await readdir(assetsDirectory);
const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const entryUrl = html.match(/<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="([^"]+)")[^>]*>/)?.[1];
const entryName = entryUrl?.split("/").pop();

if (!entryName || !assetNames.includes(entryName)) {
  throw new Error("Production entry JavaScript bundle referenced by index.html was not found.");
}

const { size } = await stat(new URL(entryName, assetsDirectory));
const maxSize = 390 * 1024;

console.log(`Initial JavaScript bundle: ${(size / 1024).toFixed(1)} KiB (budget: 390 KiB).`);

if (size > maxSize) {
  throw new Error("Initial JavaScript bundle exceeds the 390 KiB budget.");
}
