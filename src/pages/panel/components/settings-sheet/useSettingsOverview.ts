import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SettingsOverview } from "../../../../types/app";
import type { SettingsState } from "./types";

export function useSettingsOverview(open: boolean): SettingsState {
  const [settings, setSettings] = useState<SettingsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await invoke<SettingsOverview>("get_settings_overview");
      setSettings(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshSettings();
  }, [open, refreshSettings]);

  const toggleLaunchAtLogin = useCallback(async (checked: boolean) => {
    setLaunchBusy(true);
    setError(null);
    try {
      const next = await invoke<SettingsOverview>("set_launch_at_login", {
        enabled: checked,
      });
      setSettings(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLaunchBusy(false);
    }
  }, []);

  const openTarget = useCallback(async (target: string) => {
    await invoke("open_settings_target", { target });
  }, []);

  const openExternal = useCallback(async (url: string) => {
    await invoke("open_external", { url });
  }, []);

  return {
    settings,
    loading,
    error,
    launchBusy,
    refreshSettings,
    toggleLaunchAtLogin,
    openTarget,
    openExternal,
  };
}
