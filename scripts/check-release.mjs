import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const pluginManifest = JSON.parse(readFileSync(
  join(root, "plugin/com.so1omon563.herdr-control.sdPlugin/manifest.json"),
  "utf8"
));
const version = packageManifest.version;
const tag = process.argv[2] ?? `v${version}`;
const artifact = process.argv[3];
const numericSemver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

if (!numericSemver.test(version)) {
  throw new Error(`package.json version must be numeric SemVer, got ${version}`);
}

const expectedTag = `v${version}`;
if (tag !== expectedTag) {
  throw new Error(`release tag ${tag} does not match package version ${expectedTag}`);
}

if (packageLock.version !== version || packageLock.packages?.[""]?.version !== version) {
  throw new Error("package-lock.json root versions do not match package.json");
}

const expectedManifestVersion = `${version}.0`;
if (pluginManifest.Version !== expectedManifestVersion) {
  throw new Error(
    `Stream Deck manifest version ${pluginManifest.Version} does not match ${expectedManifestVersion}`
  );
}

const expectedFilename = `Herdr-Control-${tag}.streamDeckPlugin`;
if (artifact) {
  if (basename(artifact) !== expectedFilename) {
    throw new Error(`release installer must be named ${expectedFilename}`);
  }

  const embeddedManifest = JSON.parse(execFileSync(
    "/usr/bin/unzip",
    ["-p", artifact, "com.so1omon563.herdr-control.sdPlugin/manifest.json"],
    { encoding: "utf8" }
  ));
  if (embeddedManifest.Version !== expectedManifestVersion) {
    throw new Error(
      `packaged manifest version ${embeddedManifest.Version} does not match ${expectedManifestVersion}`
    );
  }
}

console.log(`Release contract passed for ${tag}${artifact ? ` and ${expectedFilename}` : ""}`);
