#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("../plugin/com.so1omon563.herdr-control.sdPlugin/property-inspector.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const prefix = "com.so1omon563.herdr-control.";

// Deliberately small DOM: select values follow the real DOM, and any HTML write fails.
class Element {
  constructor(tagName, attributes = "") {
    this.tagName = tagName;
    this.disabled = /\bdisabled\b/.test(attributes);
    this.hidden = /\bhidden\b/.test(attributes);
    this.textContent = "";
    this.children = [];
    this.listeners = new Map();
    this._value = "";
  }
  set innerHTML(_value) { throw new Error("Inspector must not inject machine data as HTML"); }
  get options() { return this.children; }
  get value() { return this._value; }
  set value(value) {
    const next = String(value);
    this._value = this.tagName === "select" && !this.options.some(option => option.value === next) ? "" : next;
  }
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }
  trigger(event, payload = {}) {
    for (const callback of this.listeners.get(event) ?? []) callback(payload);
  }
  append(child) {
    this.children.push(child);
    if (this.tagName === "select" && this.options.length === 1) this._value = child.value;
  }
  replaceChildren() {
    this.children = [];
    this._value = "";
  }
}

function inspector(action = "toggle", settings = {}) {
  const elements = new Map();
  for (const match of html.matchAll(/<(section|select|p|button)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    elements.set(match[3], new Element(match[1], match[2]));
  }
  for (const match of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const select = elements.get(match[1]);
    for (const item of match[2].matchAll(/<option value="([^"]+)"[^>]*>([^<]*)<\/option>/g)) {
      const option = new Element("option");
      option.value = item[1];
      option.textContent = item[2];
      select.append(option);
    }
  }
  const sent = [];
  const classes = new Set();
  let socket;
  class WebSocket extends Element {
    static OPEN = 1;
    constructor(url) {
      super("socket");
      this.url = url;
      this.readyState = 0;
      socket = this;
    }
    send(data) {
      assert.equal(this.readyState, WebSocket.OPEN, "must not write to a closed socket");
      sent.push(JSON.parse(data));
    }
  }
  const sandbox = {
    window: {},
    document: {
      getElementById: id => {
        assert.ok(elements.has(id), `Missing DOM fixture for ${id}`);
        return elements.get(id);
      },
      createElement: tag => new Element(tag),
      body: { classList: { add: name => classes.add(name) } }
    },
    WebSocket
  };
  vm.runInNewContext(script, sandbox, { filename: "property-inspector.html" });
  sandbox.window.connectElgatoStreamDeckSocket("12345", "inspector-uuid", "registerPropertyInspector", "{}",
    JSON.stringify({ action: `${prefix}${action}`, payload: { settings } }));
  const receive = data => socket.trigger("message", { data: JSON.stringify(data) });
  const ui = {
    el: id => elements.get(id),
    sent,
    messages: event => sent.filter(message => message.event === event),
    last: event => sent.findLast(message => message.event === event),
    open() { socket.readyState = 1; socket.trigger("open"); },
    close() { socket.readyState = 3; socket.trigger("close"); },
    receive,
    raw: data => socket.trigger("message", { data }),
    globals: value => receive({ event: "didReceiveGlobalSettings", payload: { settings: value } }),
    change(id, value) { elements.get(id).value = value; elements.get(id).trigger("change"); },
    refresh: () => elements.get("refresh-machines").trigger("click"),
    list(machines, extra = {}, requestId = ui.last("sendToPlugin").payload.requestId) {
      receive({ event: "sendToPropertyInspector", payload: { event: "machines", requestId, machines, ...extra } });
    },
    options: () => elements.get("machine").options,
    selected: () => elements.get("machine").options.find(option => option.value === elements.get("machine").value),
    status: () => elements.get("machine-status").textContent
  };
  return ui;
}
const enabled = (id = "home", label = "Home Mac") => ({ id, label, enabled: true });

