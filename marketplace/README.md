# Marketplace media

This directory contains the deterministic Marketplace media workspace for
Herdr Control. Building these files does not upload or submit anything to the
Elgato Marketplace.

## Final assets

| File | Purpose | Size |
| --- | --- | --- |
| `exports/app-icon.png` | App icon | 288 × 288 |
| `exports/thumbnail.png` | Product thumbnail | 1920 × 960 |
| `exports/gallery-01-dial-focus.png` | Stream Deck + dial controls | 1920 × 960 |
| `exports/gallery-02-profile-parity.png` | Supported profile comparison | 1920 × 960 |
| `exports/gallery-03-agent-focus.png` | Agent navigation | 1920 × 960 |

The thumbnail uses the approved Control Surface direction. The gallery keeps
the approved dark Dial Focus and Agent Focus directions together with the
light Profile Parity contrast.

## Build and validate

Rendering uses the exact-pinned Node.js renderer and Inter font sources from
the development dependencies. Text is converted to SVG glyph paths before
rendering, so the exports do not depend on fonts installed on the host.

```sh
npm run build:marketplace
npm run validate:marketplace
```

The build regenerates the concept SVG and PNG files, final exports, and the
SHA-256 export manifest. Validation checks the PNG signatures, exact required
dimensions, complete asset inventory, manifest dimensions, checksums, and the
absence of renderer-dependent SVG text. CI rebuilds the full media set and
requires the committed files to remain byte-for-byte unchanged.

See [PROVENANCE.md](PROVENANCE.md) for source and ownership details and
[CAPTURE.md](CAPTURE.md) for the later demonstration-video plan.
