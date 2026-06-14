# Taskmaster Codex Context

## Current project

Taskmaster is an Electron desktop productivity app.

Tech stack:

* Electron
* React
* TypeScript
* Vite
* Global CSS currently in `src/renderer/index.css`
* New Deep Sesh UI CSS separated into `src/renderer/styles/deepSesh.css`
* Future Python CV worker for camera, gaze, phone detection

The app currently has onboarding mostly set up. After onboarding, the first real screen should be the main focus timer UI, called **Deep Sesh UI**.

## Current working area

We are currently working in:

```txt
electron/src/renderer/
```

Main files involved:

```txt
src/renderer/pages/MenuPage.tsx
src/renderer/pages/DeepSeshPage.tsx
src/renderer/styles/deepSesh.css
src/renderer/hooks/useDeepSeshTimer.ts
```

Do not touch Electron main process yet unless explicitly asked.

Avoid modifying these for now:

```txt
src/main/index.ts
src/main/ipc-handlers.ts
src/main/session-manager.ts
src/preload/index.js
```

Those will be used later for the separate mini timer window.

## Current structure

Relevant project tree:

```txt
electron/src
+---main
|   |   activity-monitor.ts
|   |   index.ts
|   |   ipc-handlers.ts
|   |   notifier.ts
|   |   python-bridge.ts
|   |   session-manager.ts
|   |   tray-icon.png
|   |
|   \---appDetection
|           detectCommonWindowsApps.ts
|
+---preload
|       index.js
|
+---renderer
|   |   App.tsx
|   |   index.css
|   |   index.html
|   |   main.tsx
|   |   vite-env.d.ts
|   |
|   +---components
|   |   |   Dashboard.tsx
|   |   |   SessionControls.tsx
|   |   |   SessionHistory.tsx
|   |   |   Settings.tsx
|   |   |
|   |   \---onboarding
|   |           BrowserActivitySelectionStep.tsx
|   |           OnboardingAdditionalFunctions.tsx
|   |           OnboardingCameraSetup.tsx
|   |           OnboardingWelcome.tsx
|   |           WhitelistSelectionStep.tsx
|   |
|   +---hooks
|   |       useCameraDevices.ts
|   |       useFocusEnvironmentSettings.ts
|   |
|   +---pages
|   |       MenuPage.tsx
|   |       OnboardingPage.tsx
|   |       DeepSeshPage.tsx
|   |
|   \---styles
|           deepSesh.css
|
\---shared
    +---appDetection
    |       commonApps.ts
    |
    \---browserActivity
            commonBrowserActivityRules.ts
```

## What has been done

Step 1 has been completed.

We created a static `DeepSeshPage.tsx` and connected `MenuPage.tsx` to render it after onboarding.

Current flow:

```txt
OnboardingPage
  -> MenuPage
      -> DeepSeshPage
```

Current screen has:

* Top bar with `Taskmaster`, `Deep Sesh`, and `Edit setup`
* Mode selector with `Pomodoro` and `Deep Sesh`
* Big static timer card
* Static setup card
* Static focus environment summary
* Disabled `Pop out timer` button

The UI currently looks good.

## Design decision

The user wants the Pomodoro / Deep Sesh section to stay centered.

That means:

* `Taskmaster` / `Deep Sesh` title should sit on the left side
* `Edit setup` should sit on the right side
* The timer section should be centered independently from the top bar

Avoid making the timer area shift just because the top bar has content on one side.

## Current goal

Continue with Step 2:

Add real timer state while keeping the UI simple.

Create:

```txt
src/renderer/hooks/useDeepSeshTimer.ts
```

Then connect it to:

```txt
src/renderer/pages/DeepSeshPage.tsx
```

## Timer modes

There are two modes:

### Pomodoro mode

Default values:

```txt
Focus length: 25 minutes
Break length: 5 minutes
Rounds: 4
```

Functionality:

