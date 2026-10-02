const path = require("node:path");

const SUPPORTED_TERMINALS = new Set(["ghostty", "kitty", "iterm", "terminal"]);
const MACHINE_ID = /^[0-9a-f]{32}$/;
const TTY = /^\/?(?:dev\/)?(tty[a-zA-Z0-9]+)$/;
const PROCESS_NAMES = { ghostty: "ghostty", kitty: "kitty" };

function staleTargetError() {
  const error = new Error("Remote HERDR target changed before terminal routing completed");
  error.code = "HERDR_STALE";
  return error;
}

function assertCurrent(isCurrent) {
  if (isCurrent() !== true) throw staleTargetError();
}

function validArgument(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 4096 && !/[\x00-\x1f\x7f]/.test(value);
}

/** Saved-machine IDs are identity, while target and session are opaque CLI values. */
function remoteTuiArgs(machine) {
  if (!machine || !MACHINE_ID.test(machine.id ?? "") || !validTarget(machine.target) || !validSession(machine.session)) {
    throw new Error("Invalid saved remote HERDR machine");
  }
  // v0.9.3's custom session parser consumes its next argument unconditionally,
  // including valid dash-prefixed session names (src/session.rs:54-81).
  return ["--remote", machine.target, "--session", machine.session];
}

function validTarget(value) {
  return validArgument(value) && Buffer.byteLength(value, "utf8") <= 1024
    && !value.startsWith("-") && !/^ssh:\/\/[^/]*:[^/@]*@/i.test(value);
}

function validSession(value) {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(value) && value !== "." && value !== "..";
}

function validateRequest(request) {
  const machineId = request.machineId ?? request.machine?.id;
  const args = request.args ?? remoteTuiArgs(request.machine);
  if (!MACHINE_ID.test(machineId ?? "") || !Array.isArray(args) || args.length !== 4
      || args[0] !== "--remote" || args[2] !== "--session" || !validTarget(args[1]) || !validSession(args[3])) {
    throw new Error("Invalid remote HERDR terminal arguments");
  }
  if (typeof request.isCurrent !== "function") throw new Error("Remote terminal routing requires a current-target guard");
  return { machineId, args: [...args] };
}

function normalizeTty(value) {
  return typeof value === "string" ? (value.trim().match(TTY)?.[1] ?? null) : null;
}

/**
 * macOS ps has no NUL-delimited argv interface. Only cache clients when all
 * command atoms can be compared without whitespace/quoting ambiguity. Opaque
 * saved values remain supported for launch, but ambiguous identities are never
 * reused. No shell splitting, substring matching, or label matching is used.
 */
