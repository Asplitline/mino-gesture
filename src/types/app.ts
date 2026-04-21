export type TrailPoint = { x: number; y: number };
export type MouseButtonValue = "middle" | "right";

export type ScreenInfo = {
  name: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  scaleFactor: number;
};

export type TrailStartPayload = {
  screens: ScreenInfo[];
  activeScreenIndex: number;
};

export type GestureResult = {
  matched: boolean;
  scope: string;
  gesture: string;
  ruleName?: string;
  actionType?: string;
  success: boolean;
  message: string;
  trigger?: string;
  trail?: TrailPoint[];
};

export type ActionConfig = {
  id: string;
  name: string;
  kind: string;
  keyCode: number;
  control: boolean;
  option: boolean;
  shift: boolean;
  command: boolean;
};

export type FrontmostAppInfo = {
  name: string;
  bundleId: string;
};

export type BindableAppInfo = FrontmostAppInfo;

/** 与后端 `ActionHotkeySnapshot` 一致，用于规则内联快捷键 */
export type ActionHotkeySnapshot = {
  keyCode: number;
  control: boolean;
  option: boolean;
  shift: boolean;
  command: boolean;
};

/** 使用内联快捷键时 `actionType` 占位，实际执行走 `actionHotkey` */
export const INLINE_HOTKEY_ACTION_TYPE = "inline_hotkey";

export type RuleConfig = {
  id: string;
  name: string;
  enabled: boolean;
  scope: string;
  button: MouseButtonValue;
  gesture: string;
  actionType: string;
  actionHotkey?: ActionHotkeySnapshot | null;
};

export type ViewRoute = "home" | "panel";

export type TimedGestureResult = GestureResult & { at: number };

export type CreateRuleDraft = {
  name: string;
  scopes: string[];
  button: MouseButtonValue;
  gesture: string;
  actionHotkey: ActionHotkeySnapshot | null;
};

export type SettingsOverview = {
  appName: string;
  version: string;
  tauriVersion: string;
  bundleIdentifier: string;
  configPath: string;
  permissions: {
    accessibility: boolean;
    inputMonitoring: boolean;
  };
  launchAtLogin: {
    available: boolean;
    enabled: boolean;
    message: string;
  };
  closeBehavior: {
    minimizeToTrayOnClose: boolean;
    showCloseToTrayHint: boolean;
    message: string;
  };
  updates: {
    autoUpdateEnabled: boolean;
    message: string;
    releasesUrl: string;
  };
  about: {
    author: string;
    githubUrl: string;
  };
};
