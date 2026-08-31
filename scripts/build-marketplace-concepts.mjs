#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import * as fontkit from "fontkit";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "marketplace", "concepts");
const exportDir = path.join(root, "marketplace", "exports");
const imageDir = path.join(root, "plugin", "com.so1omon563.herdr-control.sdPlugin", "images");
const fontDir = path.join(root, "node_modules", "@fontsource", "inter", "files");
const assetCache = new Map();
const fontCache = new Map();
let iconClipId = 0;
const touchStripAspect = 108 / 14;

const colors = {
  ink: "#151821",
  ink2: "#0B0E15",
  panel: "#202532",
  line: "#394254",
  cyan: "#7DF9FF",
  cyan2: "#39C8D3",
  white: "#D9DAD8",
  purple: "#CDB7FF",
  yellow: "#F3D34A",
  muted: "#8E98AA",
};

const key15 = [
  ["workspace-previous", "PREV", "SPACE"],
  ["workspace-next", "NEXT", "SPACE"],
  ["workspace-new", "NEW", "SPACE"],
  ["more", "MORE"],
  ["agents", "BLOCKED", "2"],
  ["tab-previous", "PREV", "TAB"],
  ["tab-next", "NEXT", "TAB"],
  ["tab-new", "NEW", "TAB"],
  ["split-right", "SPLIT", "RIGHT"],
  ["split-down", "SPLIT", "DOWN"],
  ["pane-left", "PREV", "PANE"],
  ["pane-right", "NEXT", "PANE"],
  ["split-right", "SPLIT"],
  ["detach", "DETACH"],
  ["back", "BACK"],
];

const keyPlus = [
  ["more", "MORE"],
  ["agents", "BLOCKED", "2"],
  ["rename", "RENAME"],
  ["close", "CLOSE"],
  ["split-right", "SPLIT", "RIGHT"],
  ["split-down", "SPLIT", "DOWN"],
  ["detach", "DETACH"],
  ["back", "BACK"],
];

function fontForWeight(weight) {
  if (!fontCache.has(weight)) {
    const fontPath = path.join(fontDir, `inter-latin-${weight}-normal.woff`);
    fontCache.set(weight, fontkit.openSync(fontPath));
  }
  return fontCache.get(weight);
}

function number(value) {
  return Number(value.toFixed(4));
}

function text(x, y, value, size, options = {}) {
  const {
    fill = colors.white,
    weight = 600,
    anchor = "start",
    tracking = 0,
    opacity = 1,
  } = options;
  const font = fontForWeight(weight);
  const run = font.layout(String(value));
  const scale = size / font.unitsPerEm;
  const width = run.positions.reduce((total, position) => total + position.xAdvance * scale, 0)
    + Math.max(0, run.glyphs.length - 1) * tracking;
  const startX = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  let cursor = 0;
  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const glyphX = startX + cursor + position.xOffset * scale;
    const glyphY = y - position.yOffset * scale;
    cursor += position.xAdvance * scale + (index === run.glyphs.length - 1 ? 0 : tracking);
    return `<path d="${glyph.path.toSVG()}" transform="translate(${number(glyphX)} ${number(glyphY)}) scale(${number(scale)} ${number(-scale)})"/>`;
  });
  return `<g fill="${fill}" opacity="${opacity}">${paths.join("")}</g>`;
}

function multiline(x, y, lines, size, options = {}) {
  const lineHeight = options.lineHeight ?? size * 1.12;
  return lines
    .filter(Boolean)
    .map((line, index) => text(x, y + index * lineHeight, line, size, options))
    .join("");
}

function icon(name, x, y, size) {
  const clipId = `icon-clip-${iconClipId}`;
  iconClipId += 1;
  return `<g><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${size}" height="${size}"/></clipPath><image href="${assetUri(name, "svg")}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})"/></g>`;
}

