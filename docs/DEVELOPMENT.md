# Development

## Repository layout

- `plugin/com.so1omon563.herdr-control.sdPlugin/`: Stream Deck plugin source and assets.
- `profile/`: unpacked 15-key profile source.
- `profile-plus/`: unpacked Stream Deck+ profile source.
- `validate.mjs`: dependency-free validation and regression checks.

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
dial feedback, command mappings, and the pane-routing regressions found during
hardware testing. The Stream Deck validation runs the official CLI against the
personal plugin UUID without updating its validation schemas during the run.

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

## Packaging

Create a local installer with:

```sh
npm run pack:streamdeck
```

The command validates the plugin and writes
`dist/com.so1omon563.herdr-control.streamDeckPlugin`, replacing an existing
local artifact. The plugin's `.sdignore` excludes Finder metadata. Packaging
does not install, publish, or submit the plugin.

## Clean-install validation

The personal package was clean-installed with Stream Deck 7.5.0 (22885) on a
15-key Stream Deck and a Stream Deck+. The installed plugin reported UUID
`com.so1omon563.herdr-control`, version `0.1.0.0`, and author `so1omon563`.
Both bundled profiles installed for their intended devices, and the existing
default profiles remained intact.

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
