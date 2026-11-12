import { readdir, stat } from "node:fs/promises";

const assetsDirectory = new URL("../dist/assets/", import.meta.url);
const assetNames = await readdir(assetsDirectory);
const entryName = assetNames.find((name) => /^index-.*\.js$/.test(name));

if (!entryName) {
  throw new Error("Production entry JavaScript bundle was not found in dist/assets.");
}

const { size } = await stat(new URL(entryName, assetsDirectory));
const maxSize = 390 * 1024;

console.log(`Initial JavaScript bundle: ${(size / 1024).toFixed(1)} KiB (budget: 390 KiB).`);

if (size > maxSize) {
  throw new Error("Initial JavaScript bundle exceeds the 390 KiB budget.");
}
