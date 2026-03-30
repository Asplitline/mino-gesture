//! 领域逻辑：手势识别、规则匹配、动作执行（尽量不依赖 Tauri / 系统托盘）。

pub mod actions;
pub mod gesture;
pub mod rules;
