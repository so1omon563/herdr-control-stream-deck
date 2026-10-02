# Development

## Repository layout

- `plugin/com.so1omon563.herdr-control.sdPlugin/`: Stream Deck plugin source and assets.
- `plugin/com.so1omon563.herdr-control.sdPlugin/keybindings.js`: isolated Herdr config parsing, binding resolution, and macOS key translation.
- `plugin/com.so1omon563.herdr-control.sdPlugin/targets.js`: saved-machine identity, target-bound snapshots and focus, version checks, error classification, and polling backoff.
- `plugin/com.so1omon563.herdr-control.sdPlugin/remote-terminal.js`: dedicated local terminal clients for saved remote sessions.
- `scripts/test-targets.mjs`: target routing, schema, error, and concurrency regression checks.
- `scripts/test-property-inspector.mjs`: mocked shared-target settings and machine-list UI checks.
- `scripts/test-remote-terminal.mjs`: mocked remote terminal launch, identity, reuse, and stale-target checks.
- `scripts/test-runtime-routing.mjs`: mocked plugin-level routing and Local-only execution checks.
- `docs/REMOTE-TESTING.md`: pending physical remote validation matrix and evidence template.
- `plugin/com.so1omon563.herdr-control.sdPlugin/vendor/`: packaged runtime parser and third-party license.
- `profile/`: unpacked 15-key profile source.
- `profile-plus/`: unpacked Stream Deck+ profile source.
- `scripts/check-release.mjs`: release version and packaged-manifest contract.
- `scripts/check-next-version.mjs`: pre-tag marker and next-version contract.
- `marketplace/`: deterministic Marketplace sources, exports, provenance, and capture guidance.
- `scripts/build-marketplace-concepts.mjs`: Marketplace concept and final-media renderer.
- `scripts/validate-marketplace-assets.mjs`: final Marketplace PNG inventory, dimension, and checksum validation.
- `validate.mjs`: validation and regression checks.

## Validate

Install the pinned development tooling with Node.js 20.1 or later:

```sh
npm ci
```

The repository pins Elgato's official Stream Deck CLI at version 1.9.0.

```sh
npm test
npm run validate:streamdeck
```

The repository validation checks manifests, profile layouts, icons, agent
folder pagination and status presentation, adaptive split-or-zoom behavior,
custom binding parsing and translation, dial feedback, command mappings, and
the pane-routing regressions found during hardware testing. The Stream Deck
validation runs the official CLI against the personal plugin UUID without
updating its validation schemas during the run.

`npm test` includes the remote regression suites. They can also be run directly:

```sh
node scripts/test-targets.mjs
node scripts/test-remote-terminal.mjs
node scripts/test-property-inspector.mjs
node scripts/test-runtime-routing.mjs
```

Run these and the full commands above after integration; this documentation is
not a claim that the current combined changes have passed final validation.
Mock coverage does not replace the physical
[remote manual matrix](REMOTE-TESTING.md).

## Remote agent control

Keep the existing Local path compatible with Herdr 0.8.2. Saved-machine remote
routing requires local Herdr 0.9.1 or later and a compatible remote server; the
CLI contract was checked against Herdr 0.9.3 source. The plugin reads enabled
profiles from `herdr machine list --json` and persists a shared stable machine
ID. It does not manage SSH credentials, profiles, remote services, setup, or
upgrades. Remote preparation remains a Herdr/OpenSSH prerequisite.

Distinguish Herdr's two remote paths. In 0.9.3, machine-targeted API/control
forwarding never installs, starts, or restarts the server. Native `--remote`
TUI attach may start a missing server; if it requires an installation or an
incompatible-server replacement, Herdr can ask the user interactively. The
install prompt defaults to Yes on Enter, while server replacement defaults to
No and can stop existing pane processes if approved. Noninteractive setup
fails instead. A compatible server can attach without installation/restart.
Do not infer complete TUI compatibility solely from a successful API snapshot,
or add automatic prompt answers to the terminal path.

The remote scope is deliberately limited to status/attention, agent-folder and
dial browsing, agent focus, and dedicated Open/Back. All workspace, tab, pane,
Spaces, Rename, Settings, Sidebar, Close, and Detach execution paths must fail
with `LOCAL ONLY` for remote selections before issuing a local command or
sending a UI keystroke. Folder navigation can still expose supported agents.

Preserve these routing invariants:

