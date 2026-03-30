use std::process::Command;

#[derive(Debug, Clone)]
pub enum Action {
    HotkeyMissionControl,
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
        }
    }

    fn run_mission_control(&self) -> anyhow::Result<()> {
        // For foundation milestone we keep a single concrete action path.
        let script = "tell application \"System Events\" to key code 126 using control down";
        let status = Command::new("osascript").arg("-e").arg(script).status()?;
        if status.success() {
            Ok(())
        } else {
            anyhow::bail!("failed to run mission control hotkey")
        }
    }
}
