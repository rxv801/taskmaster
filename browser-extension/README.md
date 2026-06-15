# Taskmaster Browser Activity Prototype

This is a dev-only Manifest V3 extension for testing active browser tab monitoring with the local Taskmaster Electron app.

It sends active tab metadata only to `http://127.0.0.1:17382` and only after Taskmaster reports that browser monitoring is active. It does not store URLs, read page content, read cookies, read form data, or send anything to external servers.

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

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the project `browser-extension` folder.
5. Start a Taskmaster focus session, then switch tabs.

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

- The localhost bridge is for development only.
- It only reports the active tab in the focused browser window.
- It does not classify, block, notify, or persist browsing activity.
- Internal browser pages such as `chrome://`, `edge://`, `opera://`, `about:`, and `devtools://` are ignored.

## Future Production Plan

The production version should use Native Messaging instead of an open dev HTTP bridge.
