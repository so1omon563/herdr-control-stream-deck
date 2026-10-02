#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test as nodeTest } from "node:test";

// A broken promise/queue regression should fail promptly rather than hang CI.
const test = (name, fn) => nodeTest(name, { timeout: 5000 }, fn);

const require = createRequire(import.meta.url);
const {
  createTargetRouter, normalizeMachineId, parseMachines, requireRemoteVersion,
  targetKey, scopedKey, machineFingerprint, classifyTargetError, targetFeedback, targetError
} = require("../plugin/com.so1omon563.herdr-control.sdPlugin/targets.js");
const { enqueueAgentAttention } = require("../plugin/com.so1omon563.herdr-control.sdPlugin/plugin.js");

// Real saved-machine IDs are 32 hex digits. Names, SSH destinations and sessions
// must never be substituted for the saved ID passed to Herdr.
const A = "0123456789abcdef0123456789abcdef";
const B = "fedcba9876543210fedcba9876543210";
const PANE = "pane-shared-between-machines";
const machine = (id = A, extra = {}) => ({
  id, label: "Same display label", target: id === A ? "alice@home" : "bob@work",
  session: "herdr", enabled: true, ...extra
});
const state = (marker = "snapshot", extra = {}) => ({
  agents: [{ pane_id: PANE, workspace_id: "workspace-shared", status: "waiting" }],
  workspaces: [], tabs: [], panes: [], marker, ...extra
});
const envelope = value => JSON.stringify({ result: { snapshot: value } });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const hasCode = code => error => {
  assert.equal(error?.code, code);
  return true;
};
const offline = () => Object.assign(new Error("Command failed"), { stderr: "ssh: connection timed out" });

function fixture({ selected = null, version = "herdr 0.9.3", machines = [machine(), machine(B)] } = {}) {
  let time = 100000;
  const calls = [];
  const handlers = {};
  const config = { version, machines };
  const run = async (file, argv, timeout) => {
    const args = [...argv];
    const remote = args[0] === "--machine" ? args[1] : null;
    const command = remote === null ? args : args.slice(2);
    const kind = command[0] === "--version" ? "version"
      : command.join(" ") === "machine list --json" ? "machines"
      : command.join(" ") === "api snapshot" ? "snapshot"
      : command[0] === "agent" && command[1] === "focus" ? "focus" : "unexpected";
    const call = { file, args, command, remote, kind, timeout, time };
    calls.push(call);
    if (handlers[kind]) return handlers[kind](call);
    if (kind === "version") return config.version;
    if (kind === "machines") return JSON.stringify(config.machines);
    if (kind === "snapshot") return envelope(state(remote ?? "local"));
    if (kind === "focus") return "";
    assert.fail(`Unexpected command: ${JSON.stringify(args)}`);
  };
  const router = createTargetRouter({ run, executable: () => "/mock/herdr", now: () => time });
  router.select(selected);
  return {
    router, calls, handlers, config,
    of: kind => calls.filter(call => call.kind === kind),
    advance: amount => { time += amount; },
    setTime: value => { time = value; }
  };
}

for (const [version, compatible] of [
  ["0.8.2", false], ["0.9.0", false], ["0.9.1", true], ["0.9.3", true], ["0.10.0", true], ["1.0.0", true]
]) {
  test(`remote minimum-version gate handles ${version}`, async () => {
    const f = fixture({ selected: A, version: `herdr ${version}` });
    if (compatible) {
      assert.doesNotThrow(() => requireRemoteVersion(`herdr ${version}`));
      assert.equal((await f.router.snapshot()).marker, A);
      assert.equal(f.of("machines").length, 1);
      assert.equal(f.of("snapshot").length, 1);
    } else {
      assert.throws(() => requireRemoteVersion(`herdr ${version}`), hasCode("HERDR_VERSION"));
      await assert.rejects(f.router.snapshot(), hasCode("HERDR_VERSION"));
      assert.deepEqual(f.calls.map(call => call.args), [["--version"]]);
    }
  });
}

test("unparseable version output fails closed before discovery or remote calls", async () => {
  for (const version of ["", "herdr unknown", "herdr 0.9", "herdr 0.8.99"]) {
    const f = fixture({ selected: A, version });
    await assert.rejects(f.router.snapshot(), hasCode("HERDR_VERSION"));
    assert.equal(f.calls.length, 1);
  }
});