function logo(x, y, size) {
  return `<image href="${assetUri("plugin@2x", "png")}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
}

function assetUri(name, extension) {
  const cacheKey = `${name}.${extension}`;
  if (!assetCache.has(cacheKey)) {
    const mime = extension === "png" ? "image/png" : "image/svg+xml";
    const bytes = readFileSync(path.join(imageDir, cacheKey));
    assetCache.set(cacheKey, `data:${mime};base64,${bytes.toString("base64")}`);
  }
  return assetCache.get(cacheKey);
}

function brandLockup(x, y, scale = 1, light = true) {
  const fill = light ? colors.white : colors.ink;
  return [
    logo(x, y, 96 * scale),
    text(x + 120 * scale, y + 42 * scale, "HERDR", 38 * scale, { fill, weight: 800, tracking: 3 * scale }),
    text(x + 120 * scale, y + 78 * scale, "CONTROL", 24 * scale, { fill: colors.cyan, weight: 700, tracking: 5 * scale }),
  ].join("");
}

function keyTile(x, y, size, entry, labelMode = "full") {
  const [image, ...labels] = entry;
  const labelHeight = labelMode === "none" ? 0 : Math.max(28, size * 0.28);
  const labelTop = y + size - labelHeight;
  const titleSize = Math.max(11, size * 0.115);
  return [
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.17}" fill="${colors.ink}" stroke="${colors.line}" stroke-width="2"/>`,
    icon(image, x + 2, y + 2, size - 4),
    labelMode === "none" ? "" : `<rect x="${x + 4}" y="${labelTop - 4}" width="${size - 8}" height="${labelHeight}" rx="${size * 0.1}" fill="${colors.ink}" opacity="0.88"/>`,
    labelMode === "none" ? "" : multiline(x + size / 2, labelTop + titleSize, labels, titleSize, { anchor: "middle", weight: 700, lineHeight: titleSize * 0.92 }),
  ].join("");
}

function device15(x, y, scale = 1, options = {}) {
  const key = 88 * scale;
  const gap = 10 * scale;
  const pad = 30 * scale;
  const header = 48 * scale;
  const width = pad * 2 + key * 5 + gap * 4;
  const height = pad * 2 + header + key * 3 + gap * 2;
  const labelMode = options.labelMode ?? "full";
  let body = `<g filter="url(#deviceShadow)"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${28 * scale}" fill="#090B10" stroke="#353B49" stroke-width="${3 * scale}"/>`;
  body += text(x + pad, y + pad + 20 * scale, "STREAM DECK 15-KEY", 15 * scale, { fill: colors.muted, weight: 700, tracking: 1.5 * scale });
  key15.forEach((entry, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    body += keyTile(
      x + pad + column * (key + gap),
      y + pad + header + row * (key + gap),
      key,
      entry,
      labelMode,
    );
  });
  return `${body}</g>`;
}

function dialPanel(x, y, width, agentAccent = false) {
  const slot = width / 4;
  const height = width / touchStripAspect;
  const unit = height / 46.4;
  const entries = [
    ["dial-workspace", "WORKSPACE", "Main", "TURN · PUSH NEW"],
    ["dial-tab", "TABS", "2", "TURN · PUSH NEW"],
    ["dial-pane", "PANES", "Pane 2", "TURN · PUSH ZOOM"],
    ["dial-agent", "AGENTS 2/4", "Developer", "TURN · PUSH FOCUS"],
  ];
  let body = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${8 * unit}" fill="#090B10" stroke="${colors.line}" stroke-width="${2 * unit}"/>`;
  entries.forEach(([image, heading, value, hint], index) => {
    const sx = x + index * slot;
    const iconSize = 28 * unit;
    const iconX = sx + 7 * unit;
    const copyX = sx + 40 * unit;
    if (index > 0) body += `<line x1="${sx}" y1="${y + 6 * unit}" x2="${sx}" y2="${y + height - 6 * unit}" stroke="${colors.line}" stroke-width="${unit}"/>`;
    if (agentAccent && index === 3) body += `<rect x="${sx + 3 * unit}" y="${y + 3 * unit}" width="${slot - 6 * unit}" height="${height - 6 * unit}" rx="${6 * unit}" fill="${colors.yellow}" opacity="0.08"/>`;
    body += icon(image, iconX, y + (height - iconSize) / 2, iconSize);
    body += text(copyX, y + 14 * unit, heading, 6.2 * unit, { fill: index === 3 && agentAccent ? colors.yellow : colors.cyan, weight: 800 });
    body += text(copyX, y + 28 * unit, value, 8.8 * unit, { weight: 700 });
    body += text(copyX, y + 40 * unit, hint, 3.8 * unit, { fill: colors.muted, weight: 700, tracking: 0.08 * unit });
  });
  return body;
}

