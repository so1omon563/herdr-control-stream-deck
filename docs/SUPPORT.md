# Support Matrix

Herdr Control is pre-release software. This matrix separates declared minimums
from exact versions and hardware that have been verified. A declared minimum is
not evidence that every intermediate version has been tested.

## Software

| Component | Declared boundary | Verified environment | Evidence boundary |
| --- | --- | --- | --- |
| macOS | 13 or later | 26.5.2 (25F84) and 27.0 public beta (26A5421a), Apple silicon | The manifest declares macOS 13. Intel Macs and macOS 13 through 25 have not been hardware-tested. The agent-folder pass used the macOS 27 public beta. |
| Stream Deck | 6.6 or later | 7.5.0 (22885) | The manifest declares 6.6. Versions before 7.5.0 have not been exercised during the personal-plugin clean install. |
| Herdr | 0.8.2 | 0.8.2 | This is the only Herdr version covered by the current CLI, socket-schema, keybinding, and hardware evidence. |
| Node.js runtime | A compatible runtime must be available from Homebrew, `/usr/local`, `PATH`, or Stream Deck | 20.20.0, 22.22.3, and 24.13.1 | The full validation suite passes on all three exact versions. Development tooling requires Node.js 20.1 or later. |
| Stream Deck CLI | Development only | 1.9.0 | The repository pins this version for validation and packaging. End users do not run the CLI. |
| TOML parser | Packaged runtime dependency | smol-toml 1.7.1 | The exact CommonJS parser and BSD 3-Clause license are bundled in the plugin. Repository validation requires the vendored files to match the pinned dependency. |

## Hardware

| Hardware | Bundled profile | Hardware evidence |
| --- | --- | --- |
| 15-key Stream Deck (`20GBA9901`) | `HERDR` | The personal v3 profile clean-installed from the plugin with its More, Resize, and Agents folder tree intact. The revised three-row root layout was visually accepted. Six live agents displayed in the ten-slot Agents folder, agent keys focused the correct panes, pagination stayed hidden when unnecessary, and unused keys rendered fully off. The adaptive Pane key created and focused both side-by-side and stacked panes, then changed to the Zoom icon and toggled zoom. Its direction-specific icon with a concise `SPLIT` title and its dynamic `ZOOM` title were verified on hardware. The shared Spaces action passed an open, close, open, close toggle sequence. More than ten agents remains automation-tested rather than hardware-tested. The personal Open Herdr action also passed a hardware press test on the existing default profile. |
| Stream Deck+ (`20GBD9901`) | `HERDR Plus` | The personal plugin profile clean-installed successfully. The More folder, all four resize directions, Settings, and Sidebar passed hardware tests with their final icons. The shared Spaces action passed an open, close, open, close toggle sequence. The Agents folder passed empty, two-agent, and six-agent tests; four-slot pagination displayed pages `1/2` and `2/2`, navigation worked, agent keys focused the correct panes, and unused controls rendered fully off. The agent dial continued to report and focus the selected agent. The Pane dial created and focused both side-by-side and stacked panes from a single-pane tab, changed its hint to Zoom with multiple panes, and toggled zoom. Rename and Close retain prototype hardware coverage. |
| Other Stream Deck models | None | No support claim. Additional device sizes remain untested. |

### GitHub release installation evidence

On 2026-08-31, the published `v0.2.0` installer and checksum were downloaded
fresh and verified. The exact public asset clean-installed on a separate
machine and on the development Mac after removing the existing plugin and both
Herdr profiles. The development-Mac installation reported plugin version
`0.2.0.0`, automatically imported fresh `HERDR` and `HERDR Plus` profiles, and
both profiles referenced v0.2.0 actions. Profile activation and the root Agent
Attention action passed a connected-device smoke test. Before release, Agent
Attention had also passed blocked, done, working, idle, repeated-focus, and
cross-pane hardware checks on both supported profiles. This evidence covers
two-machine installation and the focused Agent Attention release change, not a
complete repetition of every profile action.

On 2026-08-29, the published `v0.1.0` GitHub installer and checksum were
downloaded fresh after removing the installed plugin and both Herdr profiles.
The checksum verified, the package installed as
`com.so1omon563.herdr-control` version `0.1.0.0`, and Stream Deck automatically
imported both v3 profiles with their correct model targets.

On the connected 15-key deck, Open Herdr switched to the clean-installed
`HERDR` profile. Workspace, tab, and pane navigation, the More and Spaces
open/close path, agent focus, and Back passed. After switching hardware, the
Stream Deck+ Open Herdr path selected `HERDR Plus`; all four dials, agent dial
focus, More and Spaces, agent-folder focus, and Back passed. This evidence
covers installation and representative core use from the public release asset,
not every action on either profile.

The model codes above identify the two profile targets used during testing.
They do not imply support for every device with a similar key count or layout.

## Terminal Coverage

| Selection | Version present on the validation host | Evidence boundary |
| --- | --- | --- |
| Auto | Not applicable | The personal Open Herdr hardware smoke test used the default Auto setting. Validation covers the selection order: Ghostty, kitty, iTerm2, then Terminal.app. |
| Ghostty | 1.3.1 (15212) | Installed on the validation host. The integration path was carried forward from hardware-tested prototype iteration, but was not explicitly selected and repeated under the personal UUID during SO1-279. |
| kitty | 0.48.2 | Installed on the validation host. The integration path was carried forward from hardware-tested prototype iteration, but was not explicitly selected and repeated under the personal UUID during SO1-279. |
| iTerm2 | 3.6.11 | Installed on the validation host. The integration path was carried forward from hardware-tested prototype iteration, but was not explicitly selected and repeated under the personal UUID during SO1-279. |
| Terminal.app | 2.15 (470.2) | Installed on the validation host. The integration path was carried forward from hardware-tested prototype iteration, but was not explicitly selected and repeated under the personal UUID during SO1-279. |

An installed application version records the available test environment. It
does not mean every explicit terminal selection was re-tested during this
support-matrix pass.

## Not Currently Claimed

- Intel Mac support.
- Windows or Linux support.
- Herdr versions other than 0.8.2.
- Stream Deck software versions before 7.5.0 as physically tested versions.
- Stream Deck models other than the tested 15-key device and Stream Deck+.
- Custom keybinding forms outside the documented safe subset, including Hyper,
  indexed ranges, non-ASCII keys, and unmodified direct printable keys.
- Reliable punctuation or Alt/Cmd/Super behavior across non-US keyboard
  layouts and every terminal or tmux configuration.