test("only undefined and null mean Local; malformed saved values never invoke Herdr", async () => {
  for (const value of [undefined, null]) assert.equal(normalizeMachineId(value), null);
  assert.equal(normalizeMachineId(A), A);
  for (const value of ["", " ", "\n", "-machine", "a\0b", 0, false, [], {}, { id: A }]) {
    assert.throws(() => normalizeMachineId(value), hasCode("HERDR_TARGET"));
    const f = fixture();
    f.router.select(value);
    assert.equal(f.router.isRemote(), true);
    await assert.rejects(f.router.snapshot(), hasCode("HERDR_TARGET"));
    assert.equal(f.calls.length, 0);
  }
});

test("machine discovery accepts the upstream top-level array schema and stable IDs", () => {
  const saved = [machine(A, { extra: "ignored" }), machine(B, { enabled: false })];
  const parsed = parseMachines(JSON.stringify(saved));
  assert.deepEqual(parsed, [machine(), machine(B, { enabled: false })]);
  assert.notStrictEqual(parsed, saved);
  assert.deepEqual(parseMachines("[]"), []);
});

test("machine discovery rejects malformed JSON, wrappers, missing fields and duplicate IDs", () => {
  for (const value of [null, {}, { machines: [machine()] }, { result: [machine()] }, [null], [1], ["machine"],
    [machine(), machine()], [machine(A, { enabled: "true" })], [machine(A, { target: "" })],
    [machine(A, { session: "" })], [machine(A, { label: null })], [machine(A, { id: "-option" })]]) {
    assert.throws(() => parseMachines(JSON.stringify(value)), hasCode("HERDR_SCHEMA"));
  }
  for (const key of ["id", "label", "target", "session", "enabled"]) {
    const invalid = machine();
    delete invalid[key];
    assert.throws(() => parseMachines(JSON.stringify([invalid])), hasCode("HERDR_SCHEMA"));
  }
  assert.throws(() => parseMachines("not JSON"), hasCode("HERDR_SCHEMA"));
});

test("error categories distinguish SSH auth, versions, missing machines and transport", () => {
  const examples = {
    HERDR_AUTH: ["Permission denied (publickey).", "Host key verification failed", "REMOTE HOST IDENTIFICATION HAS CHANGED!", "Enter passphrase", "password:"],
    HERDR_VERSION: ["protocol mismatch", "incompatible version", "unexpected argument '--machine'", "unrecognized option machine", "unknown machine subcommand"],
    HERDR_TARGET: ["unknown machine: old", "machine not found", "machine is disabled", "no saved machine matches", "ambiguous machine"],
    HERDR_OFFLINE: ["Connection timed out", "connection refused", "Could not resolve hostname", "No route to host", "connection reset", "network unreachable", "broken pipe", "ssh exit 255"],
    HERDR_UNAVAILABLE: ["Herdr executable not found", "unexpected backend error"]
  };
  for (const [code, messages] of Object.entries(examples)) for (const stderr of messages) {
    const result = classifyTargetError(Object.assign(new Error("Command failed"), { stderr }));
    assert.equal(result.code, code, stderr);
    assert.match(result.message, /^Remote Herdr unavailable:/);
    assert.ok(targetFeedback(result)?.title);
    assert.ok(targetFeedback(result)?.detail);
  }
  const existing = targetError("HERDR_STALE", "stale");
  assert.strictEqual(classifyTargetError(existing), existing);
  assert.match(classifyTargetError(new Error("failed"), false).message, /^Local Herdr unavailable:/);
  for (const code of ["HERDR_SCHEMA", "HERDR_REMOTE_UNSUPPORTED", "HERDR_STALE"]) assert.ok(targetFeedback({ code }));
  assert.equal(targetFeedback({ code: "unknown" }), null);
});

test("missing or disabled saved IDs never fall back to Local or same-label machines", async () => {
  for (const machines of [[], [machine(B)], [machine(A, { enabled: false }), machine(B)]]) {
    const f = fixture({ selected: A, machines });
    await assert.rejects(f.router.snapshot(), hasCode("HERDR_TARGET"));
    assert.equal(f.router.capture().machineId, A);
    assert.equal(f.of("snapshot").length, 0);
    assert.equal(f.of("focus").length, 0);
    assert.deepEqual(f.calls.map(call => call.args), [["--version"], ["machine", "list", "--json"]]);
  }
});

test("Local keeps the original CLI arguments and never requires remote capabilities", async () => {
  const f = fixture({ version: "herdr 0.8.2" });
  const current = await f.router.snapshot();
  let prepared = false;
  await f.router.focusAgent(current, PANE, async (selected, assertCurrent) => {
    assert.equal(selected, null);
    assertCurrent();
    prepared = true;
  });
  assert.equal(prepared, true);
  assert.deepEqual(f.calls.map(call => call.args), [["api", "snapshot"], ["agent", "focus", PANE]]);
  assert.ok(f.calls.every(call => call.file === "/mock/herdr" && call.timeout === 10000));
});

