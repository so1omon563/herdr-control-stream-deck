#!/bin/zsh
set -euo pipefail

root=${0:A:h:h}
tag=${1:-}

if [[ -z "$tag" ]]; then
  echo "usage: $0 vX.Y.Z" >&2
  exit 2
fi

cd "$root"
node scripts/check-release.mjs "$tag"
npm run validate:streamdeck
npm run pack:streamdeck

packed="$root/dist/com.so1omon563.herdr-control.streamDeckPlugin"
asset="Herdr-Control-${tag}.streamDeckPlugin"
installer="$root/dist/$asset"
checksum="$installer.sha256"

/bin/mv -f "$packed" "$installer"
node scripts/check-release.mjs "$tag" "$installer"

cd "$root/dist"
/usr/bin/shasum -a 256 "$asset" > "$asset.sha256"
/usr/bin/shasum -a 256 -c "$asset.sha256"

echo "Release assets created:"
echo "  $installer"
echo "  $checksum"
