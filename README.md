# Herdr Control for Stream Deck

Herdr Control brings workspace, tab, pane, and agent navigation from
[Herdr](https://herdr.dev/) to Elgato Stream Deck hardware.

> [!IMPORTANT]
> Herdr Control is available for direct installation from GitHub as pre-release
> software. It is not yet available through Elgato Marketplace. Current support
> is limited to the exact software and hardware evidence in the
> [support matrix](docs/SUPPORT.md).

[Download Herdr Control v0.1.1](https://github.com/so1omon563/herdr-control-stream-deck/releases/download/v0.1.1/Herdr-Control-v0.1.1.streamDeckPlugin)
or [view all releases](https://github.com/so1omon563/herdr-control-stream-deck/releases).

## What it does

- Launches or focuses Herdr in Ghostty, kitty, iTerm2, or Terminal.app.
- Switches supported hardware to a dedicated Herdr profile while Herdr is
  active.
- Navigates and creates workspaces and tabs.
- Navigates, splits, resizes, and zooms panes, including mixed layouts.
- Browses live agents and focuses the selected agent's pane.
- Opens Spaces, Settings, Sidebar, Rename, and Close interactions.
- Supports common custom Herdr prefixes and bindings for UI-only actions.
- Adds configurable Herdr Command actions to custom Stream Deck profiles.

## Requirements

- macOS 13 or later on Apple silicon.
- Stream Deck 6.6 or later.
- Herdr 0.8.2 installed in a [supported location](#supported-locations).
- A compatible Node.js runtime available from Homebrew, `/usr/local`, `PATH`,
  or Stream Deck.
- A 15-key Stream Deck or Stream Deck+.
- Ghostty, kitty, iTerm2, or Terminal.app.

Only the exact versions in the [support matrix](docs/SUPPORT.md) are covered by
current test evidence. Intel Macs, other Stream Deck models, and other Herdr
versions are not currently claimed.

## Install from GitHub

No Git clone, npm command, or development tooling is required.

1. Download the current
   [Herdr Control installer](https://github.com/so1omon563/herdr-control-stream-deck/releases/download/v0.1.1/Herdr-Control-v0.1.1.streamDeckPlugin)
   and its
   [SHA-256 checksum](https://github.com/so1omon563/herdr-control-stream-deck/releases/download/v0.1.1/Herdr-Control-v0.1.1.streamDeckPlugin.sha256).
2. Optionally verify the download in Terminal:

   ```sh
   cd ~/Downloads
   shasum -a 256 -c Herdr-Control-v0.1.1.streamDeckPlugin.sha256
   ```

   A valid download reports `Herdr-Control-v0.1.1.streamDeckPlugin: OK`.
3. Double-click `Herdr-Control-v0.1.1.streamDeckPlugin` and approve the plugin
   installation in Stream Deck.
4. When Stream Deck asks to install the bundled profiles, choose **Install
   Profile(s)**. `HERDR` targets the 15-key Stream Deck and `HERDR Plus`
   targets Stream Deck+.

### If the bundled profiles do not appear

The installed plugin retains both profile files. In Finder, choose **Go → Go
to Folder** and open:

```text
~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.so1omon563.herdr-control.sdPlugin/profiles/
```

Double-click the profile for the connected device:

- `HERDR.streamDeckProfile` for the 15-key Stream Deck
- `HERDR Plus.streamDeckProfile` for Stream Deck+

Do not import the unpacked profile source directories from the repository.

## First use

1. In the Stream Deck app, select a normal profile that you use outside Herdr.
2. Find **Herdr Control** in the action list and drag **Open Herdr** onto a key.
3. Select that key and choose a terminal in the Property Inspector. **Auto**
   tries Ghostty, kitty, iTerm2, then Terminal.app.
4. Press the key. Herdr Control launches or focuses Herdr and switches the
   connected supported device to its bundled Herdr profile.
5. Press **BACK** on the bundled profile to return to the previous profile.

Spaces, Settings, Sidebar, Rename, and Close may need macOS Accessibility and
Automation permission the first time they are used. See
[macOS permissions](#macos-permissions).

## Everyday controls

### 15-key Stream Deck

| Row | Key 1 | Key 2 | Key 3 | Key 4 | Key 5 |
| --- | --- | --- | --- | --- | --- |
| Top | Previous workspace | Next workspace | New workspace | More | Agents |
| Middle | Previous tab | Next tab | New tab | Split right | Split down |
| Bottom | Previous pane | Next pane | Adaptive Pane | Detach | Back |

The adaptive Pane key splits and focuses a new pane when the current tab has
one pane. With multiple panes, it changes to Zoom and toggles pane zoom.

### Stream Deck+

| Key row | Key 1 | Key 2 | Key 3 | Key 4 |
| --- | --- | --- | --- | --- |
| Top | More | Agents | Rename | Close |
| Bottom | Split right | Split down | Detach | Back |

| Dial | Rotate | Press |
| --- | --- | --- |
| Workspaces | Browse workspaces | Create workspace |
| Tabs | Browse tabs | Create tab |
| Panes | Browse panes | Split one pane or toggle zoom |
| Agents | Browse live agents | Focus selected agent |

### Shared folders

- **More** contains Spaces, Resize, Settings, and Sidebar.
- **Resize** contains titleless directional controls for left, up, right, and
  down.
- **Agents** shows agent type, workspace, and status. Press an occupied slot to
  focus that agent. Pagination controls appear only when needed.
- Stream Deck+ **Rename** and **Close** folders target the current workspace,
  tab, or pane. These commands can be added to a 15-key or custom profile with
  the configurable Herdr Command action.

## Configuration

### Terminal selection

Select an **Open Herdr** key in Stream Deck to choose Auto, Ghostty, kitty,
iTerm2, or Terminal.app. The selection is shared by Herdr Control. Auto uses
the first installed terminal in the order shown in the Property Inspector.

### Herdr Command actions

Drag **Herdr Command** from the Herdr Control action list onto any custom
profile. New actions default to **Next Workspace**. The Property Inspector can
switch the key among supported workspace, tab, pane, resize, Settings,
Sidebar, Detach, Rename, and Close commands. The key title and icon update to
match the selected command.

For **Adaptive Pane (Split or Zoom)**, choose whether a single-pane tab should
open **Side by side (Split Right)** or **Stacked (Split Down)**. Multiple-pane
tabs always use the same control to toggle zoom.

### Custom Herdr keybindings

Most actions use the Herdr CLI and do not depend on keybindings. Spaces,
Settings, Sidebar, Rename, and Close use Herdr's configured key sequences.
Herdr Control reads `HERDR_CONFIG_PATH` or `~/.config/herdr/config.toml` and
uses `keys.prefix` plus these fields:

- `keys.workspace_picker`
- `keys.settings`
- `keys.toggle_sidebar`
- `keys.rename_workspace`, `keys.rename_tab`, and `keys.rename_pane`
- `keys.close_workspace`, `keys.close_tab`, and `keys.close_pane`

Missing values use Herdr 0.8.2 defaults. A binding can be a string or an
array; arrays use the first value Herdr Control can safely simulate. Supported
forms are `prefix+key` sequences and direct chords with Ctrl, Shift,
Alt/Option, Meta, or Cmd/Super.

Supported keys include ASCII letters and digits, F1 through F24, Enter, Tab,
Escape, Backspace, arrows, Space, and Herdr's named punctuation. Hyper,
indexed ranges such as `1..9`, non-ASCII keys, and unmodified direct printable
keys are not supported. Invalid or unsupported values fail closed with
`CUSTOM KEYS` instead of sending a guessed sequence.

After editing the Herdr configuration, run `herdr server reload-config` or
restart Herdr. Herdr Control notices saved file changes automatically.

## macOS permissions

Spaces, Settings, Sidebar, Rename, and Close send Herdr key commands through
macOS System Events. Enable these entries for the Stream Deck app:

1. **System Settings → Privacy & Security → Accessibility → Elgato Stream
   Deck**
2. **System Settings → Privacy & Security → Automation → Elgato Stream Deck →
   System Events**

If an action displays `ALLOW ACCESS`, enable **Elgato Stream Deck** in the
Accessibility pane that opens. If it displays `ALLOW AUTOMATION`, enable
**System Events** under Elgato Stream Deck in Automation.

Terminal.app and iTerm2 may request an additional Automation grant when Herdr
Control focuses or closes their windows. Enable the affected terminal under
the Stream Deck Automation entry. Quit and reopen Stream Deck after changing a
permission if the action still fails, especially after a macOS upgrade.

## Troubleshooting

Stream Deck shows its red exclamation mark when an action fails. Herdr Control
also uses temporary key titles for known prerequisites:

| Key title | What to do |
| --- | --- |
| `INSTALL HERDR` | Install Herdr in one of the supported locations below. |
| `INSTALL <TERMINAL>` | Install the selected terminal or choose another terminal on the Open Herdr key. |
| `NO TERMINAL` | Install a supported terminal or choose an installed one instead of Auto. |
| `ALLOW ACCESS` | Enable Elgato Stream Deck in macOS Accessibility. |
| `ALLOW AUTOMATION` | Enable System Events under Elgato Stream Deck in macOS Automation. |
| `CUSTOM KEYS` | Correct the Herdr TOML file or use a binding from the supported subset. |

If the profiles are missing, follow
[the manual profile import steps](#if-the-bundled-profiles-do-not-appear).

Detailed failures are written to:

```text
~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.so1omon563.herdr-control.sdPlugin/logs/
```

### Supported locations

Herdr Control looks for `herdr` at:

- `/opt/homebrew/bin/herdr`
- `/usr/local/bin/herdr`
- `~/.local/bin/herdr`
- `~/.cargo/bin/herdr`

Supported terminal application locations are:

- Ghostty: `/Applications/Ghostty.app` or `~/Applications/Ghostty.app`
- kitty: `/Applications/kitty.app` or `~/Applications/kitty.app`
- iTerm2: `iTerm.app` or `iTerm2.app` under `/Applications` or
  `~/Applications`
- Terminal.app: `/System/Applications/Utilities/Terminal.app` or
  `/Applications/Utilities/Terminal.app`

## Known limitations

- Herdr 0.8.2 does not expose client navigation mode. Spaces tracks picker
  opens and closes initiated through Herdr Control. Dismissing the picker from
  Herdr's keyboard can leave the toggle out of sync until the Stream Deck
  plugin restarts.
- Alt, Cmd/Super, and punctuation behavior can depend on the terminal, tmux
  configuration, and keyboard layout. Non-US layouts are not currently
  claimed.
- Other Stream Deck models have not been tested.
- Native built-in action invocation is under discussion in
  [herdr#1624](https://github.com/herdrdev/herdr/discussions/1624).

## Upgrades and uninstall

Double-clicking a newer `.streamDeckPlugin` package updates Herdr Control in
place and preserves imported profiles and action settings.

Uninstalling Herdr Control from Stream Deck Preferences removes the plugin but
leaves imported profiles and configured keys. Those keys remain unavailable
until the plugin is reinstalled or the actions are removed manually.
Accessibility and Automation grants also remain because they belong to the
Stream Deck app, not this plugin.

## Support and development

Use the [support matrix](docs/SUPPORT.md) for exact test evidence and current
support boundaries. Report reproducible bugs through
[GitHub Issues](https://github.com/so1omon563/herdr-control-stream-deck/issues).

Contributors can run:

```sh
npm ci
npm test
npm run validate:streamdeck
```

Create a local installer with `npm run pack:streamdeck`. This packages the
plugin but does not install or publish it. See
[Development](docs/DEVELOPMENT.md), [Releasing](docs/RELEASING.md), and the
[Roadmap](docs/ROADMAP.md) for maintainer details.

## License and identity

Herdr Control is available under the [MIT License](LICENSE).

- Product: **Herdr Control**
- Repository: `herdr-control-stream-deck`
- Plugin UUID: `com.so1omon563.herdr-control`
- Author: `so1omon563`

Herdr Control is an independent integration and is not affiliated with Herdr
or Elgato. Herdr and Stream Deck are trademarks of their respective owners.