test("remote snapshot and focus route exclusively through the selected saved ID", async () => {
  const f = fixture({ selected: A });
  const current = await f.router.snapshot();
  const preparation = [];
  await f.router.focusAgent(current, PANE, async (selected, assertCurrent) => {
    assertCurrent();
    assert.equal(f.of("focus").length, 0, "client is prepared before focus is dispatched");
    preparation.push(selected);
  });
  assert.deepEqual(preparation, [machine()]);
  assert.deepEqual(f.of("snapshot")[0].args, ["--machine", A, "api", "snapshot"]);
  assert.deepEqual(f.of("focus")[0].args, ["--machine", A, "agent", "focus", PANE]);
  assert.ok(f.of("machines").length >= 2, "focus revalidates saved-machine configuration");
  assert.ok(f.calls.filter(call => ["version", "machines"].includes(call.kind)).every(call => call.timeout === 5000));
});

test("selection generations distinguish identical keys after ABA switches", () => {
  const f = fixture();
  const local = f.router.capture();
  assert.equal(f.router.select(undefined), false);
  assert.equal(f.router.select(A), true);
  const firstA = f.router.capture();
  assert.equal(f.router.select(A), false);
  assert.equal(f.router.select(B), true);
  assert.equal(f.router.select(A), true);
  const secondA = f.router.capture();
  assert.equal(firstA.key, secondA.key);
  assert.notEqual(firstA.generation, secondA.generation);
  assert.equal(f.router.isCurrent(firstA), false);
  assert.throws(() => f.router.assertCurrent(firstA), hasCode("HERDR_STALE"));
  f.router.select(null);
  assert.equal(f.router.isCurrent(local), false);
});

test("scoped keys isolate identical pane, workspace, device and context IDs across targets", () => {
  const targets = [null, A, B, "local", "[\"local\"]"].map(machineId => ({ key: targetKey(machineId) }));
  for (const id of [PANE, "workspace-shared", "device", "context", "a:b", '["quoted"]']) {
    assert.equal(new Set(targets.map(target => scopedKey(target, id))).size, targets.length);
  }
  const selections = new Map(targets.map((target, index) => [scopedKey(target, PANE), index]));
  assert.deepEqual(targets.map(target => selections.get(scopedKey(target, PANE))), [0, 1, 2, 3, 4]);
  assert.notEqual(scopedKey({ key: "a:b" }, "c"), scopedKey({ key: "a" }, "b:c"));
  assert.equal(machineFingerprint(machine()), machineFingerprint(machine(A, { label: "renamed" })));
  for (const change of [{ target: "other@host" }, { session: "other" }, { enabled: false }, { id: B }]) {
    assert.notEqual(machineFingerprint(machine()), machineFingerprint(machine(A, change)));
  }
});

test("snapshot responses require the upstream envelope, all arrays and nonempty agent pane IDs", async () => {
  const invalid = ["not JSON", "null", JSON.stringify(state()), JSON.stringify({ snapshot: state() }), envelope(null),
    envelope({}), ...["agents", "workspaces", "tabs", "panes"].flatMap(key => [envelope(state("bad", { [key]: {} })), envelope(state("bad", { [key]: null }))]),
    ...[null, {}, { pane_id: "" }, { pane_id: 42 }].map(agent => envelope(state("bad", { agents: [agent] })))];
  for (const response of invalid) {
    const f = fixture({ selected: A });
    f.handlers.snapshot = () => response;
    await assert.rejects(f.router.snapshot(), hasCode("HERDR_SCHEMA"));
    assert.equal(f.of("snapshot").length, 1);
    assert.equal(f.of("focus").length, 0);
  }
  const f = fixture();
  f.handlers.snapshot = () => envelope(state("empty", { agents: [] }));
  assert.deepEqual((await f.router.snapshot()).agents, []);
});

test("focus refuses forged snapshots, missing pane IDs and detached JSON copies", async () => {
  const f = fixture({ selected: A });
  const current = await f.router.snapshot();
  for (const candidate of [null, state(), JSON.parse(JSON.stringify(current))]) {
    await assert.rejects(f.router.focusAgent(candidate, PANE), hasCode("HERDR_STALE"));
  }
  await assert.rejects(f.router.focusAgent(current, "not-in-snapshot"), hasCode("HERDR_STALE"));
  assert.equal(f.of("focus").length, 0);
});

