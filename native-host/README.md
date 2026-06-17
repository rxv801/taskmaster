# Taskmaster Browser Monitor Native Host

This folder contains the Chrome Native Messaging host for the Taskmaster Browser Monitor extension.

The extension talks to this host through Chrome Native Messaging. The host then forwards validated messages to the local Taskmaster desktop app bridge on `127.0.0.1:17382`.

The extension itself does not require localhost host permissions.

## Host Name

```txt
com.taskmaster.browser_monitor
```

## Allowed Chrome Extension

```txt
kibldolnfbpajohdnkbjfjefnemllapm
```

## Install On Windows

From the repo root:

```powershell
.\native-host\install-chrome-native-host.ps1
```

This registers the host under:

```txt
HKCU\Software\Google\Chrome\NativeMessagingHosts\com.taskmaster.browser_monitor
```

HKCU is used so admin rights are not required.

## Verify Registration

1. Open `regedit`.
2. Go to:
   ```txt
   HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.taskmaster.browser_monitor
   ```
3. Confirm the default value points to the generated manifest in:
   ```txt
   native-host\.generated\com.taskmaster.browser_monitor.chrome.json
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
- Confirm `node` is installed and available when running the install script.
- Restart Chrome after installing the native host.

Raw URLs are not logged by default.
