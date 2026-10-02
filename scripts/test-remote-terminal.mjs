import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createRemoteTerminalController, remoteTuiArgs, parseProcessTable } = require("../plugin/com.so1omon563.herdr-control.sdPlugin/remote-terminal.js");
const binary = "/opt/homebrew/bin/herdr";
const machine = { id: "a".repeat(32), target: "me@remote.example", session: "default" };
const apps = { ghostty: "/Applications/Ghostty.app", kitty: "/Applications/kitty.app", iterm: "/Applications/iTerm.app", terminal: "/System/Applications/Utilities/Terminal.app" };
const row = (pid, ppid, tty, command, started = "Fri Oct  2 15:00:00 2026") => ({ pid: String(pid), ppid: String(ppid), tty, command, started });
const printRows = records => records.map(record => `${record.pid} ${record.ppid} ${record.tty ?? "??"} ${record.started} ${record.command}`).join("\n");
const command = target => [binary, ...remoteTuiArgs(target)].join(" ");

function fixture(terminal, options = {}) {
  const calls = [];
  let records = [row(1, 0, null, "/sbin/launchd")];
  let launches = 0;
  let focuses = 0;
  let processReads = 0;
  let current = true;
  const request = (extra = {}) => ({ machine: { ...machine }, terminalPreference: terminal, isCurrent: () => current, ...extra });
  const controller = createRemoteTerminalController({
    herdrExecutable: () => options.binary ?? binary,
    terminalApp: term => apps[term],
    terminalForLaunch: async preference => {
      assert.equal(preference, terminal);
      if (options.staleOnSelection) current = false;
      return terminal;
    },
    captureAttempts: 2,
    sleep: async () => { if (options.staleOnSleep) current = false; },
    run: async (file, args, timeout) => {
      calls.push({ file, args, timeout });
      if (file === "/bin/ps") {
        processReads += 1;
        if (options.staleOnRead === processReads) current = false;
        if (options.failRead === processReads || options.failAllReads) throw new Error("Process inspection unavailable");
        return printRows(records);
      }
      const scriptedLaunch = file === "/usr/bin/osascript" && args[1].includes("set herdrCommand");
      if (file === "/usr/bin/env" || scriptedLaunch) {
        launches += 1;
        const tty = `ttys${String(launches).padStart(3, "0")}`;
        const pid = 100 + launches * 10;
        const childArgv = scriptedLaunch ? args.slice(2) : args.slice(args.indexOf("--args") + 1 + (terminal === "ghostty" ? 1 : 0));
        const argv = scriptedLaunch ? childArgv : childArgv.slice(5);
        if (!options.noCapture) {
          if (scriptedLaunch) {
            records.push(row(pid, 1, tty, argv.join(" ")));
          } else {
            const executable = `${apps[terminal]}/Contents/MacOS/${terminal}`;
            records.push(row(pid, 1, null, [executable, ...(terminal === "ghostty" ? ["-e"] : []), ...childArgv].join(" ")));
            records.push(row(pid + 1, pid, tty, argv.join(" ")));
            // The --remote parent remains alive above the actual client child.
            records.push(row(pid + 2, pid + 1, tty, `${binary} client`));
          }
        }
        if (options.staleOnLaunch) current = false;
        return scriptedLaunch ? `/dev/${tty}` : "";
      }
      assert.equal(file, "/usr/bin/osascript");
      assert.ok(args[1].includes("set targetTTY") || args[1].includes("set targetPID"));
      assert.ok(!args[1].includes("keystroke"));
      focuses += 1;
      if (options.staleOnFocus) current = false;
      return "focused";
    }
  });
  return {
    controller, calls, request,
    get records() { return records; },
    set records(value) { records = value; },
    get launches() { return launches; },
    get focuses() { return focuses; },
    get processReads() { return processReads; },
    set current(value) { current = value; }
  };
}

