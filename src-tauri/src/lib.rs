//! mino-gesture 后端入口：模块树、`run()`、Tauri 注册。
//!
//! 目录符合 Cargo 惯用布局（子模块目录 + `lib.rs` / `main.rs`）；分层说明见 `.cursor/rules/rust-project-layout.mdc`。

mod commands;
mod config;
mod core;
mod domain;
mod platform;

use crate::config::ConfigStore;
use crate::core::state::AppState;
use crate::domain::actions::ActionExecutor;
use crate::domain::gesture::GestureRecognizer;
use crate::domain::rules::RuleEngine;
use crate::platform::input::InputEngine;
use crate::platform::{mouse_listener, tray};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, WindowEvent};

fn app_config_dir(handle: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
    Ok(handle.path().app_config_dir()?)
}

pub fn run() {
    // 日志文件路径
    let log_dir = std::env::temp_dir().join("mino-gesture");
    let _ = std::fs::create_dir_all(&log_dir);

    tracing_subscriber::fmt().with_env_filter("info").init();

    tracing::info!("mino-gesture starting");
    tracing::info!("log directory: {:?}", log_dir);

    // 设置 panic hook 写入崩溃日志
    let crash_log = log_dir.join("crash.log");
    let crash_log_clone = crash_log.clone();
    std::panic::set_hook(Box::new(move |panic_info| {
        use std::io::Write;
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let msg = format!("[timestamp:{}] PANIC: {:?}\n", timestamp, panic_info);
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&crash_log_clone)
            .and_then(|mut f| f.write_all(msg.as_bytes()));
        eprintln!("{}", msg);
    }));

    tauri::Builder::default()
        .setup(|app| {
            let config = ConfigStore::load_or_default(&app_config_dir(app.handle())?)
                .map_err(|e| tauri::Error::Anyhow(e.into()))?;

            let state = Arc::new(Mutex::new(AppState {
                actions: ActionExecutor::new(config.value().actions.clone()),
                config,
                input: InputEngine::new(),
                recognizer: GestureRecognizer::new(40.0),
                rules: RuleEngine::new(),
                last_execution: None,
            }));
            app.manage(state.clone());
            mouse_listener::spawn_middle_button_listener(app.handle().clone(), state);
            tray::setup(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let state = window.state::<Arc<Mutex<AppState>>>();
                let (minimize_to_tray_on_close, show_close_to_tray_hint) = state
                    .lock()
                    .map(|guard| {
                        (
                            guard.config.value().minimize_to_tray_on_close,
                            guard.config.value().show_close_to_tray_hint,
                        )
                    })
                    .unwrap_or((true, false));

                if !minimize_to_tray_on_close {
                    window.app_handle().exit(0);
                    return;
                }

                if show_close_to_tray_hint {
                    let _ = window.app_handle().emit("close-to-tray-hint-requested", ());
                    return;
                }

                tray::hide_main_window_to_tray(window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_status,
            commands::get_settings_overview,
            commands::list_rules,
            commands::list_actions,
            commands::get_frontmost_app,
            commands::list_bindable_apps,
            commands::create_rule,
            commands::update_rule,
            commands::delete_rule,
            commands::reset_rules,
            commands::set_launch_at_login,
            commands::set_minimize_to_tray_on_close,
            commands::dismiss_close_to_tray_hint,
            commands::remember_close_behavior_choice,
            commands::hide_main_window_to_tray,
            commands::open_settings_target,
            commands::open_external,
            commands::set_enabled,
            commands::execute_gesture,
            commands::run_foundation_probe
        ])
        .run(tauri::generate_context!())
        .expect("failed to run mino-gesture");
}
