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

The repository validation checks manifests, profile layouts, icons, dial
behavior, command mappings, and the pane-routing regressions found during
hardware testing. The Stream Deck validation runs the official CLI against the
personal plugin UUID without updating its validation schemas during the run.

## Profiles

Edit the unpacked profile sources, then regenerate the embedded profile archives:

```sh
npm run build:profiles
```

Do not hand-edit the `.streamDeckProfile` archives.

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

This test exposed an unsupported `1.1` profile format version in the 15-key
archive. Stream Deck logged the import as corrupted and rejected it. The
15-key source now uses the supported `1.0` format, matching Elgato's bundled
15-key profiles, and the rebuilt archive imports successfully.

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
