# Taskmaster Browser Monitor Native Host

This folder contains the Chrome Native Messaging host for the Taskmaster Browser Monitor extension.

The extension talks to this host through Chrome Native Messaging. The host then forwards validated messages to the local Taskmaster desktop app bridge on `127.0.0.1:17382`.

The local bridge requires a per-app-run token written by Taskmaster, so browser pages cannot bypass Native Messaging by posting directly to localhost. The extension itself does not require localhost host permissions.

## Host Name

```txt
com.taskmaster.browser_monitor
```

## Allowed Chrome Extension

```txt
kibldolnfbpajohdnkbjfjefnemllapm
```

This is the Chrome Web Store extension ID for the submitted Taskmaster Browser Monitor item.

## Install On Windows

From the repo root:

```powershell
.\native-host\install-chrome-native-host.ps1
```

This registers the host under Chrome/Opera GX and Edge user-level locations:

```txt
HKCU\Software\Google\Chrome\NativeMessagingHosts\com.taskmaster.browser_monitor
HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.taskmaster.browser_monitor
```

HKCU is used so admin rights are not required.

Opera GX uses the Chrome Native Messaging host registry path documented by Opera, so the Chrome entry covers it.

## Install On macOS

From the repo root:

```bash
./native-host/install-chrome-native-host.sh
```

This creates user-level manifests at:

```txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.taskmaster.browser_monitor.json
~/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.taskmaster.browser_monitor.json
```

The generated manifest points to a small shell launcher, which then runs the Node host script.

## Verify Registration

On Windows:

1. Open `regedit`.
2. Confirm these keys point to the generated manifest:
   ```txt
   HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.taskmaster.browser_monitor
   HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\com.taskmaster.browser_monitor
   ```

On macOS:

1. Confirm these files exist:
   ```txt
   ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.taskmaster.browser_monitor.json
   ~/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.taskmaster.browser_monitor.json
   ```

## Test Flow

1. Install the native host.
2. Start Taskmaster Electron dev.
3. Load or install the Chrome extension with ID `kibldolnfbpajohdnkbjfjefnemllapm`.
4. Start a Deep Sesh or Pomodoro session.
5. Open GitHub, YouTube, or ChatGPT.
6. Confirm FocusMonitorPanel shows the current domain and title.
7. Stop the focus session and confirm tab updates stop.

## Debugging

If Chrome says the native host was not found:

- Confirm the registry key exists under HKCU, not HKLM.
- Confirm the manifest path in the registry exists.
- Confirm the generated manifest `path` points to the generated `.cmd` launcher.
- On macOS, confirm the installed manifest points to the generated `.sh` launcher.
- Confirm `node` is installed and available when running the install script.
- Restart Chrome after installing the native host.

Raw URLs are not logged by default.