test("every inspector loads shared settings and machine choices before enabling changes", () => {
  for (const action of ["toggle", "command", "encoder", "agent", "back"]) {
    const ui = inspector(action);
    for (const id of ["machine", "terminal", "command", "split-direction"]) assert.equal(ui.el(id).disabled, true);
    ui.open();
    assert.deepEqual(ui.sent.slice(0, 2), [
      { event: "registerPropertyInspector", uuid: "inspector-uuid" },
      { event: "getGlobalSettings", context: "inspector-uuid" }
    ]);
    assert.deepEqual(ui.last("sendToPlugin"), {
      event: "sendToPlugin", action: `${prefix}${action}`, context: "inspector-uuid",
      payload: { event: "listMachines", requestId: 1 }
    });
    ui.change("terminal", "kitty");
    ui.change("machine", "local");
    ui.change("command", "tab-new");
    ui.change("split-direction", "down");
    assert.equal(ui.messages("setGlobalSettings").length, 0);
    assert.equal(ui.messages("setSettings").length, 0);
    ui.list([enabled()]);
    assert.equal(ui.el("machine").disabled, true, "a machine list does not unlock global editing");
    ui.globals({});
    for (const id of ["machine", "terminal", "command", "split-direction"]) assert.equal(ui.el(id).disabled, false);
    assert.equal(ui.el("machine-settings").hidden, false);
  }
});

test("terminal and machine writes preserve all unknown globals and use stable IDs", () => {
  const ui = inspector();
  ui.open();
  const globals = { terminal: "ghostty", machineId: "office", extra: { theme: "dark", nested: [1, 2] }, future: true };
  ui.globals(globals);
  ui.list([enabled("office", "Same label"), enabled("home", "Same label")]);
  ui.change("terminal", "kitty");
  assert.deepEqual(ui.last("setGlobalSettings").payload, { ...globals, terminal: "kitty" });
  ui.change("machine", "machine:home");
  assert.deepEqual(ui.last("setGlobalSettings").payload, { ...globals, terminal: "kitty", machineId: "home" });
  ui.change("machine", "local");
  assert.deepEqual(ui.last("setGlobalSettings").payload, { ...globals, terminal: "kitty", machineId: null });
});

test("the newest global snapshot is preserved on the next edit", () => {
  const ui = inspector();
  ui.open();
  ui.globals({ terminal: "kitty", machineId: "home", oldField: 1 });
  ui.globals({ terminal: "ghostty", machineId: "office", newField: { keep: true } });
  ui.change("terminal", "iterm");
  assert.deepEqual(ui.last("setGlobalSettings").payload, { terminal: "iterm", machineId: "office", newField: { keep: true } });
  assert.equal(ui.el("machine").value, "machine:office");
});

test("refresh requests increase monotonically and stale or duplicate responses are ignored", () => {
  const ui = inspector();
  ui.open();
  ui.globals({ machineId: "home" });
  const first = ui.last("sendToPlugin").payload.requestId;
  ui.refresh();
  const second = ui.last("sendToPlugin").payload.requestId;
  assert.ok(second > first);
  ui.list([enabled("office")], {}, first);
  assert.equal(ui.options().some(option => option.value === "machine:office"), false);
  ui.list([enabled("home", "Current home")], {}, second);
  assert.equal(ui.el("machine-label").textContent, "Current home");
  ui.list([enabled("home", "Duplicate response")], {}, second);
  assert.equal(ui.el("machine-label").textContent, "Current home");
  ui.refresh();
  const third = ui.last("sendToPlugin").payload.requestId;
  assert.ok(third > second);
  ui.list([enabled("home", "Stale home")], { error: "stale error" }, second);
  assert.equal(ui.el("machine-label").textContent, "Current home");
  assert.doesNotMatch(ui.status(), /stale error/);
  ui.list([enabled("home", "Newest home")], {}, third);
  assert.equal(ui.el("machine-label").textContent, "Newest home");
});

test("missing and disabled saved targets stay selected until an explicit valid choice", () => {
  for (const machines of [[], [{ id: "old", label: "Old Mac", enabled: false }]]) {
    const ui = inspector();
    ui.open();
    ui.globals({ machineId: "old", terminal: "auto", retained: 42 });
    ui.list(machines);
    assert.equal(ui.el("machine").value, "machine:old");
    assert.equal(ui.selected().disabled, true);
    assert.match(ui.selected().textContent, /unavailable/);
    assert.match(ui.status(), /unavailable/);
    assert.equal(ui.options()[0].textContent, "Local");
    assert.equal(ui.messages("setGlobalSettings").length, 0, "loading never resets a target");
    ui.change("terminal", "kitty");
    assert.equal(ui.last("setGlobalSettings").payload.machineId, "old");
    ui.change("machine", "machine:old");
    assert.equal(ui.messages("setGlobalSettings").length, 1, "unavailable option cannot be written");
    ui.change("machine", "local");
    assert.deepEqual(ui.last("setGlobalSettings").payload, { machineId: null, terminal: "kitty", retained: 42 });
  }
});