test("simultaneous remote snapshot polls share one discovery and one request", async () => {
  const f = fixture({ selected: A });
  const entered = deferred(), result = deferred();
  f.handlers.snapshot = () => { entered.resolve(); return result.promise; };
  const requests = Array.from({ length: 30 }, () => f.router.snapshot());
  await entered.promise;
  assert.equal(f.of("version").length, 1);
  assert.equal(f.of("machines").length, 1);
  assert.equal(f.of("snapshot").length, 1);
  result.resolve(envelope(state("shared")));
  const results = await Promise.all(requests);
  assert.ok(results.every(value => value === results[0]));
});

test("machine discovery is single-flight, cached for 30 seconds and explicitly refreshable", async () => {
  const f = fixture();
  const entered = deferred(), result = deferred();
  f.handlers.machines = () => { entered.resolve(); return result.promise; };
  const requests = Array.from({ length: 12 }, () => f.router.listMachines());
  await entered.promise;
  assert.equal(f.of("version").length, 1);
  assert.equal(f.of("machines").length, 1);
  result.resolve(JSON.stringify([machine()]));
  const results = await Promise.all(requests);
  assert.ok(results.every(value => value === results[0]));
  delete f.handlers.machines;
  f.advance(29999);
  await f.router.listMachines();
  assert.equal(f.of("machines").length, 1);
  await f.router.listMachines(true);
  assert.equal(f.of("machines").length, 2);
  assert.equal(f.of("version").length, 1, "forced discovery does not redundantly repeat a fresh version check");
  f.advance(30000);
  await f.router.listMachines();
  assert.equal(f.of("machines").length, 3);
  assert.equal(f.of("version").length, 2);
});

for (const [selected, ttl] of [[null, 800], [A, 2000]]) {
  test(`${selected === null ? "Local" : "remote"} snapshot cache expires exactly at ${ttl} ms`, async () => {
    const f = fixture({ selected });
    const first = await f.router.snapshot();
    f.advance(ttl - 1);
    assert.strictEqual(await f.router.snapshot(), first);
    assert.equal(f.of("snapshot").length, 1);
    f.advance(1);
    assert.notStrictEqual(await f.router.snapshot(), first);
    assert.equal(f.of("snapshot").length, 2);
    f.router.invalidate();
    await f.router.snapshot();
    assert.equal(f.of("snapshot").length, 3);
  });
}

test("remote failure retries use bounded backoff and successful recovery resets it", async () => {
  const f = fixture({ selected: A });
  f.handlers.snapshot = () => { throw offline(); };
  for (const [index, delay] of [2000, 4000, 8000, 16000, 30000, 30000, 30000].entries()) {
    await assert.rejects(f.router.snapshot(), hasCode("HERDR_OFFLINE"));
    assert.equal(f.of("snapshot").length, index + 1);
    f.advance(delay - 1);
    await assert.rejects(f.router.snapshot(), hasCode("HERDR_OFFLINE"));
    assert.equal(f.of("snapshot").length, index + 1, "polling during backoff must not launch SSH again");
    f.advance(1);
  }
  delete f.handlers.snapshot;
  await f.router.snapshot();
  f.router.invalidate();
  f.handlers.snapshot = () => { throw offline(); };
  await assert.rejects(f.router.snapshot(), hasCode("HERDR_OFFLINE"));
  const calls = f.of("snapshot").length;
  f.advance(1999);
  await assert.rejects(f.router.snapshot(), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("snapshot").length, calls);
  f.advance(1);
  await assert.rejects(f.router.snapshot(), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("snapshot").length, calls + 1);
  assert.ok(f.of("snapshot").every(call => call.remote === A));
});

test("simultaneous failing polls share one error and switching bypasses only the old target backoff", async () => {
  const f = fixture({ selected: A });
  const entered = deferred(), result = deferred();
  f.handlers.snapshot = () => { entered.resolve(); return result.promise; };
  const requests = Array.from({ length: 20 }, () => f.router.snapshot());
  const settled = Promise.allSettled(requests);
  await entered.promise;
  result.reject(offline());
  const outcomes = await settled;
  assert.equal(f.of("snapshot").length, 1);
  assert.ok(outcomes.every(outcome => outcome.status === "rejected" && outcome.reason === outcomes[0].reason));
  delete f.handlers.snapshot;
  f.router.select(B);
  assert.equal((await f.router.snapshot()).marker, B);
  assert.deepEqual(f.of("snapshot").map(call => call.remote), [A, B]);
});

