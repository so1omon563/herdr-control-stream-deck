import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const root = new URL(".", import.meta.url).pathname;
const plugin = join(root, "plugin/com.so1omon563.herdr-control.sdPlugin");
const profile = join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/manifest.json");
const embeddedProfile = join(plugin, "profiles/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/manifest.json");
const plusProfile = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/manifest.json");
const plusPage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7420/manifest.json");
const renamePage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/6B2C84E0-AD9C-4D13-98E6-5B8FD2B3C401/manifest.json");
const closePage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/3FD8B9A7-1976-4E21-BB12-A1F27947D502/manifest.json");
const icons = [
  "idle.svg", "attached.svg", "command.svg", "workspace-previous.svg", "workspace-next.svg",
  "workspace-new.svg", "workspace-picker.svg", "tab-previous.svg", "tab-next.svg",
  "tab-new.svg", "split-right.svg", "split-down.svg", "pane-left.svg",
  "pane-right.svg", "zoom.svg", "sidebar.svg", "rename.svg", "close.svg", "detach.svg", "back.svg"
];
const dialIcons = ["dial-workspace.svg", "dial-tab.svg", "dial-pane.svg", "dial-agent.svg"];

const packageManifest = JSON.parse(readFileSync(join(root, "package.json")));
assert.equal(packageManifest.license, "MIT");
const license = readFileSync(join(root, "LICENSE"), "utf8");
assert.equal(readFileSync(join(plugin, "LICENSE"), "utf8"), license);
assert.match(license, /Copyright \(c\) 2026 Jedidiah Foster/);

const pluginManifest = JSON.parse(readFileSync(join(plugin, "manifest.json")));
assert.equal(pluginManifest.Version, "0.1.0.0");
assert.equal(pluginManifest.UUID, "com.so1omon563.herdr-control");
assert.equal(pluginManifest.Author, "so1omon563");
assert.equal(pluginManifest.Actions[0].PropertyInspectorPath, "property-inspector.html");
assert.deepEqual(pluginManifest.Profiles.map(item => item.DeviceType), [0, 7]);
const encoderAction = pluginManifest.Actions.find(item => item.UUID === "com.so1omon563.herdr-control.encoder");
assert.deepEqual(encoderAction.Controllers, ["Encoder"]);
assert.equal(encoderAction.Encoder.layout, "layouts/herdr-dial.json");
const dialLayout = JSON.parse(readFileSync(join(plugin, encoderAction.Encoder.layout)));
assert.deepEqual(dialLayout.items.map(item => item.key), ["glyph", "label", "value", "hint"]);
for (const item of dialLayout.items) {
  const [x, y, width, height] = item.rect;
  assert.ok(x >= 0 && y >= 0 && x + width <= 200 && y + height <= 100, `${item.key} exceeds dial canvas`);
}
for (const [index, item] of dialLayout.items.entries()) {
  const [x, y, width, height] = item.rect;
  for (const other of dialLayout.items.slice(index + 1)) {
    const [otherX, otherY, otherWidth, otherHeight] = other.rect;
    assert.ok(x + width <= otherX || otherX + otherWidth <= x || y + height <= otherY || otherY + otherHeight <= y, `${item.key} overlaps ${other.key}`);
  }
}
for (const file of [profile, embeddedProfile]) {
  const manifest = JSON.parse(readFileSync(file));
  assert.equal(manifest.Version, "1.0");
  for (const action of Object.values(manifest.Actions)) {
    assert.equal(action.States[0].FSize, "12");
  }
}
assert.ok(existsSync(join(plugin, "profiles/HERDR Plus.streamDeckProfile")));
const plusManifest = JSON.parse(readFileSync(plusProfile));
assert.equal(plusManifest.Version, "3.0");
assert.equal(plusManifest.Pages.Default, plusManifest.Pages.Current);
assert.equal(plusManifest.Device.Model, "20GBD9901");
const plusControllers = JSON.parse(readFileSync(plusPage)).Controllers;
const plusKeys = plusControllers.find(item => item.Type === "Keypad").Actions;
const plusDials = plusControllers.find(item => item.Type === "Encoder").Actions;
assert.deepEqual(Object.values(plusKeys).map(item => item.Settings.command ?? (item.UUID === "com.elgato.streamdeck.profile.openchild" ? item.UUID : "back")), [
  "workspace-picker", "sidebar", "com.elgato.streamdeck.profile.openchild", "com.elgato.streamdeck.profile.openchild",
  "split-right", "split-down", "detach", "back"
]);
assert.deepEqual(plusKeys["2,0"].Settings, { ProfileUUID: "6b2c84e0-ad9c-4d13-98e6-5b8fd2b3c401" });
assert.deepEqual(plusKeys["3,0"].Settings, { ProfileUUID: "3fd8b9a7-1976-4e21-bb12-a1f27947d502" });
assert.ok(existsSync(join(plusPage, "../Images/rename.png")));
assert.ok(existsSync(join(plusPage, "../Images/close.png")));
for (const [file, expected] of [
  [renamePage, ["back", "rename-workspace", "rename-tab", "rename-pane"]],
  [closePage, ["back", "close-workspace", "close-tab", "close-pane"]]
]) {
  const actions = JSON.parse(readFileSync(file)).Controllers.find(item => item.Type === "Keypad").Actions;
  assert.deepEqual(Object.values(actions).map(item => item.Settings.command ?? "back"), expected);
  assert.deepEqual(Object.values(actions).slice(1).map(item => item.States[0].Title), ["WORKSPACE", "TAB", "PANE"]);
}
assert.deepEqual(Object.values(plusDials).map(item => item.Settings.dial), ["workspace", "tabs", "panes", "client"]);
for (const action of Object.values(plusKeys)) assert.equal(action.States[0].FontSize, 12);
for (const icon of icons) {
  const file = join(plugin, "images", icon);
  assert.ok(existsSync(file), `missing ${icon}`);
  const svg = readFileSync(file, "utf8");
  assert.match(svg, /<svg\b/);
  assert.match(svg, /viewBox="0 0 144 144"/);
}
for (const icon of ["rename.svg", "close.svg"]) {
  const svg = readFileSync(join(plugin, "images", icon), "utf8");
  assert.match(svg, /fill="#171923"/);
  assert.match(svg, /stroke="#7DF9FF"/);
}
for (const icon of dialIcons) {
  const svg = readFileSync(join(plugin, "images", icon), "utf8");
  assert.match(svg, /<svg\b/);
  assert.match(svg, /viewBox="0 0 64 64"/);
}

