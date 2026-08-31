# Marketplace submission preparation

This document maps the exact Herdr Control listing data to Elgato Maker
Console and records the remaining preflight work. It does not authorize or
perform a Marketplace upload, review submission, or publication.

The canonical field values are in [`listing.json`](listing.json). The values
were checked against Elgato's current official guidance on 2026-08-29.

## Listing fields

| Maker Console field | Value or source |
| --- | --- |
| Product type | Stream Deck plugin |
| Name | Herdr Control |
| Maker | so1omon563 |
| Type | Development |
| Language | English |
| Price | Free |
| Description | `product.description` in `listing.json` |
| Operating system | macOS |
| Compatibility | Stream Deck 6.6 or later |
| Dial support | Yes |
| Profiles | Yes, 15-key Stream Deck and Stream Deck + |
| Additional links | `additionalLinks` in `listing.json` |
| Release notes | `release.notes` in `listing.json` |

The description is 868 characters. Its first 338 characters are an
unformatted paragraph, so the first 250 characters remain usable for search
and native SEO. It names the supported software and hardware, summarizes the
core controls, and states the installation requirements.

## File mapping

| Submission field | Repository or release source |
| --- | --- |
| Product file | Published `v0.2.0` GitHub release recorded in `listing.json` |
| Product checksum | Published SHA-256 recorded in `listing.json` |
| App icon | `marketplace/exports/app-icon.png` |
| Thumbnail | `marketplace/exports/thumbnail.png` |
| Gallery item 1 | `marketplace/exports/gallery-01-dial-focus.png` |
| Gallery item 2 | `marketplace/exports/gallery-02-profile-parity.png` |
| Gallery item 3 | `marketplace/exports/gallery-03-agent-focus.png` |
| Demonstration video | Pending a separate hardware-capture ticket |

Upload gallery files in the listed order. Maker Console does not currently
support reordering gallery items without removing and re-adding them.

The published `v0.2.0` installer is the verified submission candidate. Its URL
and checksum are recorded in `listing.json`. SO1-361 verified the downloaded
asset, checksum, manifest, bundled profiles, and clean installation on two
machines.

## Product decisions

### DRM

Do not mark the initial Marketplace version as DRM compatible. Elgato requires
Node.js plugins to use `@elgato/streamdeck` v2 or later, SDK 3, immutable
packaged files, and Stream Deck 6.9 or later for DRM. Herdr Control currently
uses its own local WebSocket client, SDK 2, and a Stream Deck 6.6 minimum.
Enabling DRM would be a separate runtime migration with its own compatibility
and hardware testing.

### Privacy

Do not add a privacy-policy link for the current release. Herdr Control has no
analytics, remote service, account system, or personal-data collection. It
reads local Herdr state and configuration, invokes local applications, and
communicates with the Stream Deck host over a loopback WebSocket. If a future
version collects or transmits identifiable or analytics data, add consent,
deletion handling, and a privacy policy before submitting that version.

### Publication

Keep **Automatically publish after being approved** disabled. Approval and
public Marketplace release are separate actions. Public release requires
explicit authorization after review approval.

## Preflight checklist

### Prepared locally

- [x] Maker organization name matches manifest author `so1omon563`.
- [x] Plugin and action UUIDs use the permanent personal namespace.
- [x] Plugin, category, and visible action-list icons use the required
  package sizes and monochrome transparent SVG treatment where applicable.
- [x] The repository pins Elgato Stream Deck CLI 1.9.0, confirmed as the latest
  published npm version on 2026-08-29.
- [x] Product name, type, language, price, description, and requirements are
  defined.
- [x] Support, setup, source, and Herdr dependency links are defined.
- [x] The Property Inspector provides direct setup and support help.
- [x] A temporary `0.1.0.1` package displayed the new category and visible
  action icons correctly in Stream Deck, and the Setup and support link opened
  the First use documentation on 2026-08-29.
- [x] Initial release notes are defined.
- [x] The verified `v0.2.0` GitHub release installer and checksum are recorded
  as the Marketplace submission candidate.
- [x] App icon, thumbnail, and three gallery images are mapped and validated.
- [x] DRM, privacy-policy, and automatic-publication decisions are explicit.
- [x] Marketplace search found no exact `Herdr Control` product-name conflict
  on 2026-08-29.

### Remaining before any submission

- [ ] Add the remaining Maker profile picture in Maker Console.
- [ ] Create and complete the separately tracked functional demonstration
  video using [`CAPTURE.md`](CAPTURE.md).
- [x] Publish and verify release `v0.2.0` through SO1-361 and the maintained
  composite-action workflow.
- [ ] Reconfirm that `Herdr Control` remains available when creating the
  product draft. Maker Console is authoritative for product-name availability.
- [ ] Download the new release's exact versioned installer and verify its
  SHA-256 checksum immediately before upload.
- [ ] Run `npm ci`, `npm test`, and `npm run build:release -- vX.Y.Z`
  against the exact submission commit or tag.
- [ ] Verify Maker Console's detected version, macOS support, Stream Deck
  compatibility, dial support, and bundled-profile state against
  `listing.json`.
- [ ] Upload the product file and mapped media only after explicit
  authorization.
- [ ] Leave automatic publication disabled and obtain separate authorization
  before submitting for review.
- [ ] After approval, obtain separate authorization before public release.

## Official references

- [Product guidelines](https://docs.elgato.com/guidelines/products/)
- [Stream Deck plugin guidelines](https://docs.elgato.com/guidelines/stream-deck/plugins/)
- [Submitting products](https://docs.elgato.com/maker-console/submitting-products/)
- [Review process](https://docs.elgato.com/maker-console/review-process/)
- [Managing products](https://docs.elgato.com/maker-console/managing-products/)
- [Maker organization](https://docs.elgato.com/maker-console/organization/)
- [Stream Deck distribution and DRM](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/)