for (const [from, to] of [[null, A], [A, null], [A, B]]) for (const failure of [false, true]) {
  test(`in-flight ${from ?? "Local"} → ${to ?? "Local"} discards stale ${failure ? "failure" : "success"}`, async () => {
    const f = fixture({ selected: from });
    const entered = deferred(), result = deferred();
    let first = true;
    f.handlers.snapshot = call => {
      if (first) { first = false; entered.resolve(); return result.promise; }
      return envelope(state(call.remote ?? "local"));
    };
    const old = f.router.snapshot();
    const rejected = assert.rejects(old, hasCode("HERDR_STALE"));
    await entered.promise;
    f.router.select(to);
    const fresh = f.router.snapshot();
    if (failure) result.reject(offline()); else result.resolve(envelope(state("stale")));
    await rejected;
    const current = await fresh;
    assert.equal(current.marker, to ?? "local");
    assert.strictEqual(await f.router.snapshot(), current, "old completion cannot overwrite the new cache");
    assert.deepEqual(f.of("snapshot").map(call => call.remote), [from, to]);
  });
}

for (const [from, intermediate] of [[A, B], [A, null], [null, A]]) {
  test(`rapid ABA switch from ${from ?? "Local"} rejects old work even after returning`, async () => {
    const f = fixture({ selected: from });
    const entered = deferred(), result = deferred();
    let first = true;
    f.handlers.snapshot = () => {
      if (first) { first = false; entered.resolve(); return result.promise; }
      return envelope(state("new-generation"));
    };
    const initial = f.router.capture();
    const stale = f.router.snapshot(initial);
    const rejected = assert.rejects(stale, hasCode("HERDR_STALE"));
    await entered.promise;
    f.router.select(intermediate);
    const skipped = f.router.snapshot();
    const skippedRejected = assert.rejects(skipped, hasCode("HERDR_STALE"));
    f.router.select(from);
    const latest = f.router.snapshot();
    result.resolve(envelope(state("old-generation")));
    await Promise.all([rejected, skippedRejected]);
    assert.equal((await latest).marker, "new-generation");
    assert.equal(f.router.isCurrent(initial), false);
    assert.deepEqual(f.of("snapshot").map(call => call.remote), [from, from]);
  });
}

test("cached identical pane IDs on another machine cannot authorize stale focus", async () => {
  const f = fixture({ selected: A });
  const first = await f.router.snapshot();
  f.router.select(B);
  const second = await f.router.snapshot();
  await assert.rejects(f.router.focusAgent(first, PANE), hasCode("HERDR_STALE"));
  await f.router.focusAgent(second, PANE);
  assert.deepEqual(f.of("focus").map(call => call.remote), [B]);
  f.router.select(A);
  await assert.rejects(f.router.focusAgent(first, PANE), hasCode("HERDR_STALE"));
  assert.equal(f.of("focus").length, 1);
});

test("queued attention captures its original target and never focuses after an ABA switch", async () => {
  const f = fixture({ selected: A });
  const release = deferred(), entered = deferred();
  const context = "attention-regression-ABA";
  const blocking = enqueueAgentAttention(context, async () => { entered.resolve(); await release.promise; });
  await entered.promise;
  const captured = f.router.capture();
  const queued = enqueueAgentAttention(context, async () => {
    const current = await f.router.snapshot(captured);
    await f.router.focusAgent(current, PANE);
  });
  const rejected = assert.rejects(queued, hasCode("HERDR_STALE"));
  f.router.select(B);
  f.router.select(A);
  release.resolve();
  await Promise.all([blocking, rejected]);
  assert.equal(f.calls.length, 0, "stale queued work must be rejected before any command");
  const next = f.router.capture();
  await enqueueAgentAttention(context, async () => {
    const current = await f.router.snapshot(next);
    await f.router.focusAgent(current, PANE);
  });
  assert.deepEqual(f.of("focus").map(call => call.remote), [A]);
});

for (const change of [{ target: "other@host" }, { session: "different" }, { enabled: false }, { missing: true }]) {
  test(`focus revalidates saved machine before client preparation: ${JSON.stringify(change)}`, async () => {
    const f = fixture({ selected: A });
    const current = await f.router.snapshot();
    f.config.machines = change.missing ? [] : [machine(A, change)];
    let prepared = false;
    await assert.rejects(f.router.focusAgent(current, PANE, async () => { prepared = true; }), hasCode("HERDR_TARGET"));
    assert.equal(prepared, false);
    assert.equal(f.of("focus").length, 0);
  });
}

