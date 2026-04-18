use std::process::Command;

#[derive(Debug, Clone)]
pub enum Action {
    HotkeyMissionControl,
    HotkeySwitchLeft,
    HotkeySwitchRight,
}

#[derive(Debug)]
pub struct ActionExecutor;

impl ActionExecutor {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, action: Action) -> anyhow::Result<()> {
        match action {
            Action::HotkeyMissionControl => self.run_mission_control(),
            Action::HotkeySwitchLeft => self.run_switch_left(),
            Action::HotkeySwitchRight => self.run_switch_right(),
        }
    }

    pub fn execute_action_type(&self, action_type: &str) -> anyhow::Result<()> {
        match action_type {
            // backward compatible alias
            "hotkey" | "hotkey_mission_control" => self.execute(Action::HotkeyMissionControl),
            "hotkey_switch_left" => self.execute(Action::HotkeySwitchLeft),
            "hotkey_switch_right" => self.execute(Action::HotkeySwitchRight),
            _ => anyhow::bail!("unsupported action type: {action_type}"),
        }
    }

    fn run_mission_control(&self) -> anyhow::Result<()> {
        // Control + Up (key code 126)
        osascript_ctrl_key(126)
    }

    fn run_switch_left(&self) -> anyhow::Result<()> {
        // Control + Left (key code 123)
        osascript_ctrl_key(123)
    }

    fn run_switch_right(&self) -> anyhow::Result<()> {
        // Control + Right (key code 124)
        osascript_ctrl_key(124)
    }
}

/// Sends a Control + <keycode> keystroke via System Events AppleScript.
///
/// CGEvent posting to Session/HID is unreliable for system-level shortcuts
/// (Mission Control, Space switching) on ad-hoc signed builds and modern macOS
/// security hardening. System Events AppleScript is the proven path; macOS will
/// prompt once for Automation → System Events permission.
#[cfg(target_os = "macos")]
fn osascript_ctrl_key(keycode: u16) -> anyhow::Result<()> {
    let script = format!(
        "tell application \"System Events\" to key code {} using control down",
        keycode
    );
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
fn osascript_ctrl_key(_keycode: u16) -> anyhow::Result<()> {
    anyhow::bail!("hotkey actions are only supported on macOS")
}
