use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub enabled: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self { enabled: true }
    }
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
            let store = Self {
                path,
                value: AppConfig::default(),
            };
            store.save()?;
            return Ok(store);
        }

        let raw = fs::read_to_string(&path)?;
        let value = toml::from_str::<AppConfig>(&raw).unwrap_or_default();
        Ok(Self { path, value })
    }

    pub fn value(&self) -> &AppConfig {
        &self.value
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.value.enabled = enabled;
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
