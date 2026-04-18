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
                EventType::ButtonPress(Button::Middle) => {
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
                EventType::ButtonRelease(Button::Middle) => {
                    let should_process = if let Ok(mut cap) = capturing_clone.lock() {
                        if *cap {
                            *cap = false;
                            true
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