- Capture the target and generation at the start of an operation. Discard stale
  results after a selection change, including a switch away and back to the same
  ID; never reinterpret them as results for the newly selected target.
- Bind snapshots and pane selections to their target. Scope attention history,
  agent-folder pages, and dial selections by target, not by pane ID alone.
- Serialize snapshots and focus operations, share in-flight reads, and back off
  repeated status failures. A failed read is not an empty agent list.
- Revalidate the saved machine before focus, including its target, session, and
  enabled state. Missing, disabled, changed, or malformed profiles fail closed
  and preserve the selection; there is no Local fallback.
- Never automatically retry agent focus after an ambiguous timeout. The remote
  may already have applied the command.
- Keep authentication, offline, version/schema, unavailable-session, and
  target-selection failures distinguishable in feedback.

Remote agent focus invokes `herdr --machine <saved-id> agent focus <pane-id>`.
Herdr broadcasts focus to attached clients of that remote session. It does not
switch an existing combined Local/remote TUI's selected endpoint. Open therefore
creates or safely reuses a dedicated local terminal client with
`herdr --remote <exact-saved-target> --session <exact-saved-session>`. Labels are
for display only; do not reconstruct a host, omit a named session, or reuse a
client based on a substring match. Back must hide only that safely identified
client, without closing remote work or unrelated local/remote terminals.

Client reuse is limited to launches tracked in the current plugin runtime,
revalidated with process ID, start time, TTY, and exact remote arguments. A
restart, ambiguous process arguments, inspection failure, or multiple TTYs in
a Ghostty/kitty process must not cause broad terminal focus. Open creates a
fresh dedicated window when safe reuse cannot be established; Back leaves
unrecognized clients alone. Do not simulate terminal keystrokes or answer
authentication prompts automatically.

The four terminal paths have mock coverage, not physical macOS validation.
Record exact versions and outcomes in `SUPPORT.md` only after completing the
corresponding [manual cases](REMOTE-TESTING.md); preserve the older Local and
release-installation evidence separately.

## Marketplace media

Regenerate and validate the deterministic app icon, thumbnail, and gallery
images with:

```sh
npm run build:marketplace
npm run validate:marketplace
```

The build uses the exact-pinned Node.js renderer and Inter font sources from
the development dependencies. It writes final PNG files and their checksum
manifest under `marketplace/exports/`. The build performs no network request,
Marketplace submission, or publication. Provenance and the deferred
demonstration-video plan are documented in `marketplace/`.

## Runtime dependency

The plugin packages the CommonJS runtime and BSD 3-Clause license from the
exact pinned `smol-toml` dependency. After changing that dependency, refresh
the committed runtime files with:

```sh
npm run build:vendor
```

Do not hand-edit the vendored files. `npm test` compares them byte for byte
with the installed dependency so dependency updates cannot silently leave the
packaged parser stale.
Source maps are copied only when the dependency ships one; refreshing a version
without a source map removes any stale vendored map.

`keybindings.js` caches the parsed Herdr keys table using the config path and
file metadata. A missing config uses documented defaults. Any unreadable,
invalid, unbound, or unsupported configured value fails closed with `CUSTOM
KEYS`; it never falls back blindly after an explicit unsupported assignment.

The shared `workspace-picker` command tracks picker state by attached terminal
client. Its first press sends the resolved configured binding; its next press
sends Escape, which Herdr reserves for leaving navigate mode. The close path
does not resolve the configurable opening binding. Successful sends are the
only state transitions, concurrent presses are ignored, and state is discarded
when the attached client disappears. Pruning checks tracked clients
even when the global terminal preference currently excludes their terminal, so
preference changes do not look like disconnections. Herdr 0.8.2 does not
expose navigate-mode state through its CLI or socket snapshot, so
keyboard-driven dismissal outside Herdr Control cannot be observed.

## Profiles

Edit the unpacked profile sources, then regenerate the embedded profile archives:

```sh
npm run build:profiles
```

Do not hand-edit the `.streamDeckProfile` archives.

The Stream Deck+ Pane dial and 15-key Pane key both use the shared
`pane-primary` command. It resolves panes only in the focused tab, splits a
single pane with `--focus`, and toggles zoom when multiple panes exist. Each
action stores `splitDirection` as `right` or `down`; the Property Inspector
labels those choices **Side by side (Split Right)** and **Stacked (Split
Down)**. On the 15-key profile, the adaptive action must leave its static
profile title unset so runtime feedback can display `SPLIT` or `ZOOM`; the
direction-specific split icon communicates the configured orientation.

