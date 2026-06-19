#!/usr/bin/env bash
#
# Packages the Taskmaster browser extension for manual Chrome Web Store upload.
# macOS/Linux counterpart to package-browser-extension.ps1.
# Dependency-free (uses the system `zip`); includes only the extension runtime
# files.
#
# Usage (from anywhere):
#   ./scripts/package-browser-extension.sh

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
extension_dir="$repo_root/browser-extension"
dist_dir="$repo_root/dist"
staging_dir="$dist_dir/taskmaster-browser-monitor-extension"
zip_path="$dist_dir/taskmaster-browser-monitor-extension.zip"

# Fresh staging directory under dist/.
rm -rf "$staging_dir"
mkdir -p "$staging_dir"

cp "$extension_dir/manifest.json" "$staging_dir/"
cp "$extension_dir/background.js" "$staging_dir/"

# Rebuild the zip from the staged files (paths relative to the staging root).
rm -f "$zip_path"
( cd "$staging_dir" && zip -qr "$zip_path" . )

rm -rf "$staging_dir"

echo "Created $zip_path"
