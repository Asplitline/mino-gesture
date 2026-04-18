use crate::config::ActionConfig;
use std::collections::HashMap;
use std::process::Command;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct ActionExecutor {
    actions: Arc<HashMap<String, ActionConfig>>,
}

impl ActionExecutor {
    pub fn new(actions: Vec<ActionConfig>) -> Self {
        let map = actions
            .into_iter()
            .map(|a| (a.id.clone(), a))
            .collect::<HashMap<_, _>>();
        Self {
            actions: Arc::new(map),
        }
    }

    pub fn list_actions(&self) -> Vec<ActionConfig> {
        let mut actions = self.actions.values().cloned().collect::<Vec<_>>();
        actions.sort_by(|a, b| a.id.cmp(&b.id));
        actions
    }

    pub fn execute_action_type(&self, action_type: &str) -> anyhow::Result<()> {
        // Backward compatible alias.
        let action_id = if action_type == "hotkey" {
            "hotkey_mission_control"
        } else {
            action_type
        };
        let action = self
            .actions
            .get(action_id)
            .ok_or_else(|| anyhow::anyhow!("unsupported action type: {action_type}"))?;

        match action.kind.as_str() {
            "hotkey" => osascript_hotkey(action),
            _ => anyhow::bail!("unsupported action kind: {}", action.kind),
        }
    }
}

/// Sends a configurable hotkey via System Events AppleScript.
///
/// CGEvent posting to Session/HID is unreliable for system-level shortcuts
/// (Mission Control, Space switching) on ad-hoc signed builds and modern macOS
/// security hardening. System Events AppleScript is the proven path; macOS will
/// prompt once for Automation → System Events permission.
#[cfg(target_os = "macos")]
fn osascript_hotkey(action: &ActionConfig) -> anyhow::Result<()> {
    let mut modifiers = Vec::new();
    if action.control {
        modifiers.push("control down");
    }
    if action.option {
        modifiers.push("option down");
    }
    if action.shift {
        modifiers.push("shift down");
    }
    if action.command {
        modifiers.push("command down");
    }

    let script = if modifiers.is_empty() {
        format!(
            "tell application \"System Events\" to key code {}",
            action.key_code
        )
    } else {
        format!(
            "tell application \"System Events\" to key code {} using {{{}}}",
            action.key_code,
            modifiers.join(", ")
        )
    };
    let status = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .status()?;
    if status.success() {
        Ok(())
    } else {
        anyhow::bail!("osascript exited with status: {}", status)
    }
}

#[cfg(not(target_os = "macos"))]
fn osascript_hotkey(_action: &ActionConfig) -> anyhow::Result<()> {
    anyhow::bail!("hotkey actions are only supported on macOS")
}
