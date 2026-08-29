# Marketplace media provenance

## Product artwork

- The Herdr Control mark comes from
  `plugin/com.so1omon563.herdr-control.sdPlugin/images/plugin@2x.png`.
- Key and dial artwork comes from the committed SVG files under
  `plugin/com.so1omon563.herdr-control.sdPlugin/images/`.
- Profile arrangements reproduce the committed, hardware-tested 15-key Stream
  Deck and Stream Deck + layouts.
- Device illustrations are deterministic SVG constructions. They do not use
  Elgato product photography or reproduce the Elgato wordmark.

## Reference material

- Elgato documents the Stream Deck + touch strip as 108 × 14 mm with an
  800 × 100 pixel resolution. The device illustration preserves that ratio.
- A user-supplied hardware photo, `IMG_1977.HEIC`, was used only to check bezel,
  touch-strip, content, and dial proportions. The photo is not copied into the
  repository or distributed with the exports.
- Earlier hardware photos remain behavior evidence only. Their backgrounds,
  reflections, private labels, and framing make them unsuitable for final
  Marketplace media.

## Typography and generation

- Text uses the system Arial/Helvetica fallback stack. No font files are
  redistributed.
- `scripts/build-marketplace-concepts.mjs` deterministically composes and
  renders every final image from repository-owned source artwork.
- No generative image model, stock image, external logo, user terminal content,
  or fabricated application screenshot appears in the final exports.
