# Technical Design

## 1. Technical Direction

mino-gesture is built as a lightweight macOS desktop utility with a thin React UI and a Rust-first core.

The architecture should reflect the product philosophy:

- small and focused
- low overhead
- modern stack
- easy to reason about
- easy to extend without becoming bloated

## 2. Stack

### App shell
- Tauri 2

### Core runtime
- Rust
- Rust 2024 edition

### Frontend
- React
- TypeScript
- Vite

### Styling
- Tailwind CSS or a very small custom styling layer
- avoid heavy UI frameworks

### Serialization and errors
- serde
- anyhow
- thiserror

### Logging
- tracing

## 3. Version Baseline

The project should use a modern baseline rather than optimizing for old machines or old system versions.

Recommended baseline:

- macOS 14+
- Apple Silicon first
- Tauri 2.10+
- React 19.2
- Vite 8
- Rust stable with Rust 2024 edition
- Node 22 LTS for development

## 4. Architecture Overview

The app should be split into two clear layers.

### React UI layer
Responsible for:
- rules page
- rule editor
- permissions page
- settings page
- small app state for the interface

### Rust core layer
Responsible for:
- global input listening
- gesture path sampling
- gesture recognition
- rule matching
- action execution
- config persistence
- tray integration
- system-facing logic

The frontend must remain thin. Any high-frequency or low-level logic belongs in Rust.

## 5. Why Tauri + Rust + React

### Why Tauri
Tauri keeps the desktop shell smaller than Chromium-based alternatives and fits the goal of a lightweight utility.

### Why Rust
Rust is a good fit for a long-running background utility that needs predictable performance, low memory usage, and clean state-machine style logic.

### Why React
React is used only for the settings interface. It provides a fast development experience and easy composition for a small configuration UI.

### Why Vite
Vite provides a fast and modern frontend toolchain. For this project, it should remain a thin frontend build layer rather than a source of ecosystem bloat.

## 6. Scope Control

The technical design should actively prevent bloat.

### Keep
- a small UI surface
- a small action model
- a small rule model
- direct architecture

### Avoid
- plugin runtime in v1
- large component libraries
- sidecar processes in v1
- monorepo complexity
- background analytics systems
- giant state management setup

## 7. Core Modules

### 7.1 input
Responsibilities:
- listen to global mouse events
- detect gesture start
- stream movement samples
- detect gesture end
- normalize the raw event flow for the gesture engine

Notes:
- should isolate macOS-specific input code
- should minimize unnecessary event work while idle

### 7.2 gesture
Responsibilities:
- collect pointer path samples
- apply movement threshold filtering
- reduce noise
- transform sampled path into direction tokens
- support simple gesture patterns such as `U`, `D`, `L`, `R`, and small combinations

Design principle:
- prefer deterministic recognition over “smart” but unpredictable matching

### 7.3 rules
Responsibilities:
- store global rules
- store app-specific rules
- resolve active rule scope
- find the appropriate matching rule

Important behavior:
- app-specific rules should be able to override global rules cleanly
- rule matching should remain understandable and debuggable

### 7.4 actions
Supported action types for v1:
- hotkey
- open application
- shell command
- AppleScript

Responsibilities:
- execute the resolved action
- abstract action execution behind a consistent interface
- keep action types explicit and small

### 7.5 config
Responsibilities:
- load local config on startup
- save config changes
- validate config shape
- support future import/export if needed

Format guidance:
- use TOML for readability
- keep the schema flat and obvious

### 7.6 tray
Responsibilities:
- provide menu bar presence
- toggle enabled state
- open settings window
- quit the app

## 8. Suggested File Structure

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

This should stay small in v1. Avoid premature package splitting.

## 9. Frontend Design

The frontend should be intentionally minimal.

### Pages
- Rules
- Permissions
- Settings

### Components
- RuleList
- RuleRow
- RuleEditor
- ActionFields
- PermissionCard
- SettingsPanel
- Small shared UI primitives

### Frontend principles
- no complex routing needed
- no giant global store unless clearly necessary
- avoid a dashboard mentality
- design for one compact app window

## 10. UI Style Direction

The UI should feel:
- minimal
- polished
- soft but not playful
- modern without being trendy for its own sake

Guidelines:
- few colors
- good spacing
- simple hierarchy
- rounded corners
- subtle separators
- low-noise surfaces

Avoid:
- overly dense control panels
- big enterprise table layouts
- unnecessary charts or statistics
- decorative effects that increase bundle size or complexity

## 11. Config Model

A simple config format is preferred.

Example:

```toml
[[rules]]
name = "Mission Control"
enabled = true
scope = "global"
trigger = "right_drag"
gesture = "U"

[rules.action]
type = "hotkey"
modifiers = ["ctrl"]
key = "up"
```

Browser-specific rule example:

```toml
[[rules]]
name = "Browser Back"
enabled = true
scope = "com.google.Chrome"
trigger = "right_drag"
gesture = "L"

[rules.action]
type = "hotkey"
modifiers = ["cmd"]
key = "["
```

## 12. Event Flow

The basic event flow should be:

1. User presses the configured trigger button
2. Input module starts collecting cursor movement
3. Gesture module samples and reduces the path
4. Gesture module produces a normalized gesture token sequence
5. Rules module resolves the current app scope
6. Rules module matches the best rule
7. Actions module executes the corresponding action

This pipeline should be simple to inspect and debug.

## 13. macOS Integration Strategy

The product should use native macOS input and action mechanisms through the Rust side.

Initial implementation should prefer:
- stable system integration
- shortcut-driven actions
- minimal fragility

Before deeper automation features are considered, the product should first prove reliability with a smaller action model.

## 14. Performance Strategy

### Main goals
- low idle CPU use
- low idle memory use
- fast startup
- small frontend bundle
- small packaged app footprint

### Practical rules
- keep React bundle small
- avoid heavy UI libraries
- keep gesture recognition in Rust
- do as little work as possible when no gesture is active
- limit background polling or observers

## 15. Build and Dependency Strategy

### Frontend
- use Vite defaults where possible
- keep dependencies minimal
- avoid full design systems
- prefer custom small components over importing large UI kits
- code-split only if it genuinely helps, since the UI surface is small

### Rust
- prefer a small number of well-known crates
- avoid abstraction-heavy frameworks
- keep module interfaces direct and explicit

## 16. Future Extensions

These may be added later if they do not compromise the product philosophy:

- gesture preview or visualization
- richer rule editing UX
- import/export UI
- more built-in action types
- better app-specific presets

These should be treated as optional enhancements, not baseline requirements.

## 17. Technical Boundary

If an implementation choice makes the app significantly heavier, more confusing, or more general-purpose than intended, it should be reconsidered.

The architecture should protect the product from turning into a bloated automation framework.
