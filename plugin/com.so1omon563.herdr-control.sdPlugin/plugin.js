const { execFile } = require("node:child_process");
const { existsSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { appleScriptKeyLine, commandKeySequence } = require("./keybindings.js");

const TOGGLE_UUID = "com.so1omon563.herdr-control.toggle";
const COMMAND_UUID = "com.so1omon563.herdr-control.command";
const BACK_UUID = "com.so1omon563.herdr-control.back";
const ENCODER_UUID = "com.so1omon563.herdr-control.encoder";
const AGENT_UUID = "com.so1omon563.herdr-control.agent";
const HERDR_PROFILES = {
  0: "profiles/HERDR",
  7: "profiles/HERDR Plus"
};
const TERMINAL_ORDER = ["ghostty", "kitty", "iterm", "terminal"];
const HERDR_CANDIDATES = [
  "/opt/homebrew/bin/herdr",
  "/usr/local/bin/herdr",
  path.join(os.homedir(), ".local", "bin", "herdr"),
  path.join(os.homedir(), ".cargo", "bin", "herdr")
];
const TERMINAL_APPS = {
  ghostty: ["/Applications/Ghostty.app", path.join(os.homedir(), "Applications", "Ghostty.app")],
  kitty: ["/Applications/kitty.app", path.join(os.homedir(), "Applications", "kitty.app")],
  iterm: [
    "/Applications/iTerm.app",
    "/Applications/iTerm2.app",
    path.join(os.homedir(), "Applications", "iTerm.app"),
    path.join(os.homedir(), "Applications", "iTerm2.app")
  ],
  terminal: ["/System/Applications/Utilities/Terminal.app", "/Applications/Utilities/Terminal.app"]
};
const PROCESS_NAMES = {
  ghostty: "ghostty",
  kitty: "kitty",
  iterm: "iTerm2",
  terminal: "Terminal"
};

function herdrExecutable(candidates = HERDR_CANDIDATES) {
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error("HERDR executable not found in a supported install location");
  return executable;
}

function terminalApp(terminal) {
  const app = TERMINAL_APPS[terminal]?.find(existsSync);
  if (!app) throw new Error(`${terminal} is not installed in a supported location`);
  return app;
}

function terminalIsInstalled(terminal) {
  return TERMINAL_APPS[terminal]?.some(existsSync) ?? false;
}

function normalizeTerminal(value) {
  return value === "auto" || TERMINAL_ORDER.includes(value) ? value : "auto";
}

function terminalIds(value) {
  const terminal = normalizeTerminal(value);
  return terminal === "auto" ? [...TERMINAL_ORDER] : [terminal];
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function processTerminalPattern(terminal) {
  const binary = path.join(terminalApp(terminal), "Contents", "MacOS", PROCESS_NAMES[terminal]);
  const separator = terminal === "ghostty" ? " -e " : " ";
  return `^${regexEscape(binary)}${separator}${regexEscape(herdrExecutable())}$`;
}
const COMMAND_TITLES = {
  "workspace-prev": "PREV\nSPACE",
  "workspace-picker": "SPACES",
  "workspace-next": "NEXT\nSPACE",
  "workspace-new": "NEW\nSPACE",
  "rename-workspace": "WORKSPACE",
  "rename-tab": "TAB",
  "rename-pane": "PANE",
  "close-workspace": "WORKSPACE",
  "close-tab": "TAB",
  "close-pane": "PANE",
  "detach": "DETACH",
  "tab-new": "NEW\nTAB",
  "tab-prev": "PREV\nTAB",
  "tab-next": "NEXT\nTAB",
  "split-right": "SPLIT\n→",
  "split-down": "SPLIT\n↓",
  "pane-primary": "PANE",
  "resize-left": "",
  "resize-right": "",
  "resize-up": "",
  "resize-down": "",
  "settings": "SETTINGS",
  "sidebar": "SIDEBAR",
  "zoom": "ZOOM",
  "pane-left": "PREV\nPANE",
  "pane-right": "NEXT\nPANE"
};

const COMMAND_IMAGES = {
  "workspace-prev": "images/workspace-previous.svg",
  "workspace-picker": "images/workspace-picker.svg",
  "workspace-next": "images/workspace-next.svg",
  "workspace-new": "images/workspace-new.svg",
  "rename-workspace": "images/rename.svg",
  "rename-tab": "images/rename.svg",
  "rename-pane": "images/rename.svg",
  "close-workspace": "images/close.svg",
  "close-tab": "images/close.svg",
  "close-pane": "images/close.svg",
  "detach": "images/detach.svg",
  "tab-new": "images/tab-new.svg",
  "tab-prev": "images/tab-previous.svg",
  "tab-next": "images/tab-next.svg",
  "split-right": "images/split-right.svg",
  "split-down": "images/split-down.svg",
  "pane-primary": "images/zoom.svg",
  "resize-left": "images/resize-left.svg",
  "resize-right": "images/resize-right.svg",
  "resize-up": "images/resize-up.svg",
  "resize-down": "images/resize-down.svg",
  "settings": "images/settings.svg",
  "sidebar": "images/sidebar.svg",
  "zoom": "images/zoom.svg",
  "pane-left": "images/pane-left.svg",
  "pane-right": "images/pane-right.svg"
};

const DEFAULT_COMMAND = "workspace-next";

function commandForSettings(settings = {}) {
  const command = settings?.command;
  return Object.hasOwn(COMMAND_TITLES, command) && Object.hasOwn(COMMAND_IMAGES, command) ? command : DEFAULT_COMMAND;
}

function commandSettings(settings = {}) {
  const current = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  return { ...current, command: commandForSettings(current) };
}

function normalizeSplitDirection(settings = {}) {
  return settings?.splitDirection === "down" ? "down" : "right";
}

function panePrimaryCommand(state, settings = {}) {
  const panes = state?.panes?.filter(item => item.tab_id === state.focused_tab_id) ?? [];
  if (!state?.focused_pane_id || !panes.some(item => item.pane_id === state.focused_pane_id)) return null;
  return panes.length > 1 ? "zoom" : `split-${normalizeSplitDirection(settings)}`;
}

function commandPresentation(settings = {}, state) {
  const command = commandForSettings(settings);
  if (command === "pane-primary") {
    const resolved = panePrimaryCommand(state, settings);
    return {
      command,
      title: resolved?.startsWith("split-") ? "SPLIT" : resolved ? COMMAND_TITLES[resolved] : COMMAND_TITLES[command],
      image: resolved ? COMMAND_IMAGES[resolved] : COMMAND_IMAGES[command]
    };
  }
  return { command, title: COMMAND_TITLES[command], image: COMMAND_IMAGES[command] };
}

function errorRestoreTitle(info, originalTitle) {
  return info?.action === COMMAND_UUID ? (info.commandTitle ?? commandPresentation(info.settings).title) : originalTitle;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function initialDevices() {
  try {
    return JSON.parse(argument("-info") ?? "{}").devices ?? [];
  } catch {
    return [];
  }
}

function run(file, args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const child = execFile(file, args, (error, stdout, stderr) => {
      clearTimeout(timer);
      if (error) {
        if (timedOut) error.message = `${file} timed out after ${timeoutMs}ms`;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
  });
}

async function pids(args) {
  try {
    const output = await run("/usr/bin/pgrep", args, 5000);
    return output.split("\n").filter(Boolean);
  } catch (error) {
    if (error.code === 1) return [];
    throw error;
  }
}

async function firstPid(args) {
  return (await pids(args))[0] ?? null;
}

async function terminalTtys() {
  if (!(await firstPid(["-x", PROCESS_NAMES.terminal]))) return [];
  const script = [
    "set matches to {}",
    'tell application "Terminal"',
    "repeat with w in windows",
    "repeat with t in tabs of w",
    'if (processes of t) contains "herdr" then set end of matches to tty of t',
    "end repeat",
    "end repeat",
    "end tell",
    "set AppleScript's text item delimiters to linefeed",
    "return matches as text"
  ].join("\n");
  const output = await run("/usr/bin/osascript", ["-e", script], 5000);
  return output.split("\n").filter(Boolean);
}

async function iTermTtys() {
  if (!(await firstPid(["-x", PROCESS_NAMES.iterm]))) return [];
  const script = [
    "set matches to {}",
    'tell application "iTerm2"',
    "repeat with w in windows",
    "repeat with t in tabs of w",
    "repeat with s in sessions of t",
    "set end of matches to tty of s",
    "end repeat",
    "end repeat",
    "end repeat",
    "end tell",
    "set AppleScript's text item delimiters to linefeed",
    "return matches as text"
  ].join("\n");
  const output = await run("/usr/bin/osascript", ["-e", script], 5000);
  return output.split("\n").filter(Boolean);
}

function herdrPidForTty(tty) {
  return firstPid(["-t", path.basename(tty), "-x", "herdr"]);
}

async function clientsForTerminal(terminal) {
  if (!terminalIsInstalled(terminal)) return [];
  if (terminal === "ghostty" || terminal === "kitty") {
    return (await pids(["-f", processTerminalPattern(terminal)]))
      .map(id => ({ terminal, id }));
  }
  if (terminal === "terminal") {
    return (await terminalTtys()).map(id => ({ terminal, id }));
  }

  const clients = [];
  for (const tty of await iTermTtys()) {
    if (await herdrPidForTty(tty)) clients.push({ terminal, id: tty });
  }
  return clients;
}

async function attachedClients() {
  const clients = [];
  for (const terminal of terminalIds(terminalPreference)) {
    clients.push(...await clientsForTerminal(terminal));
  }
  return clients;
}

async function attachedClient() {
  return (await attachedClients())[0] ?? null;
}

function clientKey(client) {
  return `${client.terminal}:${client.id}`;
}

function workspacePickerPruneTerminals(preference, trackedClientKeys) {
  const selectedTerminals = new Set(terminalIds(preference));
  const terminals = new Set();
  for (const key of trackedClientKeys) {
    const terminal = key.slice(0, key.indexOf(":"));
    if (TERMINAL_ORDER.includes(terminal) && !selectedTerminals.has(terminal)) {
      terminals.add(terminal);
    }
  }
  return [...terminals];
}

async function frontmostProcessPid() {
  const script = 'tell application "System Events" to unix id of first application process whose frontmost is true';
  return run("/usr/bin/osascript", ["-e", script], 5000);
}

async function focusProcess(pid) {
  const script = [
    "on run argv",
    "set targetPID to (item 1 of argv) as integer",
    'tell application "System Events"',
    "set frontmost of first application process whose unix id is targetPID to true",
    "end tell",
    "end run"
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script, pid]);
}

async function hideProcess(pid) {
  const script = [
    "on run argv",
    "set targetPID to (item 1 of argv) as integer",
    'tell application "System Events"',
    "set visible of first application process whose unix id is targetPID to false",
    "end tell",
    "end run"
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script, pid]);
}

async function focusScriptedClient(client) {
  const app = client.terminal === "terminal" ? "Terminal" : "iTerm2";
  const body = client.terminal === "terminal" ? [
    "repeat with w in windows",
    "repeat with t in tabs of w",
    "if tty of t is targetTTY then",
    "set selected of t to true",
    "set frontmost of w to true",
    "set miniaturized of w to false",
    "activate",
    "return",
    "end if",
    "end repeat",
    "end repeat"
  ] : [
    "repeat with w in windows",
    "repeat with t in tabs of w",
    "repeat with s in sessions of t",
    "if tty of s is targetTTY then",
    "tell s to select",
    "tell t to select",
    "tell w to select",
    "activate",
    "return",
    "end if",
    "end repeat",
    "end repeat",
    "end repeat"
  ];
  const script = [
    "on run argv",
    "set targetTTY to item 1 of argv",
    `tell application "${app}"`,
    ...body,
    "end tell",
    'error "HERDR terminal session not found"',
    "end run"
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script, client.id]);
}

async function focusClient(client) {
  if (client.terminal === "ghostty" || client.terminal === "kitty") {
    return focusProcess(client.id);
  }
  return focusScriptedClient(client);
}

async function hideClient(client) {
  if (client.terminal === "ghostty" || client.terminal === "kitty") {
    return hideProcess(client.id);
  }
  await focusClient(client);
  const script = [
    'tell application "System Events"',
    "delay 0.1",
    'keystroke "m" using command down',
    "end tell"
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script]);
}

