use crate::core::execution::apply_gesture_match;
use crate::core::execution_result::ExecutionResult;
use crate::core::state::AppState;
use crate::domain::gesture::{self, Point};
use crate::platform::macos_input::{listen, MouseButton, RawEvent};
use serde::Serialize;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InputEvent {
    KeyPress { key: String, code: Option<u32> },
    KeyRelease { key: String, code: Option<u32> },
    MousePress { button: String },
    MouseRelease { button: String },
}

fn button_to_string(button: &MouseButton) -> String {
    match button {
        MouseButton::Left => "左键".to_string(),
        MouseButton::Right => "右键".to_string(),
        MouseButton::Middle => "中键".to_string(),
        MouseButton::Other(n) => format!("Button{}", n),
    }
}

/// macOS 虚拟键码 → 可读字符串（常用键）
fn keycode_to_string(code: u32) -> String {
    match code {
        0 => "A", 1 => "S", 2 => "D", 3 => "F", 4 => "H", 5 => "G",
        6 => "Z", 7 => "X", 8 => "C", 9 => "V", 11 => "B", 12 => "Q",
        13 => "W", 14 => "E", 15 => "R", 16 => "Y", 17 => "T", 18 => "1",
        19 => "2", 20 => "3", 21 => "4", 22 => "6", 23 => "5", 24 => "=",
        25 => "9", 26 => "7", 27 => "-", 28 => "8", 29 => "0", 30 => "]",
        31 => "O", 32 => "U", 33 => "[", 34 => "I", 35 => "P", 36 => "Return",
        37 => "L", 38 => "J", 39 => "'", 40 => "K", 41 => ";", 42 => "\\",
        43 => ",", 44 => "/", 45 => "N", 46 => "M", 47 => ".", 48 => "Tab",
        49 => "Space", 50 => "`", 51 => "Backspace", 53 => "Esc",
        54 => "⌘Right", 55 => "⌘Left", 56 => "ShiftLeft", 57 => "CapsLock",
        58 => "Alt", 59 => "ControlLeft", 60 => "ShiftRight", 61 => "AltGr",
        62 => "ControlRight", 63 => "Function",
        96 => "F5", 97 => "F6", 98 => "F7", 99 => "F3", 100 => "F8",
        101 => "F9", 103 => "F11", 105 => "PrintScreen", 107 => "ScrollLock",
        109 => "F10", 111 => "F12", 113 => "Pause", 114 => "Insert",
        115 => "Home", 116 => "PageUp", 117 => "Delete", 118 => "F4",
        119 => "End", 120 => "F2", 121 => "PageDown", 122 => "F1",
        123 => "←", 124 => "→", 125 => "↓", 126 => "↑",
        71 => "NumLock", 75 => "Num/", 76 => "Enter", 78 => "Num-",
        81 => "Num=", 82 => "Num0", 83 => "Num1", 84 => "Num2", 85 => "Num3",
        86 => "Num4", 87 => "Num5", 88 => "Num6", 89 => "Num7",
        91 => "Num8", 92 => "Num9",
        _ => "",
    }
    .to_string()
    .pipe(|s| if s.is_empty() { format!("Key({})", code) } else { s })
}

trait Pipe: Sized {
    fn pipe<B, F: FnOnce(Self) -> B>(self, f: F) -> B { f(self) }
}
impl Pipe for String {}

/// 获取当前前台应用 bundle id；失败时返回 None，匹配阶段回退为 global
fn frontmost_bundle_id() -> Option<String> {
    let script = r#"tell application "System Events" to get bundle identifier of first application process whose frontmost is true"#;
    let output = Command::new("osascript").arg("-e").arg(script).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if s.is_empty() { None } else { Some(s) }
}

pub fn spawn_middle_button_listener(app: AppHandle, state: Arc<Mutex<AppState>>) {
    std::thread::spawn(move || {
        tracing::info!("input listener thread started (native CGEventTap)");
        tracing::info!("IMPORTANT: grant Accessibility permission in System Settings if no events appear");

        let capturing = Arc::new(Mutex::new(false));
        let points = Arc::new(Mutex::new(Vec::<Point>::new()));
        let last_xy = Arc::new(Mutex::new((0.0_f64, 0.0_f64)));

        let capturing_c = capturing.clone();
        let points_c = points.clone();
        let last_xy_c = last_xy.clone();
        let state_c = state.clone();
        let app_c = app.clone();

        if let Err(e) = listen(move |event| {
            handle_raw_event(
                event,
                &app_c,
                &state_c,
                &capturing_c,
                &points_c,
                &last_xy_c,
            );
        }) {
            tracing::error!("CGEventTap listen error: {}", e);
        }
    });
}

/// 实时轨迹点，用于前端预览
#[derive(Debug, Clone, Serialize)]
struct TrailPoint {
    x: f64,
    y: f64,
}

