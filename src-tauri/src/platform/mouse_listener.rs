use crate::core::execution::apply_gesture_match;
use crate::core::execution_result::ExecutionResult;
use crate::core::state::AppState;
use crate::domain::gesture::{self, Point};
use rdev::{Button, EventType, Key};
use serde::Serialize;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InputEvent {
    KeyPress { key: String, code: Option<u32> },
    KeyRelease { key: String, code: Option<u32> },
    MousePress { button: String },
    MouseRelease { button: String },
}

fn key_to_string(key: Key) -> String {
    match key {
        Key::Alt => "Alt".to_string(),
        Key::AltGr => "AltGr".to_string(),
        Key::Backspace => "Backspace".to_string(),
        Key::CapsLock => "CapsLock".to_string(),
        Key::ControlLeft => "ControlLeft".to_string(),
        Key::ControlRight => "ControlRight".to_string(),
        Key::Delete => "Delete".to_string(),
        Key::DownArrow => "↓".to_string(),
        Key::End => "End".to_string(),
        Key::Escape => "Esc".to_string(),
        Key::F1 => "F1".to_string(),
        Key::F2 => "F2".to_string(),
        Key::F3 => "F3".to_string(),
        Key::F4 => "F4".to_string(),
        Key::F5 => "F5".to_string(),
        Key::F6 => "F6".to_string(),
        Key::F7 => "F7".to_string(),
        Key::F8 => "F8".to_string(),
        Key::F9 => "F9".to_string(),
        Key::F10 => "F10".to_string(),
        Key::F11 => "F11".to_string(),
        Key::F12 => "F12".to_string(),
        Key::F13 => "F13".to_string(),
        Key::F14 => "F14".to_string(),
        Key::F15 => "F15".to_string(),
        Key::F16 => "F16".to_string(),
        Key::F17 => "F17".to_string(),
        Key::F18 => "F18".to_string(),
        Key::F19 => "F19".to_string(),
        Key::F20 => "F20".to_string(),
        Key::F21 => "F21".to_string(),
        Key::F22 => "F22".to_string(),
        Key::F23 => "F23".to_string(),
        Key::F24 => "F24".to_string(),
        Key::Home => "Home".to_string(),
        Key::LeftArrow => "←".to_string(),
        Key::MetaLeft => "⌘Left".to_string(),
        Key::MetaRight => "⌘Right".to_string(),
        Key::PageDown => "PageDown".to_string(),
        Key::PageUp => "PageUp".to_string(),
        Key::Return => "Return".to_string(),
        Key::RightArrow => "→".to_string(),
        Key::ShiftLeft => "ShiftLeft".to_string(),
        Key::ShiftRight => "ShiftRight".to_string(),
        Key::Space => "Space".to_string(),
        Key::Tab => "Tab".to_string(),
        Key::UpArrow => "↑".to_string(),
        Key::PrintScreen => "PrintScreen".to_string(),
        Key::ScrollLock => "ScrollLock".to_string(),
        Key::Pause => "Pause".to_string(),
        Key::NumLock => "NumLock".to_string(),
        Key::BackQuote => "`".to_string(),
        Key::Num1 => "1".to_string(),
        Key::Num2 => "2".to_string(),
        Key::Num3 => "3".to_string(),
        Key::Num4 => "4".to_string(),
        Key::Num5 => "5".to_string(),
        Key::Num6 => "6".to_string(),
        Key::Num7 => "7".to_string(),
        Key::Num8 => "8".to_string(),
        Key::Num9 => "9".to_string(),
        Key::Num0 => "0".to_string(),
        Key::Minus => "-".to_string(),
        Key::Equal => "=".to_string(),
        Key::KeyQ => "Q".to_string(),
        Key::KeyW => "W".to_string(),
        Key::KeyE => "E".to_string(),
        Key::KeyR => "R".to_string(),
        Key::KeyT => "T".to_string(),
        Key::KeyY => "Y".to_string(),
        Key::KeyU => "U".to_string(),
        Key::KeyI => "I".to_string(),
        Key::KeyO => "O".to_string(),
        Key::KeyP => "P".to_string(),
        Key::LeftBracket => "[".to_string(),
        Key::RightBracket => "]".to_string(),
        Key::KeyA => "A".to_string(),
        Key::KeyS => "S".to_string(),
        Key::KeyD => "D".to_string(),
        Key::KeyF => "F".to_string(),
        Key::KeyG => "G".to_string(),
        Key::KeyH => "H".to_string(),
        Key::KeyJ => "J".to_string(),
        Key::KeyK => "K".to_string(),
        Key::KeyL => "L".to_string(),
        Key::SemiColon => ";".to_string(),
        Key::Quote => "'".to_string(),
        Key::BackSlash => "\\".to_string(),
        Key::IntlBackslash => "IntlBackslash".to_string(),
        Key::KeyZ => "Z".to_string(),
        Key::KeyX => "X".to_string(),
        Key::KeyC => "C".to_string(),
        Key::KeyV => "V".to_string(),
        Key::KeyB => "B".to_string(),
        Key::KeyN => "N".to_string(),
        Key::KeyM => "M".to_string(),
        Key::Comma => ",".to_string(),
        Key::Dot => ".".to_string(),
        Key::Slash => "/".to_string(),
        Key::Insert => "Insert".to_string(),
        Key::KpReturn => "Enter".to_string(),
        Key::KpMinus => "Num-".to_string(),
        Key::KpPlus => "Num+".to_string(),
        Key::KpMultiply => "Num*".to_string(),
        Key::KpDivide => "Num/".to_string(),
        Key::Kp0 => "Num0".to_string(),
        Key::Kp1 => "Num1".to_string(),
        Key::Kp2 => "Num2".to_string(),
        Key::Kp3 => "Num3".to_string(),
        Key::Kp4 => "Num4".to_string(),
        Key::Kp5 => "Num5".to_string(),
        Key::Kp6 => "Num6".to_string(),
        Key::Kp7 => "Num7".to_string(),
        Key::Kp8 => "Num8".to_string(),
        Key::Kp9 => "Num9".to_string(),
        Key::KpDelete => "NumDel".to_string(),
        Key::Function => "Function".to_string(),
        Key::Unknown(code) => format!("Unknown({})", code),
    }
}

