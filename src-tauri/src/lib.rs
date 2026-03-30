mod actions;
mod config;
mod gesture;
mod input;
mod rules;
mod tray;

use actions::{Action, ActionExecutor};
use config::ConfigStore;
use gesture::{GestureRecognizer, Point};
use input::InputEngine;
use rules::RuleEngine;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
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
            set_enabled,
            run_foundation_probe
        ])
        .run(tauri::generate_context!())
        .expect("failed to run mino-gesture");
}
