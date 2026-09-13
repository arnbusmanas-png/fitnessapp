#!/bin/sh
# Renders public/icon.svg to the PNG sizes iOS and the web manifest need (macOS only: qlmanage + sips).
set -e
cd "$(dirname "$0")/.."
mkdir -p public/icons
tmp=$(mktemp -d)
qlmanage -t -s 1024 -o "$tmp" public/icon.svg >/dev/null 2>&1
src="$tmp/icon.svg.png"
sips -z 512 512 "$src" --out public/icons/icon-512.png >/dev/null
sips -z 192 192 "$src" --out public/icons/icon-192.png >/dev/null
sips -z 180 180 "$src" --out public/icons/apple-touch-icon.png >/dev/null
rm -rf "$tmp"
echo "icons written to public/icons"
