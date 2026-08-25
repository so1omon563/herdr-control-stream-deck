# Support Matrix

Herdr Control is pre-release software. This matrix separates declared minimums
from exact versions and hardware that have been verified. A declared minimum is
not evidence that every intermediate version has been tested.

## Software

| Component | Declared boundary | Verified environment | Evidence boundary |
| --- | --- | --- | --- |
| macOS | 13 or later | 26.5.2 (25F84), Apple silicon | The manifest declares macOS 13. Intel Macs and macOS 13 through 25 have not been hardware-tested. |
| Stream Deck | 6.6 or later | 7.5.0 (22885) | The manifest declares 6.6. Versions before 7.5.0 have not been exercised during the personal-plugin clean install. |
| Herdr | 0.8.2 | 0.8.2 | This is the only Herdr version covered by the current CLI, socket-schema, keybinding, and hardware evidence. |
| Node.js runtime | A compatible runtime must be available from Homebrew, `/usr/local`, `PATH`, or Stream Deck | 20.20.0, 22.22.3, and 24.13.1 | The full validation suite passes on all three exact versions. Development tooling requires Node.js 20.1 or later. |
| Stream Deck CLI | Development only | 1.9.0 | The repository pins this version for validation and packaging. End users do not run the CLI. |

## Hardware

| Hardware | Bundled profile | Hardware evidence |
| --- | --- | --- |
| 15-key Stream Deck (`20GBA9901`) | `HERDR` | The personal plugin profile clean-installed successfully. The personal Open Herdr action was placed on the existing default profile and passed a hardware press test. The full button layout was exercised during prototype iteration, including the T-shaped pane-routing regression now covered by validation. |
| Stream Deck+ (`20GBD9901`) | `HERDR Plus` | The personal plugin profile clean-installed successfully. Buttons, dials, touch feedback, agent browsing, Rename, and Close were exercised during prototype iteration. The full interaction set has not been repeated under the personal UUID. |
| Other Stream Deck models | None | No support claim. Additional device sizes remain untested. |

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
- Automatic execution of custom Herdr bindings for Spaces, Sidebar, Rename,
  and Close.