test("renaming only a display label preserves the same remote focus identity", async () => {
  const f = fixture({ selected: A });
  const current = await f.router.snapshot();
  f.config.machines = [machine(A, { label: "New label" })];
  await f.router.focusAgent(current, PANE);
  assert.equal(f.of("focus").length, 1);
});

test("changing the selection while client preparation waits prevents any focus", async () => {
  const f = fixture({ selected: A });
  const current = await f.router.snapshot();
  const entered = deferred(), result = deferred();
  const focused = f.router.focusAgent(current, PANE, async (selected, assertCurrent) => {
    assert.equal(selected.id, A);
    assertCurrent();
    entered.resolve();
    await result.promise;
  });
  const rejected = assert.rejects(focused, hasCode("HERDR_STALE"));
  await entered.promise;
  f.router.select(null);
  result.resolve();
  await rejected;
  assert.equal(f.of("focus").length, 0);
  assert.equal((await f.router.snapshot()).marker, "local");
});

for (const change of [{ target: "other@host" }, { session: "different" }]) {
  test(`changing machine configuration during client preparation blocks focus: ${JSON.stringify(change)}`, async () => {
    const f = fixture({ selected: A });
    const current = await f.router.snapshot();
    await assert.rejects(f.router.focusAgent(current, PANE, async () => {
      f.config.machines = [machine(A, change)];
    }), hasCode("HERDR_TARGET"));
    assert.equal(f.of("focus").length, 0);
  });
}

test("client preparation failure cannot dispatch focus or fall back to Local", async () => {
  const f = fixture({ selected: A });
  const current = await f.router.snapshot();
  const error = targetError("HERDR_AUTH", "SSH preparation rejected");
  await assert.rejects(f.router.focusAgent(current, PANE, async () => { throw error; }), error);
  assert.equal(f.of("focus").length, 0);
  assert.ok(f.of("snapshot").every(call => call.remote === A));
});

for (const message of ["Connection timed out", "Permission denied (publickey).", "protocol mismatch", "unexpected backend error"]) {
  test(`focus errors are classified but never retried: ${message}`, async () => {
    const f = fixture({ selected: A });
    const current = await f.router.snapshot();
    const error = Object.assign(new Error("Command failed"), { stderr: message });
    f.handlers.focus = () => { throw error; };
    await assert.rejects(f.router.focusAgent(current, PANE), hasCode(classifyTargetError(error).code));
    f.advance(60000);
    await f.router.snapshot();
    assert.equal(f.of("focus").length, 1);
    assert.deepEqual(f.of("focus")[0].args, ["--machine", A, "agent", "focus", PANE]);
    assert.ok(f.of("snapshot").every(call => call.remote === A));
  });
}

for (const failure of [false, true]) {
  test(`focus completion after target switch discards stale ${failure ? "failure" : "success"}`, async () => {
    const f = fixture({ selected: A });
    const current = await f.router.snapshot();
    const entered = deferred(), result = deferred();
    f.handlers.focus = () => { entered.resolve(); return result.promise; };
    const focused = f.router.focusAgent(current, PANE);
    const rejected = assert.rejects(focused, hasCode("HERDR_STALE"));
    await entered.promise;
    f.router.select(B);
    const fresh = f.router.snapshot();
    if (failure) result.reject(offline()); else result.resolve("");
    await rejected;
    assert.equal((await fresh).marker, B);
    assert.equal(f.of("focus").length, 1);
    assert.equal(f.of("focus")[0].remote, A);
  });
}

test("successful focus invalidates the snapshot without retrying focus", async () => {
  const f = fixture({ selected: A });
  const initial = await f.router.snapshot();
  await f.router.focusAgent(initial, PANE);
  assert.notStrictEqual(await f.router.snapshot(), initial);
  assert.equal(f.of("snapshot").length, 2);
  assert.equal(f.of("focus").length, 1);
});

