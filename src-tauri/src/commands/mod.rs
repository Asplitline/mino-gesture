//! Tauri `invoke`：入参/出参与命令实现（薄编排，逻辑见 `core` / `domain` / `config`）。

use crate::config::{ActionConfig, ActionHotkeySnapshot, RuleConfig};
use crate::core::execution::{
    apply_gesture_match, normalize_button, normalize_gesture, normalize_scope, validate_button,
    validate_gesture,
};
use crate::core::execution_result::ExecutionResult;
use crate::core::state::AppState;
use crate::domain::gesture::{self, Point};
use crate::platform::tray;
use serde::{Deserialize, Serialize};
use std::collections::{hash_map::DefaultHasher, BTreeMap};
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, State};

const GITHUB_REPO_URL: &str = "https://github.com/Asplitline/mino-gesture";
const GITHUB_RELEASES_URL: &str = "https://github.com/Asplitline/mino-gesture/releases";

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn CGPreflightListenEventAccess() -> bool;
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusResponse {
    pub enabled: bool,
    pub input_running: bool,
    pub recognizer_ready: bool,
    pub hotkey_ready: bool,
    pub config_path: String,
    pub last_execution: Option<ExecutionResult>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatusResponse {
    pub accessibility: bool,
    pub input_monitoring: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchAtLoginResponse {
    pub available: bool,
    pub enabled: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseBehaviorResponse {
    pub minimize_to_tray_on_close: bool,
    pub show_close_to_tray_hint: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatusResponse {
    pub auto_update_enabled: bool,
    pub message: String,
    pub releases_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AboutResponse {
    pub author: String,
    pub github_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontmostAppResponse {
    pub name: String,
    pub bundle_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BindableAppResponse {
    pub name: String,
    pub bundle_id: String,
    pub icon_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsOverviewResponse {
    pub app_name: String,
    pub version: String,
    pub tauri_version: String,
    pub bundle_identifier: String,
    pub config_path: String,
    pub permissions: PermissionStatusResponse,
    pub launch_at_login: LaunchAtLoginResponse,
    pub close_behavior: CloseBehaviorResponse,
    pub updates: UpdateStatusResponse,
    pub about: AboutResponse,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRuleRequest {
    name: String,
    gesture: String,
    #[serde(default = "default_button")]
    button: String,
    #[serde(default = "default_scope")]
    scope: String,
    action_type: Option<String>,
    #[serde(default)]
    action_hotkey: Option<ActionHotkeySnapshot>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRuleRequest {
    id: String,
    name: String,
    enabled: bool,
    scope: String,
    button: String,
    gesture: String,
    action_type: String,
    #[serde(default)]
    action_hotkey: Option<ActionHotkeySnapshot>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteRuleRequest {
    id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteGestureRequest {
    gesture: String,
    #[serde(default = "default_scope")]
    scope: String,
    #[serde(default = "default_button")]
    button: String,
}

fn open_with_macos(target: &str) -> Result<(), String> {
    let status = Command::new("open")
        .arg(target)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("failed to open target: {target}"))
    }
}

fn applescript_escape(input: &str) -> String {
    input.replace('\\', "\\\\").replace('"', "\\\"")
}

fn run_osascript(script: &str) -> Result<String, String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if stderr.is_empty() {
            "osascript failed".to_string()
        } else {
            stderr
        })
    }
}

fn frontmost_app_info() -> Result<Option<FrontmostAppResponse>, String> {
    let script = r#"tell application "System Events"
set frontApp to first application process whose frontmost is true
set appName to name of frontApp
set bundleId to bundle identifier of frontApp
return appName & linefeed & bundleId
end tell"#;
    let output = run_osascript(script)?;
    let mut lines = output.lines();
    let name = lines.next().unwrap_or_default().trim().to_string();
    let bundle_id = lines.next().unwrap_or_default().trim().to_string();
    if name.is_empty() || bundle_id.is_empty() || bundle_id == "missing value" {
        Ok(None)
    } else {
        Ok(Some(FrontmostAppResponse { name, bundle_id }))
    }
}

fn plutil_extract_raw(info_plist: &Path, key: &str) -> Option<String> {
    let output = Command::new("plutil")
        .arg("-extract")
        .arg(key)
        .arg("raw")
        .arg("-o")
        .arg("-")
        .arg(info_plist)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.is_empty() || value == "missing value" {
        None
    } else {
        Some(value)
    }
}

fn app_icon_source_path(app_path: &Path, info_plist: &Path) -> Option<PathBuf> {
    let icon_file = plutil_extract_raw(info_plist, "CFBundleIconFile")?;
    let icon_file = if Path::new(&icon_file).extension().is_some() {
        icon_file
    } else {
        format!("{icon_file}.icns")
    };
    let icon_path = app_path.join("Contents").join("Resources").join(icon_file);
    icon_path.exists().then_some(icon_path)
}

fn cached_png_icon_path(icon_path: &Path, bundle_id: &str) -> Option<String> {
    let mut hasher = DefaultHasher::new();
    icon_path.hash(&mut hasher);
    bundle_id.hash(&mut hasher);
    let cache_dir = std::env::temp_dir().join("mino-gesture").join("app-icons");
    fs::create_dir_all(&cache_dir).ok()?;
    let output_path = cache_dir.join(format!("{:x}.png", hasher.finish()));
    if output_path.exists() {
        return Some(output_path.display().to_string());
    }

    let status = Command::new("sips")
        .arg("-s")
        .arg("format")
        .arg("png")
        .arg(icon_path)
        .arg("--out")
        .arg(&output_path)
        .status()
        .ok()?;
    if status.success() && output_path.exists() {
        Some(output_path.display().to_string())
    } else {
        None
    }
}

fn collect_apps_from_dir(dir: &Path, apps: &mut BTreeMap<String, BindableAppResponse>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let is_app = path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("app"));

        if is_app {
            let info_plist = path.join("Contents").join("Info.plist");
            let Some(bundle_id) = plutil_extract_raw(&info_plist, "CFBundleIdentifier") else {
                continue;
            };
            let name = plutil_extract_raw(&info_plist, "CFBundleDisplayName")
                .or_else(|| plutil_extract_raw(&info_plist, "CFBundleName"))
                .or_else(|| path.file_stem().and_then(|stem| stem.to_str()).map(str::to_string))
                .unwrap_or_else(|| bundle_id.clone());
            let icon_path = app_icon_source_path(&path, &info_plist)
                .and_then(|icon_path| cached_png_icon_path(&icon_path, &bundle_id));
            apps.entry(bundle_id.clone())
                .or_insert(BindableAppResponse {
                    name,
                    bundle_id,
                    icon_path,
                });
        } else if path.is_dir() {
            collect_apps_from_dir(&path, apps);
        }
    }
}

fn list_bindable_apps_info() -> Vec<BindableAppResponse> {
    let mut apps = BTreeMap::new();
    collect_apps_from_dir(Path::new("/Applications"), &mut apps);
    collect_apps_from_dir(Path::new("/System/Applications"), &mut apps);
    if let Some(home) = std::env::var_os("HOME") {
        collect_apps_from_dir(&PathBuf::from(home).join("Applications"), &mut apps);
    }

    let mut apps: Vec<_> = apps.into_values().collect();
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

fn app_bundle_or_binary_path() -> Result<PathBuf, String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    for ancestor in current_exe.ancestors() {
        if ancestor
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("app"))
        {
            return Ok(ancestor.to_path_buf());
        }
    }
    Ok(current_exe)
}

fn login_item_exists(name: &str) -> Result<bool, String> {
    let script = format!(
        "tell application \"System Events\" to exists login item \"{}\"",
        applescript_escape(name)
    );
    Ok(run_osascript(&script)?.eq_ignore_ascii_case("true"))
}

fn set_login_item_enabled(name: &str, path: &Path, enabled: bool) -> Result<(), String> {
    let escaped_name = applescript_escape(name);
    let escaped_path = applescript_escape(&path.display().to_string());
    let script = if enabled {
        format!(
            "tell application \"System Events\"\n\
             if exists login item \"{escaped_name}\" then delete login item \"{escaped_name}\"\n\
             make login item at end with properties {{name:\"{escaped_name}\", path:\"{escaped_path}\", hidden:false}}\n\
             end tell"
        )
    } else {
        format!(
            "tell application \"System Events\"\n\
             if exists login item \"{escaped_name}\" then delete login item \"{escaped_name}\"\n\
             end tell"
        )
    };
    run_osascript(&script).map(|_| ())
}

fn detect_permissions() -> PermissionStatusResponse {
    #[cfg(target_os = "macos")]
    {
        PermissionStatusResponse {
            accessibility: unsafe { AXIsProcessTrusted() },
            input_monitoring: unsafe { CGPreflightListenEventAccess() },
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        PermissionStatusResponse {
            accessibility: false,
            input_monitoring: false,
        }
    }
}

fn launch_at_login_status(app: &AppHandle) -> LaunchAtLoginResponse {
    let name = app.package_info().name.clone();
    match login_item_exists(&name) {
        Ok(enabled) => LaunchAtLoginResponse {
            available: true,
            enabled,
            message: "通过 macOS 登录项管理；首次切换时系统可能会请求自动化权限。".to_string(),
        },
        Err(err) => LaunchAtLoginResponse {
            available: false,
            enabled: false,
            message: format!("无法读取登录项状态：{err}"),
        },
    }
}

fn settings_overview(
    app: &AppHandle,
    config_path: String,
    minimize_to_tray_on_close: bool,
    show_close_to_tray_hint: bool,
) -> SettingsOverviewResponse {
    let package = app.package_info();
    SettingsOverviewResponse {
        app_name: package.name.clone(),
        version: package.version.to_string(),
        tauri_version: tauri::VERSION.to_string(),
        bundle_identifier: app.config().identifier.clone(),
        config_path,
        permissions: detect_permissions(),
        launch_at_login: launch_at_login_status(app),
        close_behavior: CloseBehaviorResponse {
            minimize_to_tray_on_close,
            show_close_to_tray_hint,
            message: if minimize_to_tray_on_close {
                "关闭主窗口时会最小化到托盘。首次关闭会记住你的选择，后续可在这里修改。".to_string()
            } else {
                "关闭主窗口时会直接退出应用。首次关闭会记住你的选择，后续可在这里修改。".to_string()
            },
        },
        updates: UpdateStatusResponse {
            auto_update_enabled: false,
            message: "当前版本未接入内置自动更新，可通过 GitHub Releases 手动安装新版本。"
                .to_string(),
            releases_url: GITHUB_RELEASES_URL.to_string(),
        },
        about: AboutResponse {
            author: "Asplitline".to_string(),
            github_url: GITHUB_REPO_URL.to_string(),
        },
    }
}

fn default_scope() -> String {
    "global".to_string()
}

fn default_button() -> String {
    "middle".to_string()
}

#[tauri::command]
pub fn get_status(state: State<'_, Arc<Mutex<AppState>>>) -> Result<StatusResponse, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(StatusResponse {
        enabled: guard.config.value().enabled,
        input_running: guard.input.is_active(),
        recognizer_ready: guard.recognizer.threshold() > 0.0,
        hotkey_ready: true,
        config_path: guard.config.path().display().to_string(),
        last_execution: guard.last_execution.clone(),
    })
}

#[tauri::command]
pub fn get_settings_overview(
    app: AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<SettingsOverviewResponse, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(settings_overview(
        &app,
        guard.config.path().display().to_string(),
        guard.config.value().minimize_to_tray_on_close,
        guard.config.value().show_close_to_tray_hint,
    ))
}

#[tauri::command]
pub fn list_rules(state: State<'_, Arc<Mutex<AppState>>>) -> Result<Vec<RuleConfig>, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(guard.config.rules().to_vec())
}

#[tauri::command]
pub fn list_actions(state: State<'_, Arc<Mutex<AppState>>>) -> Result<Vec<ActionConfig>, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(guard.actions.list_actions())
}

#[tauri::command]
pub fn get_frontmost_app() -> Result<Option<FrontmostAppResponse>, String> {
    frontmost_app_info()
}

#[tauri::command]
pub fn list_bindable_apps() -> Result<Vec<BindableAppResponse>, String> {
    Ok(list_bindable_apps_info())
}

#[tauri::command]
pub fn create_rule(
    payload: CreateRuleRequest,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<RuleConfig, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    let gesture = normalize_gesture(&payload.gesture);
    validate_gesture(&gesture)?;
    let button = normalize_button(&payload.button);
    validate_button(&button)?;

    let (action_type, action_hotkey) = if let Some(hk) = payload.action_hotkey {
        ("inline_hotkey".to_string(), Some(hk))
    } else {
        let default_action_type = guard
            .config
            .value()
            .actions
            .first()
            .map(|a| a.id.clone())
            .unwrap_or_else(|| "hotkey".to_string());
        let action_type = payload.action_type.unwrap_or(default_action_type);
        (action_type, None)
    };

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let rule = RuleConfig {
        id: format!("rule-{timestamp}"),
        name: payload.name,
        enabled: true,
        scope: normalize_scope(&payload.scope),
        button,
        gesture,
        action_type,
        action_hotkey,
    };
    guard.config.push_rule(rule.clone());
    guard.config.save().map_err(|e| e.to_string())?;
    Ok(rule)
}

#[tauri::command]
pub fn update_rule(
    payload: UpdateRuleRequest,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<RuleConfig, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    let gesture = normalize_gesture(&payload.gesture);
    validate_gesture(&gesture)?;
    let button = normalize_button(&payload.button);
    validate_button(&button)?;
    let rule = RuleConfig {
        id: payload.id,
        name: payload.name,
        enabled: payload.enabled,
        scope: normalize_scope(&payload.scope),
        button,
        gesture,
        action_type: payload.action_type,
        action_hotkey: payload.action_hotkey,
    };
    if !guard.config.update_rule(rule.clone()) {
        return Err("rule not found".to_string());
    }
    guard.config.save().map_err(|e| e.to_string())?;
    Ok(rule)
}

#[tauri::command]
pub fn delete_rule(
    payload: DeleteRuleRequest,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    if !guard.config.delete_rule(&payload.id) {
        return Err("rule not found".to_string());
    }
    guard.config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_enabled(enabled: bool, state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.config.set_enabled(enabled);
    guard.config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_gesture(
    payload: ExecuteGestureRequest,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<ExecutionResult, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    let gesture = normalize_gesture(&payload.gesture);
    validate_gesture(&gesture)?;
    let scope = normalize_scope(&payload.scope);
    let button = normalize_button(&payload.button);
    validate_button(&button)?;

    let mut result = apply_gesture_match(&mut guard, &gesture, &scope, &button);
    result.trigger = Some("manual".to_string());
    guard.last_execution = Some(result.clone());
    Ok(result)
}

#[tauri::command]
pub fn reset_rules(state: State<'_, Arc<Mutex<AppState>>>) -> Result<Vec<RuleConfig>, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.config.reset_rules_to_builtin();
    guard.config.save().map_err(|e| e.to_string())?;
    Ok(guard.config.rules().to_vec())
}

#[tauri::command]
pub fn set_launch_at_login(
    enabled: bool,
    app: AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<SettingsOverviewResponse, String> {
    let path = app_bundle_or_binary_path()?;
    let name = app.package_info().name.clone();
    set_login_item_enabled(&name, &path, enabled)?;

    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(settings_overview(
        &app,
        guard.config.path().display().to_string(),
        guard.config.value().minimize_to_tray_on_close,
        guard.config.value().show_close_to_tray_hint,
    ))
}

#[tauri::command]
pub fn set_minimize_to_tray_on_close(
    enabled: bool,
    app: AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<SettingsOverviewResponse, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.config.set_minimize_to_tray_on_close(enabled);
    guard.config.save().map_err(|e| e.to_string())?;
    Ok(settings_overview(
        &app,
        guard.config.path().display().to_string(),
        guard.config.value().minimize_to_tray_on_close,
        guard.config.value().show_close_to_tray_hint,
    ))
}

#[tauri::command]
pub fn dismiss_close_to_tray_hint(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.config.dismiss_close_to_tray_hint();
    guard.config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_close_behavior_choice(
    minimize_to_tray_on_close: bool,
    app: AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<SettingsOverviewResponse, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard
        .config
        .remember_close_behavior_choice(minimize_to_tray_on_close);
    guard.config.save().map_err(|e| e.to_string())?;
    Ok(settings_overview(
        &app,
        guard.config.path().display().to_string(),
        guard.config.value().minimize_to_tray_on_close,
        guard.config.value().show_close_to_tray_hint,
    ))
}

#[tauri::command]
pub fn hide_main_window_to_tray(app: AppHandle) {
    tray::hide_main_window_to_tray(&app);
}

#[tauri::command]
pub fn open_settings_target(target: String) -> Result<(), String> {
    let url = match target.as_str() {
        "accessibility" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        }
        "input-monitoring" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent"
        }
        "login-items" => "x-apple.systempreferences:com.apple.LoginItems-Settings.extension",
        _ => return Err(format!("unsupported settings target: {target}")),
    };
    open_with_macos(url)
}

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("empty url".to_string());
    }
    open_with_macos(url.trim())
}

#[tauri::command]
pub fn run_foundation_probe(state: State<'_, Arc<Mutex<AppState>>>) -> Result<Vec<String>, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.input.start(Point { x: 100.0, y: 100.0 });
    guard.input.sample(Point { x: 101.0, y: 40.0 });
    let points = guard.input.end();
    let tokens = guard.recognizer.recognize(&points);
    if guard.rules.matches_mission_control(&tokens) {
        let _ = guard.actions.execute_action_type("hotkey_mission_control");
    }
    let gesture_str = gesture::directions_to_string(&tokens);
    guard.last_execution = Some(ExecutionResult {
        matched: true,
        scope: "global".to_string(),
        gesture: gesture_str,
        rule_name: Some("Foundation Probe".to_string()),
        action_type: Some("hotkey".to_string()),
        success: true,
        message: "probe executed".to_string(),
        trigger: Some("probe".to_string()),
    });
    Ok(tokens.into_iter().map(|t| format!("{t:?}")).collect())
}
