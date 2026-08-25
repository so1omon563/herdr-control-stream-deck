#!/bin/zsh
set -euo pipefail

root=${0:A:h:h}
profiles="$root/plugin/com.so1omon563.herdr-control.sdPlugin/profiles"

cd "$root/profile"
/usr/bin/zip -qr -FS "$profiles/HERDR.streamDeckProfile" 2F9C9B72-92B4-4EC1-AB64-BFC50ED6CFD8.sdProfile

cd "$root/profile-plus"
/usr/bin/zip -qr -FS "$profiles/HERDR Plus.streamDeckProfile" C7A1F520-4F17-4D6E-8B87-9077A0D2F9C1.sdProfile
