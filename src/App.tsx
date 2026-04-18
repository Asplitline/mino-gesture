import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type TrailPoint = { x: number; y: number };
type MouseButtonValue = "middle" | "right";

type ScreenInfo = {
  name: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  scaleFactor: number;
};

type TrailStartPayload = {
  screens: ScreenInfo[];
  activeScreenIndex: number;
};

type GestureResult = {
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

type ActionConfig = {
  id: string;
  name: string;
  kind: string;
  keyCode: number;
  control: boolean;
  option: boolean;
  shift: boolean;
  command: boolean;
};

type RuleConfig = {
  id: string;
  name: string;
  enabled: boolean;
  scope: string;
  button: MouseButtonValue;
  gesture: string;
  actionType: string;
};

const DIRECTION_ARROW: Record<string, string> = {
  U: "↑",
  D: "↓",
  L: "←",
  R: "→",
  UL: "↖",
  UR: "↗",
  DL: "↙",
  DR: "↘",
};

const GESTURE_OPTIONS = ["U", "D", "L", "R", "UL", "UR", "DL", "DR"];
const BUTTON_OPTIONS: Array<{ value: MouseButtonValue; label: string }> = [
  { value: "middle", label: "中键" },
  { value: "right", label: "右键" },
];

function parseGestureArrows(gesture: string): string[] {
  const arrows: string[] = [];
  let i = 0;
  while (i < gesture.length) {
    const two = gesture.slice(i, i + 2);
    if (DIRECTION_ARROW[two]) {
      arrows.push(DIRECTION_ARROW[two]);
      i += 2;
    } else {
      arrows.push(DIRECTION_ARROW[gesture[i]] ?? gesture[i]);
      i += 1;
    }
  }
  return arrows;
}

function formatHotkey(action: ActionConfig): string {
  const mods: string[] = [];
  if (action.control) mods.push("Ctrl");
  if (action.option) mods.push("Option");
  if (action.shift) mods.push("Shift");
  if (action.command) mods.push("Command");
  mods.push(`KeyCode ${action.keyCode}`);
  return mods.join(" + ");
}

function ScreenMap({ screens, activeIndex }: { screens: ScreenInfo[]; activeIndex: number }) {
  if (screens.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of screens) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.w);
    maxY = Math.max(maxY, s.y + s.h);
  }

  const totalW = maxX - minX;
  const totalH = maxY - minY;
  const svgW = 320;
  const svgH = Math.round((totalH / totalW) * svgW);
  const scale = svgW / totalW;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="block mx-auto" style={{ maxWidth: "100%" }}>
        {screens.map((s, i) => {
          const x = (s.x - minX) * scale;
          const y = (s.y - minY) * scale;
          const w = s.w * scale;
          const h = s.h * scale;
          const isActive = i === activeIndex;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                ry={4}
                fill={isActive ? "rgba(99,102,241,0.15)" : "rgba(156,163,175,0.12)"}
                stroke={isActive ? "rgb(99,102,241)" : "rgb(209,213,219)"}
                strokeWidth={isActive ? 2 : 1}
                className="dark:[stroke:rgb(79,82,221)] dark:[fill:rgba(99,102,241,0.2)]"
              />
              <text
                x={x + w / 2}
                y={y + h / 2 - (s.name ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(11, Math.min(18, h * 0.3))}
                fontWeight="700"
                fill={isActive ? "rgb(79,70,229)" : "rgb(156,163,175)"}
              >
                {i + 1}
              </text>
              {s.name && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + Math.max(9, Math.min(14, h * 0.22))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(8, Math.min(11, h * 0.18))}
                  fill={isActive ? "rgb(99,102,241)" : "rgb(156,163,175)"}
                >
                  {s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function App() {
  const [isListening, setIsListening] = useState(false);
  const capturingRef = useRef(false);
  const [lastResult, setLastResult] = useState<GestureResult | null>(null);
  const [history, setHistory] = useState<GestureResult[]>([]);
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [activeScreenIndex, setActiveScreenIndex] = useState<number>(0);

  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [actions, setActions] = useState<ActionConfig[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [creatingRule, setCreatingRule] = useState(false);
  const [resettingRules, setResettingRules] = useState(false);

  const actionById = useMemo(() => {
    return Object.fromEntries(actions.map((a) => [a.id, a]));
  }, [actions]);

  const refreshRulesAndActions = async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const [nextRules, nextActions] = await Promise.all([
        invoke<RuleConfig[]>("list_rules"),
        invoke<ActionConfig[]>("list_actions"),
      ]);
      setRules(nextRules);
      setActions(nextActions);
    } catch (err) {
      setRulesError(String(err));
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    setIsListening(true);
    void refreshRulesAndActions();

    const unlistenStart = listen<TrailStartPayload>("trail-start", (e) => {
      capturingRef.current = true;
      setLastResult(null);
      if (e.payload.screens?.length) {
        setScreens(e.payload.screens);
        setActiveScreenIndex(e.payload.activeScreenIndex);
      }
    });

    const unlistenResult = listen<GestureResult>("gesture-result", (e) => {
      const r = e.payload;
      capturingRef.current = false;
      setLastResult(r);
      if (r.gesture) setHistory((prev) => [r, ...prev].slice(0, 20));
    });

    return () => {
      setIsListening(false);
      unlistenStart.then((fn) => fn());
      unlistenResult.then((fn) => fn());
    };
  }, []);

  const updateRuleLocal = (id: string, patch: Partial<RuleConfig>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveRule = async (rule: RuleConfig) => {
    setSavingRuleId(rule.id);
    setRulesError(null);
    try {
      await invoke<RuleConfig>("update_rule", {
        payload: {
          id: rule.id,
          name: rule.name,
          enabled: rule.enabled,
          scope: "global",
          button: rule.button,
          gesture: rule.gesture.toUpperCase(),
          actionType: rule.actionType,
        },
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...rule, gesture: rule.gesture.toUpperCase(), scope: "global" } : r)),
      );
    } catch (err) {
      setRulesError(String(err));
    } finally {
      setSavingRuleId(null);
    }
  };

  const removeRule = async (id: string) => {
    setSavingRuleId(id);
    setRulesError(null);
    try {
      await invoke("delete_rule", { payload: { id } });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setRulesError(String(err));
    } finally {
      setSavingRuleId(null);
    }
  };

  const createRule = async () => {
    if (actions.length === 0) {
      setRulesError("当前没有可用操作，请先检查配置。");
      return;
    }
    setCreatingRule(true);
    setRulesError(null);
    try {
      const created = await invoke<RuleConfig>("create_rule", {
        payload: {
          name: "新规则",
          scope: "global",
          button: "middle",
          gesture: "U",
          actionType: actions[0].id,
        },
      });
      setRules((prev) => [created, ...prev]);
    } catch (err) {
      setRulesError(String(err));
    } finally {
      setCreatingRule(false);
    }
  };

  const resetRules = async () => {
    setResettingRules(true);
    setRulesError(null);
    try {
      const next = await invoke<RuleConfig[]>("reset_rules");
      setRules(next);
    } catch (err) {
      setRulesError(String(err));
    } finally {
      setResettingRules(false);
    }
  };

  const gestureArrows = lastResult?.gesture ? parseGestureArrows(lastResult.gesture) : [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Mino Gesture</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">按住中/右键画手势</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{isListening ? "监听中" : "未连接"}</span>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-4xl mx-auto">
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">识别结果</h2>
          {lastResult ? (
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                lastResult.matched
                  ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
              }`}
            >
              {gestureArrows.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {gestureArrows.map((arrow, i) => (
                    <span key={i} className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 select-none">
                      {arrow}
                    </span>
                  ))}
                  <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {lastResult.gesture}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    lastResult.matched
                      ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {lastResult.matched ? "✓ 已匹配" : "× 未匹配"}
                </span>
                {lastResult.ruleName && <span className="text-xs text-gray-600 dark:text-gray-400">{lastResult.ruleName}</span>}
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">{lastResult.scope}</span>
              </div>
              {lastResult.message && <p className="text-xs text-gray-500 dark:text-gray-400">{lastResult.message}</p>}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-600">在任意位置按住中/右键并移动鼠标</p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">规则配置</h2>
            <div className="flex gap-2">
              <button
                onClick={() => void createRule()}
                disabled={creatingRule || rulesLoading}
                className="text-xs rounded border border-indigo-200 text-indigo-700 px-2.5 py-1 hover:bg-indigo-50 disabled:opacity-50"
              >
                {creatingRule ? "新增中..." : "新增规则"}
              </button>
              <button
                onClick={() => void resetRules()}
                disabled={resettingRules || rulesLoading}
                className="text-xs rounded border border-gray-300 text-gray-700 px-2.5 py-1 hover:bg-gray-100 disabled:opacity-50"
              >
                {resettingRules ? "重置中..." : "重置默认规则"}
              </button>
            </div>
          </div>

          {rulesError && <div className="text-xs rounded border border-red-200 bg-red-50 text-red-600 px-3 py-2">{rulesError}</div>}

          {rulesLoading ? (
            <div className="text-sm text-gray-400">加载规则中...</div>
          ) : rules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-400">暂无规则。</div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const action = actionById[rule.actionType];
                const busy = savingRuleId === rule.id;
                return (
                  <div key={rule.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-gray-900"
                        value={rule.name}
                        onChange={(e) => updateRuleLocal(rule.id, { name: e.target.value })}
                        placeholder="规则名称"
                      />
                      <select
                        className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-gray-900"
                        value={rule.button}
                        onChange={(e) => updateRuleLocal(rule.id, { button: e.target.value as MouseButtonValue })}
                      >
                        {BUTTON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-gray-900"
                        value={rule.gesture.toUpperCase()}
                        onChange={(e) => updateRuleLocal(rule.id, { gesture: e.target.value.toUpperCase() })}
                      >
                        {GESTURE_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g} {DIRECTION_ARROW[g]}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-gray-900"
                        value={rule.actionType}
                        onChange={(e) => updateRuleLocal(rule.id, { actionType: e.target.value })}
                      >
                        {actions.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => updateRuleLocal(rule.id, { enabled: e.target.checked })}
                        />
                        启用
                      </label>
                      <span className="font-mono">{rule.id}</span>
                      {action && <span className="ml-auto">{formatHotkey(action)}</span>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void saveRule(rule)}
                        disabled={busy}
                        className="text-xs rounded border border-indigo-200 text-indigo-700 px-2.5 py-1 hover:bg-indigo-50 disabled:opacity-50"
                      >
                        {busy ? "保存中..." : "保存"}
                      </button>
                      <button
                        onClick={() => void removeRule(rule.id)}
                        disabled={busy}
                        className="text-xs rounded border border-red-200 text-red-700 px-2.5 py-1 hover:bg-red-50 disabled:opacity-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</h2>
              <button onClick={() => setHistory([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                清空
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              {history.map((r, i) => {
                const arrows = parseGestureArrows(r.gesture);
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex gap-0.5">
                      {arrows.map((a, j) => (
                        <span key={j} className="text-base text-indigo-500 dark:text-indigo-400">
                          {a}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-xs text-gray-400">{r.gesture}</span>
                    <span
                      className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                        r.matched
                          ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      }`}
                    >
                      {r.matched ? "匹配" : "未匹配"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {screens.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              屏幕布局
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-600">{screens.length} 块显示器</span>
            </h2>
            <ScreenMap screens={screens} activeIndex={activeScreenIndex} />
          </section>
        )}
      </main>
    </div>
  );
}
