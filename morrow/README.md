# morrow.

A local-first, dependency-free Pomodoro Chrome extension (Manifest V3).

## Install on macOS

1. Unzip `morrow-extension.zip`.
2. In Chrome, visit `chrome://extensions`.
3. Enable **Developer mode** (upper right).
4. Click **Load unpacked**.
5. Select the extracted `morrow` folder containing `manifest.json`.
6. Pin **morrow.** to the toolbar and open its popup.

## Features

- Timestamp-based focus and break countdowns, background Chrome alarms, pause/resume/reset.
- Customizable session lengths, sessions per cycle, long-break frequency, auto-continuation, light/dark/system themes.
- A dedicated break tab, editable break website list, local storage, no telemetry or network calls from the extension itself.
- Final break always ends the cycle, never auto-starts another.

## Architecture

The service worker serializes timer commands and alarm transitions. State is saved before alarms and tab operations. Each session has a unique token; stale alarms are reconciled against the current persisted deadline. The popup and break tab are views only; neither owns the timer. Closing the break tab manually leaves the background countdown running. Only an extension-owned break tab whose URL matches the internal break page is eligible for automatic closing.

Settings are applied to *subsequent* sessions; the current session retains its original duration. Changing sessions-per-cycle during an active cycle may affect the next transition.

## Manual Chrome acceptance tests (still required)

1. Load unpacked, inspect `chrome://extensions` for service worker errors.
2. Start, pause, resume, reset; close/reopen popup and confirm countdown persists.
3. Set durations to one minute, test focus → break tab → next focus (auto on and off).
4. Set sessions=1, verify final break closes its managed tab and returns to idle without restarting.
5. Close the break tab yourself; ensure timer still advances and unrelated tabs remain untouched.
6. Reset during break; ensure no future transition and only managed break tab closes.
7. Test theme selection and saved websites; reject `javascript:` and credential-bearing URLs.
8. Restart Chrome mid-session; ensure countdown recovers (alarms may fire after startup).
9. Try rapid clicks, repeated resets, and reopening the popup.

No real Chrome UI/runtime integration test was performed in the build environment. Static checks and mocked Chrome API tests are supplied separately.
