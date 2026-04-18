//! 平台集成：全局输入、系统托盘、与 OS 交互的边界代码。

pub mod input;
#[cfg(target_os = "macos")]
pub mod macos_input;
pub mod mouse_listener;
pub mod tray;
