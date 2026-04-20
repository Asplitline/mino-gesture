# mino-gesture

[中文说明](./README.zh-CN.md)

mino-gesture is a lightweight mouse gesture utility for macOS, built with Tauri, Rust, React, and TypeScript.

The project is intentionally narrow in scope: make a small set of frequent actions faster and easier, without turning into a large automation platform. The current version focuses on pointer-button drag gestures, hotkey execution, essential settings, and a compact configuration UI.

## Current Features

- Recognize gestures by holding the middle or right mouse button, dragging, and releasing.
- Support `U / D / L / R` gestures and their combinations.
- Ship with a small set of built-in starter rules:
  - middle-button up for Mission Control
  - middle-button left/right for switching Spaces
  - right-button left/right for browser back/forward
- Create, edit, enable, disable, delete, and reset rules.
- Record custom hotkeys for each rule.
- Show recent execution results and gesture logs.
- Detect Accessibility and Input Monitoring permission status.
- Support launch at login.
- Let users choose whether closing the main window minimizes to tray or quits the app.
- Show version info, update guidance, changelog, and project links inside Settings.

## Scope

The app is usable today, but its boundaries are deliberate:

- Hotkey execution is the primary action model right now.
- The current product emphasizes global rules and built-in practical scenarios, not heavy automation.
- Updates are currently installed manually from GitHub Releases; in-app auto-update is not enabled.

If you are looking for a window manager, scripting platform, plugin system, or cross-platform input tool, this project is not trying to be that.

## Installation

The recommended installation path is GitHub Releases:

- Releases: <https://github.com/Asplitline/mino-gesture/releases>

After downloading, move the app into `/Applications` and grant the required permissions on first launch.

## Permissions

mino-gesture requires these macOS permissions:

- Accessibility
- Input Monitoring

Without them, the app may fail to capture global mouse events, and gestures will not work.

In development, permissions usually need to be granted to the host app that launches `pnpm tauri dev`, such as:

- Terminal
- iTerm
- Cursor
- VS Code

For more details, see [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Development

### Requirements

- macOS
- Rust toolchain
- pnpm
- Xcode Command Line Tools

### Install dependencies

```bash
pnpm install
```

### Common commands

```bash
pnpm tauri dev
pnpm build
pnpm tauri build
```

### Versioning and release

```bash
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
```

See [docs/RELEASE.md](./docs/RELEASE.md) and [docs/CHANGELOG_GENERATION.md](./docs/CHANGELOG_GENERATION.md) for release and changelog conventions.

## Configuration and Data

The app stores its configuration in the macOS application support directory. On first launch it creates a default config with built-in actions and rules.

The default rules currently cover:

- Mission Control
- Space switching
- browser back / forward

If you want to start over, you can reset rules back to the built-in set from Settings.

## Tech Stack

- Tauri 2
- Rust
- React 19
- TypeScript
- Vite
- Tailwind CSS

## Docs

- [docs/CURRENT_FEATURES.md](./docs/CURRENT_FEATURES.md)
- [docs/TECH_DESIGN.md](./docs/TECH_DESIGN.md)
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- [docs/RELEASE.md](./docs/RELEASE.md)
- [docs/CHANGELOG_GENERATION.md](./docs/CHANGELOG_GENERATION.md)

## Status

Current version: `0.1.5`

The README is intended to describe what is already implemented, not long-range plans.
