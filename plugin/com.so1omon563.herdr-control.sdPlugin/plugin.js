const { execFile } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const TOGGLE_UUID = "com.so1omon563.herdr-control.toggle";
const COMMAND_UUID = "com.so1omon563.herdr-control.command";
const BACK_UUID = "com.so1omon563.herdr-control.back";
const ENCODER_UUID = "com.so1omon563.herdr-control.encoder";
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
  "sidebar": "images/sidebar.svg",
  "zoom": "images/zoom.svg",
  "pane-left": "images/pane-left.svg",
  "pane-right": "images/pane-right.svg"
};

const HERDR_PREFIX_COMMANDS = {
  "rename-workspace": [13, true],
  "rename-tab": [17, true],
  "rename-pane": [35, true],
  "close-workspace": [2, true],
  "close-tab": [7, true],
  "close-pane": [7, false]
};

const HERDR_CONFIG_BINDINGS = {
  "workspace-picker": "workspace_picker",
  "sidebar": "toggle_sidebar",
  "rename-workspace": "rename_workspace",
  "rename-tab": "rename_tab",
  "rename-pane": "rename_pane",
  "close-workspace": "close_workspace",
  "close-tab": "close_tab",
  "close-pane": "close_pane"
};
function prefixCommand(command) {
  return HERDR_PREFIX_COMMANDS[command] ?? null;
}

function herdrConfigPath() {
  return process.env.HERDR_CONFIG_PATH?.trim()
    || path.join(os.homedir(), ".config", "herdr", "config.toml");
}

function tomlAssignment(line) {
  return line.match(/^([A-Za-z0-9_-]+)\s*=/)?.[1]
    ?? line.match(/^["']([^"']+)["']\s*=/)?.[1]
    ?? null;
}

function tomlName(value) {
  return value.match(/^["']([^"']+)["']$/)?.[1] ?? value;
}

