# Security Policy

## Supported versions

Herdr Control is pre-release. Security reports are accepted for the current
`main` branch, but no tagged version is currently supported for public
installation.

| Version | Supported |
| --- | --- |
| Current `main` | Yes |
| Prototype `com.vfostje.herdrtoggle` builds | No |

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use
[GitHub private vulnerability reporting](https://github.com/so1omon563/herdr-control-stream-deck/security/advisories/new)
instead.

Include the affected commit or plugin version, macOS and Stream Deck versions,
hardware model, expected impact, reproduction steps, and any known mitigation.
Redact usernames, local paths, workspace or pane names, terminal history, and
other personal data from logs, configuration, and profile exports.

Reports will be reviewed as soon as practical. Please allow time to validate
and address the issue before public disclosure, and coordinate disclosure
through the private advisory.

Security-sensitive areas include command construction, AppleScript automation,
Herdr configuration handling, bundled profiles, packaging, and release
automation. Issues that affect Herdr, Stream Deck, or a terminal independently
should be reported upstream unless Herdr Control contributes to the problem.