Both root profiles use the hidden Agent action with `role: attention`. It
reuses the live snapshot refresh and existing agent artwork, prioritizes
blocked and then unseen done agents for repeated-press focus, and leaves its
static profile title unset for runtime state and count feedback. The full
Agents child page remains unchanged and is opened from More. Attention refresh
must not update the per-device Agents-page index.

## Packaging

Create a local installer with:

```sh
npm run pack:streamdeck
```

The command validates the plugin and writes
`dist/com.so1omon563.herdr-control.streamDeckPlugin`, replacing an existing
local artifact. The plugin's `.sdignore` excludes Finder metadata. Packaging
does not install, publish, or submit the plugin.

For a versioned installer and SHA-256 checksum, use the matching repository
version and numeric SemVer tag:

```sh
npm run build:release -- v0.2.0
```

This remains a local build. The marker-driven GitHub workflow, authorization
boundary, version contract, and existing-tag recovery path are documented in
[`RELEASING.md`](RELEASING.md).

## Clean-install validation

The personal package was clean-installed with Stream Deck 7.5.0 (22885) on a
15-key Stream Deck and a Stream Deck+. The installed plugin reported UUID
`com.so1omon563.herdr-control`, version `0.1.0.0`, and author `so1omon563`.
Both bundled profiles installed for their intended devices, and the existing
default profiles remained intact.

The direct GitHub distribution path was separately validated from the
published `v0.1.0` release asset on 2026-08-29. After the installed plugin and
both Herdr profiles were removed, the freshly downloaded installer passed its
published SHA-256 checksum,
`c0e9f973a576be46dc1b3c396c0e8503be3b05954747998d11314599d3d09ae2`,
and was opened directly without repository or npm tooling. Stream Deck
installed version `0.1.0.0` and automatically imported both v3 profiles with
their correct device targets. Representative hardware smoke tests passed on
the 15-key deck and Stream Deck+: Open Herdr and profile switching, workspace,
tab, and pane navigation, Spaces open and close, agent focus, and Back. The
Plus pass also covered all four dials and agent-dial focus.

An early clean-install test exposed an unsupported `1.1` profile format in the
15-key archive. Later testing found that a legacy `1.0` archive with nested
`.sdProfile` child bundles caused the predefined-profile installer to loop,
while removing only those suffixes caused Stream Deck to discard the child
folders as orphans. Both bundled profiles now use the modern `3.0` structure:
one outer profile bundle, a root page, and plain UUID child-page directories.
The repository validation checks both archive roots and rejects nested child
profile bundles before packaging.

The 15-key v3 profile clean-installed with its More, Resize, and Agents folder
tree intact. Hardware testing displayed and focused six live agents in its
ten-slot folder. Stream Deck+ testing covered empty, two-agent, and six-agent
states, including four-slot pagination across two pages. Unused navigation and
agent slots render black so the physical keys appear off.

Adaptive Pane hardware testing covered both split preferences on both bundled
profiles. From a single-pane tab, each action created and focused the expected
side-by-side or stacked pane. With multiple panes, each action switched to Zoom
feedback and toggled zoom. The 15-key action also changed its icon and concise
runtime title between the Split and Zoom states.

A hardware smoke test placed `com.so1omon563.herdr-control.toggle` on the
existing 15-key default profile and confirmed that pressing it opens Herdr and
returns to the previous application as expected.

## Lifecycle validation

The personal package was exercised through an update and uninstall cycle with
Stream Deck 7.5.0 (22885) on macOS 26.5.2:

- Installing a temporary `0.1.0.1` package over `0.1.0.0` preserved both
  bundled profile IDs and the existing action settings.
- Uninstalling removed the plugin directory but retained both bundled profiles
  and the configured action in the existing default profile.
- Reinstalling the canonical `0.1.0.0` package restored the retained action and
  did not duplicate profiles.
- Uninstalling did not revoke Stream Deck's macOS permissions because those
  grants belong to the host application.

A reset-permissions test restarted Stream Deck before exercising `SPACES`.
The denied action returned AppleScript error `1002`, opened **Privacy &
Security → Accessibility**, and left **Elgato Stream Deck** disabled for the
user to approve. Enabling the grant restored the action immediately.

The validation suite directly covers the missing-Herdr, unavailable selected
terminal, no-supported-terminal, Accessibility, and Automation error paths and
their user-visible feedback mapping.
