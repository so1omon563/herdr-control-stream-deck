// Herdr's snapshot has no machine identity. Keep routing and its provenance together.
const MIN_REMOTE_VERSION = [0, 9, 1];
const RECEIPT = Symbol("Herdr target receipt");

function targetError(code, message) {
  return Object.assign(new Error(message), { code });
}

function normalizeMachineId(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !value.trim() || value.startsWith("-") || /[\x00-\x1f\x7f]/.test(value)) {
    throw targetError("HERDR_TARGET", "Invalid saved machine selection. Select Local or an enabled saved Herdr machine.");
  }
  return value;
}

function targetKey(machineId) {
  return JSON.stringify(machineId === null ? ["local"] : ["machine", machineId]);
}

function scopedKey(target, id) {
  return JSON.stringify([target.key, id]);
}

function machineFingerprint(machine) {
  return JSON.stringify([machine.id, machine.target, machine.session, machine.enabled]);
}

function parseMachines(output) {
  let machines;
  try { machines = JSON.parse(output); } catch {
    throw targetError("HERDR_SCHEMA", "Herdr returned invalid machine-list JSON.");
  }
  const ids = new Set();
  if (!Array.isArray(machines) || machines.some(machine => {
    if (!machine || typeof machine !== "object") return true;
    const valid = ["id", "label", "target", "session"].every(key => typeof machine[key] === "string")
      && machine.id && machine.target && machine.session && typeof machine.enabled === "boolean";
    if (!valid || ids.has(machine.id)) return true;
    try { normalizeMachineId(machine.id); } catch { return true; }
    ids.add(machine.id);
    return false;
  })) throw targetError("HERDR_SCHEMA", "Herdr returned an unsupported machine-list schema.");
  return machines.map(({ id, label, target, session, enabled }) => ({ id, label, target, session, enabled }));
}

function requireRemoteVersion(output) {
  const version = output.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  const actual = version?.slice(1).map(Number);
  if (!actual || actual.some((value, index) => value < MIN_REMOTE_VERSION[index]
    && actual.slice(0, index).every((previous, i) => previous === MIN_REMOTE_VERSION[i]))) {
    throw targetError("HERDR_VERSION", "Remote control requires local Herdr 0.9.1 or later and a compatible remote Herdr server.");
  }
}

function classifyTargetError(error, remote = true) {
  if (error?.code?.startsWith?.("HERDR_")) return error;
  const message = `${error?.message ?? ""}\n${error?.stderr ?? ""}`;
  let code = "HERDR_UNAVAILABLE";
  if (/permission denied|authentication|publickey|host key verification|REMOTE HOST IDENTIFICATION|passphrase|password:/i.test(message)) code = "HERDR_AUTH";
  else if (/version|protocol mismatch|incompatible|unexpected argument.*--machine|unrecognized.*machine|unknown.*machine.*subcommand/i.test(message)) code = "HERDR_VERSION";
  else if (/unknown machine|machine.*(?:not found|disabled)|no.*machine.*match|ambiguous.*machine/i.test(message)) code = "HERDR_TARGET";
  else if (/timed out|timeout|connection refused|could not resolve|no route|network|connection.*(?:closed|reset)|unreachable|broken pipe|ssh.*exit/i.test(message)) code = "HERDR_OFFLINE";
  return targetError(code, remote ? `Remote Herdr unavailable: ${message.trim()}` : `Local Herdr unavailable: ${message.trim()}`);
}

function targetFeedback(error) {
  return {
    HERDR_AUTH: { title: "AUTH\nREQUIRED", detail: "Check this machine's OpenSSH authentication and host key in your terminal." },
    HERDR_VERSION: { title: "VERSION\nMISMATCH", detail: "Remote control needs Herdr 0.9.1+ locally and a compatible remote server." },
    HERDR_TARGET: { title: "CHECK\nMACHINE", detail: "Select an enabled saved Herdr machine, or explicitly select Local." },
    HERDR_OFFLINE: { title: "REMOTE\nOFFLINE", detail: "The selected remote machine could not be reached." },
    HERDR_SCHEMA: { title: "VERSION\nMISMATCH", detail: "Herdr returned an unsupported response. Check both Herdr versions." },
    HERDR_UNAVAILABLE: { title: "HERDR\nUNAVAILABLE", detail: "Could not read the selected Herdr session." },
    HERDR_REMOTE_UNSUPPORTED: { title: "LOCAL\nONLY", detail: "This first remote version supports agent browsing and focus only." },
    HERDR_STALE: { title: "TARGET\nCHANGED", detail: "The machine selection changed. Press again on the selected target." }
  }[error?.code] ?? null;
}

