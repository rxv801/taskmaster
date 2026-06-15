# Chrome Web Store Listing Draft

## Extension Name

Taskmaster Browser Monitor

## Short Description

Connects active browser tab metadata to the local Taskmaster desktop focus app.

## Detailed Description

Taskmaster Browser Monitor helps the Taskmaster desktop app understand the active browser tab during a running focus session.

The extension sends the active tab title, URL, domain, and timestamp to the local Taskmaster desktop app only when a Deep Sesh or Pomodoro focus session is running or paused. It does not send data to external servers, does not read page content, and does not collect cookies, passwords, form inputs, or full browsing history.

The Taskmaster desktop app is required.

## Permissions Explanation

### `tabs`

Taskmaster uses the `tabs` permission to read the active tab title and URL after the local Taskmaster desktop app says browser monitoring is active. The implementation does not use the browsing history API and does not inspect background tabs.

Chrome may describe this permission broadly. Taskmaster limits use to active-session, active-tab metadata only.

### `nativeMessaging`

Taskmaster uses Native Messaging to communicate with the local Taskmaster desktop app on the same device. Browser activity is not sent to any external server.

## Reviewer Test Instructions

1. Install and open the Taskmaster desktop app.
2. Install the Taskmaster Browser Monitor extension.
3. Start a Deep Sesh or Pomodoro session in Taskmaster.
4. Open a normal web page such as GitHub, YouTube, or ChatGPT.
5. Confirm the Taskmaster desktop app shows the active tab domain and title.
6. Stop the focus session.
7. Switch tabs and confirm Taskmaster no longer receives new browser activity.

## Notes

- The desktop app is required.
- Native Messaging host setup is required for production operation.
- The extension does not include content scripts.
- The extension does not request cookies, history, webRequest, scripting, or `<all_urls>`.
