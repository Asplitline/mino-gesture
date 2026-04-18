use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

fn builtin_actions() -> Vec<ActionConfig> {
    vec![
        ActionConfig {
            id: "hotkey_mission_control".to_string(),
            name: "Mission Control".to_string(),
            kind: "hotkey".to_string(),
            key_code: 126,
            control: true,
            option: false,
            shift: false,
            command: false,
        },
        ActionConfig {
            id: "hotkey_switch_left".to_string(),
            name: "Switch Space Left".to_string(),
            kind: "hotkey".to_string(),
            key_code: 123,
            control: true,
            option: false,
            shift: false,
            command: false,
        },
        ActionConfig {
            id: "hotkey_switch_right".to_string(),
            name: "Switch Space Right".to_string(),
            kind: "hotkey".to_string(),
            key_code: 124,
            control: true,
            option: false,
            shift: false,
            command: false,
        },
        ActionConfig {
            id: "hotkey_browser_back".to_string(),
            name: "Browser Back".to_string(),
            kind: "hotkey".to_string(),
            key_code: 33,
            control: false,
            option: false,
            shift: false,
            command: true,
        },
        ActionConfig {
            id: "hotkey_browser_forward".to_string(),
            name: "Browser Forward".to_string(),
            kind: "hotkey".to_string(),
            key_code: 30,
            control: false,
            option: false,
            shift: false,
            command: true,
        },
    ]
}

fn builtin_rules() -> Vec<RuleConfig> {
    vec![
        RuleConfig {
            id: "builtin-mission-control".to_string(),
            name: "中键上滑 - Mission Control".to_string(),
            enabled: true,
            scope: "global".to_string(),
            button: "middle".to_string(),
            gesture: "U".to_string(),
            action_type: "hotkey_mission_control".to_string(),
        },
        RuleConfig {
            id: "builtin-switch-left".to_string(),
            name: "中键左滑 - 左切换".to_string(),
            enabled: true,
            scope: "global".to_string(),
            button: "middle".to_string(),
            gesture: "L".to_string(),
            action_type: "hotkey_switch_left".to_string(),
        },
        RuleConfig {
            id: "builtin-switch-right".to_string(),
            name: "中键右滑 - 右切换".to_string(),
            enabled: true,
            scope: "global".to_string(),
            button: "middle".to_string(),
            gesture: "R".to_string(),
            action_type: "hotkey_switch_right".to_string(),
        },
        RuleConfig {
            id: "builtin-browser-back".to_string(),
            name: "右键左滑 - 网页后退".to_string(),
            enabled: true,
            scope: "global".to_string(),
            button: "right".to_string(),
            gesture: "L".to_string(),
            action_type: "hotkey_browser_back".to_string(),
        },
        RuleConfig {
            id: "builtin-browser-forward".to_string(),
            name: "右键右滑 - 网页前进".to_string(),
            enabled: true,
            scope: "global".to_string(),
            button: "right".to_string(),
            gesture: "R".to_string(),
            action_type: "hotkey_browser_forward".to_string(),
        },
    ]
}

fn ensure_builtin_actions(config: &mut AppConfig) -> bool {
    let mut changed = false;
    for action in builtin_actions() {
        let exists = config.actions.iter().any(|a| a.id == action.id);
        if !exists {
            config.actions.push(action);
            changed = true;
        }
    }
    changed
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub enabled: bool,
    #[serde(default = "builtin_actions")]
    pub actions: Vec<ActionConfig>,
    #[serde(default)]
    pub rules: Vec<RuleConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            actions: builtin_actions(),
            rules: builtin_rules(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionConfig {
    pub id: String,
    pub name: String,
    /// Supported kinds: hotkey
    pub kind: String,
    pub key_code: u16,
    #[serde(default)]
    pub control: bool,
    #[serde(default)]
    pub option: bool,
    #[serde(default)]
    pub shift: bool,
    #[serde(default)]
    pub command: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleConfig {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub scope: String,
    #[serde(default = "default_rule_button")]
    pub button: String,
    pub gesture: String,
    pub action_type: String,
}

fn default_rule_button() -> String {
    "middle".to_string()
}

#[derive(Debug, Clone)]
pub struct ConfigStore {
    path: PathBuf,
    value: AppConfig,
}

impl ConfigStore {
    pub fn load_or_default(base_dir: &Path) -> anyhow::Result<Self> {
        let path = base_dir.join("config.toml");
        if !path.exists() {
            let mut value = AppConfig::default();
            ensure_builtin_actions(&mut value);
            let store = Self {
                path,
                value,
            };
            store.save()?;
            return Ok(store);
        }

        let raw = fs::read_to_string(&path)?;
        let mut value = toml::from_str::<AppConfig>(&raw).unwrap_or_default();
        let changed = ensure_builtin_actions(&mut value);
        let store = Self { path, value };
        if changed {
            store.save()?;
        }
        Ok(store)
    }

    pub fn value(&self) -> &AppConfig {
        &self.value
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.value.enabled = enabled;
    }

    pub fn rules(&self) -> &[RuleConfig] {
        &self.value.rules
    }

    pub fn push_rule(&mut self, rule: RuleConfig) {
        self.value.rules.push(rule);
    }

    pub fn update_rule(&mut self, rule: RuleConfig) -> bool {
        if let Some(existing) = self.value.rules.iter_mut().find(|r| r.id == rule.id) {
            *existing = rule;
            return true;
        }
        false
    }

    pub fn delete_rule(&mut self, id: &str) -> bool {
        let before = self.value.rules.len();
        self.value.rules.retain(|r| r.id != id);
        before != self.value.rules.len()
    }

    pub fn reset_rules_to_builtin(&mut self) {
        self.value.rules = builtin_rules();
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn save(&self) -> anyhow::Result<()> {
        let raw = toml::to_string_pretty(&self.value)?;
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, raw)?;
        Ok(())
    }
}
