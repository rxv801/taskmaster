# Taskmaster Browser Extension Privacy Note

This draft explains the data behavior for the Taskmaster Browser Monitor MVP.

## Data Accessed

The extension accesses only active tab metadata:

- Active tab URL
- Active tab title
- Derived domain
- Timestamp

## When Data Is Accessed

The extension checks whether Taskmaster browser monitoring is active before reading active tab metadata. Monitoring should be active only while a Taskmaster Deep Sesh or Pomodoro session is running or paused.

## Where Data Goes

Active tab metadata is sent only to the local Taskmaster desktop app on the same device.

Taskmaster does not send this data to external servers.

## Data Not Accessed

The extension does not access:

- Page content
- Cookies
- Passwords
- Form inputs
- Full browsing history
- Background tabs
- Analytics identifiers

## Storage

Raw URLs are not permanently stored by default. The MVP keeps current browser activity in memory so the Taskmaster desktop UI can show the current active domain and title.

## Sale And Advertising

Taskmaster does not sell browser activity data and does not use it for advertising.