for (const kind of ["version", "machines"]) {
  test(`${kind} discovery failures are single-flight and exponentially backed off`, async () => {
    const f = fixture({ selected: A });
    const entered = deferred(), result = deferred();
    f.handlers[kind] = () => { entered.resolve(); return result.promise; };
    const first = Promise.allSettled(Array.from({ length: 12 }, () => f.router.listMachines()));
    await entered.promise;
    assert.equal(f.of(kind).length, 1);
    result.reject(offline());
    const initial = await first;
    assert.ok(initial.every(item => item.status === "rejected" && item.reason === initial[0].reason));
    f.handlers[kind] = () => { throw offline(); };
    for (const [index, delay] of [2000, 4000, 8000, 16000, 30000, 30000].entries()) {
      f.advance(delay - 1);
      await assert.rejects(f.router.listMachines(), hasCode("HERDR_OFFLINE"));
      await assert.rejects(f.router.resolveMachine(f.router.capture()), hasCode("HERDR_OFFLINE"));
      assert.equal(f.of(kind).length, index + 1, "ordinary discovery must reuse its bounded failure backoff");
      f.advance(1);
      await assert.rejects(f.router.listMachines(), hasCode("HERDR_OFFLINE"));
      assert.equal(f.of(kind).length, index + 2);
    }
    assert.equal(f.of("snapshot").length, 0);
    assert.equal(f.of("focus").length, 0);
  });
}

test("manual discovery refresh bypasses failure backoff and recovery resets it", async () => {
  const f = fixture({ selected: A });
  f.handlers.machines = () => { throw offline(); };
  await assert.rejects(f.router.listMachines(), hasCode("HERDR_OFFLINE"));
  await assert.rejects(f.router.listMachines(), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("machines").length, 1);
  await assert.rejects(f.router.listMachines(true), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("machines").length, 2);
  delete f.handlers.machines;
  assert.deepEqual(await f.router.listMachines(true), [machine(), machine(B)]);
  assert.equal(f.of("machines").length, 3);
  assert.equal((await f.router.resolveMachine(f.router.capture())).id, A);
  f.advance(30000); // Expire the old successful cache before testing recovery backoff.
  f.handlers.machines = () => { throw offline(); };
  await assert.rejects(f.router.listMachines(true), hasCode("HERDR_OFFLINE"));
  f.advance(1999);
  await assert.rejects(f.router.listMachines(), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("machines").length, 4);
  f.advance(1);
  await assert.rejects(f.router.listMachines(), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("machines").length, 5);
});

test("failed forced discovery does not silently serve a previously valid cached machine", async () => {
  const f = fixture({ selected: A });
  await f.router.listMachines();
  f.handlers.machines = () => { throw offline(); };
  await assert.rejects(f.router.listMachines(true), hasCode("HERDR_OFFLINE"));
  await assert.rejects(f.router.resolveMachine(f.router.capture()), hasCode("HERDR_OFFLINE"));
  await assert.rejects(f.router.snapshot(), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("snapshot").length, 0);
  f.router.select(null);
  assert.equal((await f.router.snapshot()).marker, "local", "explicit Local remains independent of remote discovery failure");
  assert.deepEqual(f.of("snapshot").map(call => call.remote), [null]);
});

test("queued Local snapshot checks selection again after async resolution before dispatch", async () => {
  const f = fixture();
  const pending = f.router.snapshot();
  const rejected = assert.rejects(pending, hasCode("HERDR_STALE"));
  // snapshot's serialized task enters resolveMachine(Local), which itself is async.
  await Promise.resolve();
  f.router.select(A);
  await rejected;
  assert.equal(f.calls.length, 0, "no old Local command may be dispatched after a remote selection");
});

