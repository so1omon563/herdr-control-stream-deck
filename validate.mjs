import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const root = new URL(".", import.meta.url).pathname;
const plugin = join(root, "plugin/com.so1omon563.herdr-control.sdPlugin");
const profile = join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/manifest.json");
const standardPage = join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/Profiles/A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7410/manifest.json");
const plusProfile = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/manifest.json");
const plusPage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7420/manifest.json");
const renamePage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/6B2C84E0-AD9C-4D13-98E6-5B8FD2B3C401/manifest.json");
const closePage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/3FD8B9A7-1976-4E21-BB12-A1F27947D502/manifest.json");
const standardSpacesPage = join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/Profiles/19BB5C24-877C-4BB0-A517-28079C643001/manifest.json");
const standardResizePage = join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/Profiles/19BB5C24-877C-4BB0-A517-28079C643002/manifest.json");
const standardAgentsPage = join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/Profiles/8A44C2E0-F4A6-4BD1-A9D8-36A4D39E3001/manifest.json");
const plusSpacesPage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/19BB5C24-877C-4BB0-A517-28079C643101/manifest.json");
const plusResizePage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/19BB5C24-877C-4BB0-A517-28079C643102/manifest.json");
const plusAgentsPage = join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/8A44C2E0-F4A6-4BD1-A9D8-36A4D39E3101/manifest.json");
const keypadActions = file => {
  const manifest = JSON.parse(readFileSync(file));
  return manifest.Actions ?? manifest.Controllers.find(item => item.Type === "Keypad").Actions;
};
const icons = [
  "idle.svg", "attached.svg", "command.svg", "workspace-previous.svg", "workspace-next.svg",
  "workspace-new.svg", "workspace-picker.svg", "tab-previous.svg", "tab-next.svg",
  "tab-new.svg", "split-right.svg", "split-down.svg", "pane-left.svg",
  "pane-right.svg", "zoom.svg", "resize.svg", "resize-left.svg", "resize-right.svg",
  "resize-up.svg", "resize-down.svg", "settings.svg", "more.svg", "agents.svg", "agents-empty.svg",
  "agent-page-previous.svg", "agent-page-next.svg", "blank.svg", "sidebar.svg", "rename.svg", "close.svg", "detach.svg", "back.svg"
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
const toggleAction = pluginManifest.Actions.find(item => item.UUID === "com.so1omon563.herdr-control.toggle");
const commandAction = pluginManifest.Actions.find(item => item.UUID === "com.so1omon563.herdr-control.command");
assert.equal(toggleAction.PropertyInspectorPath, "property-inspector.html");
assert.notEqual(toggleAction.VisibleInActionsList, false);
assert.equal(commandAction.PropertyInspectorPath, "property-inspector.html");
assert.notEqual(commandAction.VisibleInActionsList, false);
for (const uuid of ["com.so1omon563.herdr-control.back", "com.so1omon563.herdr-control.encoder", "com.so1omon563.herdr-control.agent"]) {
  assert.equal(pluginManifest.Actions.find(item => item.UUID === uuid).VisibleInActionsList, false);
}
assert.deepEqual(pluginManifest.Profiles.map(item => item.DeviceType), [0, 7]);
for (const [name, bundle, model] of [
  ["HERDR.streamDeckProfile", "2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile", "20GBA9901"],
  ["HERDR Plus.streamDeckProfile", "C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile", "20GBD9901"]
]) {
  const archive = join(plugin, "profiles", name);
  const entries = execFileSync("/usr/bin/unzip", ["-Z1", archive], { encoding: "utf8" });
  assert.doesNotMatch(entries, /\.sdProfile\/Profiles\/[^/\n]+\.sdProfile\//, `${name} contains a child profile bundle`);
  const manifest = JSON.parse(execFileSync("/usr/bin/unzip", ["-p", archive, `${bundle}/manifest.json`], { encoding: "utf8" }));
  assert.equal(manifest.Version, "3.0");
  assert.equal(manifest.Device.Model, model);
}
const encoderAction = pluginManifest.Actions.find(item => item.UUID === "com.so1omon563.herdr-control.encoder");
assert.deepEqual(encoderAction.Controllers, ["Encoder"]);
assert.equal(encoderAction.Encoder.layout, "layouts/herdr-dial.json");
assert.equal(encoderAction.PropertyInspectorPath, "property-inspector.html");
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
const standardManifest = JSON.parse(readFileSync(profile));
assert.equal(standardManifest.Version, "3.0");
assert.equal(standardManifest.Pages.Default, standardManifest.Pages.Current);
assert.equal(standardManifest.Device.Model, "20GBA9901");
assert.equal(standardManifest.Pages.Current, "A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7410");
const standardActions = keypadActions(standardPage);
for (const action of Object.values(standardActions)) {
  assert.equal(action.States[0].FontSize, 12);
  assert.equal(action.States[0].ShowTitle, true);
}
assert.deepEqual([
  standardActions["0,0"].Settings.command,
  standardActions["1,0"].Settings.command,
  standardActions["2,0"].Settings.command
], ["workspace-prev", "workspace-next", "workspace-new"]);
assert.equal(standardActions["3,0"].UUID, "com.elgato.streamdeck.profile.openchild");
assert.deepEqual(standardActions["3,0"].Settings, { ProfileUUID: "19bb5c24-877c-4bb0-a517-28079c643001" });
assert.equal(standardActions["3,0"].Name, "More");
assert.equal(standardActions["3,0"].States[0].Title, "MORE");
assert.equal(standardActions["3,0"].States[0].Image, "Images/more.png");
assert.equal(standardActions["4,0"].UUID, "com.elgato.streamdeck.profile.openchild");
assert.deepEqual(standardActions["4,0"].Settings, { ProfileUUID: "8a44c2e0-f4a6-4bd1-a9d8-36a4d39e3001" });
assert.equal(standardActions["4,0"].States[0].Title, "AGENTS");
assert.equal(standardActions["4,0"].States[0].Image, "Images/agents.png");
assert.deepEqual([
  standardActions["0,1"].Settings.command,
  standardActions["1,1"].Settings.command,
  standardActions["2,1"].Settings.command
], ["tab-prev", "tab-next", "tab-new"]);
assert.deepEqual([
  standardActions["0,2"].Settings.command,
  standardActions["1,2"].Settings.command,
  standardActions["2,2"].Settings.command,
  standardActions["3,2"].Settings.command,
  standardActions["4,2"].UUID
], ["pane-left", "pane-right", "pane-primary", "detach", "com.so1omon563.herdr-control.back"]);
assert.deepEqual(standardActions["2,2"].Settings, { command: "pane-primary", splitDirection: "right" });
assert.equal(standardActions["2,2"].States[0].Title, "");
for (const file of [standardSpacesPage, standardResizePage]) {
  for (const action of Object.values(keypadActions(file)).filter(item => item.States[0].Title)) {
    assert.equal(action.States[0].FontSize, 12);
    assert.equal(action.States[0].ShowTitle, true);
  }
}
assert.equal(keypadActions(standardSpacesPage)["2,0"].States[0].Image, "Images/resize.png");
assert.ok(existsSync(join(plugin, "profiles/HERDR Plus.streamDeckProfile")));
const plusManifest = JSON.parse(readFileSync(plusProfile));
assert.equal(plusManifest.Version, "3.0");
assert.equal(plusManifest.Pages.Default, plusManifest.Pages.Current);
assert.equal(plusManifest.Device.Model, "20GBD9901");
const plusControllers = JSON.parse(readFileSync(plusPage)).Controllers;
const plusKeys = plusControllers.find(item => item.Type === "Keypad").Actions;
const plusDials = plusControllers.find(item => item.Type === "Encoder").Actions;
assert.deepEqual(Object.values(plusKeys).map(item => item.Settings.command ?? (item.UUID === "com.elgato.streamdeck.profile.openchild" ? item.UUID : "back")), [
  "com.elgato.streamdeck.profile.openchild", "com.elgato.streamdeck.profile.openchild",
  "com.elgato.streamdeck.profile.openchild", "com.elgato.streamdeck.profile.openchild",
  "split-right", "split-down", "detach", "back"
]);
assert.deepEqual(plusKeys["0,0"].Settings, { ProfileUUID: "19bb5c24-877c-4bb0-a517-28079c643101" });
assert.equal(plusKeys["0,0"].Name, "More");
assert.equal(plusKeys["0,0"].States[0].Title, "MORE");
assert.deepEqual(plusKeys["1,0"].Settings, { ProfileUUID: "8a44c2e0-f4a6-4bd1-a9d8-36a4d39e3101" });
assert.equal(plusKeys["1,0"].States[0].Title, "AGENTS");
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
for (const [file, childProfile] of [
  [standardSpacesPage, "19bb5c24-877c-4bb0-a517-28079c643002"],
  [plusSpacesPage, "19bb5c24-877c-4bb0-a517-28079c643102"]
]) {
  assert.equal(JSON.parse(readFileSync(file)).Name, "More");
  const actions = keypadActions(file);
  assert.deepEqual(Object.values(actions).map(item => item.Settings?.command ?? (item.UUID === "com.elgato.streamdeck.profile.openchild" ? item.UUID : "back")), [
    "back", "workspace-picker", "com.elgato.streamdeck.profile.openchild", "settings", "sidebar"
  ]);
  assert.deepEqual(Object.values(actions)[2].Settings, { ProfileUUID: childProfile });
}
assert.equal(keypadActions(standardSpacesPage)["4,0"].Settings.command, "sidebar");
assert.equal(keypadActions(plusSpacesPage)["0,1"].Settings.command, "sidebar");
for (const file of [standardResizePage, plusResizePage]) {
  const actions = keypadActions(file);
  assert.deepEqual(Object.values(actions).map(item => item.Settings?.command ?? "back"), [
    "back", "resize-left", "resize-up", "resize-right", "resize-down"
  ]);
  assert.equal(actions["2,1"].Settings.command, "resize-down");
  assert.deepEqual(Object.values(actions).slice(1).map(item => item.States[0].Title), ["", "", "", ""]);
  assert.deepEqual(Object.values(actions).slice(1).map(item => item.States[0].ShowTitle), [false, false, false, false]);
}
for (const [file, pageSize, slots] of [
  [standardAgentsPage, 10, 10],
  [plusAgentsPage, 4, 4]
]) {
  const actions = keypadActions(file);
  assert.equal(Object.values(actions).filter(item => item.UUID === "com.so1omon563.herdr-control.agent").length, slots + 3);
  assert.deepEqual([actions["1,0"].Settings.role, actions["2,0"].Settings.role, actions["3,0"].Settings.role], ["prev", "page", "next"]);
  assert.deepEqual([actions["1,0"].Settings.pageSize, actions["2,0"].Settings.pageSize, actions["3,0"].Settings.pageSize], [pageSize, pageSize, pageSize]);
  assert.equal(actions["2,0"].States[0].Title, "");
  const agentActions = Object.values(actions).filter(item => item.Settings?.role === "agent");
  assert.deepEqual(agentActions.map(item => item.Settings.slot), Array.from({ length: slots }, (_, index) => index));
  assert.deepEqual(agentActions.map(item => item.States[0].FontSize), Array(slots).fill(10));
}
for (const file of [
  join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/Profiles/A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7410/Images/more.png"),
  join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/Profiles/A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7410/Images/agents.png"),
  join(root, "profile/2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile/Profiles/19BB5C24-877C-4BB0-A517-28079C643001/Images/resize.png"),
  join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7420/Images/more.png"),
  join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/A2E7C5F3-B9D4-4E1F-8C63-10B6A98D7420/Images/agents.png"),
  join(root, "profile-plus/C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile/Profiles/19BB5C24-877C-4BB0-A517-28079C643101/Images/resize.png")
]) assert.ok(existsSync(file), `missing profile image ${file}`);
assert.deepEqual(Object.values(plusDials).map(item => item.Settings.dial), ["workspace", "tabs", "panes", "client"]);
assert.deepEqual(plusDials["2,0"].Settings, { dial: "panes", splitDirection: "right" });
for (const action of Object.values(plusKeys)) assert.equal(action.States[0].FontSize, 12);
for (const icon of icons) {
  const file = join(plugin, "images", icon);
  assert.ok(existsSync(file), `missing ${icon}`);
  const svg = readFileSync(file, "utf8");
  assert.match(svg, /<svg\b/);
  assert.match(svg, /viewBox="0 0 144 144"/);
}
assert.match(readFileSync(join(plugin, "images/blank.svg"), "utf8"), /fill="#000000"/);
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
for (const icon of [
  "workspace-previous.svg", "workspace-next.svg", "workspace-new.svg", "workspace-picker.svg",
  "tab-previous.svg", "tab-next.svg", "tab-new.svg", "split-right.svg", "split-down.svg",
  "pane-left.svg", "pane-right.svg", "zoom.svg", "resize-left.svg", "resize-right.svg",
  "resize-up.svg", "resize-down.svg", "settings.svg", "sidebar.svg", "rename.svg", "close.svg", "detach.svg"
]) assert.ok(source.includes(`images/${icon}`), `unmapped ${icon}`);
for (const event of ["dialRotate", "dialUp", "touchTap"]) assert.ok(source.includes(event), `missing ${event}`);
for (const icon of dialIcons) assert.ok(source.includes(`images/${icon}`), `unmapped ${icon}`);
for (const icon of ["agents.svg", "agents-empty.svg", "agent-page-previous.svg", "agent-page-next.svg", "blank.svg"]) {
  assert.ok(source.includes(`images/${icon}`), `unmapped ${icon}`);
}
assert.ok(source.includes('setFeedbackLayout(message.context, "layouts/herdr-dial.json")'));
const inspector = readFileSync(join(plugin, "property-inspector.html"), "utf8");
for (const terminal of ["auto", "ghostty", "kitty", "iterm", "terminal"]) {
  assert.ok(inspector.includes(`value="${terminal}"`), `missing terminal option ${terminal}`);
}
const commandSelect = inspector.match(/<select id="command">([\s\S]*?)<\/select>/)?.[1];
assert.ok(commandSelect, "missing command selector");
assert.deepEqual([...commandSelect.matchAll(/<option value="([^"]+)">/g)].map(match => match[1]), [
  "workspace-next", "workspace-prev", "workspace-new", "workspace-picker",
  "tab-next", "tab-prev", "tab-new",
  "pane-right", "pane-left", "split-right", "split-down",
  "resize-left", "resize-right", "resize-up", "resize-down", "pane-primary", "zoom",
  "settings", "sidebar", "detach",
  "rename-workspace", "rename-tab", "rename-pane",
  "close-workspace", "close-tab", "close-pane"
]);
assert.match(inspector, /event:\s*"setSettings"/);
assert.match(inspector, /action,\s*context,\s*payload: settings/);
assert.match(inspector, /Side by side \(Split Right\)/);
assert.match(inspector, /Stacked \(Split Down\)/);
assert.match(inspector, /action === ENCODER_UUID/);

const { agentCommandArgs, agentForSlot, agentKeyPresentation, agentKeyTitle, agentPageCount, agentStatusColor, bindingOverride, commandForSettings, commandPresentation, commandSettings, encoderCommand, encoderFeedback, errorFeedback, errorRestoreTitle, herdrExecutable, normalizeAgentPage, normalizeSplitDirection, normalizeTerminal, paneCommandArgs, paneCycleTarget, panePrimaryCommand, paneRouteDirections, prefixCommand, selectAgent, shiftAgentPage, terminalForLaunch, terminalIds } = require(join(plugin, "plugin.js"));
assert.equal(commandForSettings({}), "workspace-next");
assert.equal(commandForSettings({ command: "unsupported" }), "workspace-next");
assert.equal(commandForSettings({ command: "pane-primary" }), "pane-primary");
assert.deepEqual(commandSettings({ custom: true }), { custom: true, command: "workspace-next" });
assert.deepEqual(commandSettings({ command: "tab-next", custom: true }), { command: "tab-next", custom: true });
assert.deepEqual(commandPresentation({ command: "split-right" }), {
  command: "split-right",
  title: "SPLIT\n→",
  image: "images/split-right.svg"
});
const singlePaneState = {
  focused_tab_id: "t1",
  focused_pane_id: "p1",
  panes: [{ pane_id: "p1", tab_id: "t1", label: "shell" }]
};
const multiplePaneState = {
  ...singlePaneState,
  panes: [...singlePaneState.panes, { pane_id: "p2", tab_id: "t1", label: "logs" }]
};
assert.equal(normalizeSplitDirection({}), "right");
assert.equal(normalizeSplitDirection({ splitDirection: "down" }), "down");
assert.equal(normalizeSplitDirection({ splitDirection: "unsupported" }), "right");
assert.equal(panePrimaryCommand(singlePaneState), "split-right");
assert.equal(panePrimaryCommand(singlePaneState, { splitDirection: "down" }), "split-down");
assert.equal(panePrimaryCommand(multiplePaneState, { splitDirection: "down" }), "zoom");
assert.equal(panePrimaryCommand({ ...singlePaneState, focused_pane_id: "missing" }), null);
assert.equal(panePrimaryCommand({ ...singlePaneState, focused_pane_id: null }), null);
assert.equal(panePrimaryCommand({ ...singlePaneState, panes: [{ pane_id: "p1", tab_id: "t2" }] }), null);
assert.deepEqual(commandPresentation({ command: "pane-primary" }), {
  command: "pane-primary",
  title: "PANE",
  image: "images/zoom.svg"
});
assert.deepEqual(commandPresentation({ command: "pane-primary", splitDirection: "down" }, singlePaneState), {
  command: "pane-primary",
  title: "SPLIT",
  image: "images/split-down.svg"
});
assert.deepEqual(commandPresentation({ command: "pane-primary", splitDirection: "down" }, multiplePaneState), {
  command: "pane-primary",
  title: "ZOOM",
  image: "images/zoom.svg"
});
assert.deepEqual(commandPresentation({ command: "resize-up" }), {
  command: "resize-up",
  title: "",
  image: "images/resize-up.svg"
});
assert.equal(errorRestoreTitle({ action: "com.so1omon563.herdr-control.command", settings: { command: "tab-next" } }, "NEXT\nSPACE"), "NEXT\nTAB");
assert.equal(errorRestoreTitle({ action: "com.so1omon563.herdr-control.toggle" }, undefined), undefined);
assert.ok(source.includes("syncCommand(message.context, settings, true)"));
assert.match(source, /async function runCommandKey[\s\S]*?command !== "pane-primary"[\s\S]*?adaptivePaneKeyBusy\.has\(context\)[\s\S]*?adaptivePaneKeyBusy\.add\(context\)[\s\S]*?finally[\s\S]*?adaptivePaneKeyBusy\.delete\(context\)/);
assert.ok(source.includes("runCommandKey(message.context, message.payload?.settings)"));
assert.throws(() => herdrExecutable([]), /HERDR executable not found in a supported install location/);
await assert.rejects(terminalForLaunch("kitty", () => false), /kitty is not installed/);
await assert.rejects(terminalForLaunch("auto", () => false), /No supported terminal is installed/);
assert.equal(normalizeTerminal("kitty"), "kitty");
assert.equal(normalizeTerminal("unknown"), "auto");
assert.deepEqual(errorFeedback(new Error("HERDR executable not found in a supported install location")), { title: "INSTALL\nHERDR" });
assert.deepEqual(errorFeedback(new Error("kitty is not installed")), { title: "INSTALL\nKITTY" });
assert.deepEqual(errorFeedback(new Error("No supported terminal is installed")), { title: "NO\nTERMINAL" });
assert.deepEqual(errorFeedback({ stderr: "System Events got an error: osascript is not allowed to send keystrokes. (1002)" }), { title: "ALLOW\nACCESS", pane: "Privacy_Accessibility" });
assert.deepEqual(errorFeedback(new Error("Not authorized to send Apple events to System Events. (-1743)")), { title: "ALLOW\nAUTOMATION", pane: "Privacy_Automation" });
assert.equal(errorFeedback(new Error("HERDR client is not attached")), null);
assert.ok(source.includes('event: "logMessage"'));
assert.deepEqual(terminalIds("iterm"), ["iterm"]);
assert.deepEqual(terminalIds("auto"), ["ghostty", "kitty", "iterm", "terminal"]);
assert.equal(encoderCommand("workspace", "dialRotate", { ticks: -1 }), "workspace-prev");
assert.equal(encoderCommand("workspace", "dialUp"), "workspace-new");
assert.equal(encoderCommand("tabs", "dialRotate", { ticks: 1 }), "tab-next");
assert.equal(encoderCommand("panes", "dialUp"), "pane-primary");
assert.equal(encoderCommand("client", "dialRotate", { ticks: 1 }), null);
assert.equal(encoderCommand("client", "dialUp"), null);
assert.equal(encoderCommand("client", "touchTap", { hold: true }), null);
assert.deepEqual(paneCommandArgs("split-right", "w1:p2"), ["pane", "split", "--pane", "w1:p2", "--direction", "right", "--focus"]);
assert.deepEqual(paneCommandArgs("split-down", "w1:p2"), ["pane", "split", "--pane", "w1:p2", "--direction", "down", "--focus"]);
for (const direction of ["left", "right", "up", "down"]) {
  assert.deepEqual(paneCommandArgs(`resize-${direction}`, "w1:p2"), ["pane", "resize", "--pane", "w1:p2", "--direction", direction]);
}
assert.deepEqual(paneCommandArgs("zoom", "w1:p2"), ["pane", "zoom", "--pane", "w1:p2", "--toggle"]);
assert.deepEqual(paneCommandArgs("pane-right", "w1:p2", "down"), ["pane", "focus", "--pane", "w1:p2", "--direction", "down"]);
assert.deepEqual(prefixCommand("rename-workspace"), [13, true]);
assert.deepEqual(prefixCommand("rename-tab"), [17, true]);
assert.deepEqual(prefixCommand("rename-pane"), [35, true]);
assert.deepEqual(prefixCommand("close-workspace"), [2, true]);
assert.deepEqual(prefixCommand("close-tab"), [7, true]);
assert.deepEqual(prefixCommand("close-pane"), [7, false]);
assert.deepEqual(prefixCommand("settings"), [1, false]);
assert.equal(prefixCommand("rename"), null);
const affectedBindings = {
  "settings": "settings",
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
assert.deepEqual(errorFeedback({ code: "HERDR_CUSTOM_KEYBINDING" }), { title: "CUSTOM\nKEYS" });
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
assert.equal(encoderFeedback("panes", singlePaneState).hint, "TURN CYCLE    PUSH SPLIT →");
assert.equal(encoderFeedback("panes", singlePaneState, undefined, { splitDirection: "down" }).hint, "TURN CYCLE    PUSH SPLIT ↓");
assert.equal(encoderFeedback("panes", multiplePaneState, undefined, { splitDirection: "down" }).hint, "TURN CYCLE    PUSH ZOOM");
assert.equal(encoderFeedback("panes", { focused_tab_id: "t1", panes: [] }).hint, "TURN CYCLE    NO PANE");
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
assert.equal(agentPageCount(0, 4), 1);
assert.equal(agentPageCount(5, 4), 2);
assert.equal(normalizeAgentPage(9, 5, 4), 1);
assert.equal(shiftAgentPage(1, 1, 5, 4), 0);
assert.equal(shiftAgentPage(0, -1, 5, 4), 1);
assert.equal(agentForSlot(agentState, 0, 4, 1).pane_id, "p2");
assert.equal(agentKeyTitle(agentState, agentState.agents[1]), "REVIEWER\nDEVELOPER");
assert.equal(agentStatusColor(agentState.agents[0]), "#FFD166");
assert.equal(agentStatusColor(agentState.agents[1]), "#7DF9FF");
const manyAgents = {
  ...agentState,
  agents: Array.from({ length: 11 }, (_, index) => ({
    pane_id: `p${index + 1}`,
    workspace_id: "w1",
    agent: "codex",
    agent_status: index % 2 ? "working" : "idle"
  }))
};
assert.equal(agentForSlot(manyAgents, 1, 10, 0).pane_id, "p11");
assert.equal(agentKeyPresentation(manyAgents, { role: "page", pageSize: 10 }, 1).title, "2/2");
assert.equal(agentKeyPresentation(manyAgents, { role: "page", pageSize: 10 }, 1).image, "images/agents.svg");
assert.equal(agentKeyPresentation(manyAgents, { role: "next", pageSize: 10 }, 0).image, "images/agent-page-next.svg");
assert.deepEqual(agentKeyPresentation({ agents: [] }, { role: "agent", pageSize: 4, slot: 0 }), {
  title: "NO\nAGENTS",
  image: "images/agents-empty.svg"
});
assert.equal(agentKeyPresentation({ agents: [] }, { role: "page", pageSize: 4 }, 0).title, "");
assert.equal(agentKeyPresentation({ agents: [] }, { role: "page", pageSize: 4 }, 0).image, "images/blank.svg");
assert.equal(agentKeyPresentation(agentState, { role: "page", pageSize: 4 }, 0).title, "");
assert.equal(agentKeyPresentation(agentState, { role: "page", pageSize: 4 }, 0).image, "images/blank.svg");
assert.equal(agentKeyPresentation(agentState, { role: "agent", pageSize: 4, slot: 1 }, 0).agent.pane_id, "p2");
assert.match(agentKeyPresentation(agentState, { role: "agent", pageSize: 4, slot: 1 }, 0).image, /^data:image\/svg\+xml;base64,/);
assert.equal(encoderFeedback("client", agentState, "p1").label, "AGENTS · 1/2");
assert.equal(encoderFeedback("client", agentState, "p1").value, "Developer");
assert.equal(encoderFeedback("client", agentState, "p1").hint, "CLAUDE · IDLE · PRESS TO FOCUS");
console.log("HERDR package validation passed");
