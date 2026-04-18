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

export type RuleConfig = {
  id: string;
  name: string;
  enabled: boolean;
  scope: string;
  button: MouseButtonValue;
  gesture: string;
  actionType: string;
};

export type ViewRoute = "home" | "panel";

export type TimedGestureResult = GestureResult & { at: number };

export type CreateRuleDraft = {
  name: string;
  button: MouseButtonValue;
  gesture: string;
  actionType: string;
};