for (const [from, to] of [[null, A], [A, null], [A, B]]) {
  test(`queued attention from ${from ?? "Local"} never migrates to ${to ?? "Local"}`, async () => {
    const f = fixture({ selected: from });
    const release = deferred(), entered = deferred();
    const context = `attention-regression-${from}-${to}`;
    const blocking = enqueueAgentAttention(context, async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    const captured = f.router.capture();
    const queued = enqueueAgentAttention(context, async () => {
      const current = await f.router.snapshot(captured);
      await f.router.focusAgent(current, PANE);
    });
    const rejected = assert.rejects(queued, hasCode("HERDR_STALE"));
    f.router.select(to);
    release.resolve();
    await Promise.all([blocking, rejected]);
    assert.equal(f.calls.length, 0);
  });
}

for (const selected of [null, A]) {
  test(`focus queued from ${selected ?? "Local"} never dispatches after a selection switch`, async () => {
    const f = fixture({ selected });
    const current = await f.router.snapshot();
    const captured = f.router.capture();
    const pending = f.router.focusAgent(current, PANE);
    const rejected = assert.rejects(pending, hasCode("HERDR_STALE"));
    f.router.select(selected === null ? A : null);
    await rejected;
    assert.equal(f.router.isCurrent(captured), false);
    assert.equal(f.of("focus").length, 0);
  });
}

test("version capability cache expires at precisely 30 seconds even with forced list refreshes", async () => {
  const f = fixture({ selected: A });
  await f.router.listMachines();
  f.advance(29999);
  await f.router.listMachines(true);
  assert.equal(f.of("version").length, 1);
  f.advance(1);
  await f.router.listMachines(true);
  assert.equal(f.of("version").length, 2);
  assert.equal(f.of("machines").length, 3);
});

for (const selected of [null, A]) {
  test(`fresh ${selected ?? "Local"} action snapshot bypasses an unexpired feedback cache`, async () => {
    const f = fixture({ selected });
    let revision = 0;
    f.handlers.snapshot = () => envelope(state(`revision-${++revision}`));
    const target = f.router.capture();
    const cached = await f.router.snapshot(target);
    assert.strictEqual(await f.router.snapshot(target), cached);
    const fresh = await f.router.snapshot(target, { fresh: true });
    assert.equal(cached.marker, "revision-1");
    assert.equal(fresh.marker, "revision-2");
    assert.notStrictEqual(fresh, cached);
    assert.equal(f.of("snapshot").length, 2);
    assert.strictEqual(await f.router.snapshot(target), fresh, "fresh action state replaces feedback cache");
    assert.ok(f.of("snapshot").every(call => call.remote === selected));
  });

  test(`fresh ${selected ?? "Local"} action queues a new snapshot after an existing poll`, async () => {
    const f = fixture({ selected });
    const entered = deferred(), release = deferred();
    let revision = 0;
    f.handlers.snapshot = () => {
      revision += 1;
      if (revision === 1) { entered.resolve(); return release.promise; }
      return envelope(state(`revision-${revision}`));
    };
    const target = f.router.capture();
    const polling = f.router.snapshot(target);
    await entered.promise;
    const action = f.router.snapshot(target, { fresh: true });
    assert.equal(f.of("snapshot").length, 1, "fresh action must serialize behind the existing poll");
    release.resolve(envelope(state("feedback-before-action")));
    const [feedback, current] = await Promise.all([polling, action]);
    assert.equal(feedback.marker, "feedback-before-action");
    assert.equal(current.marker, "revision-2");
    assert.notStrictEqual(current, feedback, "a fresh action may not coalesce a stale in-flight snapshot");
    assert.equal(f.of("snapshot").length, 2);
    assert.strictEqual(await f.router.snapshot(target), current);
    assert.ok(f.of("snapshot").every(call => call.remote === selected));
  });

  test(`two fresh ${selected ?? "Local"} action snapshots each perform their own serialized read`, async () => {
    const f = fixture({ selected });
    const entered = deferred(), release = deferred();
    let revision = 0;
    f.handlers.snapshot = () => {
      revision += 1;
      if (revision === 1) { entered.resolve(); return release.promise; }
      return envelope(state(`revision-${revision}`));
    };
    const target = f.router.capture();
    const first = f.router.snapshot(target, { fresh: true });
    await entered.promise;
    const second = f.router.snapshot(target, { fresh: true });
    release.resolve(envelope(state("revision-1")));
    const [one, two] = await Promise.all([first, second]);
    assert.equal(one.marker, "revision-1");
    assert.equal(two.marker, "revision-2");
    assert.equal(f.of("snapshot").length, 2);
  });
}

test("fresh remote snapshots still respect unavailable-target backoff and never fall back", async () => {
  const f = fixture({ selected: A });
  f.handlers.snapshot = () => { throw offline(); };
  await assert.rejects(f.router.snapshot(), hasCode("HERDR_OFFLINE"));
  await assert.rejects(f.router.snapshot(f.router.capture(), { fresh: true }), hasCode("HERDR_OFFLINE"));
  assert.equal(f.of("snapshot").length, 1);
  assert.equal(f.of("snapshot")[0].remote, A);
});

test("fresh Local action queued behind feedback is canceled when the selection becomes remote", async () => {
  const f = fixture();
  const entered = deferred(), release = deferred();
  f.handlers.snapshot = () => { entered.resolve(); return release.promise; };
  const target = f.router.capture();
  const polling = f.router.snapshot(target);
  const pollingRejected = assert.rejects(polling, hasCode("HERDR_STALE"));
  await entered.promise;
  const action = f.router.snapshot(target, { fresh: true });
  const actionRejected = assert.rejects(action, hasCode("HERDR_STALE"));
  f.router.select(A);
  release.resolve(envelope(state("stale-local")));
  await Promise.all([pollingRejected, actionRejected]);
  assert.equal(f.of("snapshot").length, 1, "the queued action must not dispatch an additional Local read");
  assert.equal(f.of("focus").length, 0);
});
