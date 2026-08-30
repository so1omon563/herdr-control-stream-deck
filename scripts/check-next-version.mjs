import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const bumpMarkers = ["major", "minor", "patch"];
const releaseMarkers = ["#release", "#publish", "#ship"];
const skipMarkers = ["#skip-version", "#no-bump", "#skip"];

function hasMarker(text, marker) {
  const lowerText = text.toLowerCase();
  const lowerMarker = marker.toLowerCase();
  let offset = 0;

  while (offset <= lowerText.length) {
    const index = lowerText.indexOf(lowerMarker, offset);
    if (index === -1) return false;
    const before = index === 0 ? "" : lowerText[index - 1];
    const afterIndex = index + lowerMarker.length;
    const after = afterIndex === lowerText.length ? "" : lowerText[afterIndex];
    if ((!before || !/[a-z0-9]/i.test(before)) && (!after || !/[a-z0-9]/i.test(after))) {
      return true;
    }
    offset = afterIndex;
  }

  return false;
}

function firstBumpMarker(text) {
  return bumpMarkers.find(marker => hasMarker(text, `#${marker}`)) ?? null;
}

export function bumpFromMessage(message) {
  const [title = "", ...bodyLines] = message.split(/\r?\n/);
  const body = bodyLines.join("\n");
  if (skipMarkers.some(marker => hasMarker(title, marker))) return null;
  const titleBump = firstBumpMarker(title);
  if (titleBump) return titleBump;
  if (skipMarkers.some(marker => hasMarker(body, marker))) return null;
  return firstBumpMarker(message);
}

export function resolveReleaseRequest(message) {
  const bumpType = bumpFromMessage(message) ?? "none";
  return {
    bumpType,
    releaseRequested: bumpType !== "none" && releaseMarkers.some(marker => hasMarker(message, marker))
  };
}

function parseStableTag(tag) {
  const match = tag.match(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/);
  return match ? match.slice(1, 4).map(Number) : null;
}

export function highestStableVersion(tags) {
  return tags.reduce((highest, tag) => {
    const parsed = parseStableTag(tag);
    if (!parsed) return highest;
    for (let index = 0; index < 3; index += 1) {
      if (parsed[index] > highest[index]) return parsed;
      if (parsed[index] < highest[index]) return highest;
    }
    return highest;
  }, [0, 0, 0]);
}

export function expectedReleaseVersion(tags, message) {
  const bump = bumpFromMessage(message);
  if (!bump) return null;

  const [major, minor, patch] = highestStableVersion(tags);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function assertNextVersion(version, tags, message) {
  const expected = expectedReleaseVersion(tags, message);
  if (expected && version !== expected) {
    throw new Error(
      `version marker would create v${expected}, but staged package metadata is v${version}`
    );
  }
  return expected;
}

if (resolve(process.argv[1] ?? "") === scriptPath) {
  const packageManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const message = process.env.RELEASE_PR_TITLE ?? execFileSync("git", ["log", "-1", "--pretty=%B"], {
    cwd: root,
    encoding: "utf8"
  });
  const tags = execFileSync("git", ["tag", "--list", "v*.*.*"], {
    cwd: root,
    encoding: "utf8"
  }).trim().split("\n").filter(Boolean);
  const expected = assertNextVersion(packageManifest.version, tags, message);
  const request = resolveReleaseRequest(message);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `bump_type=${request.bumpType}\nrelease_requested=${request.releaseRequested}\n`
    );
  }
  console.log(expected
    ? `Pre-tag version contract passed for v${expected}`
    : "No version marker found; custom-semver-bumper will skip tagging");
}
