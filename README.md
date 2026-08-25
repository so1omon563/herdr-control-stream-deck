# Herdr Control for Stream Deck

Herdr Control brings workspace, tab, pane, and agent navigation from [Herdr](https://herdr.dev/) to Elgato Stream Deck hardware.

> [!WARNING]
> This project is under active development and is not ready for public installation or Marketplace submission.

## What works today

- Launch or focus Herdr in Ghostty, kitty, iTerm2, or Terminal.app.
- Automatically switch to dedicated 15-key Stream Deck and Stream Deck+ profiles.
- Navigate and create workspaces and tabs.
- Navigate, split, and zoom panes, including mixed horizontal and vertical layouts.
- Browse and focus agents from a Stream Deck+ dial.
- Open Herdr-native rename and close interactions.

## Requirements

- macOS 13 or later.
- Stream Deck 6.6 or later.
- Herdr available from a standard installation path.
- A 15-key Stream Deck or Stream Deck+.

## Known limitations

- Spaces, Sidebar, Rename, and Close currently support only Herdr's default keybindings. Herdr Control blocks an affected action when it detects a relevant override instead of sending the wrong default sequence.
- The current build and installation process is for development only.
- Other Stream Deck models have not been tested yet.
- Accessibility and Automation permissions may be required to focus terminal applications and send Herdr key commands.

### Custom Herdr keybindings

Herdr Control reads `HERDR_CONFIG_PATH` or `~/.config/herdr/config.toml` only to detect explicit overrides. It does not parse or execute configured bindings yet. If `keys.prefix` or the affected action field is assigned explicitly, the corresponding Stream Deck action displays `CUSTOM KEYS` and stops.

The affected fields are `keys.workspace_picker`, `keys.toggle_sidebar`, `keys.rename_workspace`, `keys.rename_tab`, `keys.rename_pane`, `keys.close_workspace`, `keys.close_tab`, and `keys.close_pane`. An explicit `keys.prefix` assignment affects all eight. Even an explicit assignment containing the default value is treated as an override until automatic binding support is implemented.

Workspace and tab creation and cycling, pane navigation and layout controls, agent focus, Detach, and Back continue to use Herdr CLI or plugin-owned behavior. Native built-in action invocation is being discussed upstream in [herdr#1624](https://github.com/herdrdev/herdr/discussions/1624).

## Development

Run the validation suite with:

```sh
npm test
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the repository layout and [docs/ROADMAP.md](docs/ROADMAP.md) for the release blockers.

## Project identity

- Product: **Herdr Control**
- Repository: `herdr-control-stream-deck`
- Plugin UUID: `com.so1omon563.herdr-control`
- Author: `so1omon563`

Herdr Control is an independent integration and is not affiliated with Herdr or Elgato. Herdr and Stream Deck are trademarks of their respective owners.