async function currentTty(terminal) {
  const script = terminal === "terminal" ? [
    'tell application "Terminal"',
    'if not (exists front window) then return ""',
    "return tty of selected tab of front window",
    "end tell"
  ] : [
    'tell application "iTerm2"',
    'if not (exists current window) then return ""',
    "return tty of current session of current window",
    "end tell"
  ];
  return run("/usr/bin/osascript", ["-e", script.join("\n")], 5000);
}

async function clientIsForeground(client, foregroundPid) {
  if (client.terminal === "ghostty" || client.terminal === "kitty") {
    return client.id === foregroundPid;
  }
  const appPid = await firstPid(["-x", PROCESS_NAMES[client.terminal]]);
  return appPid === foregroundPid && await currentTty(client.terminal) === client.id;
}

async function processHerdrPid(parentPid) {
  const direct = await firstPid(["-P", parentPid, "-x", "herdr"]);
  if (direct) return direct;
  for (const childPid of await pids(["-P", parentPid])) {
    const nested = await firstPid(["-P", childPid, "-x", "herdr"]);
    if (nested) return nested;
  }
  return null;
}

async function closeScriptedClient(client) {
  const app = client.terminal === "terminal" ? "Terminal" : "iTerm2";
  const body = client.terminal === "terminal" ? [
    "repeat with w in windows",
    "repeat with t in tabs of w",
    "if tty of t is targetTTY then",
    "close w",
    "return",
    "end if",
    "end repeat",
    "end repeat"
  ] : [
    "repeat with w in windows",
    "repeat with t in tabs of w",
    "repeat with s in sessions of t",
    "if tty of s is targetTTY then",
    "close s",
    "return",
    "end if",
    "end repeat",
    "end repeat",
    "end repeat"
  ];
  const script = [
    "on run argv",
    "set targetTTY to item 1 of argv",
    `tell application "${app}"`,
    ...body,
    "end tell",
    "end run"
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script, client.id]);
}