assert.deepEqual(remoteTuiArgs(machine), ["--remote", "me@remote.example", "--session", "default"]);
assert.deepEqual(remoteTuiArgs({ ...machine, target: "ssh://user@remote.example:2222", session: "work-2" }), ["--remote", "ssh://user@remote.example:2222", "--session", "work-2"]);
for (const changed of [
  { id: "friendly label" }, { id: "A".repeat(32) }, { target: "" }, { target: "host\ncommand" },
  { target: "host\u0000ignored" }, { target: "-oProxyCommand=evil" }, { target: "ssh://user:password@host" },
  { target: "x".repeat(1025) }, { session: "a b" }, { session: ".." }, { session: "a".repeat(65) }
]) assert.throws(() => remoteTuiArgs({ ...machine, ...changed }), /Invalid saved/);
{
  const f = fixture("terminal");
  assert.equal((await f.controller.open(f.request({ machine: { ...machine, session: "-foo" } }))).launched, true);
  const launch = f.calls.find(call => call.args[1]?.includes("set herdrCommand"));
  assert.deepEqual(launch.args.slice(-2), ["--session", "-foo"]);
}
assert.equal(parseProcessTable("garbage\n").length, 0);
assert.deepEqual(parseProcessTable(printRows([row(123, 1, "ttys003", command(machine))]))[0], {
  pid: "123", ppid: "1", tty: "ttys003", started: "Fri Oct 2 15:00:00 2026", command: command(machine)
});

for (const terminal of Object.keys(apps)) {
  const f = fixture(terminal);
  assert.equal(await f.controller.find(f.request()), null, "Find never launches an unknown client");
  assert.equal(f.launches, 0);
  const opened = await f.controller.open(f.request());
  assert.equal(opened.launched, true);
  assert.ok(opened.client);
  assert.deepEqual(await f.controller.find(f.request()), opened.client);
  assert.equal(f.focuses, 0, "Find does not raise the application");
  assert.deepEqual(await f.controller.open(f.request()), { launched: false, client: opened.client });
  assert.equal(f.launches, 1);
  assert.equal(f.focuses, 1);
  const launch = f.calls.find(call => call.file === "/usr/bin/env" || call.args[1]?.includes("set herdrCommand"));
  if (terminal === "ghostty" || terminal === "kitty") {
    assert.deepEqual(launch.args, ["-u", "NO_COLOR", "-u", "HERDR_REMOTE_BINARY", "/usr/bin/open", "-na", apps[terminal], "--args", ...(terminal === "ghostty" ? ["-e"] : []), "/usr/bin/env", "-u", "NO_COLOR", "-u", "HERDR_REMOTE_BINARY", binary, "--remote", machine.target, "--session", "default"]);
  } else {
    assert.deepEqual(launch.args.slice(2), [binary, "--remote", machine.target, "--session", "default"]);
    assert.match(launch.args[1], /quoted form of \(argument as text\)/);
    assert.match(launch.args[1], /exec \/usr\/bin\/env -u NO_COLOR -u HERDR_REMOTE_BINARY/);
    assert.match(launch.args[1], terminal === "terminal" ? /newTab to do script/ : /newWindow to create window/);
    assert.ok(!launch.args[1].includes(machine.target));
  }
  assert.ok(!f.calls.some(call => call.args.some(argument => argument === "--machine")));
  f.controller.clear();
  assert.equal(await f.controller.find(f.request()), null);
  assert.equal((await f.controller.open(f.request())).launched, true, "Cleared clients are never adopted from unrelated processes");
}

for (const terminal of Object.keys(apps)) {
  for (const change of ["command", "tty", "start", "gone"]) {
    const f = fixture(terminal);
    await f.controller.open(f.request());
    const herdr = f.records.find(record => record.command === command(machine));
    if (change === "command") herdr.command = binary; // same PID/TTY now runs local HERDR
    if (change === "tty") herdr.tty = "ttys999";
    if (change === "start") herdr.started = "Fri Oct  2 15:01:00 2026"; // reused PID
    if (change === "gone") f.records = f.records.filter(record => record !== herdr);
    assert.equal(await f.controller.find(f.request()), null, `${terminal}: reject ${change}`);
    assert.equal((await f.controller.open(f.request())).launched, true);
    assert.equal(f.focuses, 0, `${terminal}: never focus a stale or local client`);
  }
}

for (const terminal of ["ghostty", "kitty"]) {
  const f = fixture(terminal);
  await f.controller.open(f.request());
  const parent = f.records.find(record => record.command.startsWith(apps[terminal]));
  f.records.push(row(900, parent.pid, "ttys999", "/bin/zsh"));
  assert.equal(await f.controller.find(f.request()), null, "Multiple terminal TTYs make process focus unsafe");
  assert.equal((await f.controller.open(f.request())).launched, true);
  assert.equal(f.focuses, 0);
}