function createTargetRouter({ run, executable, now = Date.now }) {
  let selection = { machineId: null, key: targetKey(null), generation: 0 };
  let selectionError;
  let machineCache;
  let machineRequest;
  let machineFailure;
  let machineFailures = 0;
  let machineRetryAt = 0;
  let versionCheckedAt = -Infinity;
  let queue = Promise.resolve();
  let snapshotFlight;
  let lastSnapshot;
  let failure;
  let failures = 0;
  let retryAt = 0;

  const capture = () => ({ ...selection });
  const isCurrent = target => target.generation === selection.generation && target.key === selection.key;
  const assertCurrent = target => {
    if (!isCurrent(target)) throw targetError("HERDR_STALE", "Machine selection changed during the request.");
    if (selectionError) throw selectionError;
  };
  const select = value => {
    let machineId;
    let error;
    try { machineId = normalizeMachineId(value); } catch (cause) { error = cause; machineId = "<invalid>"; }
    const key = error ? "invalid" : targetKey(machineId);
    if (key === selection.key && Boolean(error) === Boolean(selectionError)) return false;
    selection = { machineId, key, generation: selection.generation + 1 };
    selectionError = error;
    lastSnapshot = null;
    failure = null;
    failures = 0;
    retryAt = 0;
    return true;
  };
  const serialize = task => {
    const result = queue.then(task, task);
    queue = result.catch(() => {});
    return result;
  };
  const checkVersion = async () => {
    if (now() - versionCheckedAt < 30000) return;
    requireRemoteVersion(await run(executable(), ["--version"], 5000));
    versionCheckedAt = now();
  };
  const listMachines = async (force = false) => {
    if (machineRequest) return machineRequest;
    if (!force && machineFailure && now() < machineRetryAt) throw machineFailure;
    if (!force && machineCache && now() - machineCache.at < 30000) return machineCache.machines;
    machineRequest = (async () => {
      try {
        await checkVersion();
        const machines = parseMachines(await run(executable(), ["machine", "list", "--json"], 5000));
        machineCache = { at: now(), machines };
        machineFailure = null;
        machineFailures = 0;
        return machines;
      } catch (error) {
        machineFailure = classifyTargetError(error);
        machineFailures += 1;
        machineRetryAt = now() + Math.min(30000, 1000 * 2 ** Math.min(machineFailures, 5));
        throw machineFailure;
      }
    })();
    try { return await machineRequest; } finally { machineRequest = null; }
  };
  const resolveMachine = async (target, force = false) => {
    assertCurrent(target);
    if (target.machineId === null) return null;
    const machine = (await listMachines(force)).find(item => item.id === target.machineId);
    assertCurrent(target);
    if (!machine?.enabled) throw targetError("HERDR_TARGET", "The selected Herdr machine is missing or disabled. It was not replaced with Local.");
    return machine;
  };
  const args = (target, command) => target.machineId === null ? command : ["--machine", target.machineId, ...command];
  const snapshot = async (target = capture(), { fresh = false } = {}) => {
    assertCurrent(target);
    if (!fresh && lastSnapshot && now() - lastSnapshot.at < (target.machineId === null ? 800 : 2000)) return lastSnapshot.state;
    if (failure && now() < retryAt) throw failure;
    if (!fresh && snapshotFlight?.generation === target.generation) return snapshotFlight.promise;
    const promise = serialize(async () => {
      assertCurrent(target);
      try {
        const machine = await resolveMachine(target);
        assertCurrent(target);
        const output = await run(executable(), args(target, ["api", "snapshot"]), 10000);
        assertCurrent(target);
        let state;
        try { state = JSON.parse(output)?.result?.snapshot; } catch {}
        if (!state || !["agents", "workspaces", "tabs", "panes"].every(key => Array.isArray(state[key]))
          || state.agents.some(agent => typeof agent?.pane_id !== "string" || !agent.pane_id)) {
          throw targetError("HERDR_SCHEMA", "Herdr returned an unsupported snapshot response.");
        }
        Object.defineProperty(state, RECEIPT, { value: { target, machine } });
        lastSnapshot = { state, at: now() };
        failure = null;
        failures = 0;
        retryAt = 0;
        return state;
      } catch (error) {
        if (!isCurrent(target)) throw targetError("HERDR_STALE", "Discarded response from a previous machine selection.");
        failure = classifyTargetError(error, target.machineId !== null);
        failures += 1;
        retryAt = now() + Math.min(30000, 1000 * 2 ** Math.min(failures, 5));
        lastSnapshot = null;
        throw failure;
      }
    });
    snapshotFlight = { generation: target.generation, promise };
    try { return await promise; } finally {
      if (snapshotFlight?.promise === promise) snapshotFlight = null;
    }
  };
  const focusAgent = async (state, paneId, prepareClient = async () => {}) => {
    const receipt = state?.[RECEIPT];
    if (!receipt || !state.agents.some(agent => agent.pane_id === paneId)) throw targetError("HERDR_STALE", "Agent does not belong to the current snapshot.");
    const { target, machine: previous } = receipt;
    return serialize(async () => {
      assertCurrent(target);
      const machine = await resolveMachine(target, true);
      if (machine && machineFingerprint(machine) !== machineFingerprint(previous)) {
        lastSnapshot = null;
        throw targetError("HERDR_TARGET", "The saved machine changed. Refresh its agents before focusing.");
      }
      await prepareClient(machine, () => assertCurrent(target));
      assertCurrent(target);
      // Opening a terminal can take seconds. Re-read the profile before sending IDs.
      if (machine && machineFingerprint(await resolveMachine(target, true)) !== machineFingerprint(machine)) {
        lastSnapshot = null;
        throw targetError("HERDR_TARGET", "The saved machine changed while opening its terminal. Refresh before focusing.");
      }
      // Focus is never retried: a timeout may still have completed on the remote server.
      assertCurrent(target);
      try { await run(executable(), args(target, ["agent", "focus", paneId]), 10000); }
      catch (error) { assertCurrent(target); throw classifyTargetError(error, target.machineId !== null); }
      assertCurrent(target);
      lastSnapshot = null;
    });
  };
  return { capture, select, isCurrent, assertCurrent, snapshot, focusAgent, listMachines, resolveMachine,
    invalidate: () => { lastSnapshot = null; },
    isRemote: () => selection.machineId !== null || Boolean(selectionError) };
}

module.exports = { createTargetRouter, normalizeMachineId, parseMachines, requireRemoteVersion, targetKey, scopedKey, machineFingerprint, classifyTargetError, targetFeedback, targetError };
