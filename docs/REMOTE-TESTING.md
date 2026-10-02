# Remote Agent Control: Manual Validation

Status: **pending physical validation**. The first remote version has automated
and mock coverage, including all four terminal adapters, but no physical macOS,
two-machine remote-session, or Stream Deck run yet. Existing release installs
and Local hardware tests in [SUPPORT.md](SUPPORT.md) do not cover this matrix.

## Preparation

Use a test Mac and remote hosts/sessions where changing agent focus is safe.
Run the repository tests described in [DEVELOPMENT.md](DEVELOPMENT.md) before
installing a locally built test package. Building a package does not publish a
release or establish hardware support.

Record local and remote Herdr versions, macOS version and architecture, Stream
Deck software version, plugin commit/build, terminal versions, device model,
and the outcome of every case. Use local Herdr 0.9.1 or later and compatible
remote servers; 0.9.3 is the source-contract reference, not a hardware-tested
version claim. Retain a separate Local 0.8.2 regression run.

Prepare two enabled saved Herdr machines, including an explicit nondefault
session. Prefer two remote hosts; distinct saved sessions on one host can help
with isolated routing checks but do not replace two-host evidence. Configure
OpenSSH authentication and host-key trust through the normal Herdr/SSH workflow
before testing. Confirm both saved targets and sessions work in Herdr itself.
Remote Herdr may need separate setup or upgrading; the plugin provides neither
an installation nor an upgrade guarantee. Native Herdr remote attach may start
a missing server or ask you to install a binary/replace an incompatible server.
The plugin must not answer those prompts. In 0.9.3, Enter approves the default
installation prompt; server replacement defaults to No and can stop remote pane
processes if accepted. Cancel setup prompts unless that separate change is
intended and authorized.

Keep a local Herdr client and an unrelated terminal window open while testing.
For focus-broadcast cases, also attach a second client to the same remote
session. Avoid recording credentials, private keys, or full sensitive logs in
the results.

## Matrix

Repeat Open, focus, and Back cases with explicit **Ghostty**, **kitty**,
**iTerm2**, and **Terminal.app** selections, then check **Auto**. Run the
applicable key/folder cases on both the **15-key Stream Deck** and **Stream
Deck+**, with dial-specific cases on the Plus. Do not mark an entire terminal
or device as tested after a mock run or a single successful action.

| Case | Exercise | Required observation |
| --- | --- | --- |
| Local regression | Select Local and exercise Open/Back, agent status/focus, workspace/tab/pane controls, UI shortcuts, and Plus dials; repeat the established Local path on Herdr 0.8.2. | Existing Local behavior remains available. An unavailable remote machine list does not prevent explicit Local control. |
| Saved identity and persistence | Select remote A in one action; inspect another action and both profiles, then restart the plugin. Rename A in Herdr and refresh the list. | All actions share the selected stable ID; restart and label changes do not select another machine. |
| Two remote targets and named sessions | Give A and B visibly different agents. Use explicit nondefault sessions and switch Local → A → B → A. | Status, attention, folder, dial, and focus come only from the intended target and saved session. Dedicated clients use the exact saved target and session. |
| Identical pane IDs | Arrange matching pane IDs across Local, A, and B, or use controlled fixtures that reproduce the collision. Select different agents/pages and mark done agents seen on each. | Pane IDs alone cannot transfer selection, attention history, or pages between targets. Record if a real collision could not be exercised. |
| Rapid changes with blocked work | Delay or block a remote snapshot/focus preparation, switch A → B → A, and issue more browsing/focus input. Release the delayed operation. | Stale results do not overwrite current status or issue a new focus/launch after the target changes. A command already dispatched may have completed only against its originally captured target. No Local fallback. |
| Disabled, deleted, or changed profile | While A is selected, disable/delete it, refresh, and try focus/Open. Also change its saved target or session while a snapshot is displayed. | A remains selected but unavailable; controls request a valid machine or a fresh snapshot. No silent reselection or command against an old/new destination from stale state. |
| Offline, authentication, and version failures | Separately make a target unreachable, use a test SSH authentication/host-key failure, and test unsupported local/remote Herdr versions or response schemas. Restore service afterward. | Distinct offline/authentication/version feedback, bounded polling with recovery, and no false empty-agent success or Local fallback. Never bypass a security warning to complete the case. |
| Native attach setup prompts | In an isolated test environment, exercise a remote whose API works but whose TUI compatibility requires setup, if reproducible. Observe and cancel any Herdr install/replacement prompt. | The plugin does not type a response, approve setup, or restart the server. Record native Herdr behavior separately from plugin forwarding; do not report a cancelled setup as successful attach. |
| Valid empty session | Connect successfully to a saved remote session with no live agents. | Empty/no-agent presentation is shown without an offline/authentication/version error; no focus is issued. |
| Agent attention, folder, and dial | Exercise blocked/done/working/idle states, repeated attention presses, enough agents for pagination, unused slots, and Plus dial browse/press. | Correct remote status, page bounds, inactive empty slots, and focus on the selected remote agent; attention refresh does not reset the folder page. |
| Unsupported controls | With A selected, press workspace/tab/pane navigation/create, split/resize/zoom, Spaces, Rename, Settings, Sidebar, Close, and Detach; include custom Herdr Command keys and non-agent dials. | Action controls show `LOCAL ONLY`; no local or remote navigation, mutation, UI shortcut, close, or detach is sent. Navigation to the Agents folder remains usable. |
| Dedicated terminal lifecycle | For each terminal, Open A repeatedly, focus an agent, open B, return to A, and press Back. Close/reopen the dedicated client, restart the plugin, and test ambiguous process identity or additional Ghostty/kitty TTYs; leave unrelated local and remote windows open throughout. | Exact-client reuse only for known current-run clients with safe identity; otherwise a fresh window and no broad focus. Correct session after relaunch; Back hides only the identified dedicated client, returns to the previous profile, and leaves agents/sessions/unrelated windows untouched. |
| Other attached clients and combined TUI | Keep another client attached to A's saved session and an existing combined Local/remote TUI open. Focus an A agent from Stream Deck. | The other same-session client receives Herdr's focus broadcast. The combined TUI is not assumed to change endpoint; the dedicated A client is shown. Clients on B and Local remain unaffected. |

## Recording results

For each run, record:

- Date, commit/build, local and remote Herdr versions, and exact saved session
  names (redact host details as needed).
- macOS, Stream Deck software, device model, and selected terminal/version.
- Case, actions performed, expected versus actual behavior, and pass/fail/not run.
- Any permission prompt, delayed operation, stale-state case, or recovered error.
- Relevant redacted logs or screenshots and any limitation in reproducing a case.

Only promote the exact completed coverage to `SUPPORT.md`. Keep a failed or
unrun case visible; a passing Local install, automated suite, or source review
must not be described as a successful physical remote run.