async function detach(client) {
  if (client.terminal === "ghostty" || client.terminal === "kitty") {
    const herdrPid = await processHerdrPid(client.id);
    process.kill(Number(herdrPid ?? client.id), "SIGTERM");
    return;
  }
  if (client.terminal === "terminal") {
    const herdrPid = await herdrPidForTty(client.id);
    if (herdrPid) process.kill(Number(herdrPid), "SIGTERM");
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await closeScriptedClient(client);
}

async function terminalForLaunch(preference = terminalPreference, isInstalled = terminalIsInstalled) {
  if (preference !== "auto") {
    if (!isInstalled(preference)) {
      throw new Error(`${preference} is not installed`);
    }
    return preference;
  }
  const terminal = TERMINAL_ORDER.find(isInstalled);
  if (!terminal) throw new Error("No supported terminal is installed");
  return terminal;
}

async function attach() {
  const terminal = await terminalForLaunch();
  if (terminal === "ghostty" || terminal === "kitty") {
    const args = ["-u", "NO_COLOR", "/usr/bin/open", "-na", terminalApp(terminal), "--args"];
    if (terminal === "ghostty") args.push("-e");
    args.push(herdrExecutable());
    return run("/usr/bin/env", args);
  }

  const app = terminal === "terminal" ? "Terminal" : "iTerm2";
  const launch = terminal === "terminal"
    ? "do script herdrCommand"
    : "create window with default profile command herdrCommand";
  const script = [
    "on run argv",
    terminal === "terminal"
      ? 'set herdrCommand to "/usr/bin/env -u NO_COLOR " & quoted form of (item 1 of argv) & "; exit 0"'
      : 'set herdrCommand to "exec /usr/bin/env -u NO_COLOR " & quoted form of (item 1 of argv)',
    `tell application "${app}"`,
    launch,
    "activate",
    "end tell",
    "end run"
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script, herdrExecutable()]);
}

async function snapshot() {
  const response = JSON.parse(await run(herdrExecutable(), ["api", "snapshot"]));
  return response.result.snapshot;
}

function adjacent(items, currentId, idKey, delta) {
  if (!items.length) return null;
  const index = items.findIndex(item => item[idKey] === currentId);
  if (index < 0) return items[delta < 0 ? items.length - 1 : 0];
  return items[(index + delta + items.length) % items.length];
}

function agentCommandArgs(state, command) {
  const target = adjacent(state.agents ?? [], state.focused_pane_id, "pane_id", command.endsWith("prev") ? -1 : 1);
  if (!target) throw new Error("No HERDR agent available");
  return ["agent", "focus", target.pane_id];
}

function selectAgent(state, selectedPaneId, delta = 0) {
  const agents = state?.agents ?? [];
  if (!agents.length) return null;
  const selected = agents.find(item => item.pane_id === selectedPaneId)
    ?? agents.find(item => item.pane_id === state.focused_pane_id);
  return delta ? adjacent(agents, selected?.pane_id, "pane_id", delta) : selected ?? agents[0];
}

const AGENT_STATUSES = new Set(["idle", "working", "blocked", "done", "unknown"]);
const AGENT_STATUS_COLORS = {
  idle: "#FFD166",
  working: "#7DF9FF",
  blocked: "#FF6B6B",
  done: "#7DFFB2",
  unknown: "#8A8F98"
};

function agentStatus(agent) {
  const status = String(agent?.agent_status ?? "unknown").toLowerCase();
  return AGENT_STATUSES.has(status) ? status : "unknown";
}

function agentStatusColor(agent) {
  return AGENT_STATUS_COLORS[agentStatus(agent)];
}

function compactKeyLabel(value, fallback, maxLength = 12) {
  const label = String(value ?? "").trim().replace(/\s+/g, " ") || fallback;
  return label.length <= maxLength ? label : `${label.slice(0, maxLength - 3)}...`;
}