test("invalid saved target IDs remain visible and preserved when another global changes", () => {
  for (const machineId of ["", "   ", 0, false, [], { id: "home" }]) {
    const ui = inspector();
    ui.open();
    ui.globals({ machineId, untouched: "keep" });
    ui.list([enabled()]);
    assert.equal(ui.el("machine").value, "invalid-target");
    assert.match(ui.selected().textContent, /invalid ID; unavailable/);
    ui.change("terminal", "kitty");
    assert.deepEqual(ui.last("setGlobalSettings").payload, { machineId, untouched: "keep", terminal: "kitty" });
    ui.change("machine", "local");
    assert.equal(ui.last("setGlobalSettings").payload.machineId, null);
  }
});

test("only absent or null machine IDs mean Local", () => {
  for (const globals of [{}, { machineId: null }]) {
    const ui = inspector();
    ui.open();
    ui.globals(globals);
    ui.list([enabled("local"), enabled("invalid-target")]);
    assert.equal(ui.el("machine").value, "local");
    assert.equal(ui.messages("setGlobalSettings").length, 0);
    ui.change("machine", "machine:local");
    assert.equal(ui.last("setGlobalSettings").payload.machineId, "local", "a saved ID cannot collide with Local");
  }
});

test("malformed global snapshots block all settings writes, preserving the last valid target", () => {
  for (const invalid of [undefined, null, [], "bad", 17, false]) {
    const ui = inspector("command", { command: "pane-primary", keepAction: true });
    ui.open();
    ui.globals(invalid);
    assert.match(ui.status(), /Shared settings were invalid/);
    for (const id of ["machine", "terminal", "command", "split-direction"]) assert.equal(ui.el(id).disabled, true);
    ui.change("terminal", "kitty");
    ui.change("command", "tab-new");
    ui.change("machine", "local");
    assert.equal(ui.messages("setGlobalSettings").length, 0);
    assert.equal(ui.messages("setSettings").length, 0);
    ui.globals({ machineId: "home", unknown: 1 });
    ui.globals(invalid);
    assert.equal(ui.el("machine").value, "machine:home");
    ui.change("machine", "local");
    assert.equal(ui.messages("setGlobalSettings").length, 0);
    ui.globals({ machineId: "home", unknown: 2 });
    ui.change("terminal", "kitty");
    assert.deepEqual(ui.last("setGlobalSettings").payload, { machineId: "home", unknown: 2, terminal: "kitty" });
  }
});

test("malformed websocket messages are harmless and do not unlock changes", () => {
  const ui = inspector();
  ui.open();
  for (const raw of ["not-json", "null", "[]", "17", '"hello"']) assert.doesNotThrow(() => ui.raw(raw));
  for (const message of [{}, { event: "sendToPropertyInspector" }, { event: "sendToPropertyInspector", payload: [] }]) {
    assert.doesNotThrow(() => ui.receive(message));
  }
  assert.equal(ui.el("machine").disabled, true);
  assert.equal(ui.messages("setGlobalSettings").length, 0);
});

test("failed or malformed machine lists preserve target and require a successful refresh for remote choices", () => {
  for (const response of [{ machines: [], error: "Herdr is offline" }, { machines: null }]) {
    const ui = inspector();
    ui.open();
    ui.globals({ machineId: "home" });
    ui.list([enabled()]);
    ui.refresh();
    ui.list(response.machines, response.error ? { error: response.error } : {});
    assert.equal(ui.el("machine").value, "machine:home");
    assert.match(ui.status(), /Unable to refresh/);
    assert.match(ui.status(), /remains selected; availability is unknown/);
    ui.change("machine", "machine:home");
    assert.equal(ui.messages("setGlobalSettings").length, 0);
    ui.refresh();
    ui.list([enabled("home", "Recovered home")]);
    assert.equal(ui.selected().disabled, false);
    assert.equal(ui.selected().textContent, "Recovered home");
  }
});

