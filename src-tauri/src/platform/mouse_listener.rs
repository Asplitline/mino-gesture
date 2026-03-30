use crate::core::execution::apply_gesture_match;
use crate::core::execution_result::ExecutionResult;
use crate::core::state::AppState;
use crate::domain::gesture::{self, Point};
use rdev::{Button, EventType};
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

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
        let mut capturing = false;
        let mut points: Vec<Point> = Vec::new();
        let mut last_xy = (0.0_f64, 0.0_f64);

        if let Err(e) = rdev::listen(move |event| {
            match event.event_type {
                EventType::MouseMove { x, y } => {
                    last_xy = (x, y);
                    if capturing {
                        points.push(Point { x, y });
                    }
                }
                EventType::ButtonPress(Button::Middle) => {
                    capturing = true;
                    points.clear();
                    points.push(Point {
                        x: last_xy.0,
                        y: last_xy.1,
                    });
                }
                EventType::ButtonRelease(Button::Middle) => {
                    if capturing {
                        capturing = false;
                        let pts = std::mem::take(&mut points);
                        let scope =
                            frontmost_bundle_id().unwrap_or_else(|| "global".to_string());
                        let result = {
                            let mut guard = match state.lock() {
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
                        if let Err(err) = app.emit("gesture-result", &result) {
                            tracing::warn!("emit gesture-result failed: {}", err);
                        }
                    }
                }
                _ => {}
            }
        }) {
            tracing::error!("rdev listen exited with error: {:?}", e);
        }
    });
}