function comparableArgv(argv) {
  return argv.every(value => validArgument(value) && !/[\s'"\\]/u.test(value));
}

function parseProcessTable(output) {
  const records = [];
  for (const line of String(output).split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/);
    if (!match) continue;
    records.push({ pid: match[1], ppid: match[2], tty: normalizeTty(match[3]), started: match[4].replace(/\s+/g, " "), command: match[5] });
  }
  return records;
}

function processIdentity(record) {
  return record ? `${record.pid}:${record.started}` : null;
}

function descendants(records, pid) {
  const found = [];
  const pending = [pid];
  const seen = new Set(pending);
  while (pending.length) {
    const parent = pending.pop();
    for (const record of records) {
      if (record.ppid !== parent || seen.has(record.pid)) continue;
      seen.add(record.pid);
      found.push(record);
      pending.push(record.pid);
    }
  }
  return found;
}

function launchScript(terminal) {
  const body = terminal === "terminal" ? [
    'tell application "Terminal"',
    "set newTab to do script herdrCommand",
    "activate",
    "return tty of newTab",
    "end tell"
  ] : [
    'tell application "iTerm2"',
    "set newWindow to create window with default profile command herdrCommand",
    "tell newWindow to select",
    "activate",
    "return tty of current session of newWindow",
    "end tell"
  ];
  return [
    "on run argv",
    'set herdrCommand to "exec /usr/bin/env -u NO_COLOR -u HERDR_REMOTE_BINARY"',
    "repeat with argument in argv",
    'set herdrCommand to herdrCommand & " " & quoted form of (argument as text)',
    "end repeat",
    ...body,
    "end run"
  ].join("\n");
}

function focusScript(terminal) {
  if (terminal === "ghostty" || terminal === "kitty") {
    return [
      "on run argv",
      "set targetPID to (item 1 of argv) as integer",
      'tell application "System Events"',
      "set frontmost of first application process whose unix id is targetPID to true",
      "end tell",
      "end run"
    ].join("\n");
  }
  const body = terminal === "terminal" ? [
    "repeat with w in windows",
    "repeat with t in tabs of w",
    "if tty of t is targetTTY then",
    "set selected of t to true",
    "set frontmost of w to true",
    "set miniaturized of w to false",
    "activate",
    'return "focused"',
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
    'return "focused"',
    "end if",
    "end repeat",
    "end repeat",
    "end repeat"
  ];
  return [
    "on run argv",
    "set targetTTY to item 1 of argv",
    `tell application "${terminal === "terminal" ? "Terminal" : "iTerm2"}"`,
    ...body,
    "end tell",
    'error "Remote HERDR terminal session not found"',
    "end run"
  ].join("\n");
}

function matchingClient(records, { terminal, tty, expectedHerdr, expectedTerminal, previous }) {
  if (terminal === "terminal" || terminal === "iterm") {
    const matches = records.filter(record => record.tty === tty && record.command === expectedHerdr);
    if (matches.length !== 1 || previous.has(processIdentity(matches[0]))) return null;
    return { terminal, id: `/dev/${tty}`, herdr: matches[0] };
  }
  const matches = [];
  for (const parent of records.filter(record => record.command === expectedTerminal && !previous.has(processIdentity(record)))) {
    const children = descendants(records, parent.pid);
    const herdr = children.filter(record => record.command === expectedHerdr && record.tty);
    const ttys = new Set(children.map(record => record.tty).filter(Boolean));
    // A process with several terminal sessions cannot safely be brought forward:
    // another tab may contain a local HERDR client. Create a fresh window instead.
    if (herdr.length === 1 && ttys.size === 1 && ttys.has(herdr[0].tty)) {
      matches.push({ terminal, id: parent.pid, process: parent, herdr: herdr[0] });
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

function revalidateClient(client, records, expectedHerdr, expectedTerminal) {
  const herdr = records.find(record => processIdentity(record) === processIdentity(client.herdr));
  if (!herdr || herdr.command !== expectedHerdr || herdr.tty !== client.herdr.tty) return false;
  if (client.terminal === "terminal" || client.terminal === "iterm") {
    return records.filter(record => record.tty === herdr.tty && record.command === expectedHerdr).length === 1;
  }
  const parent = records.find(record => processIdentity(record) === processIdentity(client.process));
  if (!parent || parent.command !== expectedTerminal) return false;
  const children = descendants(records, parent.pid);
  const ttys = new Set(children.map(record => record.tty).filter(Boolean));
  return children.some(record => processIdentity(record) === processIdentity(herdr))
    && children.filter(record => record.command === expectedHerdr).length === 1
    && ttys.size === 1 && ttys.has(herdr.tty);
}

/**
 * Uses injected plugin primitives and only reuses launches owned by this
 * controller. open() is serialized so repeated presses cannot duplicate a
 * still-starting client. isCurrent must check the caller's target/generation.
 * An already-dispatched macOS command cannot be undone; a stale completion
 * never causes a subsequent focus, launch, cache update, or successful result.
 */
function createRemoteTerminalController({ run, herdrExecutable, terminalForLaunch, terminalApp, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), captureAttempts = 8, captureDelayMs = 100 } = {}) {
  if (![run, herdrExecutable, terminalForLaunch, terminalApp, sleep].every(value => typeof value === "function")) {
    throw new Error("Remote terminal controller requires terminal primitives");
  }
  const clients = new Map();
  let queue = Promise.resolve();

  async function readProcesses(isCurrent) {
    assertCurrent(isCurrent);
    const output = await run("/bin/ps", ["-ww", "-axo", "pid=,ppid=,tty=,lstart=,command="], 5000);
    assertCurrent(isCurrent);
    const records = parseProcessTable(output);
    if (!records.length) throw new Error("Could not read remote terminal process identities");
    return records;
  }

  async function openCurrent(request, findOnly = false) {
    const { machineId, args } = validateRequest(request);
    const { isCurrent } = request;
    assertCurrent(isCurrent);
    const terminal = await terminalForLaunch(request.terminalPreference ?? "auto");
    assertCurrent(isCurrent);
    if (!SUPPORTED_TERMINALS.has(terminal)) throw new Error("Unsupported remote HERDR terminal");
    const binary = herdrExecutable();
    if (!validArgument(binary) || !path.isAbsolute(binary)) throw new Error("Invalid HERDR executable");
    const app = terminalApp(terminal);
    if (!validArgument(app) || !path.isAbsolute(app)) throw new Error("Invalid terminal application");
    const herdrArgv = [binary, ...args];
    // Apply this to the command inside the terminal, not just `open`: macOS
    // application launch environment inheritance is not a sufficient boundary.
    // HERDR_REMOTE_BINARY explicitly requests remote payload installation.
    // Ordinary --remote may still show bootstrap/upgrade/authentication prompts;
    // those remain interactive for the user. This module never answers them.
    const childArgv = ["/usr/bin/env", "-u", "NO_COLOR", "-u", "HERDR_REMOTE_BINARY", ...herdrArgv];
    const processArgv = terminal === "ghostty" || terminal === "kitty"
      ? [path.join(app, "Contents", "MacOS", PROCESS_NAMES[terminal]), ...(terminal === "ghostty" ? ["-e"] : []), ...childArgv]
      : null;
    const expectedHerdr = herdrArgv.join(" ");
    const expectedTerminal = processArgv?.join(" ");
    const canCapture = comparableArgv(herdrArgv) && (!processArgv || comparableArgv(processArgv));
    const key = JSON.stringify([machineId, terminal, herdrArgv, app]);
    const cached = clients.get(key);
    let records = [];
    let hasBaseline = false;
    // Inability to inspect processes is an identity failure, not permission to
    // focus broadly. A new dedicated terminal may still be launched safely.
    if (canCapture) {
      try { records = await readProcesses(isCurrent); hasBaseline = true; }
      catch (error) { if (error.code === "HERDR_STALE") throw error; }
    }
    assertCurrent(isCurrent);
    if (cached && revalidateClient(cached, records, expectedHerdr, expectedTerminal)) {
      if (findOnly) return { terminal, id: cached.id };
      assertCurrent(isCurrent);
      await run("/usr/bin/osascript", ["-e", focusScript(terminal), cached.id], 5000);
      assertCurrent(isCurrent);
      return { launched: false, client: { terminal, id: cached.id } };
    }
    clients.delete(key);
    if (findOnly) return null;
    const previous = new Set(records.map(processIdentity));
    let tty = null;
    assertCurrent(isCurrent);
    if (processArgv) {
      const launchArgs = ["-u", "NO_COLOR", "-u", "HERDR_REMOTE_BINARY", "/usr/bin/open", "-na", app, "--args", ...(terminal === "ghostty" ? ["-e"] : []), ...childArgv];
      await run("/usr/bin/env", launchArgs, 15000);
    } else {
      tty = normalizeTty(await run("/usr/bin/osascript", ["-e", launchScript(terminal), ...herdrArgv], 15000));
    }
    assertCurrent(isCurrent);
    let client = null;
    if (canCapture && hasBaseline && (processArgv || tty)) {
      for (let attempt = 0; attempt < captureAttempts; attempt += 1) {
        if (attempt > 0) {
          await sleep(captureDelayMs);
          assertCurrent(isCurrent);
        }
        try {
          records = await readProcesses(isCurrent);
          client = matchingClient(records, { terminal, tty, expectedHerdr, expectedTerminal, previous });
        } catch (error) {
          if (error.code === "HERDR_STALE") throw error;
          break;
        }
        if (client) break;
      }
    }
    assertCurrent(isCurrent);
    if (client) clients.set(key, client);
    return { launched: true, client: client ? { terminal, id: client.id } : null };
  }

  return {
    open(request) {
      // Copy mutable arguments at invocation, before a queued request can wait.
      const snapshot = { ...request, args: request?.args && [...request.args], machine: request?.machine && { ...request.machine } };
      const operation = queue.then(() => openCurrent(snapshot));
      queue = operation.catch(() => {});
      return operation;
    },
    find(request) {
      const snapshot = { ...request, args: request?.args && [...request.args], machine: request?.machine && { ...request.machine } };
      const operation = queue.then(() => openCurrent(snapshot, true));
      queue = operation.catch(() => {});
      return operation;
    },
    clear() { clients.clear(); }
  };
}

module.exports = { createRemoteTerminalController, remoteTuiArgs, parseProcessTable };
