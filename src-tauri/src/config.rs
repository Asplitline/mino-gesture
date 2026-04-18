use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

fn builtin_rules() -> Vec<RuleConfig> {
    vec![
        RuleConfig {
            id: "builtin-mission-control".to_string(),
            name: "中键上滑 - Mission Control".to_string(),
            enabled: true,
            scope: "global".to_string(),
            gesture: "U".to_string(),
            action_type: "hotkey_mission_control".to_string(),
        },
        RuleConfig {
            id: "builtin-switch-left".to_string(),
            name: "中键左滑 - 左切换".to_string(),
            enabled: true,
            scope: "global".to_string(),
            gesture: "L".to_string(),
            action_type: "hotkey_switch_left".to_string(),
        },
        RuleConfig {
            id: "builtin-switch-right".to_string(),
            name: "中键右滑 - 右切换".to_string(),
            enabled: true,
            scope: "global".to_string(),
            gesture: "R".to_string(),
            action_type: "hotkey_switch_right".to_string(),
        },
    ]
}

fn ensure_builtin_rules(config: &mut AppConfig) -> bool {
    let mut changed = false;
    for rule in builtin_rules() {
        let exists = config.rules.iter().any(|r| r.id == rule.id);
        if !exists {
            config.rules.push(rule);
            changed = true;
        }
    }
    changed
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub enabled: bool,
    #[serde(default)]
    pub rules: Vec<RuleConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            rules: builtin_rules(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleConfig {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub scope: String,
    pub gesture: String,
    pub action_type: String,
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
            ensure_builtin_rules(&mut value);
            let store = Self {
                path,
                value,
            };
            store.save()?;
            return Ok(store);
        }

        let raw = fs::read_to_string(&path)?;
        let mut value = toml::from_str::<AppConfig>(&raw).unwrap_or_default();
        let changed = ensure_builtin_rules(&mut value);
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