{
  const f = fixture("ghostty");
  // Existing local and remote processes are not sufficient evidence of ownership.
  f.records.push(row(50, 1, null, `${apps.ghostty}/Contents/MacOS/ghostty -e /usr/bin/env -u NO_COLOR -u HERDR_REMOTE_BINARY ${command(machine)}`));
  f.records.push(row(51, 50, "ttys020", command(machine)));
  f.records.push(row(52, 1, "ttys021", binary));
  const opened = await f.controller.open(f.request());
  assert.equal(opened.client.id, "110");
  assert.equal(f.focuses, 0);
}

{
  const f = fixture("terminal");
  await f.controller.open(f.request());
  assert.equal(await f.controller.find(f.request({ machine: { ...machine, target: "other-host" } })), null);
  assert.equal((await f.controller.open(f.request({ machine: { ...machine, session: "other-session" } }))).launched, true);
  assert.equal(f.focuses, 0, "Machine ID alone cannot validate changed target/session routing");
}

for (const terminal of Object.keys(apps)) {
  const target = `config-alias';$(touch /tmp/should-not-run)`;
  const f = fixture(terminal);
  const first = await f.controller.open(f.request({ machine: { ...machine, target } }));
  assert.equal(first.launched, true);
  assert.equal(first.client, null, "Ambiguous ps argv must not be reused");
  assert.equal((await f.controller.open(f.request({ machine: { ...machine, target } }))).launched, true);
  assert.equal(f.focuses, 0);
  for (const call of f.calls.filter(call => call.file !== "/bin/ps")) {
    assert.ok(call.args.includes(target), "Opaque value stays one subprocess argument");
    assert.ok(!call.args[1].includes(target), "Opaque value is never AppleScript source");
  }
}

for (const options of [{ staleOnSelection: true }, { staleOnRead: 1 }]) {
  const f = fixture("terminal", options);
  await assert.rejects(f.controller.open(f.request()), { code: "HERDR_STALE" });
  assert.equal(f.launches, 0);
  assert.equal(f.focuses, 0);
}
{
  const f = fixture("terminal", { staleOnLaunch: true });
  await assert.rejects(f.controller.open(f.request()), { code: "HERDR_STALE" });
  assert.equal(f.launches, 1);
  assert.equal(f.focuses, 0);
  f.current = true;
  assert.equal(await f.controller.find(f.request()), null, "Stale launch completion must not populate cache");
}
{
  const f = fixture("terminal", { noCapture: true, staleOnSleep: true });
  await assert.rejects(f.controller.open(f.request()), { code: "HERDR_STALE" });
  assert.equal(f.focuses, 0);
}
{
  const f = fixture("terminal", { staleOnRead: 3 });
  await f.controller.open(f.request());
  await assert.rejects(f.controller.open(f.request()), { code: "HERDR_STALE" });
  assert.equal(f.focuses, 0, "Stale identity lookup must not dispatch focus");
}
{
  const f = fixture("terminal", { staleOnFocus: true });
  await f.controller.open(f.request());
  await assert.rejects(f.controller.open(f.request()), { code: "HERDR_STALE" });
}
{
  const f = fixture("kitty");
  const [first, second] = await Promise.all([f.controller.open(f.request()), f.controller.open(f.request())]);
  assert.equal(first.launched, true);
  assert.equal(second.launched, false);
  assert.equal(f.launches, 1, "Repeated presses serialize against the first launch");
}
for (const options of [{ failAllReads: true }, { noCapture: true }]) {
  const f = fixture("kitty", options);
  assert.deepEqual(await f.controller.open(f.request()), { launched: true, client: null });
  assert.equal(f.focuses, 0);
}
{
  const f = fixture("kitty", { failRead: 1, noCapture: true });
  f.records.push(row(50, 1, null, `${apps.kitty}/Contents/MacOS/kitty /usr/bin/env -u NO_COLOR -u HERDR_REMOTE_BINARY ${command(machine)}`));
  f.records.push(row(51, 50, "ttys020", command(machine)));
  assert.equal((await f.controller.open(f.request())).client, null, "A failed prelaunch baseline cannot adopt an existing process");
}
{
  const f = fixture("terminal");
  await assert.rejects(f.controller.open({ machine, terminalPreference: "terminal" }), /current-target guard/);
  await assert.rejects(f.controller.open(f.request({ args: ["--machine", machine.id] })), /Invalid remote/);
  await assert.rejects(f.controller.open(f.request({ isCurrent: async () => true })), { code: "HERDR_STALE" });
  assert.equal(f.launches, 0);
}
console.log("Remote terminal routing tests passed");