function devicePlus(x, y, scale = 1, options = {}) {
  const key = 82 * scale;
  const gap = 10 * scale;
  const pad = 28 * scale;
  const header = 46 * scale;
  const stripGap = 18 * scale;
  const width = pad * 2 + key * 4 + gap * 3;
  const stripWidth = width - pad * 2;
  const stripHeight = stripWidth / touchStripAspect;
  const dialAreaHeight = 76 * scale;
  const height = pad * 2 + header + key * 2 + gap + stripGap + stripHeight + dialAreaHeight;
  let body = `<g filter="url(#deviceShadow)"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${28 * scale}" fill="#090B10" stroke="#353B49" stroke-width="${3 * scale}"/>`;
  body += text(x + pad, y + pad + 20 * scale, "STREAM DECK +", 15 * scale, { fill: colors.muted, weight: 700, tracking: 1.5 * scale });
  keyPlus.forEach((entry, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    body += keyTile(x + pad + column * (key + gap), y + pad + header + row * (key + gap), key, entry, "full");
  });
  const stripY = y + pad + header + key * 2 + gap + stripGap;
  body += dialPanel(x + pad, stripY, stripWidth, options.agentAccent ?? false);
  const dialY = stripY + stripHeight + 34 * scale;
  for (let index = 0; index < 4; index += 1) {
    const cx = x + pad + (index + 0.5) * ((width - pad * 2) / 4);
    body += `<circle cx="${cx}" cy="${dialY}" r="${20 * scale}" fill="#11151E" stroke="#3E4758" stroke-width="${3 * scale}"/>`;
    body += `<line x1="${cx}" y1="${dialY - 13 * scale}" x2="${cx}" y2="${dialY - 4 * scale}" stroke="${colors.white}" stroke-width="${2 * scale}" stroke-linecap="round"/>`;
  }
  return `${body}</g>`;
}

function defs() {
  return `<defs>
    <filter id="deviceShadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.45"/></filter>
    <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="28"/></filter>
    <radialGradient id="cyanBloom" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${colors.cyan}" stop-opacity="0.34"/><stop offset="1" stop-color="${colors.cyan}" stop-opacity="0"/></radialGradient>
    <linearGradient id="darkSweep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#222838"/><stop offset="0.55" stop-color="${colors.ink}"/><stop offset="1" stop-color="#090C13"/></linearGradient>
    <linearGradient id="purpleSweep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#25283B"/><stop offset="0.58" stop-color="#151821"/><stop offset="1" stop-color="#16111F"/></linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#7DF9FF" stroke-opacity="0.06" stroke-width="1"/></pattern>
  </defs>`;
}

function svgDocument(background, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1920" height="960" viewBox="0 0 1920 960">${defs()}${background}${body}</svg>\n`;
}

async function render(svg, outputPath, width, height) {
  const rendered = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: false },
  }).render();
  if (rendered.width !== width || rendered.height !== height) {
    throw new Error(`Rendered ${path.basename(outputPath)} at ${rendered.width}x${rendered.height}; expected ${width}x${height}`);
  }
  await writeFile(outputPath, rendered.asPng());
}