const source = readFileSync(join(plugin, "plugin.js"), "utf8");
assert.ok(!source.includes("com.vfostje.herdrtoggle"));
for (const icon of icons.slice(3, -1)) assert.ok(source.includes(`images/${icon}`), `unmapped ${icon}`);
for (const event of ["dialRotate", "dialUp", "touchTap"]) assert.ok(source.includes(event), `missing ${event}`);
for (const icon of dialIcons) assert.ok(source.includes(`images/${icon}`), `unmapped ${icon}`);
assert.ok(source.includes('setFeedbackLayout(message.context, "layouts/herdr-dial.json")'));
const inspector = readFileSync(join(plugin, "property-inspector.html"), "utf8");
for (const terminal of ["auto", "ghostty", "kitty", "iterm", "terminal"]) {
  assert.ok(inspector.includes(`value="${terminal}"`), `missing terminal option ${terminal}`);
}

const { agentCommandArgs, bindingOverride, encoderCommand, encoderFeedback, normalizeTerminal, paneCommandArgs, paneCycleTarget, paneRouteDirections, prefixCommand, selectAgent, terminalIds } = require(join(plugin, "plugin.js"));
assert.equal(normalizeTerminal("kitty"), "kitty");
assert.equal(normalizeTerminal("unknown"), "auto");
assert.deepEqual(terminalIds("iterm"), ["iterm"]);
assert.deepEqual(terminalIds("auto"), ["ghostty", "kitty", "iterm", "terminal"]);
assert.equal(encoderCommand("workspace", "dialRotate", { ticks: -1 }), "workspace-prev");
assert.equal(encoderCommand("workspace", "dialUp"), "workspace-new");
assert.equal(encoderCommand("tabs", "dialRotate", { ticks: 1 }), "tab-next");
assert.equal(encoderCommand("panes", "dialUp"), "zoom");
assert.equal(encoderCommand("client", "dialRotate", { ticks: 1 }), null);
assert.equal(encoderCommand("client", "dialUp"), null);
assert.equal(encoderCommand("client", "touchTap", { hold: true }), null);
assert.deepEqual(paneCommandArgs("split-right", "w1:p2"), ["pane", "split", "--pane", "w1:p2", "--direction", "right", "--focus"]);
assert.deepEqual(paneCommandArgs("split-down", "w1:p2"), ["pane", "split", "--pane", "w1:p2", "--direction", "down", "--focus"]);
assert.deepEqual(paneCommandArgs("zoom", "w1:p2"), ["pane", "zoom", "--pane", "w1:p2", "--toggle"]);
assert.deepEqual(paneCommandArgs("pane-right", "w1:p2", "down"), ["pane", "focus", "--pane", "w1:p2", "--direction", "down"]);
assert.deepEqual(prefixCommand("rename-workspace"), [13, true]);
assert.deepEqual(prefixCommand("rename-tab"), [17, true]);
assert.deepEqual(prefixCommand("rename-pane"), [35, true]);
assert.deepEqual(prefixCommand("close-workspace"), [2, true]);
assert.deepEqual(prefixCommand("close-tab"), [7, true]);
assert.deepEqual(prefixCommand("close-pane"), [7, false]);
assert.equal(prefixCommand("rename"), null);
const affectedBindings = {
  "workspace-picker": "workspace_picker",
  "sidebar": "toggle_sidebar",
  "rename-workspace": "rename_workspace",
  "rename-tab": "rename_tab",
  "rename-pane": "rename_pane",
  "close-workspace": "close_workspace",
  "close-tab": "close_tab",
  "close-pane": "close_pane"
};
for (const [command, binding] of Object.entries(affectedBindings)) {
  assert.equal(bindingOverride(command, `[keys]\n${binding} = "prefix+f12"`), binding);
}
assert.equal(bindingOverride("workspace-picker", "[keys]\nprefix = \"ctrl+a\""), "prefix");
assert.equal(bindingOverride("workspace-picker", "keys.workspace_picker = \"ctrl+alt+w\""), "workspace_picker");
assert.equal(bindingOverride("workspace-picker", "[\"keys\"]\n\"workspace_picker\" = \"ctrl+alt+w\""), "workspace_picker");
assert.equal(bindingOverride("workspace-picker", "\"keys\".\"workspace_picker\" = \"ctrl+alt+w\""), "workspace_picker");
assert.equal(bindingOverride("workspace-picker", "keys = { workspace_picker = \"ctrl+alt+w\" }"), "keys");
assert.equal(bindingOverride("workspace-picker", "[keys]\nnew_tab = \"ctrl+alt+c\""), null);
assert.equal(bindingOverride("workspace-picker", "[keys]\n# workspace_picker = \"ctrl+alt+w\""), null);
assert.equal(bindingOverride("workspace-next", "[keys]\nprefix = \"ctrl+a\""), null);
assert.ok(source.includes('setTitle(context, "CUSTOM\\nKEYS")'));
const paneState = {
  focused_pane_id: "p2",
  focused_tab_id: "t1",
  layouts: [{ tab_id: "t1", panes: [
    { pane_id: "p1", rect: { x: 0, y: 0, width: 100, height: 50 } },
    { pane_id: "p2", rect: { x: 0, y: 50, width: 50, height: 50 } },
    { pane_id: "p3", rect: { x: 50, y: 50, width: 50, height: 50 } }
  ] }]
};
assert.equal(paneCycleTarget(paneState, "pane-right").pane_id, "p3");
assert.equal(paneCycleTarget(paneState, "pane-left").pane_id, "p1");
assert.equal(paneCycleTarget({ ...paneState, focused_pane_id: "p3" }, "pane-right").pane_id, "p1");
assert.deepEqual(paneRouteDirections(paneState.layouts[0].panes[0], paneState.layouts[0].panes[2]), ["down", "right"]);
const tPanes = [
  { pane_id: "left", rect: { x: 0, y: 0, width: 50, height: 100 } },
  { pane_id: "top-right", rect: { x: 50, y: 0, width: 50, height: 50 } },
  { pane_id: "bottom-right", rect: { x: 50, y: 50, width: 50, height: 50 } }
];
assert.deepEqual(paneRouteDirections(tPanes[2], tPanes[0]), ["left", "up"]);
assert.equal(encoderFeedback("tabs", { focused_tab_id: "t5", tabs: [{ tab_id: "t5", number: 5, label: "1" }] }).value, "1");
assert.equal(encoderFeedback("workspace", { focused_workspace_id: "w1", workspaces: [{ workspace_id: "w1", number: 1, label: "api" }] }).value, "api");
assert.equal(encoderFeedback("panes", { focused_tab_id: "t1", focused_pane_id: "p2", panes: [{ pane_id: "p2", tab_id: "t1", label: "logs" }] }).value, "logs");
const agentState = {
  focused_pane_id: "p2",
  workspaces: [{ workspace_id: "w1", number: 1, label: "Developer" }],
  agents: [
    { pane_id: "p1", workspace_id: "w1", agent: "claude", agent_status: "idle" },
    { pane_id: "p2", workspace_id: "w1", agent: "codex", display_agent: "reviewer", agent_status: "working" }
  ]
};
assert.deepEqual(agentCommandArgs(agentState, "agent-next"), ["agent", "focus", "p1"]);
assert.deepEqual(agentCommandArgs({ ...agentState, focused_pane_id: "shell" }, "agent-next"), ["agent", "focus", "p1"]);
assert.deepEqual(agentCommandArgs({ ...agentState, focused_pane_id: "shell" }, "agent-prev"), ["agent", "focus", "p2"]);
assert.equal(selectAgent(agentState, "p1", 1).pane_id, "p2");
assert.equal(selectAgent(agentState, "p2", 1).pane_id, "p1");
assert.equal(encoderFeedback("client", agentState, "p1").label, "AGENTS · 1/2");
assert.equal(encoderFeedback("client", agentState, "p1").value, "Developer");
assert.equal(encoderFeedback("client", agentState, "p1").hint, "CLAUDE · PRESS TO FOCUS");
console.log("HERDR package validation passed");
