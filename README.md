# mino-gesture

A lightweight, beautiful macOS gesture app built with Tauri, Rust, and React.

mino-gesture is designed as a small, focused utility that improves everyday interactions through simple, reliable mouse gestures. It is not trying to become a giant automation platform or a complicated window manager. The goal is to make a few common actions feel faster, smoother, and more pleasant on macOS.

## What it is

mino-gesture listens for mouse gesture input, matches it against a small rule set, and triggers actions such as system shortcuts, app launches, or simple scripts.

The product direction is intentionally narrow:

- lightweight runtime
- small app bundle
- minimal and beautiful interface
- modern architecture
- clear feature boundaries
- native-feeling macOS experience

## Product direction

mino-gesture is built around the idea of **small and focused interaction enhancement**.

The first version should solve a small number of practical workflows really well:

- upward gesture to open Mission Control
- left and right gestures to switch Spaces
- browser-specific left and right gestures for back and forward
- custom gestures mapped to hotkeys
- simple app launch and script actions

The product should feel like a polished macOS utility, not a dashboard.

## Principles

- Small and focused
- Fast to open, fast to configure
- Minimal UI, low cognitive load
- Beautiful but restrained
- Modern but dependency-light
- Reliable over clever

## Tech stack

### App shell
- Tauri 2

### Core
- Rust
- Rust 2024 edition

### Frontend
- React
- TypeScript
- Vite

## Why this stack

The stack is chosen to keep the product small and modern.

- **Tauri** keeps the desktop shell lightweight.
- **Rust** handles gesture listening, recognition, matching, and action execution.
- **React** is only used for a thin settings UI.
- **Vite** keeps frontend development fast and modern.

The frontend should stay small. All high-frequency or system-level logic belongs in Rust.

## Initial scope

### Included in v1
- mouse gesture recognition
- right-button drag gestures
- simple gesture patterns such as `U`, `D`, `L`, `R`, and small combinations
- global rules
- app-specific rule overrides
- hotkey actions
- open application actions
- shell command actions
- AppleScript actions
- menu bar control
- permissions guidance
- launch at login

### Explicitly out of scope for v1
- trackpad multi-touch gestures
- advanced window management
- cloud sync
- plugin system
- analytics dashboard
- heavy scripting workflows
- multi-platform support

## UX goals

The user experience should feel:

- instant
- clean
- quiet
- obvious
- low-friction

The UI should avoid unnecessary pages, panels, tabs, and configuration noise.

## Project structure

```text
src/
  app/
  pages/
  components/
  hooks/
  styles/

src-tauri/
  src/
    main.rs
    input.rs
    gesture.rs
    rules.rs
    actions.rs
    config.rs
    tray.rs
```

## Documentation

- [PRD](./docs/PRD.md)
- [Technical Design](./docs/TECH_DESIGN.md)

## Status

Project planning and initialization.