function conceptControlSurface() {
  const background = `<rect width="1920" height="960" fill="url(#darkSweep)"/><rect width="1920" height="960" fill="url(#grid)"/><ellipse cx="1400" cy="500" rx="670" ry="540" fill="url(#cyanBloom)"/>`;
  const body = [
    brandLockup(96, 72, 0.82),
    text(96, 306, "HERDR AT YOUR", 62, { weight: 800, tracking: 0.5 }),
    text(96, 382, "FINGERTIPS.", 62, { weight: 800, fill: colors.cyan, tracking: 0.5 }),
    multiline(100, 470, ["Workspaces, tabs, panes, and agents", "within reach on every supported profile."], 24, { fill: colors.muted, weight: 500, lineHeight: 36 }),
    `<rect x="100" y="576" width="420" height="3" fill="${colors.cyan}"/>`,
    text(100, 632, "STREAM DECK 15-KEY · STREAM DECK +", 15, { fill: colors.white, weight: 700, tracking: 1.5 }),
    `<g transform="translate(714 226) rotate(-3 338 245)">${device15(0, 0, 1.25)}</g>`,
    `<g transform="translate(1276 264) rotate(3 245 266)">${devicePlus(0, 0, 1.18)}</g>`,
  ].join("");
  return svgDocument(background, body);
}

function conceptDialFocus() {
  const background = `<rect width="1920" height="960" fill="#080B11"/><path d="M0 820 C450 650 650 1050 1050 750 C1360 520 1590 610 1920 390 V960 H0Z" fill="#101824"/><ellipse cx="470" cy="380" rx="560" ry="470" fill="url(#cyanBloom)" opacity="0.8"/>`;
  const body = [
    brandLockup(96, 72, 0.78),
    text(96, 286, "TURN. PRESS.", 64, { weight: 800 }),
    text(96, 360, "STAY IN FLOW.", 64, { weight: 800, fill: colors.cyan }),
    multiline(100, 446, ["Navigate Herdr workspaces, tabs, panes,", "and agents from four dedicated dials."], 24, { fill: colors.muted, weight: 500, lineHeight: 36 }),
    `<rect x="86" y="650" width="780" height="142" rx="24" fill="#111722" stroke="#263143" stroke-width="2"/>`,
    dialPanel(106, 673, 740, false),
    `<g transform="translate(1110 126)">${devicePlus(0, 0, 1.56)}</g>`,
  ].join("");
  return svgDocument(background, body);
}

function conceptProfileParity() {
  const background = `<rect width="1920" height="960" fill="#F3F5F4"/><circle cx="1740" cy="160" r="360" fill="#D9FBFD"/><circle cx="80" cy="890" r="380" fill="#E8E1FA"/>`;
  const body = [
    brandLockup(96, 64, 0.7, false),
    text(960, 112, "ONE CONTROL MODEL.", 46, { fill: colors.ink, weight: 800, anchor: "middle" }),
    text(960, 160, "TWO PURPOSE-BUILT PROFILES.", 27, { fill: colors.cyan2, weight: 800, anchor: "middle", tracking: 1.5 }),
    `<g transform="translate(168 284)">${device15(0, 0, 1.15)}</g>`,
    `<g transform="translate(1202 246)">${devicePlus(0, 0, 1.15)}</g>`,
    `<line x1="960" y1="236" x2="960" y2="792" stroke="#CBD1D6" stroke-width="2"/>`,
    text(480, 816, "STREAM DECK 15-KEY", 18, { fill: colors.ink, weight: 800, anchor: "middle", tracking: 2 }),
    text(1440, 816, "STREAM DECK +", 18, { fill: colors.ink, weight: 800, anchor: "middle", tracking: 2 }),
    text(960, 900, "Shared navigation, profile-specific strengths.", 24, { fill: "#596170", weight: 600, anchor: "middle" }),
  ].join("");
  return svgDocument(background, body);
}

