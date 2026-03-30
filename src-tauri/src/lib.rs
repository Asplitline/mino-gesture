mod actions;
mod config;
mod gesture;
mod input;
mod rules;
mod tray;

use actions::{Action, ActionExecutor};
use config::{ConfigStore, RuleConfig};
use gesture::{GestureRecognizer, Point};
use input::InputEngine;
use rules::RuleEngine;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};

#[derive(Debug)]
struct AppState {
    config: ConfigStore,
    input: InputEngine,
    recognizer: GestureRecognizer,
    rules: RuleEngine,
    actions: ActionExecutor,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusResponse {
    enabled: bool,
    input_running: bool,
    recognizer_ready: bool,
    hotkey_ready: bool,
    config_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRuleRequest {
    name: String,
    gesture: String,
    #[serde(default = "default_scope")]
    scope: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateRuleRequest {
    id: String,
    name: String,
    enabled: bool,
    scope: String,
    gesture: String,
    action_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteRuleRequest {
    id: String,
}

fn default_scope() -> String {
    "global".to_string()
}

fn normalize_scope(scope: &str) -> String {
    let s = scope.trim();
    if s.is_empty() {
        "global".to_string()
    } else {
        s.to_string()
    }
}

fn normalize_gesture(gesture: &str) -> String {
    gesture.trim().to_uppercase()
}

fn validate_gesture(gesture: &str) -> Result<(), String> {
    if gesture.is_empty() {
        return Err("gesture is required".to_string());
    }
    if !gesture.chars().all(|c| matches!(c, 'U' | 'D' | 'L' | 'R')) {
        return Err("gesture must only contain U, D, L, R".to_string());
    }
    Ok(())
}

fn app_data_dir(handle: &AppHandle) -> anyhow::Result<PathBuf> {
    let dir = handle.path().app_config_dir()?;
    Ok(dir)
}

#[tauri::command]
fn get_status(state: State<'_, Mutex<AppState>>) -> Result<StatusResponse, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(StatusResponse {
        enabled: guard.config.value().enabled,
        input_running: guard.input.is_active(),
        recognizer_ready: guard.recognizer.threshold() > 0.0,
        hotkey_ready: true,
        config_path: guard.config.path().display().to_string(),
    })
}

#[tauri::command]
fn list_rules(state: State<'_, Mutex<AppState>>) -> Result<Vec<RuleConfig>, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(guard.config.rules().to_vec())
}

#[tauri::command]
fn create_rule(
    payload: CreateRuleRequest,
    state: State<'_, Mutex<AppState>>,
) -> Result<RuleConfig, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    let gesture = normalize_gesture(&payload.gesture);
    validate_gesture(&gesture)?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let rule = RuleConfig {
        id: format!("rule-{timestamp}"),
        name: payload.name,
        enabled: true,
        scope: normalize_scope(&payload.scope),
        gesture,
        action_type: "hotkey".to_string(),
    };
    guard.config.push_rule(rule.clone());
    guard.config.save().map_err(|e| e.to_string())?;
    Ok(rule)
}

#[tauri::command]
fn update_rule(
    payload: UpdateRuleRequest,
    state: State<'_, Mutex<AppState>>,
) -> Result<RuleConfig, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    let gesture = normalize_gesture(&payload.gesture);
    validate_gesture(&gesture)?;
    let rule = RuleConfig {
        id: payload.id,
        name: payload.name,
        enabled: payload.enabled,
        scope: normalize_scope(&payload.scope),
        gesture,
        action_type: payload.action_type,
    };
    if !guard.config.update_rule(rule.clone()) {
        return Err("rule not found".to_string());
    }
    guard.config.save().map_err(|e| e.to_string())?;
    Ok(rule)
}

#[tauri::command]
fn delete_rule(payload: DeleteRuleRequest, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    if !guard.config.delete_rule(&payload.id) {
        return Err("rule not found".to_string());
    }
    guard.config.save().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_enabled(enabled: bool, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.config.set_enabled(enabled);
    guard.config.save().map_err(|e| e.to_string())
}

#[tauri::command]
fn run_foundation_probe(state: State<'_, Mutex<AppState>>) -> Result<Vec<String>, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.input.start(Point { x: 100.0, y: 100.0 });
    guard.input.sample(Point { x: 101.0, y: 40.0 });
    let points = guard.input.end();
    let tokens = guard.recognizer.recognize(&points);
    if guard.rules.matches_mission_control(&tokens) {
        let _ = guard.actions.execute(Action::HotkeyMissionControl);
    }
    Ok(tokens.into_iter().map(|t| format!("{t:?}")).collect())
}

pub fn run() {
    tracing_subscriber::fmt().with_env_filter("info").init();

    tauri::Builder::default()
        .setup(|app| {
            let config = ConfigStore::load_or_default(&app_data_dir(app.handle())?)
                .map_err(|e| tauri::Error::Anyhow(e.into()))?;

            let state = AppState {
                config,
                input: InputEngine::new(),
                recognizer: GestureRecognizer::new(5.0),
                rules: RuleEngine::new(),
                actions: ActionExecutor::new(),
            };
            app.manage(Mutex::new(state));
            tray::setup(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_status,
            list_rules,
            create_rule,
            update_rule,
            delete_rule,
            set_enabled,
            run_foundation_probe
        ])
        .run(tauri::generate_context!())
        .expect("failed to run mino-gesture");
}
