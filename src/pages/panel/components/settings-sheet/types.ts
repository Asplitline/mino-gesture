import type { IconSettings } from "../../../../components/icons";
import type { SettingsOverview } from "../../../../types/app";

export type SettingsSectionId =
  | "general"
  | "permissions"
  | "data"
  | "updates"
  | "about"
  | "changelog";

export type SettingsState = {
  settings: SettingsOverview | null;
  loading: boolean;
  error: string | null;
  launchBusy: boolean;
  refreshSettings: () => Promise<void>;
  toggleLaunchAtLogin: (checked: boolean) => Promise<void>;
  openTarget: (target: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
};

export type SettingsSectionContentProps = SettingsState & {
  onResetRules: () => Promise<void>;
  resettingRules: boolean;
};

export type SettingsSectionDefinition = {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: typeof IconSettings;
  eyebrow: string;
  title: string;
  panelDescription: string;
  render: (props: SettingsSectionContentProps) => React.ReactNode;
};
