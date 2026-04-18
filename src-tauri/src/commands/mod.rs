//! Tauri `invoke`：入参/出参与命令实现（薄编排，逻辑见 `core` / `domain` / `config`）。

use crate::config::{ActionConfig, RuleConfig};
use crate::core::execution::{
    apply_gesture_match, normalize_button, normalize_gesture, normalize_scope, validate_button,
    validate_gesture,
};
use crate::core::execution_result::ExecutionResult;
use crate::core::state::AppState;
use crate::domain::gesture::{self, Point};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

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
pub fn create_rule(
    payload: CreateRuleRequest,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<RuleConfig, String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    let gesture = normalize_gesture(&payload.gesture);
    validate_gesture(&gesture)?;
    let button = normalize_button(&payload.button);
    validate_button(&button)?;

    let default_action_type = guard
        .config
        .value()
        .actions
        .first()
        .map(|a| a.id.clone())
        .unwrap_or_else(|| "hotkey".to_string());
    let action_type = payload.action_type.unwrap_or(default_action_type);

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