function bindingOverride(command, source) {
  const binding = HERDR_CONFIG_BINDINGS[command];
  if (!binding) return null;
  let section = "";

  for (const line of source.split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;

    const arrayTable = value.match(/^\[\[\s*([^\]]+?)\s*\]\](?:\s*#.*)?$/);
    if (arrayTable) {
      section = tomlName(arrayTable[1]);
      continue;
    }
    const table = value.match(/^\[\s*([^\]]+?)\s*\](?:\s*#.*)?$/);
    if (table) {
      section = tomlName(table[1]);
      continue;
    }

    if (!section) {
      if (/^(?:keys|["']keys["'])\s*=/.test(value)) {
        return "keys";
      }
      const dotted = value.match(/^(?:keys|["']keys["'])\.(?:([A-Za-z0-9_-]+)|["']([^"']+)["'])\s*=/);
      const name = dotted?.[1] ?? dotted?.[2];
      if (name === "prefix" || name === binding) return name;
      continue;
    }

    if (section === "keys") {
      const name = tomlAssignment(value);
      if (name === "prefix" || name === binding) return name;
    }
  }

  return null;
}

function activeBindingOverride(command) {
  if (!HERDR_CONFIG_BINDINGS[command]) return null;
  const config = herdrConfigPath();
  if (!existsSync(config)) return null;
  try {
    return bindingOverride(command, readFileSync(config, "utf8"));
  } catch {
    return "config";
  }
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

async function sendPrefixKey(keyCode, shift = false) {
  const client = await attachedClient();
  if (!client) throw new Error("HERDR client is not attached");
  await focusClient(client);
  const script = [
    "on run argv",
    "set commandKeyCode to (item 1 of argv) as integer",
    'tell application "System Events"',
    "delay 0.1",
    "key code 11 using control down",
    "delay 0.08",
    shift ? "key code commandKeyCode using shift down" : "key code commandKeyCode",
    "end tell",
    "end run"
  ].join("\n");
  await run("/usr/bin/osascript", ["-e", script, String(keyCode)]);
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

async function executeCommand(command) {
  const overriddenBinding = activeBindingOverride(command);
  if (overriddenBinding) {
    const error = new Error(`HERDR keybinding ${overriddenBinding} is explicitly configured`);
    error.code = "HERDR_CUSTOM_KEYBINDING";
    throw error;
  }
  if (command === "workspace-picker") return sendPrefixKey(13);
  if (command === "sidebar") return sendPrefixKey(11);
  const prefix = prefixCommand(command);
  if (prefix) return sendPrefixKey(...prefix);
  if (command === "detach") {
    const client = await attachedClient();
    if (!client) throw new Error("HERDR client is not attached");
    return detach(client);
  }

  if (["split-right", "split-down", "zoom"].includes(command)) {
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
      panes: "zoom"
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
const agentSelections = new Map();
let busy = false;
let lastAttachedState = -1;
let terminalPreference = "auto";
let socket;

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function setState(context, state) {
  send({ event: "setState", context, payload: { state } });
}

function setTitle(context, title) {
  send({ event: "setTitle", context, payload: { title } });
}

function setImage(context, image) {
  send({ event: "setImage", context, payload: { image } });
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
  const attachedState = clients.length ? 1 : 0;
  if (force || attachedState !== lastAttachedState) {
    lastAttachedState = attachedState;
    for (const context of toggleContexts) setState(context, attachedState);
  }

  await syncHerdrProfile(clients);
  return attachedState;
}

function encoderFeedback(dial, state, selectedAgentPaneId) {
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
    return {
      glyph: "images/dial-pane.svg",
      label: "PANES",
      value: panes[pane]?.label?.trim() || (pane >= 0 ? `PANE ${pane + 1}` : "NO PANE"),
      hint: "TURN CYCLE    PUSH ZOOM"
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
    hint: agent ? `${agentName?.toUpperCase() || "AGENT"} · PRESS TO FOCUS` : "WAITING FOR AGENTS"
  };
}

async function refreshEncoderFeedbacks() {
  const encoders = [...contextInfo.entries()].filter(([, info]) => info.action === ENCODER_UUID);
  if (!encoders.length) return;
  let state;
  try {
    state = await snapshot();
  } catch {}
  for (const [context, info] of encoders) {
    const selected = info.settings.dial === "client" ? selectAgent(state, agentSelections.get(context)) : null;
    if (selected) agentSelections.set(context, selected.pane_id);
    setFeedback(context, encoderFeedback(info.settings.dial, state, selected?.pane_id));
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
    setTimeout(() => refresh(true).catch(() => showAlert(context)), 750);
  } catch {
    showAlert(context);
  } finally {
    busy = false;
  }
}

async function runCommand(context, command, acknowledge = true) {
  if (!command) return showAlert(context);
  try {
    const result = await executeCommand(command);
    if (acknowledge && result !== false) showOk(context);
    await refreshEncoderFeedbacks();
  } catch (error) {
    if (error?.code === "HERDR_CUSTOM_KEYBINDING") {
      setTitle(context, "CUSTOM\nKEYS");
      setTimeout(() => setTitle(context, COMMAND_TITLES[command] ?? "HERDR"), 2000);
    }
    showAlert(context);
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
        await refreshEncoderFeedbacks();
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
    else await runCommand(context, command, false);
  } finally {
    encoderBusy.delete(context);
  }
}

function connectPlugin() {
  socket = new WebSocket(`ws://127.0.0.1:${port}`);

  socket.addEventListener("open", () => {
    send({ event: registerEvent, uuid: pluginUUID });
    send({ event: "getGlobalSettings", context: pluginUUID });
    setInterval(() => refresh().then(() => refreshEncoderFeedbacks()).catch(() => {}), 1000);
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
      return;
    }

    if (![TOGGLE_UUID, COMMAND_UUID, BACK_UUID, ENCODER_UUID].includes(message.action)) return;

    if (message.event === "willAppear") {
      knownDevices.add(message.device);
      contextInfo.set(message.context, {
        action: message.action,
        device: message.device,
        settings: message.payload?.settings ?? {}
      });
      if (message.action === TOGGLE_UUID) toggleContexts.add(message.context);
      if (message.action === COMMAND_UUID) {
        const command = message.payload?.settings?.command;
        setTitle(message.context, COMMAND_TITLES[command] ?? "HERDR");
        setImage(message.context, COMMAND_IMAGES[command] ?? "images/command.svg");
      } else if (message.action === BACK_UUID) {
        setTitle(message.context, "BACK");
      } else if (message.action === ENCODER_UUID) {
        setFeedbackLayout(message.context, "layouts/herdr-dial.json");
        refreshEncoderFeedbacks().catch(() => showAlert(message.context));
      }
      refresh(true).catch(() => showAlert(message.context));
    } else if (message.event === "willDisappear") {
      contextInfo.delete(message.context);
      toggleContexts.delete(message.context);
      agentSelections.delete(message.context);
    } else if (message.event === "keyUp") {
      if (message.action === TOGGLE_UUID) toggle(message.context);
      else if (message.action === COMMAND_UUID) runCommand(message.context, message.payload?.settings?.command);
      else if (message.action === BACK_UUID) returnToPreviousProfile(message.context);
    } else if (message.action === ENCODER_UUID && ["dialRotate", "dialUp", "touchTap"].includes(message.event)) {
      const dial = message.payload?.settings?.dial ?? contextInfo.get(message.context)?.settings?.dial;
      runEncoder(message.context, dial, message.event, message.payload);
    }
  });
}

module.exports = { agentCommandArgs, bindingOverride, encoderCommand, encoderFeedback, herdrExecutable, normalizeTerminal, paneCommandArgs, paneCycleTarget, paneRouteDirections, prefixCommand, selectAgent, terminalForLaunch, terminalIds };
if (require.main === module) connectPlugin();