function agentKeyTitle(state, agent) {
  if (!agent) return "";
  const name = compactKeyLabel(
    agent.display_agent || agent.name || agent.agent,
    "AGENT"
  ).toUpperCase();
  const workspace = state?.workspaces?.find(item => item.workspace_id === agent.workspace_id);
  const workspaceName = compactKeyLabel(
    workspace?.label,
    workspace ? `SPACE ${workspace.number}` : "NO SPACE"
  ).toUpperCase();
  return `${name}\n${workspaceName}`;
}

function agentStatusGlyph(status) {
  if (status === "working") return '<path d="M105 21L118 29L105 37Z" fill="#171923"/>';
  if (status === "idle") return '<path d="M105 21V37M115 21V37" stroke="#171923" stroke-width="4" stroke-linecap="round"/>';
  if (status === "blocked") return '<path d="M104 23L116 35M116 23L104 35" stroke="#171923" stroke-width="4" stroke-linecap="round"/>';
  if (status === "done") return '<path d="M102 29L108 35L118 22" stroke="#171923" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
  return '<text x="110" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="#171923">?</text>';
}

function agentKeyImage(agent, focusedPaneId) {
  const status = agentStatus(agent);
  const color = agentStatusColor(agent);
  const focused = agent?.pane_id === focusedPaneId;
  const svg = `<svg width="144" height="144" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="138" height="138" rx="19" fill="#171923" stroke="${focused ? "#CDB7FF" : "#7DF9FF"}" stroke-width="${focused ? 8 : 5}"/>
  <text x="18" y="29" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${color}">${status.toUpperCase()}</text>
  <path d="M72 38V48" stroke="#D9DAD8" stroke-width="6" stroke-linecap="round"/>
  <circle cx="72" cy="34" r="5" fill="#7DF9FF"/>
  <rect x="34" y="48" width="76" height="60" rx="13" stroke="#D9DAD8" stroke-width="6"/>
  <circle cx="58" cy="73" r="6" fill="#7DF9FF"/>
  <circle cx="86" cy="73" r="6" fill="#7DF9FF"/>
  <path d="M57 92H87" stroke="#7DF9FF" stroke-width="6" stroke-linecap="round"/>
  <circle cx="110" cy="29" r="17" fill="${color}"/>
  ${agentStatusGlyph(status)}
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function agentActionSettings(settings = {}) {
  const role = ["agent", "prev", "page", "next"].includes(settings.role) ? settings.role : "agent";
  const pageSize = [4, 10].includes(Number(settings.pageSize)) ? Number(settings.pageSize) : 4;
  const slot = Number.isInteger(Number(settings.slot)) && Number(settings.slot) >= 0
    ? Number(settings.slot)
    : 0;
  return { role, pageSize, slot };
}

function agentPageCount(agentCount, pageSize) {
  return Math.max(1, Math.ceil(agentCount / pageSize));
}

function normalizeAgentPage(page, agentCount, pageSize) {
  return Math.min(Math.max(0, Number(page) || 0), agentPageCount(agentCount, pageSize) - 1);
}

function shiftAgentPage(page, delta, agentCount, pageSize) {
  const count = agentPageCount(agentCount, pageSize);
  return (normalizeAgentPage(page, agentCount, pageSize) + delta + count) % count;
}

function agentForSlot(state, page, pageSize, slot) {
  return state?.agents?.[normalizeAgentPage(page, state?.agents?.length ?? 0, pageSize) * pageSize + slot] ?? null;
}

function agentKeyPresentation(state, settings, page = 0) {
  const { role, pageSize, slot } = agentActionSettings(settings);
  const agents = state?.agents ?? [];
  const normalizedPage = normalizeAgentPage(page, agents.length, pageSize);
  const pages = agentPageCount(agents.length, pageSize);
  if (role === "prev") {
    return { title: "", image: pages > 1 ? "images/agent-page-previous.svg" : "images/blank.svg" };
  }
  if (role === "next") {
    return { title: "", image: pages > 1 ? "images/agent-page-next.svg" : "images/blank.svg" };
  }
  if (role === "page") {
    return {
      title: pages > 1 ? `${normalizedPage + 1}/${pages}` : "",
      image: pages > 1 ? "images/agents.svg" : "images/blank.svg"
    };
  }
  const agent = agentForSlot(state, normalizedPage, pageSize, slot);
  if (agent) {
    return {
      title: agentKeyTitle(state, agent),
      image: agentKeyImage(agent, state?.focused_pane_id),
      agent
    };
  }
  return {
    title: !agents.length && slot === 0 ? "NO\nAGENTS" : "",
    image: !agents.length && slot === 0 ? "images/agents-empty.svg" : "images/blank.svg"
  };
}

async function sendKeySequence(sequence, client) {
  client ??= await attachedClient();
  if (!client) throw new Error("HERDR client is not attached");
  await focusClient(client);
  const keyLines = sequence.flatMap((chord, index) => (
    index + 1 < sequence.length
      ? [appleScriptKeyLine(chord), "delay 0.08"]
      : [appleScriptKeyLine(chord)]
  ));
  const script = [
    'tell application "System Events"',
    "delay 0.1",
    ...keyLines,
    "end tell",
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script]);
}

const ESCAPE_KEY_SEQUENCE = [{ keyCode: 53, modifiers: [] }];

function workspacePickerSequence(isOpen, resolveOpenSequence) {
  return isOpen ? ESCAPE_KEY_SEQUENCE : resolveOpenSequence();
}

async function toggleWorkspacePicker() {
  if (workspacePickerBusy) return false;
  workspacePickerBusy = true;
  try {
    const client = await attachedClient();
    if (!client) throw new Error("HERDR client is not attached");
    const key = clientKey(client);
    const isOpen = workspacePickerOpenClients.has(key);
    const sequence = workspacePickerSequence(isOpen, () => commandKeySequence("workspace-picker"));
    await sendKeySequence(sequence, client);
    if (isOpen) workspacePickerOpenClients.delete(key);
    else workspacePickerOpenClients.add(key);
    return true;
  } finally {
    workspacePickerBusy = false;
  }
}

function paneCycleTarget(state, command) {
  const panes = state.layouts?.find(item => item.tab_id === state.focused_tab_id)?.panes ?? [];
  return adjacent(panes, state.focused_pane_id, "pane_id", command === "pane-left" ? -1 : 1);
}

function paneRouteDirections(current, target) {
  const center = pane => ({
    x: pane.rect.x + pane.rect.width / 2,
    y: pane.rect.y + pane.rect.height / 2
  });
  const from = center(current);
  const to = center(target);
  const vertical = to.y < from.y ? "up" : to.y > from.y ? "down" : null;
  const horizontal = to.x < from.x ? "left" : to.x > from.x ? "right" : null;
  const overlapsVertically = Math.max(current.rect.y, target.rect.y)
    < Math.min(current.rect.y + current.rect.height, target.rect.y + target.rect.height);
  return (overlapsVertically ? [horizontal, vertical] : [vertical, horizontal]).filter(Boolean);
}

function paneCommandArgs(command, paneId, direction) {
  if (!paneId) throw new Error("No focused HERDR pane");
  if (command === "split-right" || command === "split-down") {
    return ["pane", "split", "--pane", paneId, "--direction", command === "split-right" ? "right" : "down", "--focus"];
  }
  if (command.startsWith("resize-")) {
    return ["pane", "resize", "--pane", paneId, "--direction", command.slice("resize-".length)];
  }
  if (command === "zoom") return ["pane", "zoom", "--pane", paneId, "--toggle"];
  return ["pane", "focus", "--pane", paneId, "--direction", direction];
}

async function cyclePane(command, state) {
  const target = paneCycleTarget(state, command);
  if (!target || target.pane_id === state.focused_pane_id) return;
  const panes = state.layouts.find(item => item.tab_id === state.focused_tab_id).panes;

  for (let hop = 0; hop < panes.length; hop += 1) {
    const current = panes.find(item => item.pane_id === state.focused_pane_id);
    let firstError;
    for (const direction of paneRouteDirections(current, target)) {
      try {
        await run(herdrExecutable(), paneCommandArgs(command, current.pane_id, direction));
        firstError = null;
        break;
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError) throw firstError;
    state = await snapshot();
    if (state.focused_pane_id === target.pane_id) return;
  }
  throw new Error(`Could not focus HERDR pane ${target.pane_id}`);
}

async function executeCommand(command, settings = {}) {
  if (command === "workspace-picker") return toggleWorkspacePicker();
  const keySequence = commandKeySequence(command);
  if (keySequence) return sendKeySequence(keySequence);
  if (command === "detach") {
    const client = await attachedClient();
    if (!client) throw new Error("HERDR client is not attached");
    return detach(client);
  }

  if (command === "pane-primary") {
    const state = await snapshot();
    const resolved = panePrimaryCommand(state, settings);
    if (!resolved) throw new Error("No focused HERDR pane");
    return run(herdrExecutable(), paneCommandArgs(resolved, state.focused_pane_id));
  }
  if (["split-right", "split-down", "resize-left", "resize-right", "resize-up", "resize-down", "zoom"].includes(command)) {
    const state = await snapshot();
    return run(herdrExecutable(), paneCommandArgs(command, state.focused_pane_id));
  }
  if (command === "pane-left" || command === "pane-right") {
    const state = await snapshot();
    return cyclePane(command, state);
  }

  const state = await snapshot();
  const pane = state.panes.find(item => item.pane_id === state.focused_pane_id);

  if (command === "agent-prev" || command === "agent-next") {
    return run(herdrExecutable(), agentCommandArgs(state, command));
  }

  if (command === "workspace-new") {
    const args = ["workspace", "create", "--focus"];
    if (pane?.cwd) args.push("--cwd", pane.cwd);
    return run(herdrExecutable(), args);
  }
  if (command === "workspace-prev" || command === "workspace-next") {
    const workspaces = [...state.workspaces].sort((a, b) => a.number - b.number);
    const target = adjacent(workspaces, state.focused_workspace_id, "workspace_id", command.endsWith("prev") ? -1 : 1);
    if (!target) throw new Error("No workspace available");
    return run(herdrExecutable(), ["workspace", "focus", target.workspace_id]);
  }
  if (command === "tab-new") {
    const args = ["tab", "create", "--workspace", state.focused_workspace_id, "--focus"];
    if (pane?.cwd) args.push("--cwd", pane.cwd);
    return run(herdrExecutable(), args);
  }
  if (command === "tab-prev" || command === "tab-next") {
    const tabs = state.tabs
      .filter(item => item.workspace_id === state.focused_workspace_id)
      .sort((a, b) => a.number - b.number);
    const target = adjacent(tabs, state.focused_tab_id, "tab_id", command.endsWith("prev") ? -1 : 1);
    if (!target) throw new Error("No tab available");
    return run(herdrExecutable(), ["tab", "focus", target.tab_id]);
  }

  throw new Error(`Unknown HERDR command: ${command}`);
}

function encoderCommand(dial, event, payload = {}) {
  if (event === "dialRotate") {
    if (!payload.ticks) return null;
    const commands = {
      workspace: payload.ticks < 0 ? "workspace-prev" : "workspace-next",
      tabs: payload.ticks < 0 ? "tab-prev" : "tab-next",
      panes: payload.ticks < 0 ? "pane-left" : "pane-right"
    };
    return commands[dial] ?? null;
  }
  if (event === "dialUp") {
    return {
      workspace: "workspace-new",
      tabs: "tab-new",
      panes: "pane-primary"
    }[dial] ?? null;
  }
  return null;
}

const port = argument("-port");
const pluginUUID = argument("-pluginUUID");
const registerEvent = argument("-registerEvent");
const devicesAtLaunch = initialDevices();
const toggleContexts = new Set();
const contextInfo = new Map();
const knownDevices = new Set(devicesAtLaunch.map(device => device.id));
const deviceTypes = new Map(devicesAtLaunch.map(device => [device.id, device.type]));
const herdrProfileDevices = new Set();
const encoderBusy = new Set();
const adaptivePaneKeyBusy = new Set();
const workspacePickerOpenClients = new Set();
const agentSelections = new Map();
const agentPages = new Map();
let busy = false;
let workspacePickerBusy = false;
let lastAttachedState = -1;
let terminalPreference = "auto";
let socket;
let liveRefreshPromise;

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function setState(context, state) {
  send({ event: "setState", context, payload: { state } });
}

function setTitle(context, title) {
  send({ event: "setTitle", context, payload: title === undefined ? {} : { title } });
}

function setImage(context, image) {
  send({ event: "setImage", context, payload: { image } });
}

function setSettings(context, settings) {
  send({ event: "setSettings", context, payload: settings });
}

function setCommandPresentation(context, presentation) {
  const info = contextInfo.get(context);
  if (!info) return;
  const signature = `${presentation.title}\n${presentation.image}`;
  if (info.commandPresentation === signature) return;
  info.commandPresentation = signature;
  info.commandTitle = presentation.title;
  setTitle(context, presentation.title);
  setImage(context, presentation.image);
}

function syncCommand(context, settings, persistDefault = false) {
  const normalized = commandSettings(settings);
  const info = contextInfo.get(context);
  if (info) info.settings = normalized;
  setCommandPresentation(context, commandPresentation(normalized));
  if (persistDefault && settings?.command !== normalized.command) setSettings(context, normalized);
  return normalized.command;
}

function setFeedback(context, payload) {
  send({ event: "setFeedback", context, payload });
}

function setFeedbackLayout(context, layout) {
  send({ event: "setFeedbackLayout", context, payload: { layout } });
}

function showAlert(context) {
  send({ event: "showAlert", context });
}

function showOk(context) {
  send({ event: "showOk", context });
}

function errorFeedback(error) {
  const message = `${error?.message ?? ""}\n${error?.stderr ?? ""}`;
  if (error?.code === "HERDR_CUSTOM_KEYBINDING") return { title: "CUSTOM\nKEYS" };
  if (/HERDR executable not found in a supported install location/i.test(message)) {
    return { title: "INSTALL\nHERDR" };
  }
  if (/No supported terminal is installed/i.test(message)) {
    return { title: "NO\nTERMINAL" };
  }
  const terminal = message.match(/\b(ghostty|kitty|iterm|terminal) is not installed\b/i)?.[1]?.toLowerCase();
  if (terminal) {
    return { title: `INSTALL\n${terminal === "iterm" ? "ITERM2" : terminal.toUpperCase()}` };
  }
  if (/-1719\b|\b1002\b|assistive access|not allowed to send keystrokes/i.test(message)) {
    return { title: "ALLOW\nACCESS", pane: "Privacy_Accessibility" };
  }
  if (/-1743\b|not authorized to send Apple events/i.test(message)) {
    return { title: "ALLOW\nAUTOMATION", pane: "Privacy_Automation" };
  }
  return null;
}

function showError(context, error, originalTitle) {
  send({ event: "logMessage", payload: { message: [error?.stack ?? String(error), error?.stderr].filter(Boolean).join("\n") } });
  const feedback = errorFeedback(error);
  if (feedback) {
    setTitle(context, feedback.title);
    setTimeout(() => setTitle(context, errorRestoreTitle(contextInfo.get(context), originalTitle)), 3000);
    if (feedback.pane) {
      run("/usr/bin/open", [`x-apple.systempreferences:com.apple.preference.security?${feedback.pane}`], 5000).catch(() => {});
    }
  }
  showAlert(context);
}

function switchProfile(device, profile) {
  send({
    event: "switchToProfile",
    context: pluginUUID,
    device,
    payload: profile ? { profile } : {}
  });
}

async function syncHerdrProfile(clients) {
  const foregroundPid = await frontmostProcessPid();
  let herdrIsForeground = false;
  for (const client of clients) {
    if (await clientIsForeground(client, foregroundPid)) {
      herdrIsForeground = true;
      break;
    }
  }

  for (const device of knownDevices) {
    const profile = HERDR_PROFILES[deviceTypes.get(device)];
    if (!profile) continue;
    if (herdrIsForeground && !herdrProfileDevices.has(device)) {
      switchProfile(device, profile);
      herdrProfileDevices.add(device);
    } else if (!herdrIsForeground && herdrProfileDevices.has(device)) {
      switchProfile(device);
      herdrProfileDevices.delete(device);
    }
  }
}

async function refresh(force = false) {
  const clients = await attachedClients();
  const attachedClientKeys = new Set(clients.map(clientKey));
  for (const terminal of workspacePickerPruneTerminals(terminalPreference, workspacePickerOpenClients)) {
    for (const client of await clientsForTerminal(terminal)) {
      attachedClientKeys.add(clientKey(client));
    }
  }
  for (const key of workspacePickerOpenClients) {
    if (!attachedClientKeys.has(key)) workspacePickerOpenClients.delete(key);
  }
  const attachedState = clients.length ? 1 : 0;
  if (force || attachedState !== lastAttachedState) {
    lastAttachedState = attachedState;
    for (const context of toggleContexts) setState(context, attachedState);
  }

  await syncHerdrProfile(clients);
  return attachedState;
}

function encoderFeedback(dial, state, selectedAgentPaneId, settings = {}) {
  if (dial === "workspace") {
    const workspace = state?.workspaces?.find(item => item.workspace_id === state.focused_workspace_id);
    return {
      glyph: "images/dial-workspace.svg",
      label: "WORKSPACE",
      value: workspace?.label?.trim() || (workspace ? `SPACE ${workspace.number}` : "NO SPACE"),
      hint: "TURN SWITCH    PUSH NEW"
    };
  }
  if (dial === "tabs") {
    const tab = state?.tabs?.find(item => item.tab_id === state.focused_tab_id);
    return {
      glyph: "images/dial-tab.svg",
      label: "TABS",
      value: tab?.label?.trim() || (tab ? `TAB ${tab.number}` : "NO TAB"),
      hint: "TURN SWITCH    PUSH NEW"
    };
  }
  if (dial === "panes") {
    const panes = state?.panes?.filter(item => item.tab_id === state.focused_tab_id) ?? [];
    const pane = panes.findIndex(item => item.pane_id === state?.focused_pane_id);
    const primary = panePrimaryCommand(state, settings);
    const pushHint = primary === "zoom"
      ? "PUSH ZOOM"
      : primary === "split-down" ? "PUSH SPLIT ↓" : primary === "split-right" ? "PUSH SPLIT →" : "NO PANE";
    return {
      glyph: "images/dial-pane.svg",
      label: "PANES",
      value: panes[pane]?.label?.trim() || (pane >= 0 ? `PANE ${pane + 1}` : "NO PANE"),
      hint: `TURN CYCLE    ${pushHint}`
    };
  }
  const agents = state?.agents ?? [];
  const agent = selectAgent(state, selectedAgentPaneId);
  const position = agent ? agents.findIndex(item => item.pane_id === agent.pane_id) + 1 : 0;
  const workspace = agent
    ? state?.workspaces?.find(item => item.workspace_id === agent.workspace_id)
    : null;
  const agentName = agent?.display_agent?.trim() || agent?.name?.trim() || agent?.agent?.trim();
  return {
    glyph: "images/dial-agent.svg",
    label: agent ? `AGENTS · ${position}/${agents.length}` : "AGENTS",
    value: workspace?.label?.trim() || (workspace ? `SPACE ${workspace.number}` : agentName) || "NO AGENTS",
    hint: agent
      ? `${agentName?.toUpperCase() || "AGENT"} · ${agentStatus(agent).toUpperCase()} · PRESS TO FOCUS`
      : "WAITING FOR AGENTS"
  };
}

async function refreshEncoderFeedbacks(state) {
  const encoders = [...contextInfo.entries()].filter(([, info]) => info.action === ENCODER_UUID);
  if (!encoders.length) return;
  for (const [context, info] of encoders) {
    const selected = info.settings.dial === "client" ? selectAgent(state, agentSelections.get(context)) : null;
    if (selected) agentSelections.set(context, selected.pane_id);
    setFeedback(context, encoderFeedback(info.settings.dial, state, selected?.pane_id, info.settings));
  }
}

function refreshAdaptivePaneKeys(state) {
  if (!state) return;
  const contexts = [...contextInfo.entries()].filter(([, info]) => (
    info.action === COMMAND_UUID && commandForSettings(info.settings) === "pane-primary"
  ));
  for (const [context, info] of contexts) {
    setCommandPresentation(context, commandPresentation(info.settings, state));
  }
}

function setAgentPresentation(context, presentation) {
  const info = contextInfo.get(context);
  if (!info) return;
  const signature = `${presentation.title}\n${presentation.image}`;
  if (info.agentPresentation === signature) return;
  info.agentPresentation = signature;
  info.agentTitle = presentation.title;
  setTitle(context, presentation.title);
  setImage(context, presentation.image);
}

function refreshAgentKeys(state) {
  const contexts = [...contextInfo.entries()].filter(([, info]) => info.action === AGENT_UUID);
  for (const [context, info] of contexts) {
    const settings = agentActionSettings(info.settings);
    const agentCount = state?.agents?.length ?? 0;
    const page = normalizeAgentPage(agentPages.get(info.device), agentCount, settings.pageSize);
    agentPages.set(info.device, page);
    setAgentPresentation(context, agentKeyPresentation(state, settings, page));
  }
}

async function refreshLiveFeedbacks() {
  if (liveRefreshPromise) return liveRefreshPromise;
  liveRefreshPromise = (async () => {
    const hasLiveControls = [...contextInfo.values()].some(info => (
      info.action === ENCODER_UUID
      || info.action === AGENT_UUID
      || (info.action === COMMAND_UUID && commandForSettings(info.settings) === "pane-primary")
    ));
    if (!hasLiveControls) return;
    let state;
    try {
      state = await snapshot();
    } catch {}
    refreshAdaptivePaneKeys(state);
    await refreshEncoderFeedbacks(state);
    refreshAgentKeys(state);
  })();
  try {
    return await liveRefreshPromise;
  } finally {
    liveRefreshPromise = null;
  }
}

async function toggle(context) {
  if (busy) return;
  busy = true;
  try {
    const client = await attachedClient();
    if (client) {
      await focusClient(client);
    } else {
      await attach();
    }
    setTimeout(() => refresh(true).catch(error => showError(context, error)), 750);
  } catch (error) {
    showError(context, error);
  } finally {
    busy = false;
  }
}

async function runCommand(context, command, acknowledge = true, settings = contextInfo.get(context)?.settings ?? {}) {
  if (!command) return showAlert(context);
  try {
    const result = await executeCommand(command, settings);
    if (acknowledge && result !== false) showOk(context);
    await refreshLiveFeedbacks();
  } catch (error) {
    showError(context, error, COMMAND_TITLES[command] ?? "HERDR");
  }
}

async function runCommandKey(context, rawSettings) {
  const settings = rawSettings ?? contextInfo.get(context)?.settings;
  const command = commandForSettings(settings);
  if (command !== "pane-primary") return runCommand(context, command, true, settings);
  if (adaptivePaneKeyBusy.has(context)) return;
  adaptivePaneKeyBusy.add(context);
  try {
    await runCommand(context, command, true, settings);
  } finally {
    adaptivePaneKeyBusy.delete(context);
  }
}

async function returnToPreviousProfile(context) {
  try {
    const client = await attachedClient();
    if (!client) return showAlert(context);
    await hideClient(client);
  } catch {
    showAlert(context);
  }
}

async function runAgentKey(context, rawSettings) {
  const info = contextInfo.get(context);
  const settings = agentActionSettings(rawSettings ?? info?.settings);
  let state;
  try {
    state = await snapshot();
    const agentCount = state?.agents?.length ?? 0;
    const page = normalizeAgentPage(agentPages.get(info?.device), agentCount, settings.pageSize);
    if (settings.role === "prev" || settings.role === "page" || settings.role === "next") {
      agentPages.set(
        info?.device,
        shiftAgentPage(page, settings.role === "prev" ? -1 : 1, agentCount, settings.pageSize)
      );
      refreshAgentKeys(state);
      return;
    }
    const agent = agentForSlot(state, page, settings.pageSize, settings.slot);
    if (!agent) return showAlert(context);
    await run(herdrExecutable(), ["agent", "focus", agent.pane_id]);
    showOk(context);
    await refreshLiveFeedbacks();
  } catch (error) {
    showError(context, error, info?.agentTitle ?? "AGENT");
  }
}

async function runEncoder(context, dial, event, payload) {
  if (encoderBusy.has(context)) return;
  if (dial === "client" && (event === "dialRotate" || event === "dialUp")) {
    encoderBusy.add(context);
    try {
      const state = await snapshot();
      const delta = event === "dialRotate" ? Math.sign(payload.ticks) : 0;
      const selected = selectAgent(state, agentSelections.get(context), delta);
      if (!selected) return showAlert(context);
      agentSelections.set(context, selected.pane_id);
      if (event === "dialUp") {
        await run(herdrExecutable(), ["agent", "focus", selected.pane_id]);
        await refreshLiveFeedbacks();
      } else {
        setFeedback(context, encoderFeedback("client", state, selected.pane_id));
      }
    } catch {
      showAlert(context);
    } finally {
      encoderBusy.delete(context);
    }
    return;
  }
  const command = encoderCommand(dial, event, payload);
  if (!command) return;
  encoderBusy.add(context);
  try {
    if (command === "back") await returnToPreviousProfile(context);
    else await runCommand(context, command, false, payload?.settings ?? contextInfo.get(context)?.settings);
  } finally {
    encoderBusy.delete(context);
  }
}

function connectPlugin() {
  socket = new WebSocket(`ws://127.0.0.1:${port}`);

  socket.addEventListener("open", () => {
    send({ event: registerEvent, uuid: pluginUUID });
    send({ event: "getGlobalSettings", context: pluginUUID });
    setInterval(() => refresh().then(() => refreshLiveFeedbacks()).catch(() => {}), 1000);
  });

  socket.addEventListener("message", event => {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (message.event === "didReceiveGlobalSettings") {
      terminalPreference = normalizeTerminal(message.payload?.settings?.terminal);
      refresh(true).catch(() => {});
      return;
    }
    if (message.event === "deviceDidConnect") {
      knownDevices.add(message.device);
      deviceTypes.set(message.device, message.deviceInfo?.type);
      refresh(true).catch(() => {});
      return;
    }
    if (message.event === "deviceDidChange") {
      deviceTypes.set(message.device, message.deviceInfo?.type);
      refresh(true).catch(() => {});
      return;
    }
    if (message.event === "deviceDidDisconnect") {
      knownDevices.delete(message.device);
      deviceTypes.delete(message.device);
      herdrProfileDevices.delete(message.device);
      agentPages.delete(message.device);
      return;
    }

    if (![TOGGLE_UUID, COMMAND_UUID, BACK_UUID, ENCODER_UUID, AGENT_UUID].includes(message.action)) return;

    if (message.event === "willAppear") {
      const settings = message.payload?.settings ?? {};
      knownDevices.add(message.device);
      contextInfo.set(message.context, {
        action: message.action,
        device: message.device,
        settings
      });
      if (message.action === TOGGLE_UUID) toggleContexts.add(message.context);
      if (message.action === COMMAND_UUID) {
        if (syncCommand(message.context, settings, true) === "pane-primary") {
          refreshLiveFeedbacks().catch(() => showAlert(message.context));
        }
      } else if (message.action === BACK_UUID) {
        setTitle(message.context, "BACK");
      } else if (message.action === ENCODER_UUID) {
        setFeedbackLayout(message.context, "layouts/herdr-dial.json");
        refreshLiveFeedbacks().catch(() => showAlert(message.context));
      } else if (message.action === AGENT_UUID) {
        refreshLiveFeedbacks().catch(() => showAlert(message.context));
      }
      refresh(true).catch(() => showAlert(message.context));
    } else if (message.event === "willDisappear") {
      contextInfo.delete(message.context);
      toggleContexts.delete(message.context);
      agentSelections.delete(message.context);
    } else if (message.event === "didReceiveSettings" && message.action === COMMAND_UUID) {
      if (syncCommand(message.context, message.payload?.settings ?? {}, true) === "pane-primary") {
        refreshLiveFeedbacks().catch(() => showAlert(message.context));
      }
    } else if (message.event === "didReceiveSettings" && message.action === ENCODER_UUID) {
      const info = contextInfo.get(message.context);
      if (info) info.settings = message.payload?.settings ?? {};
      refreshLiveFeedbacks().catch(() => showAlert(message.context));
    } else if (message.event === "keyUp") {
      if (message.action === TOGGLE_UUID) toggle(message.context);
      else if (message.action === COMMAND_UUID) {
        runCommandKey(message.context, message.payload?.settings);
      }
      else if (message.action === BACK_UUID) returnToPreviousProfile(message.context);
      else if (message.action === AGENT_UUID) {
        runAgentKey(message.context, message.payload?.settings ?? contextInfo.get(message.context)?.settings);
      }
    } else if (message.action === ENCODER_UUID && ["dialRotate", "dialUp", "touchTap"].includes(message.event)) {
      const dial = message.payload?.settings?.dial ?? contextInfo.get(message.context)?.settings?.dial;
      runEncoder(message.context, dial, message.event, message.payload);
    }
  });
}

module.exports = { agentCommandArgs, agentForSlot, agentKeyPresentation, agentKeyTitle, agentPageCount, agentStatusColor, clientKey, commandForSettings, commandPresentation, commandSettings, encoderCommand, encoderFeedback, errorFeedback, errorRestoreTitle, herdrExecutable, normalizeAgentPage, normalizeSplitDirection, normalizeTerminal, paneCommandArgs, paneCycleTarget, panePrimaryCommand, paneRouteDirections, selectAgent, shiftAgentPage, terminalForLaunch, terminalIds, workspacePickerPruneTerminals, workspacePickerSequence };
if (require.main === module) connectPlugin();
