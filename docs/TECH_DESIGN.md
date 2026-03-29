# Technical Design

## 1. Stack

- Tauri 2
- Rust
- React
- TypeScript
- Vite

## 2. Design Goals

- Small app size
- Low memory usage
- Simple architecture
- Modern developer experience
- Clean separation between UI and system-level logic

## 3. High-Level Architecture

### Frontend
Responsible for:
- Rule list
- Rule editor
- Permissions view
- Settings view

### Rust Core
Responsible for:
- Global mouse event listening
- Gesture path sampling and recognition
- Rule matching
- Action execution
- Config persistence
- Tray integration

## 4. Core Modules

### input
- Listen to global mouse events
- Detect gesture start, move, and end
- Provide normalized event stream to gesture engine

### gesture
- Sample pointer path
- Reduce noise
- Convert path into direction tokens
- Match simple gesture patterns

### rules
- Store global and app-specific rules
- Resolve active rule set by current app context
- Apply first-match or priority-based rule resolution

### actions
Supported action types:
- Hotkey
- Open application
- Shell command
- AppleScript

### config
- Load and save local configuration
- Use a simple structured format
- Support import/export later

### tray
- Menu bar icon
- Enable or disable app
- Open settings
- Quit app

## 5. UI Scope

The UI should stay intentionally small.

Pages:
- Rules
- Permissions
- Settings

Avoid:
- Dashboard
- Analytics views
- Complex nested settings
- Heavy component libraries

## 6. Config Model

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

## 7. Event Flow

1. User presses trigger button
2. App starts collecting cursor path
3. User moves pointer
4. App reduces path into gesture tokens
5. Rules are matched
6. Matching action is executed

## 8. macOS Integration

The app will rely on native macOS event handling and permission flows for gesture input and action execution.

Initial implementation should prefer reliable shortcut-based actions over deeper app automation.

## 9. Performance Principles

- Keep frontend thin
- Keep Rust core responsible for all high-frequency logic
- Avoid unnecessary dependencies
- Avoid large UI libraries
- Minimize background work when idle

## 10. Initial File Structure

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

## 11. Future Extensions

Possible future additions:
- Better gesture visualization
- Rule import/export UI
- More action types
- Improved app-specific behavior

These should only be added if they do not compromise the product's small and focused nature.
