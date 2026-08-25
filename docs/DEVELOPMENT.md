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
