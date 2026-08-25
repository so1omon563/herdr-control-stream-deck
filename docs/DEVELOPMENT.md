# Development

## Repository layout

- `plugin/com.so1omon563.herdr-control.sdPlugin/`: Stream Deck plugin source and assets.
- `profile/`: unpacked 15-key profile source.
- `profile-plus/`: unpacked Stream Deck+ profile source.
- `validate.mjs`: dependency-free validation and regression checks.

## Validate

```sh
npm test
```

The validation checks manifests, profile layouts, icons, dial behavior, command mappings, and the pane-routing regressions found during hardware testing.

## Profiles

Edit the unpacked profile sources, then regenerate the embedded profile archives:

```sh
npm run build:profiles
```

Do not hand-edit the `.streamDeckProfile` archives.

## Packaging

Public packages should be validated and built with Elgato's Stream Deck CLI. That release workflow will be added after the plugin identity, configuration handling, and supported-device matrix are stable.