fn handle_raw_event(
    event: RawEvent,
    app: &AppHandle,
    state: &Arc<Mutex<AppState>>,
    capturing: &Arc<Mutex<bool>>,
    points: &Arc<Mutex<Vec<Point>>>,
    last_xy: &Arc<Mutex<(f64, f64)>>,
) {
    match event {
        RawEvent::MouseMove { x, y } => {
            if let Ok(mut last) = last_xy.lock() {
                *last = (x, y);
            }
            if let Ok(cap) = capturing.lock() {
                if *cap {
                    if let Ok(mut pts) = points.lock() {
                        pts.push(Point { x, y });
                    }
                    // 实时推送轨迹点给前端，用于捕获中预览
                    let _ = app.emit("trail-point", &TrailPoint { x, y });
                }
            }
        }

        RawEvent::MousePress { x, y, button } => {
            let name = button_to_string(&button);
            tracing::info!("MousePress: {:?} -> {}", button, name);
            let _ = app.emit("input-event", &InputEvent::MousePress { button: name });

            if button == MouseButton::Middle {
                if let (Ok(mut cap), Ok(mut pts)) = (capturing.lock(), points.lock()) {
                    *cap = true;
                    pts.clear();
                    pts.push(Point { x, y });
                    tracing::debug!("middle-button pressed, start capturing");
                }
                // 显示覆盖窗口并覆盖当前屏幕
                show_overlay(app, x, y);
                // 通知前端起点坐标，画布立即定位
                let _ = app.emit("trail-start", &TrailPoint { x, y });
            }
        }

        RawEvent::MouseRelease { button } => {
            let name = button_to_string(&button);
            tracing::info!("MouseRelease: {:?} -> {}", button, name);
            let _ = app.emit("input-event", &InputEvent::MouseRelease { button: name });

            if button == MouseButton::Middle {
                let should_process = capturing
                    .lock()
                    .map(|mut cap| {
                        if *cap {
                            *cap = false;
                            true
                        } else {
                            false
                        }
                    })
                    .unwrap_or(false);

                if should_process {
                    process_gesture(app, state, points);
                }
            }
        }

        RawEvent::KeyPress { keycode } => {
            let key = keycode_to_string(keycode);
            tracing::debug!("KeyPress: {}", key);
            let _ = app.emit(
                "input-event",
                &InputEvent::KeyPress { key, code: Some(keycode) },
            );
        }

        RawEvent::KeyRelease { keycode } => {
            let key = keycode_to_string(keycode);
            let _ = app.emit(
                "input-event",
                &InputEvent::KeyRelease { key, code: Some(keycode) },
            );
        }
    }
}

/// 附带轨迹的手势结果，发往前端
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GestureResultWithTrail {
    #[serde(flatten)]
    result: ExecutionResult,
    trail: Vec<TrailPoint>,
}

/// 对轨迹点降采样，最多保留 `max_points` 个点（均匀抽取）
fn downsample(pts: &[Point], max_points: usize) -> Vec<TrailPoint> {
    if pts.len() <= max_points {
        return pts.iter().map(|p| TrailPoint { x: p.x, y: p.y }).collect();
    }
    let step = pts.len() as f64 / max_points as f64;
    (0..max_points)
        .map(|i| {
            let idx = (i as f64 * step) as usize;
            let p = &pts[idx.min(pts.len() - 1)];
            TrailPoint { x: p.x, y: p.y }
        })
        .collect()
}

fn process_gesture(
    app: &AppHandle,
    state: &Arc<Mutex<AppState>>,
    points: &Arc<Mutex<Vec<Point>>>,
) {
    let pts = match points.lock() {
        Ok(mut g) => std::mem::take(&mut *g),
        Err(_) => return,
    };

    let trail = downsample(&pts, 150);
    let scope = frontmost_bundle_id().unwrap_or_else(|| "global".to_string());

    let result = match state.lock() {
        Ok(mut guard) => {
            if !guard.config.value().enabled {
                tracing::debug!("middle-button gesture ignored: app disabled");
                return;
            }
            let tokens = guard.recognizer.recognize(&pts);
            let gesture_str = gesture::directions_to_string(&tokens);

            if gesture_str.is_empty() {
                tracing::debug!("middle-button: no gesture tokens");
                ExecutionResult {
                    matched: false,
                    scope,
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
                ExecutionResult { trigger: Some("middle_button".to_string()), ..base }
            }
        }
        Err(_) => return,
    };

    if let Err(e) = app.emit("gesture-result", &GestureResultWithTrail { result, trail }) {
        tracing::warn!("emit gesture-result failed: {}", e);
    }

    // 延迟 1.3s 后隐藏覆盖窗口（与前端淡出时间匹配）
    let app_hide = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1300));
        hide_overlay(&app_hide);
    });
}

/// 显示覆盖窗口，铺满鼠标当前所在的屏幕。
///
/// cursor_x / cursor_y 是 CGEvent 屏幕物理像素坐标（左上角原点）。
/// 遍历所有显示器，找到包含该坐标的那个，将窗口移到它上面并调整为其尺寸。
fn show_overlay(app: &AppHandle, cursor_x: f64, cursor_y: f64) {
    use tauri::PhysicalPosition;
    use tauri::PhysicalSize;

    let Some(win) = app.get_webview_window("overlay") else { return };

    let monitors = match win.available_monitors() {
        Ok(m) => m,
        Err(_) => {
            let _ = win.set_ignore_cursor_events(true);
            let _ = win.show();
            return;
        }
    };

    // 找到鼠标坐标落在哪块屏幕上
    let target = monitors.iter().find(|m| {
        let pos = m.position();
        let size = m.size();
        let x = pos.x as f64;
        let y = pos.y as f64;
        let w = size.width as f64;
        let h = size.height as f64;
        cursor_x >= x && cursor_x < x + w && cursor_y >= y && cursor_y < y + h
    });

    // 找不到（罕见）则回退到第一块屏幕
    let monitor = target.or_else(|| monitors.first());

    if let Some(m) = monitor {
        let pos = m.position();
        let size = m.size();
        let _ = win.set_position(PhysicalPosition::new(pos.x, pos.y));
        let _ = win.set_size(PhysicalSize::new(size.width, size.height));
        tracing::debug!(
            "overlay → monitor at ({},{}) size {}×{}",
            pos.x, pos.y, size.width, size.height
        );
    }

    let _ = win.set_ignore_cursor_events(true);
    let _ = win.show();
}

fn hide_overlay(app: &AppHandle) {
    let Some(win) = app.get_webview_window("overlay") else { return };
    let _ = win.hide();
}
