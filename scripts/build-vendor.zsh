#!/bin/zsh
set -euo pipefail

project_root=${0:A:h:h}
dependency="$project_root/node_modules/smol-toml"
vendor="$project_root/plugin/com.so1omon563.herdr-control.sdPlugin/vendor"

/bin/mkdir -p "$vendor"
/bin/cp "$dependency/dist/index.cjs" "$vendor/smol-toml.cjs"
if [[ -f "$dependency/dist/index.cjs.map" ]]; then
  /bin/cp "$dependency/dist/index.cjs.map" "$vendor/smol-toml.cjs.map"
else
  /bin/rm -f "$vendor/smol-toml.cjs.map"
fi
/bin/cp "$dependency/LICENSE" "$vendor/smol-toml.LICENSE"