fn button_to_string(button: Button) -> String {
    match button {
        Button::Left => "左键".to_string(),
        Button::Right => "右键".to_string(),
        Button::Middle => "中键".to_string(),
        Button::Unknown(code) => format!("Unknown({})", code),
    }
}

/// 获取当前前台应用 bundle id；失败时返回 None，匹配阶段可回退为 global
fn frontmost_bundle_id() -> Option<String> {
    let script =
        r#"tell application "System Events" to get bundle identifier of first application process whose frontmost is true"#;
    let output = Command::new("osascript").arg("-e").arg(script).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

pub fn spawn_middle_button_listener(app: AppHandle, state: Arc<Mutex<AppState>>) {
    std::thread::spawn(move || {
        tracing::info!("middle-button listener thread started, waiting for rdev events...");
        tracing::info!("IMPORTANT: If no events appear, grant Accessibility permission in System Settings");
        
        let capturing = Arc::new(Mutex::new(false));
        let points = Arc::new(Mutex::new(Vec::<Point>::new()));
        let last_xy = Arc::new(Mutex::new((0.0_f64, 0.0_f64)));

        let capturing_clone = capturing.clone();
        let points_clone = points.clone();
        let last_xy_clone = last_xy.clone();
        let state_clone = state.clone();
        let app_clone = app.clone();

        // 修复 macOS 键盘崩溃：告知 rdev 当前不在主线程
        // 参考: https://github.com/Narsil/rdev/issues/165
        #[cfg(target_os = "macos")]
        rdev::set_is_main_thread(false);

        tracing::info!("starting rdev::listen...");
        if let Err(e) = rdev::listen(move |event| {
            match event.event_type {
                EventType::MouseMove { x, y } => {
                    if let Ok(mut last) = last_xy_clone.lock() {
                        *last = (x, y);
                    }
                    if let Ok(cap) = capturing_clone.lock() {
                        if *cap {
                            if let Ok(mut pts) = points_clone.lock() {
                                pts.push(Point { x, y });
                            }
                        }
                    }
                }
                EventType::ButtonPress(button) => {
                    // 发送鼠标按键事件到前端
                    let button_name = button_to_string(button);
                    tracing::info!("Button pressed: {:?} -> {}", button, button_name);
                    let event = InputEvent::MousePress { button: button_name.clone() };
                    if let Err(e) = app_clone.emit("input-event", &event) {
                        tracing::error!("Failed to emit mouse press event: {}", e);
                    }
                    
                    if matches!(button, Button::Middle) {
                        if let (Ok(mut cap), Ok(mut pts), Ok(last)) = 
                            (capturing_clone.lock(), points_clone.lock(), last_xy_clone.lock()) {
                            *cap = true;
                            pts.clear();
                            pts.push(Point {
                                x: last.0,
                                y: last.1,
                            });
                            tracing::debug!("middle-button pressed, start capturing");
                        }
                    }
                }
                EventType::ButtonRelease(button) => {
                    // 发送鼠标释放事件到前端
                    let button_name = button_to_string(button);
                    tracing::info!("Button released: {:?} -> {}", button, button_name);
                    let event = InputEvent::MouseRelease { button: button_name.clone() };
                    if let Err(e) = app_clone.emit("input-event", &event) {
                        tracing::error!("Failed to emit mouse release event: {}", e);
                    }
                    
                    let should_process = if matches!(button, Button::Middle) {
                        if let Ok(mut cap) = capturing_clone.lock() {
                            if *cap {
                                *cap = false;
                                true
                            } else {
                                false
                            }
                        } else {
                            false
                        }
                    } else {
                        false
                    };

                    if should_process {
                        let pts = if let Ok(mut points_guard) = points_clone.lock() {
                            std::mem::take(&mut *points_guard)
                        } else {
                            return;
                        };

                        let scope =
                            frontmost_bundle_id().unwrap_or_else(|| "global".to_string());
                        let result = {
                            let mut guard = match state_clone.lock() {
                                Ok(g) => g,
                                Err(_) => return,
                            };
                            if !guard.config.value().enabled {
                                tracing::debug!("middle-button gesture ignored: app disabled");
                                return;
                            }
                            let tokens = guard.recognizer.recognize(&pts);
                            let gesture_str = gesture::directions_to_string(&tokens);
                            let r = if gesture_str.is_empty() {
                                tracing::debug!("middle-button: no gesture tokens");
                                ExecutionResult {
                                    matched: false,
                                    scope: scope.clone(),
                                    gesture: String::new(),
                                    rule_name: None,
                                    action_type: None,
                                    success: false,
                                    message: "no gesture (movement too small)".to_string(),
                                    trigger: Some("middle_button".to_string()),
                                }
                            } else {
                                let base = apply_gesture_match(&mut guard, &gesture_str, &scope);
                                tracing::info!(
                                    gesture = %gesture_str,
                                    scope = %scope,
                                    matched = base.matched,
                                    "middle-button gesture completed"
                                );
                                ExecutionResult {
                                    trigger: Some("middle_button".to_string()),
                                    ..base
                                }
                            };
                            guard.last_execution = Some(r.clone());
                            r
                        };
                        if let Err(err) = app_clone.emit("gesture-result", &result) {
                            tracing::warn!("emit gesture-result failed: {}", err);
                        }
                    }
                }
                EventType::KeyPress(key) => {
                    // 发送键盘按下事件到前端
                    let key_str = key_to_string(key);
                    tracing::debug!("Key pressed: {:?} -> {}", key, key_str);
                    let event = InputEvent::KeyPress { 
                        key: key_str, 
                        code: if let Key::Unknown(code) = key { Some(code) } else { None }
                    };
                    if let Err(e) = app_clone.emit("input-event", &event) {
                        tracing::error!("Failed to emit key press event: {}", e);
                    }
                }
                EventType::KeyRelease(key) => {
                    // 发送键盘释放事件到前端
                    let key_str = key_to_string(key);
                    let event = InputEvent::KeyRelease { 
                        key: key_str, 
                        code: if let Key::Unknown(code) = key { Some(code) } else { None }
                    };
                    let _ = app_clone.emit("input-event", &event);
                }
                _ => {
                    // 首次收到任何事件,确认 rdev 正常工作
                    static FIRST_EVENT: std::sync::Once = std::sync::Once::new();
                    FIRST_EVENT.call_once(|| {
                        tracing::info!("rdev listener is receiving events (first event received)");
                    });
                }
            }
        }) {
            tracing::error!("rdev listen exited with error: {:?}", e);
        }
    });
}
