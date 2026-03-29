# Product Requirements Document

## 1. Product Overview

mino-gesture is a lightweight macOS gesture app focused on small, beautiful, and efficient interaction enhancements.

It is meant for users who want a faster and more pleasant everyday desktop workflow without installing a heavy customization platform. The product should feel small, polished, and focused from day one.

The product is intentionally narrow:

- it improves interaction speed
- it stays visually minimal
- it avoids feature bloat
- it respects macOS conventions

## 2. Vision

Build a small but delightful macOS utility that makes common actions feel effortless through mouse gestures.

The long-term vision is a family of small productivity tools that share the same product philosophy:

- lightweight
- beautiful
- focused
- modern
- easy to learn

## 3. Product Principles

### Small and focused
The app should do a limited set of things well. It should not become a general automation suite.

### Beautiful but restrained
The interface should be polished and visually pleasing, but never noisy or overdesigned.

### Fast by default
The app should launch quickly, stay responsive, and keep configuration simple.

### Native-feeling
The experience should feel like it belongs on macOS.

### Reliability over novelty
A small set of dependable gesture actions is more valuable than a long list of fragile features.

## 4. Goals

### Primary goals
- Provide reliable mouse gesture recognition for common desktop actions
- Keep app size and runtime cost low
- Offer a simple and elegant configuration UI
- Support global rules and app-specific overrides
- Make first setup easy and understandable

### Secondary goals
- Provide a strong base for future small utilities in the same family
- Make the architecture easy to extend without bloating the first version

## 5. Non-Goals

The following are explicitly out of scope for v1:

- full automation platform
- complex window management system
- plugin marketplace
- cloud sync
- team collaboration features
- usage analytics dashboard
- trackpad multi-touch customization
- deep browser extension style integrations
- cross-platform support

## 6. Target Users

### Primary users
- macOS users who want faster everyday interactions
- users who like small focused utilities
- users who care about both aesthetics and speed

### Secondary users
- developers and designers who prefer keyboard-and-mouse workflow improvements
- productivity enthusiasts who do not want a huge setup surface

## 7. User Problems

Users often want to speed up repetitive desktop actions such as:

- opening Mission Control
- switching Spaces
- going back and forward in browsers
- launching apps
- triggering frequently used shortcuts

Current options can feel outdated, bloated, visually rough, or overpowered for simple needs.

## 8. Core Use Cases

### Use case 1: Mission Control
As a user, I want to trigger Mission Control with a simple upward gesture so I can quickly see windows and Spaces.

### Use case 2: Switch Spaces
As a user, I want to switch desktop Spaces with left and right gestures so I can move across work contexts quickly.

### Use case 3: Browser navigation
As a user, I want browser-specific gestures for back and forward so that web navigation feels natural.

### Use case 4: Trigger shortcuts
As a user, I want to map gestures to keyboard shortcuts so I can automate common app actions.

### Use case 5: Launch apps or scripts
As a user, I want a gesture to open an app or run a small script for repetitive tasks.

## 9. MVP Scope

### Included
- right-button drag gestures
- simple gesture recognition (`U`, `D`, `L`, `R`, plus limited combinations)
- global rules
- app-specific rule overrides
- hotkey actions
- open application actions
- shell command actions
- AppleScript actions
- menu bar app
- enable/disable switch
- permissions guidance
- launch at login
- import/export support can be deferred if it complicates v1 too much

### Excluded
- trackpad gestures
- gesture recording animation system
- advanced script chaining
- complicated conditions and branching
- visual workflow builder
- cloud account system
- large onboarding flow

## 10. Interaction Model

The first version should be optimized for a very simple gesture model:

1. User holds the configured trigger button
2. User moves the pointer
3. App collects the path
4. App reduces the path into a simple gesture pattern
5. App matches the best rule
6. App executes the action

This model should be easy to understand and easy to debug.

## 11. Functional Requirements

### Gesture input
- The app must detect gesture start, movement, and end
- The app must support simple direction-based gesture recognition
- The app should ignore tiny accidental movement
- The app should prioritize reliability over overly flexible pattern matching

### Rules
- The app must support global rules
- The app must support app-specific rules
- App-specific rules should override global rules when appropriate
- Rules should be easy to reorder or prioritize later if needed

### Actions
The app must support these action types in v1:
- send hotkey
- open application
- run shell command
- run AppleScript

### UI
- The app must provide a rules list
- The app must provide a rule editor
- The app must provide a permissions page
- The app must provide a small settings page
- The app must provide a menu bar entry

### Settings
- The app must support launch at login
- The app must support enable/disable state
- The app should keep the number of settings intentionally small

## 12. UX Requirements

- A user should be able to understand the app in under one minute
- A user should be able to create a basic rule in under 30 seconds
- The interface should avoid dense forms and unnecessary nesting
- The core screens should fit into a minimal app window
- The product should feel calm and polished

## 13. Visual Direction

The visual language should aim for:

- clean spacing
- restrained color use
- simple typography hierarchy
- subtle contrast
- rounded corners
- minimal chrome

Avoid:

- heavy gradients everywhere
- enterprise dashboard styling
- noisy sidebars
- too many icons
- overly playful motion

## 14. Success Criteria

### Product success
- Users can successfully set up and use a first gesture quickly
- The app feels responsive and reliable
- The UI feels noticeably simpler than older gesture tools

### Technical success
- Low idle resource usage
- Small packaged app size
- Stable gesture detection for the initial action set
- Minimal dependency footprint

## 15. Milestones

### Milestone 1: foundation
- app shell
- tray app
- permissions flow
- global event listening
- simple hotkey execution

### Milestone 2: usable MVP
- rule list
- rule editor
- app-specific rules
- open app and script actions
- launch at login

### Milestone 3: polish
- better empty states
- cleaner permissions guidance
- rule editing improvements
- gesture feedback refinements
- release readiness

## 16. Risks

### Risk: feature creep
Because gesture tools often expand into automation platforms, the product can quickly become too broad.

### Risk: UX complexity
A small utility can become confusing if too many actions and settings are exposed too early.

### Risk: macOS integration edge cases
Permissions and system integrations can introduce complexity and user friction.

## 17. Product Boundary

mino-gesture should remain a **small interaction tool**.

If a feature makes the product feel like a workflow builder, scripting IDE, or giant settings app, it should probably not be in the first version.
