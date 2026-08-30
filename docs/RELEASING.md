# Releasing

Herdr Control uses the maintained
`so1omon563/custom-semver-bumper@v1` and
`so1omon563/release-creator@v2` composite actions in one GitHub Actions
workflow. A tag created with `GITHUB_TOKEN` does not start a second workflow,
so versioning, exact-tag packaging, and release creation stay in the same run.

## Version contract

Every release must keep these values synchronized:

- Git tag: `vX.Y.Z`
- `package.json` and the root entries in `package-lock.json`: `X.Y.Z`
- Stream Deck manifest: `X.Y.Z.0`
- Installer: `Herdr-Control-vX.Y.Z.streamDeckPlugin`
- Checksum: `Herdr-Control-vX.Y.Z.streamDeckPlugin.sha256`

Release tags intentionally use numeric SemVer without a tag suffix because the
Stream Deck manifest requires four numeric components. GitHub Releases for
`v0.*` tags are marked as prereleases. Releases at `v1.0.0` or later use the
release creator's normal SemVer prerelease detection.

`npm test` verifies the repository versions and the workflow contract. To
build and verify the exact local installer and checksum without publishing
anything, run:

```sh
npm ci
npm test
npm run build:release -- vX.Y.Z
```

The build validates the source manifest, runs Elgato's pinned Stream Deck CLI,
packages the plugin, checks the packaged manifest, creates the SHA-256 file,
and verifies the checksum.

## Normal release path

Normal pull requests do not create tags or releases. The workflow resolves the
version and release markers from the merged pull request title, passes `none`
to the bumper when no version marker is present, and gates release creation on
the resolved `#release` request. The pull request title is authoritative even
when GitHub chooses a squash commit subject from the branch commit instead.

The current highest release tag is `v0.1.0`. Package version `0.1.1` and
manifest version `0.1.1.0` therefore require `#patch #release`: `#patch`
produces `v0.1.1`, while `#release` requests the GitHub prerelease. Do not use
`#minor`, which would target `v0.2.0` and fail the pre-tag metadata check.

Immediately before preparing `v0.1.1`, the maintained action majors were
verified on 2026-08-29: `custom-semver-bumper@v1` resolved to `v1.0.12`, and
`release-creator@v2` resolved to `v2.0.2`.

Before the tag-writing action runs, the workflow applies the bumper's hashtag
marker precedence to the pull request title, calculates the next version from
the highest existing stable tag, and requires the staged package metadata to
match. It passes that validated bump type to the maintained bumper. A
mismatched release PR fails before it can create an immutable tag.

For a release:

1. Update `package.json`, `package-lock.json`, and the Stream Deck manifest to
   the intended version.
2. Run the full local validation and release-asset build for the matching tag.
3. Use exactly one version marker in the release PR title: `#patch`, `#minor`,
   or `#major`. Add `#release` to request GitHub Release creation. Do not rely
   on the branch commit subject or squash commit message to carry the markers.
4. Confirm explicit authorization immediately before merging the PR. The
   release-triggering merge is a distinct public release action.
5. After merge, `custom-semver-bumper@v1` creates the immutable version tag.
6. The release job checks out that exact tag, repeats validation and packaging,
   then `release-creator@v2` publishes the release and both assets.
7. Verify the tag, release metadata, downloaded installer, and checksum before
   closing the release ticket.

Floating major and minor tags remain disabled. GitHub Release publication does
not submit or publish the plugin to Elgato Marketplace.

## Existing-tag recovery

If an immutable version tag exists but its GitHub Release was not created, use
the **Version Bump and Release** workflow's manual dispatch from `main` and
enter that exact `vX.Y.Z` tag. Confirm explicit release authorization
immediately before dispatching it.

The recovery job does not run the bumper, create a tag, or move a tag. It
checks out the supplied tag, validates the complete version contract, rebuilds
the assets from that commit, and asks `release-creator@v2` to publish the
release. If the release already exists, the recovery run exits successfully
without replacing it.

Never use recovery to point an existing version tag at another commit. Do not
replace the workflow with a one-off local tag or `gh release create` command.
