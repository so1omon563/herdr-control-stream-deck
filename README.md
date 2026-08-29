# Herdr Control for Stream Deck

Herdr Control brings workspace, tab, pane, and agent navigation from [Herdr](https://herdr.dev/) to Elgato Stream Deck hardware.

> [!WARNING]
> This project is under active development and is not ready for public installation or Marketplace submission.

## What works today

- Launch or focus Herdr in Ghostty, kitty, iTerm2, or Terminal.app.
- Automatically switch to dedicated 15-key Stream Deck and Stream Deck+ profiles.
- Navigate and create workspaces and tabs.
- Navigate, split, resize, and zoom panes, including mixed horizontal and vertical layouts. The Pane dial press and 15-key Pane action split a single-pane tab and toggle zoom when the tab already has multiple panes.
- Browse and focus agents from a dedicated folder on both bundled profiles or
  from the Stream Deck+ dial.
- Open Herdr-native Settings, Rename, and Close interactions.
- Respect common custom Herdr prefixes and bindings for Spaces, Settings,
  Sidebar, Rename, and Close.
- Add configurable Herdr Command actions to custom Stream Deck profiles.

Select the Pane dial or adaptive Pane key in Stream Deck to choose whether a
single-pane tab opens side by side with **Split Right** or stacked with
**Split Down**. Side by side is the default. Explicit Split Right, Split Down,
and Toggle Zoom commands remain available.

## Requirements

- macOS 13 or later.
- Stream Deck 6.6 or later.
- Herdr 0.8.2 available from a standard installation path.
- A compatible Node.js runtime supplied by Stream Deck or installed in a
  supported system path.
- A 15-key Stream Deck or Stream Deck+.

Only the exact versions and hardware listed in the
[support matrix](docs/SUPPORT.md) are covered by current test evidence.

### Supported install locations

Herdr Control looks for the `herdr` executable at `/opt/homebrew/bin/herdr`,
`/usr/local/bin/herdr`, `~/.local/bin/herdr`, and `~/.cargo/bin/herdr`.

Supported terminal applications are discovered in these locations:

- Ghostty: `/Applications/Ghostty.app` or `~/Applications/Ghostty.app`
- kitty: `/Applications/kitty.app` or `~/Applications/kitty.app`
- iTerm2: `iTerm.app` or `iTerm2.app` under `/Applications` or `~/Applications`
- Terminal.app: `/System/Applications/Utilities/Terminal.app` or `/Applications/Utilities/Terminal.app`

If an action displays `INSTALL HERDR`, install Herdr in one of the supported
locations. `INSTALL <TERMINAL>` means the selected terminal is unavailable;
install it or select another terminal in the action settings. `NO TERMINAL`
means Auto could not find any supported terminal. Detailed failures are written
under `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` in
`com.so1omon563.herdr-control.sdPlugin/logs/`.

## Known limitations

- Custom Herdr bindings outside the documented subset below display `CUSTOM
  KEYS` instead of sending a potentially incorrect key sequence.
- The current build and installation process is for development only.
- Other Stream Deck models have not been tested yet.

### Custom Herdr keybindings

Herdr Control parses `HERDR_CONFIG_PATH` or
`~/.config/herdr/config.toml` with the bundled `smol-toml` parser. It reads
`keys.prefix` and these nine action fields:

- `keys.workspace_picker`
- `keys.settings`
- `keys.toggle_sidebar`
- `keys.rename_workspace`, `keys.rename_tab`, and `keys.rename_pane`
- `keys.close_workspace`, `keys.close_tab`, and `keys.close_pane`

Missing fields retain Herdr 0.8.2's documented defaults. An action binding may
be a string or an array; arrays use the first value Herdr Control can simulate
safely. Supported bindings include `prefix+key` sequences and direct modified
chords. Modifier names are `ctrl` or `control`, `shift`, `alt` or `option`,
`meta` as Herdr's Alt alias, and `cmd`, `command`, or `super`.

The supported key set is ASCII letters and digits, F1 through F24, Enter,
Return, Tab, Esc, Escape, Backspace, the arrow keys, Space, and Herdr's named
punctuation: `minus`, `comma`, `period`, `slash`, `backslash`, `quote`,
`double_quote`, `double-quote`, `semicolon`, `colon`, `percent`, `ampersand`,
`backtick`, and `plus`. Equivalent single-character ASCII punctuation is also
supported inside prefix sequences or modified chords.

Unmodified direct printable bindings, `hyper`, indexed ranges such as `1..9`,
non-ASCII keys, invalid TOML, unreadable files, and values with unsupported
types fail closed with `CUSTOM KEYS`. Alt, Cmd/Super, and punctuation behavior
can still depend on the terminal, tmux configuration, and keyboard layout;
non-US layouts are not currently claimed. After editing Herdr's config, reload
Herdr with `herdr server reload-config` or restart it. Herdr Control notices the
file change automatically.

Workspace and tab creation and cycling, pane navigation and layout controls, agent focus, Detach, and Back continue to use Herdr CLI or plugin-owned behavior. Native built-in action invocation is being discussed upstream in [herdr#1624](https://github.com/herdrdev/herdr/discussions/1624).

### First-run macOS permissions

Spaces, Settings, Sidebar, Rename, and Close send Herdr key commands through macOS System Events. Enable both of these entries for the Stream Deck app:

1. **System Settings → Privacy & Security → Accessibility → Elgato Stream Deck**
2. **System Settings → Privacy & Security → Automation → Elgato Stream Deck → System Events**

If a protected action displays `ALLOW ACCESS`, Herdr Control opens the Accessibility pane. Enable **Elgato Stream Deck**, then press the action again. If it displays `ALLOW AUTOMATION`, enable **System Events** under the Stream Deck entry in the Automation pane.

Terminal.app and iTerm2 may request an additional Automation grant when Herdr Control focuses or closes their windows. Enable the affected terminal under **System Settings → Privacy & Security → Automation → Elgato Stream Deck**. If macOS retains a stale denial, quit and reopen Stream Deck after changing the permission.

### Upgrades and uninstall

Installing a newer package updates the plugin in place and preserves existing profiles and action settings. Uninstalling from Stream Deck Preferences removes the plugin bundle but leaves imported Herdr profiles and configured keys in place. Those keys remain unavailable until the plugin is reinstalled or the actions are removed manually.

Accessibility and Automation grants belong to the Stream Deck app, not the Herdr Control plugin, so uninstalling the plugin does not remove them.

## Development

Run the validation suite with:

```sh
npm ci
npm test
npm run validate:streamdeck
```

Create a local `.streamDeckPlugin` installer with `npm run pack:streamdeck`.
This packages the plugin but does not install or publish it.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the repository layout,
[docs/SUPPORT.md](docs/SUPPORT.md) for the tested environment, and
[docs/ROADMAP.md](docs/ROADMAP.md) for the release blockers.

## License

Herdr Control is available under the [MIT License](LICENSE).

## Project identity

- Product: **Herdr Control**
- Repository: `herdr-control-stream-deck`
- Plugin UUID: `com.so1omon563.herdr-control`
- Author: `so1omon563`

Herdr Control is an independent integration and is not affiliated with Herdr or Elgato. Herdr and Stream Deck are trademarks of their respective owners.
