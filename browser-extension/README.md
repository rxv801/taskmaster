# Taskmaster Browser Monitor

This is the browser extension package for connecting active browser tab metadata to the local Taskmaster desktop app.

It reads the active tab URL/title only after Taskmaster reports that browser monitoring is active. It does not store raw URLs permanently, read page content, read cookies, read form data, use the browsing history API, or send anything to external servers.

The official MVP transport is Native Messaging. The previous localhost bridge is retained in `background.js` as a clearly separated development transport path, but the production manifest does not include localhost host permissions.

## Start Taskmaster Dev

From the project root:

```bash
cd electron
npm run dev
```

In another terminal:

```bash
cd electron
npm run electron
```

Start a Deep Sesh or Pomodoro session before testing browser activity.

## Load In Chrome For Local Review

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the project `browser-extension` folder.
5. Start a Taskmaster focus session, then switch tabs.
6. Native Messaging requires a host install step that will be added in the next phase.

## Load In Opera GX

1. Open `opera://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the project `browser-extension` folder.
5. Start a Taskmaster focus session, then switch tabs.

## Manual Test

1. Start the Taskmaster dev app.
2. Start a Deep Sesh or Pomodoro session.
3. Open GitHub, YouTube, or ChatGPT in Chrome or Opera GX.
4. Confirm the Focus Monitor panel shows the current domain and title.
5. Stop the Taskmaster session.
6. Switch browser tabs again and confirm the panel no longer receives new activity.

## Current Limitations

- Native Messaging host setup is not implemented yet.
- It only reports the active tab in the focused browser window.
- It does not classify, block, notify, or persist browsing activity.
- Internal browser pages such as `chrome://`, `edge://`, `opera://`, `about:`, and `devtools://` are ignored.

## Package For Chrome Web Store Review

From the project root:

```powershell
.\scripts\package-browser-extension.ps1
```

The zip is created at:

```txt
dist/taskmaster-browser-monitor-extension.zip
```

The package includes only:

- `manifest.json`
- `background.js`

## Future Production Plan

The next phase will add the Native Messaging host and install scripts.
