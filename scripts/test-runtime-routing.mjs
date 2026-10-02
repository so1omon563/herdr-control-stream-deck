import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const pluginRoot = new URL("../plugin/com.so1omon563.herdr-control.sdPlugin/", import.meta.url);
const source = readFileSync(new URL("plugin.js", pluginRoot), "utf8");
const A = "a".repeat(32), B = "b".repeat(32);
const machines = [{ id: A, label: "Mini", target: "mini", session: "default", enabled: true },
  { id: B, label: "Other", target: "other", session: "work", enabled: true }];
const state = () => ({ agents: [{ pane_id: "w1:p1", workspace_id: "w1", agent: "hermes", agent_status: "blocked" }],
  workspaces: [{ workspace_id: "w1", number: 1 }], tabs: [{ tab_id: "t1", workspace_id: "w1", number: 1 }],
  panes: [{ pane_id: "w1:p1", tab_id: "t1" }], focused_pane_id: "w1:p1", focused_tab_id: "t1", focused_workspace_id: "w1" });
const jsonState = () => JSON.stringify({ result: { snapshot: state() } });
function runtime() {
  const calls = [], messages = [], remote = [];
  let respond = (file, args) => {
    if (file.endsWith("/herdr")) {
      if (args.includes("--version")) return "herdr 0.9.3";
      if (args[0] === "machine") return JSON.stringify(machines);
      if (args.includes("snapshot")) return jsonState();
      if (args.includes("focus")) return "{}";
    }
    if (file.endsWith("pgrep")) throw Object.assign(new Error("no process"), { code: 1 });
    return "";
  };
  class Socket {
    static OPEN = 1;
    readyState = 1;
    handlers = {};
    constructor() { context.socketInstance = this; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    send(value) { messages.push(JSON.parse(value)); }
  }
  const context = { console, Buffer, WebSocket: Socket, process: { argv: [], kill() {} },
    setTimeout: () => 1, clearTimeout() {}, setInterval() {}, module: { exports: {} },
    require(name) {
      if (name === "node:child_process") return { execFile(file, args, _options, callback) {
        calls.push({ file, args });
        Promise.resolve().then(() => respond(file, args)).then(value => callback(null, value, ""), error => callback(error, "", error.stderr ?? ""));
        return { kill() {} };
      } };
      if (name === "node:fs") return { existsSync: path => path === "/opt/homebrew/bin/herdr" || path === "/System/Applications/Utilities/Terminal.app" };
      if (name === "./remote-terminal.js") return { createRemoteTerminalController: () => ({
        async open(request) { assert.ok(request.isCurrent()); remote.push(["open", request.machine.id]); return { launched: true, client: null }; },
        async find(request) { assert.ok(request.isCurrent()); remote.push(["find", request.machine.id]); return null; }
      }) };
      if (name.startsWith("./")) return require(new URL(name, pluginRoot).pathname);
      return require(name);
    }
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.api = { connectPlugin, runAgentKey, runCommand, runEncoder, refreshLiveFeedbacks, returnToPreviousProfile, targets, contextInfo, agentSelections, agentPages, isLocalHerdrCommand };`, context);
  context.api.connectPlugin();
  const dispatch = message => context.socketInstance.handlers.message({ data: JSON.stringify(message) });
  return { ...context.api, calls, messages, remote, dispatch, respond: handler => { respond = handler; } };
}
const agentContext = r => r.contextInfo.set("agent-key", { action: "com.so1omon563.herdr-control.agent", device: "deck", settings: { role: "attention" } });
const settle = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
const select = (r, machineId) => r.dispatch({ event: "didReceiveGlobalSettings", payload: { settings: { terminal: "terminal", machineId } } });

{
  const r = runtime();
  agentContext(r);
  await r.runAgentKey("agent-key");
  assert.equal(r.calls.length, 0, "startup may not assume Local before settings arrive");
  select(r, A); await settle();
  await r.runAgentKey("agent-key");
  assert.ok(r.calls.some(call => JSON.stringify(call.args) === JSON.stringify(["--machine", A, "agent", "focus", "w1:p1"])));
  assert.deepEqual(r.remote.filter(([event]) => event === "open"), [["open", A]]);
  assert.ok(r.messages.some(message => message.event === "setTitle" && message.payload.title?.startsWith("MINI\n")));
  for (const command of ["workspace-next", "workspace-picker", "pane-primary", "settings", "detach", "close-pane"]) {
    const count = r.calls.length;
    await r.runCommand("agent-key", command);
    assert.equal(r.calls.length, count, `${command} must not run local or remote commands`);
  }
  assert.ok(r.messages.some(message => message.payload?.title === "LOCAL\nONLY"));
  await r.returnToPreviousProfile("agent-key");
  assert.ok(r.messages.some(message => message.event === "switchToProfile" && message.device === "deck"));
  assert.ok(!r.calls.some(call => call.args.some(arg => arg.includes('keystroke "m"') || arg.includes("set visible"))), "Back must not hide an unrelated local client");
}
{
  const r = runtime();
  agentContext(r);
  select(r, A); await settle();
  await r.runAgentKey("agent-key");
  select(r, B); await settle();
  await r.runAgentKey("agent-key");
  const focus = r.calls.filter(call => call.args.includes("focus"));
  assert.deepEqual(focus.map(call => call.args.slice(0, 2)), [["--machine", A], ["--machine", B]]);
  assert.equal(r.agentSelections.size, 1, "switch discards previous per-target selections");
  assert.ok([...r.agentSelections.keys()][0].includes(B));
}
{
  const r = runtime();
  agentContext(r);
  let release;
  r.respond((_file, args) => args.includes("snapshot") ? new Promise(resolve => { release = resolve; }) : "");
  select(r, null);
  await settle();
  const old = r.runCommand("agent-key", "workspace-new");
  select(r, ""); await settle();
  release(jsonState());
  await old; await settle();
  assert.ok(!r.calls.some(call => call.args.includes("create")), "pending local action must not survive a target switch");
  assert.ok(!r.messages.some(message => message.event === "showOk"), "stale actions cannot report success");
}
{
  const r = runtime();
  agentContext(r);
  r.respond((_file, args) => {
    if (args[0] === "--version") return "herdr 0.9.3";
    if (args[0] === "machine") return JSON.stringify(machines);
    throw new Error("Connection refused");
  });
  select(r, A); await settle();
  await r.refreshLiveFeedbacks();
  assert.ok(r.messages.some(message => message.payload?.title?.includes("REMOTE\nOFFLINE")));
  assert.ok(!r.messages.some(message => message.payload?.title?.includes("NO\nAGENTS")));
  assert.ok(r.calls.filter(call => call.args.includes("snapshot")).every(call => call.args[1] === A));
}
{
  const r = runtime();
  assert.equal(r.isLocalHerdrCommand("/opt/homebrew/bin/herdr"), true);
  assert.equal(r.isLocalHerdrCommand("herdr --remote mini --session default"), false);
  assert.equal(r.isLocalHerdrCommand("/opt/homebrew/bin/herdr --machine x"), false);
  assert.equal(r.isLocalHerdrCommand("herdr --session another-local-session"), false);
}
{
  const r = runtime();
  agentContext(r);
  select(r, "d".repeat(32)); await settle();
  await r.returnToPreviousProfile("agent-key");
  assert.ok(r.messages.some(message => message.event === "switchToProfile" && message.device === "deck"), "Back must work after a saved machine disappears");
}
{
  const r = runtime();
  agentContext(r);
  let focused = "w1:p1";
  r.respond((_file, args) => {
    if (args.includes("snapshot")) return JSON.stringify({ result: { snapshot: { ...state(), focused_pane_id: focused } } });
    return "";
  });
  select(r, null); await settle();
  focused = "w1:p2";
  await r.runCommand("agent-key", "split-right");
  const split = r.calls.find(call => call.args[0] === "pane" && call.args[1] === "split");
  assert.equal(split.args[3], "w1:p2", "local action must fetch live focus instead of the feedback cache");
}

console.log("Runtime target-routing regression tests passed");