* Countdown timer
* Starts with a focus block
* When focus reaches zero, automatically starts break
* When break reaches zero, automatically starts next focus round
* When final round finishes, session becomes completed

States:

```txt
idle
running
paused
completed
```

Pomodoro phase:

```txt
focus
break
```

Controls:

```txt
Start session
Pause
Resume
Stop
```

Settings should be editable only before the session starts.

### Deep Sesh mode

Default value:

```txt
Session length: 60 minutes
```

Functionality:

* One countdown timer
* No rounds
* No breaks
* When timer reaches zero, session becomes completed

Controls:

```txt
Start session
Pause
Resume
Stop
```

Settings should be editable only before the session starts.

## Mini timer window

There is a disabled `Pop out timer` button in the UI.

Do not implement it yet.

Later, this will become Option B:

* Separate small Electron BrowserWindow
* Always on top
* Shows time left
* Pause / resume / stop
* Open full app button
* Main app can be minimized while mini timer stays visible

For now, keep the button disabled or placeholder only.

## Focus monitor panel

Not yet implemented.

Later, when a session starts, the layout should change:

Before starting:

```txt
Timer is centered
Setup card below
Focus environment summary below
```

After starting:

```txt
Left side: Focus monitor panel
Right side: Timer card
```

The timer should visually slide to the right and the left panel should appear.

For now, do not connect camera. That will come later.

## CSS rules

Deep Sesh-specific styles should go in:

```txt
src/renderer/styles/deepSesh.css
```

Do not add Deep Sesh styles to `index.css`.

`index.css` is already long and should remain for global tokens, shared buttons, onboarding styles, and existing global styles.

Use existing CSS variables:

```css
--color-bg-main
--color-bg-card
--color-bg-elevated
--color-text-main
--color-text-muted
--color-accent
--color-accent-bright
--color-focused
--color-distracted
--color-border
--radius-sm
--radius-md
--radius-lg
--space-sm
--space-md
--space-lg
--space-xl
```

Use existing shared classes where possible:

```txt
.primary-button
.secondary-button
.surface-card
.status-pill
.muted-text
```

## Code style preferences

Use simple, clear TypeScript.

The user likes comments, but not too many.

Use comments like:

```ts
/* Converts seconds into the clock format shown in the UI. */
function formatSeconds(totalSeconds: number) {
  ...
}
```

Also use small inline comments inside functions when they clarify the actual step.

Avoid comments that repeat obvious JSX.

Keep UI and logic separate:

```txt
DeepSeshPage.tsx
  UI composition

useDeepSeshTimer.ts
  timer state and countdown logic
```

Because `verbatimModuleSyntax` is enabled, use `import type` when importing TypeScript-only types.

No emojis in UI text or comments.

Avoid em dashes in generated text and comments.



## Current task for Codex

Please continue from Step 2.

Implement the first real timer hook and connect it to the Deep Sesh page.

Files to create or edit:

```txt
src/renderer/hooks/useDeepSeshTimer.ts
src/renderer/pages/DeepSeshPage.tsx
src/renderer/styles/deepSesh.css
```

Do not touch Electron main, preload, Python, or PR #14 files.

After implementation, make sure:

* Pomodoro / Deep Sesh mode switching works
* Inputs update timer values
* Start / pause / resume / stop works
* Pomodoro automatically transitions from focus to break and from break to next focus
* Final round completes the session
* Deep Sesh countdown completes the session
* Timer area stays centered with the top bar content on the sides










After completing Step 2, follow this roadmap for the rest of the Pomodoro / Deep Sesh UI work. Do not implement all steps at once unless I explicitly ask. Keep each step reviewable and avoid creating a large PR.

## Remaining Deep Sesh / Pomodoro roadmap

### Step 2: Timer hook and basic controls

Goal:

Add renderer-only timer logic.

Files:

```txt
src/renderer/hooks/useDeepSeshTimer.ts
src/renderer/pages/DeepSeshPage.tsx
src/renderer/styles/deepSesh.css
```

Functionality:

* Pomodoro mode
* Deep Sesh mode
* Start / pause / resume / stop
* Editable settings before session starts
* Disabled settings while session is running or paused
* Pomodoro automatically transitions:

  * focus -> break
  * break -> next focus round
  * final round -> completed
* Deep Sesh countdown completes when it reaches zero

Do not touch Electron main, preload, Python, or mini window logic.

Suggested PR:

```txt
PR 2: Deep Sesh timer logic
```

### Step 3: Split the Deep Sesh page into small components

Goal:

Avoid `DeepSeshPage.tsx` becoming too large.

Possible files:

```txt
src/renderer/components/deepSesh/DeepSeshModeSelector.tsx
src/renderer/components/deepSesh/DeepSeshTimerCard.tsx
src/renderer/components/deepSesh/DeepSeshSetupPanel.tsx
src/renderer/components/deepSesh/FocusEnvironmentSummary.tsx
```

Keep the hook as the source of timer logic.

`DeepSeshPage.tsx` should mostly compose the page.

Suggested PR:

This can be part of PR 2 if the diff is still small, otherwise make it a separate refactor PR.

### Step 4: Active session layout

Goal:

When the session starts, change the layout.

Before session starts:

```txt
Timer centered
Setup card below
Focus environment summary below
```

After session starts:

```txt
Left side: Focus monitor panel
Right side: Timer card
```

The timer should visually move to the right, but keep the CSS simple.

Add a class based on state:

```txt
deep-sesh-screen--setup
deep-sesh-screen--active
```

or:

```txt
deep-sesh-main--setup
deep-sesh-main--active
```

Do not connect the real camera yet.

Suggested PR:

```txt
PR 3: Deep Sesh active session layout
```

### Step 5: Focus monitor placeholder

Goal:

Add the left panel that will later contain camera/focus detection.

File:

```txt
src/renderer/components/deepSesh/FocusMonitorPanel.tsx
```

For now, keep it honest and simple:

```txt
Focus monitor
Timer active
Camera preview coming soon
App monitoring coming soon
Focus detection coming soon
```

Do not connect `useCameraDevices` yet.

Do not claim real detection is working.

### Step 6: Focus environment summary

Goal:

Connect the summary card to onboarding settings.

Use:

```txt
src/renderer/hooks/useFocusEnvironmentSettings.ts
```

Show:

```txt
Main browser
Browser blocking on/off
Allowed apps count
Blocked apps count
Blocked browser rules count
```

This should be display-only for now.

Do not change onboarding settings from this screen yet.

### Step 7: Basic polish and testing

Goal:

Make sure the MVP feels clean and stable.

Check:

```txt
npm run lint
npm run build
```

Manual tests:

```txt
Switch Pomodoro / Deep Sesh
Edit values
Start Pomodoro
Pause / resume
Stop
Pomodoro focus -> break transition
Pomodoro break -> next round transition
Final Pomodoro round completes
Start Deep Sesh
Deep Sesh completes
Layout changes correctly while running
Inputs are disabled while running
```

### Step 8: Stop before mini timer window

Do not implement the mini timer Electron window yet.

The `Pop out timer` button should stay disabled or placeholder only.

The mini window will be a later PR because it touches Electron main, IPC, preload, and state synchronization.

Suggested future PR:

```txt
PR 4: Mini timer window
```

## PR strategy

Keep PRs small.

Recommended split:

```txt
PR 1: Static Deep Sesh UI shell
PR 2: Timer hook and controls
PR 3: Active layout + focus monitor placeholder + focus environment summary
PR 4: Mini timer Electron window
```

Before opening each PR:

```bash
git status
npm run lint
npm run build
```

Avoid committing empty files or unrelated files.

Each PR should have a clear description telling the reviewer what to focus on.