function conceptAgentFocus() {
  const background = `<rect width="1920" height="960" fill="url(#purpleSweep)"/><rect width="1920" height="960" fill="url(#grid)"/><ellipse cx="360" cy="430" rx="520" ry="520" fill="url(#cyanBloom)"/><circle cx="1600" cy="170" r="250" fill="${colors.yellow}" opacity="0.06"/>`;
  const body = [
    brandLockup(96, 72, 0.78),
    icon("agents", 104, 242, 150),
    text(100, 478, "FIND THE", 60, { weight: 800 }),
    text(100, 548, "RIGHT AGENT.", 60, { weight: 800, fill: colors.yellow }),
    multiline(104, 638, ["See blocked work at a glance,", "then press to focus the right pane."], 24, { fill: colors.muted, weight: 500, lineHeight: 36 }),
    `<g transform="translate(1100 100)">${devicePlus(0, 0, 1.35, { agentAccent: true })}</g>`,
    `<rect x="934" y="748" width="820" height="146" rx="22" fill="#0B0E15" stroke="${colors.yellow}" stroke-opacity="0.5" stroke-width="2"/>`,
    dialPanel(954, 770, 780, true),
  ].join("");
  return svgDocument(background, body);
}

const concepts = [
  ["01-control-surface", conceptControlSurface()],
  ["02-dial-focus", conceptDialFocus()],
  ["03-profile-parity", conceptProfileParity()],
  ["04-agent-focus", conceptAgentFocus()],
];

await mkdir(outputDir, { recursive: true });
await mkdir(exportDir, { recursive: true });

for (const [name, svg] of concepts) {
  if (/<text\b/.test(svg) || /font-family=/.test(svg)) {
    throw new Error(`${name}.svg contains renderer-dependent text instead of pinned glyph paths`);
  }
  const svgPath = path.join(outputDir, `${name}.svg`);
  const pngPath = path.join(outputDir, `${name}.png`);
  await writeFile(svgPath, svg, "utf8");
  await render(svg, pngPath, 1920, 960);
}

const appIconSvg = svgDocument(
  `<rect width="1920" height="960" fill="none"/>`,
  `<image href="${assetUri("plugin@2x", "png")}" x="480" y="0" width="960" height="960"/>`,
).replace('width="1920" height="960" viewBox="0 0 1920 960"', 'width="288" height="288" viewBox="480 0 960 960"');
const appIconSource = path.join(outputDir, "app-icon.svg");
const appIconOutput = path.join(exportDir, "app-icon.png");
await writeFile(appIconSource, appIconSvg, "utf8");
await render(appIconSvg, appIconOutput, 288, 288);

const finalAssets = [
  { file: "app-icon.png", purpose: "Marketplace app icon", source: "plugin/com.so1omon563.herdr-control.sdPlugin/images/plugin@2x.png", width: 288, height: 288 },
  { file: "thumbnail.png", purpose: "Marketplace thumbnail", source: "marketplace/concepts/01-control-surface.svg", width: 1920, height: 960 },
  { file: "gallery-01-dial-focus.png", purpose: "Gallery image: Stream Deck + dial controls", source: "marketplace/concepts/02-dial-focus.svg", width: 1920, height: 960 },
  { file: "gallery-02-profile-parity.png", purpose: "Gallery image: supported profile comparison", source: "marketplace/concepts/03-profile-parity.svg", width: 1920, height: 960 },
  { file: "gallery-03-agent-focus.png", purpose: "Gallery image: agent navigation", source: "marketplace/concepts/04-agent-focus.svg", width: 1920, height: 960 },
];

const exportCopies = [
  ["01-control-surface.png", "thumbnail.png"],
  ["02-dial-focus.png", "gallery-01-dial-focus.png"],
  ["03-profile-parity.png", "gallery-02-profile-parity.png"],
  ["04-agent-focus.png", "gallery-03-agent-focus.png"],
];
for (const [source, destination] of exportCopies) {
  await copyFile(path.join(outputDir, source), path.join(exportDir, destination));
}

for (const asset of finalAssets) {
  const bytes = await readFile(path.join(exportDir, asset.file));
  asset.sha256 = createHash("sha256").update(bytes).digest("hex");
}

await writeFile(
  path.join(exportDir, "manifest.json"),
  `${JSON.stringify({ version: 1, assets: finalAssets }, null, 2)}\n`,
  "utf8",
);

console.log(`Built ${concepts.length} Marketplace concepts and ${finalAssets.length} final assets`);
