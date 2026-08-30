# Marketplace Visual Directions

These four 1920 × 960 concepts established the approved visual system for
SO1-284. They use the existing Herdr Control identity and exact profile assets.
The generated concept files remain local review outputs; the selected,
committed deliverables live under `exports/`.

## Directions

1. `01-control-surface`: approved Marketplace thumbnail.
2. `02-dial-focus`: approved Stream Deck + gallery image.
3. `03-profile-parity`: approved light profile-comparison gallery image.
4. `04-agent-focus`: approved agent-navigation gallery image.

## Preserve

- The existing Herdr Control logo, dark navy, cyan, off-white, and purple.
- Exact key artwork and the hardware-tested profile layouts.
- Accurate claims limited to workspaces, tabs, panes, agents, and supported
  Stream Deck hardware.

## Avoid

- Photorealistic device imagery that does not match the actual hardware.
- User-specific workspace names, agent names, private terminal content, or
  unrelated third-party branding.
- Dense copy, invented capabilities, or generic AI imagery.

## Build

Run `npm run build:marketplace`. Rendering uses the exact-pinned Node.js
renderer and Inter font sources from the development dependencies. The build
refreshes the ignored local concepts and the committed final exports,
including their deterministic asset manifest.
