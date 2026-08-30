#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportDir = path.join(root, "marketplace", "exports");
const manifest = JSON.parse(await readFile(path.join(exportDir, "manifest.json"), "utf8"));

const expected = new Map([
  ["app-icon.png", [288, 288]],
  ["thumbnail.png", [1920, 960]],
  ["gallery-01-dial-focus.png", [1920, 960]],
  ["gallery-02-profile-parity.png", [1920, 960]],
  ["gallery-03-agent-focus.png", [1920, 960]],
]);
const expectedExportFiles = new Set(["manifest.json", ...expected.keys()]);
const exportEntries = await readdir(exportDir, { withFileTypes: true });
const actualExportFiles = new Set(exportEntries.filter((entry) => entry.isFile()).map((entry) => entry.name));
const unexpectedExports = exportEntries
  .filter((entry) => !entry.isFile() || !expectedExportFiles.has(entry.name))
  .map((entry) => entry.name);
const missingExports = [...expectedExportFiles].filter((file) => !actualExportFiles.has(file));

if (unexpectedExports.length !== 0) {
  throw new Error(`Unexpected Marketplace export files: ${unexpectedExports.join(", ")}`);
}
if (missingExports.length !== 0) {
  throw new Error(`Missing Marketplace export files: ${missingExports.join(", ")}`);
}

if (manifest.version !== 1) {
  throw new Error(`Unsupported Marketplace manifest version: ${manifest.version}`);
}

if (!Array.isArray(manifest.assets) || manifest.assets.length !== expected.size) {
  throw new Error(`Expected ${expected.size} Marketplace assets in the manifest`);
}

function pngDimensions(bytes, file) {
  const signature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`${file} is not a PNG`);
  }
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`${file} has no leading PNG IHDR chunk`);
  }
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

for (const asset of manifest.assets) {
  const dimensions = expected.get(asset.file);
  if (!dimensions) {
    throw new Error(`Unexpected Marketplace asset: ${asset.file}`);
  }
  const bytes = await readFile(path.join(exportDir, asset.file));
  const actualDimensions = pngDimensions(bytes, asset.file);
  if (actualDimensions[0] !== dimensions[0] || actualDimensions[1] !== dimensions[1]) {
    throw new Error(`${asset.file} is ${actualDimensions.join("x")}; expected ${dimensions.join("x")}`);
  }
  if (asset.width !== dimensions[0] || asset.height !== dimensions[1]) {
    throw new Error(`${asset.file} manifest dimensions do not match the required dimensions`);
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (asset.sha256 !== digest) {
    throw new Error(`${asset.file} does not match its manifest checksum`);
  }
  expected.delete(asset.file);
}

if (expected.size !== 0) {
  throw new Error(`Missing Marketplace assets: ${[...expected.keys()].join(", ")}`);
}

console.log("Validated 1 app icon, 1 thumbnail, and 3 Marketplace gallery images");