test("untrusted labels and errors are text, duplicate or malformed records are ignored", () => {
  const ui = inspector();
  const label = '<img src=x onerror="alert(1)"> & remote';
  const id = "</option><script>unsafe()</script>";
  ui.open();
  ui.globals({ machineId: id });
  ui.list([enabled(id, label), enabled(id, "Duplicate"), null, { id: 12, label: "Invalid", enabled: true },
    { id: "missing-enabled", label: "Incomplete" }, { id: "", label: "Empty", enabled: true }]);
  assert.equal(ui.options().length, 2);
  assert.equal(ui.selected().textContent, label);
  assert.equal(ui.el("machine-label").textContent, label);
  ui.change("machine", `machine:${id}`);
  assert.equal(ui.last("setGlobalSettings").payload.machineId, id);
  ui.refresh();
  ui.list([], { error: "<svg onload=unsafe()>" });
  assert.match(ui.status(), /<svg onload=unsafe\(\)>/);
});

test("command and split controls keep action settings intact and reflect action updates", () => {
  const ui = inspector("command", { command: "pane-primary", splitDirection: "down", other: { retained: true } });
  ui.open();
  ui.globals({ machineId: "home", terminal: "kitty" });
  assert.equal(ui.el("command-settings").hidden, false);
  assert.equal(ui.el("pane-settings").hidden, false);
  assert.equal(ui.el("terminal-settings").hidden, true);
  assert.equal(ui.el("split-direction").value, "down");
  ui.change("split-direction", "right");
  assert.deepEqual(ui.last("setSettings"), {
    event: "setSettings", action: `${prefix}command`, context: "inspector-uuid",
    payload: { command: "pane-primary", splitDirection: "right", other: { retained: true } }
  });
  ui.change("command", "tab-next");
  assert.equal(ui.el("pane-settings").hidden, true);
  assert.deepEqual(ui.last("setSettings").payload, { command: "tab-next", splitDirection: "right", other: { retained: true } });
  ui.receive({ event: "didReceiveSettings", payload: { settings: { command: "pane-primary", splitDirection: "down", newField: 2 } } });
  assert.equal(ui.el("pane-settings").hidden, false);
  ui.change("split-direction", "right");
  assert.deepEqual(ui.last("setSettings").payload, { command: "pane-primary", splitDirection: "right", newField: 2 });
  assert.equal(ui.messages("setGlobalSettings").length, 0);
});

test("encoder pane settings and toggle terminal visibility remain intact", () => {
  for (const dial of ["panes", "agents"]) {
    const ui = inspector("encoder", { dial, splitDirection: "down" });
    ui.open();
    ui.globals({});
    assert.equal(ui.el("pane-settings").hidden, dial !== "panes");
    assert.equal(ui.el("terminal-settings").hidden, true);
    assert.equal(ui.el("command-settings").hidden, true);
  }
  const ui = inspector();
  ui.open();
  ui.globals({ terminal: "ghostty" });
  assert.equal(ui.el("terminal-settings").hidden, false);
  assert.equal(ui.el("terminal").value, "ghostty");
});

test("disconnect disables writes and refreshes without discarding the target", () => {
  const ui = inspector();
  ui.open();
  ui.globals({ machineId: "home" });
  ui.list([enabled()]);
  ui.close();
  for (const id of ["machine", "terminal", "command", "split-direction", "refresh-machines"]) assert.equal(ui.el(id).disabled, true);
  assert.match(ui.status(), /Disconnected/);
  assert.equal(ui.el("machine").value, "machine:home");
  const count = ui.sent.length;
  ui.change("terminal", "kitty");
  ui.change("machine", "local");
  ui.refresh();
  assert.equal(ui.sent.length, count);
});

test("inline help states the remote scope and support links still work", () => {
  assert.match(html, /agents and Open\/Back only; workspace, tab, pane, and UI controls are unavailable remotely/);
  const ui = inspector();
  ui.open();
  ui.el("help").trigger("click");
  assert.deepEqual(ui.last("openUrl"), {
    event: "openUrl", payload: { url: "https://github.com/so1omon563/herdr-control-stream-deck#first-use" }
  });
});
