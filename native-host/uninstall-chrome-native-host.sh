#!/usr/bin/env bash
# Removes the user-level macOS Native Messaging manifests for Taskmaster.

set -euo pipefail

HOST_NAME="com.taskmaster.browser_monitor"
CHROME_MANIFEST="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/$HOST_NAME.json"
EDGE_MANIFEST="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts/$HOST_NAME.json"

rm -f "$CHROME_MANIFEST" "$EDGE_MANIFEST"

echo "Removed $CHROME_MANIFEST if present"
echo "Removed $EDGE_MANIFEST if present"
