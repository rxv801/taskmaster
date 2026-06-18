#!/usr/bin/env bash
# Registers the Taskmaster Browser Monitor native host on macOS.
# User-level manifests avoid sudo and are installed for Chrome plus Edge.

set -euo pipefail

HOST_NAME="com.taskmaster.browser_monitor"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/.generated"
GENERATED_MANIFEST_PATH="$GENERATED_DIR/$HOST_NAME.chrome.json"
GENERATED_LAUNCHER_PATH="$GENERATED_DIR/taskmaster-browser-monitor-host.sh"
HOST_SCRIPT_PATH="$SCRIPT_DIR/taskmaster-browser-monitor-host.js"
NODE_PATH="$(command -v node)"

mkdir -p "$GENERATED_DIR"

cat > "$GENERATED_LAUNCHER_PATH" <<EOF
#!/usr/bin/env bash
exec "$NODE_PATH" "$HOST_SCRIPT_PATH"
EOF

chmod 755 "$GENERATED_LAUNCHER_PATH"

cat > "$GENERATED_MANIFEST_PATH" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Taskmaster Browser Monitor Native Host",
  "path": "$GENERATED_LAUNCHER_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://kibldolnfbpajohdnkbjfjefnemllapm/"
  ]
}
EOF

CHROME_HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
EDGE_HOST_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"

mkdir -p "$CHROME_HOST_DIR" "$EDGE_HOST_DIR"
cp "$GENERATED_MANIFEST_PATH" "$CHROME_HOST_DIR/$HOST_NAME.json"
cp "$GENERATED_MANIFEST_PATH" "$EDGE_HOST_DIR/$HOST_NAME.json"

echo "Registered $HOST_NAME"
echo "Manifest source: $GENERATED_MANIFEST_PATH"
echo "Chrome manifest: $CHROME_HOST_DIR/$HOST_NAME.json"
echo "Edge manifest: $EDGE_HOST_DIR/$HOST_NAME.json"
