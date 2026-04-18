import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BUTTON_OPTIONS, GESTURE_OPTIONS, parseGestureArrows } from "./gesture";
import { ResultSection } from "./components/ResultSection";
import { RuleSection } from "./components/RuleSection";
import { ScreenMap } from "./components/ScreenMap";
import type { ActionConfig, GestureResult, MouseButtonValue, RuleConfig, ScreenInfo, TrailStartPayload } from "./types/app";

type ViewRoute = "home" | "panel";
type TimedGestureResult = GestureResult & { at: number };

function readRouteState(): { route: ViewRoute; search: string } {
  if (typeof window === "undefined") return { route: "home", search: "" };
  return {
    route: window.location.pathname === "/panel" ? "panel" : "home",
    search: window.location.search,
  };
}

export function App() {
  const [routeState, setRouteState] = useState(readRouteState);
  const route = routeState.route;
  const [isListening, setIsListening] = useState(false);
  const handledIntentRef = useRef<string>("");
  const [advancedView, setAdvancedView] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [draftName, setDraftName] = useState("新规则");
  const [draftButton, setDraftButton] = useState<MouseButtonValue>("middle");
  const [draftGesture, setDraftGesture] = useState("U");
  const [draftActionId, setDraftActionId] = useState("");

  const [lastResult, setLastResult] = useState<GestureResult | null>(null);
  const [history, setHistory] = useState<TimedGestureResult[]>([]);
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

  const shouldAutoCreateRule = useMemo(() => {
    return new URLSearchParams(routeState.search).get("intent") === "create";
  }, [routeState.search]);

  const usageByRuleId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of history) {
      if (!item.actionType) continue;
      counts[item.actionType] = (counts[item.actionType] ?? 0) + 1;
    }
    return counts;
  }, [history]);

  const navigateTo = (to: string) => {
    window.history.pushState({}, "", to);
    setRouteState(readRouteState());
  };

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
    if (actions.length === 0) return;
    setDraftActionId((prev) => (prev ? prev : actions[0].id));
  }, [actions]);

  useEffect(() => {
    const onPopState = () => setRouteState(readRouteState());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (route !== "panel") {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    void refreshRulesAndActions();

    const unlistenStart = listen<TrailStartPayload>("trail-start", (e) => {
      setLastResult(null);
      if (e.payload.screens?.length) {
        setScreens(e.payload.screens);
        setActiveScreenIndex(e.payload.activeScreenIndex);
      }
    });

    const unlistenResult = listen<GestureResult>("gesture-result", (e) => {
      const r = e.payload;
      setLastResult(r);
      if (r.gesture) setHistory((prev) => [{ ...r, at: Date.now() }, ...prev].slice(0, 20));
    });

    return () => {
      setIsListening(false);
      unlistenStart.then((fn) => fn());
      unlistenResult.then((fn) => fn());
    };
  }, [route]);

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

  const createRule = async (params?: {
    name?: string;
    button?: MouseButtonValue;
    gesture?: string;
    actionType?: string;
  }) => {
    if (actions.length === 0) {
      setRulesError("当前没有可用操作，请先检查配置。");
      return;
    }
    const actionType = params?.actionType ?? (draftActionId || actions[0].id);
    setCreatingRule(true);
    setRulesError(null);
    try {
      const created = await invoke<RuleConfig>("create_rule", {
        payload: {
          name: params?.name?.trim() || "新规则",
          scope: "global",
          button: params?.button ?? "middle",
          gesture: (params?.gesture ?? "U").toUpperCase(),
          actionType,
        },
      });
      setRules((prev) => [created, ...prev]);
    } catch (err) {
      setRulesError(String(err));
    } finally {
      setCreatingRule(false);
    }
  };

  const handleCreateFromPanel = async () => {
    await createRule({
      name: draftName,
      button: draftButton,
      gesture: draftGesture,
      actionType: draftActionId,
    });
    setShowCreatePanel(false);
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

  useEffect(() => {
    if (route !== "panel") return;
    if (!shouldAutoCreateRule) return;
    if (rulesLoading || creatingRule || actions.length === 0) return;

    const intentKey = routeState.search;
    if (handledIntentRef.current === intentKey) return;
    handledIntentRef.current = intentKey;

    void createRule().finally(() => {
      window.history.replaceState({}, "", "/panel");
      setRouteState(readRouteState());
    });
  }, [route, shouldAutoCreateRule, rulesLoading, creatingRule, actions.length, routeState.search]);

  const formatShortcut = (action: ActionConfig | undefined, fallbackGesture: string) => {
    if (!action) return fallbackGesture;
    const parts: string[] = [];
    if (action.control) parts.push("Ctrl");
    if (action.option) parts.push("Alt");
    if (action.shift) parts.push("Shift");
    if (action.command) parts.push("Cmd");
    if (action.keyCode >= 65 && action.keyCode <= 90) {
      parts.push(String.fromCharCode(action.keyCode));
    } else if (action.keyCode >= 48 && action.keyCode <= 57) {
      parts.push(String.fromCharCode(action.keyCode));
    } else {
      parts.push(`K${action.keyCode}`);
    }
    return parts.join(" + ");
  };

  if (route === "home") {
    return (
      <div className="soft-home-shell">
        <section className="soft-home-panel">
          <div className="soft-home-glow" aria-hidden="true" />
          <div className="soft-home-stack">
            <h1 className="text-[34px] font-semibold leading-[1.2] text-[var(--text-primary)]">Welcome to Gesture Control</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--text-secondary)]">
              配置你的首个鼠标手势流程，快速进入控制中心。
            </p>

            <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3">
              <button type="button" className="soft-btn soft-btn-primary h-12 text-lg font-semibold" onClick={() => navigateTo("/panel")}>
                Get Started with a Demo Gesture
              </button>
              <button type="button" className="soft-btn h-12 text-base font-medium" onClick={() => navigateTo("/panel?intent=create")}>
                Create a New Gesture
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="soft-config-shell">
      <section className="soft-config-frame">
        <header className="soft-config-topbar">
          <div className="soft-config-tabs">
            {[
              { key: "all", label: "All", active: true },
              { key: "navigation", label: "Navigation", active: false },
              { key: "apps", label: "Apps", active: false },
              { key: "scripts", label: "Scripts", active: false },
            ].map((tab) => (
              <button key={tab.key} type="button" className={`soft-tab ${tab.active ? "soft-tab-active" : ""}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="soft-home-link" onClick={() => navigateTo("/")}>
              Home
            </button>
            <button
              type="button"
              className="soft-record-icon-btn"
              onClick={() => setShowCreatePanel((v) => !v)}
              disabled={rulesLoading || actions.length === 0}
              title="Record New Gesture"
              aria-label="Record New Gesture"
            >
              ⊕
            </button>
            <span className={`soft-listen-switch ${isListening ? "soft-listen-switch-on" : ""}`} aria-hidden="true">
              <span />
            </span>
            <span className="text-[18px] leading-none text-[var(--text-secondary)]">›</span>
          </div>
        </header>

        {showCreatePanel && (
          <>
            <button type="button" className="soft-create-backdrop" onClick={() => setShowCreatePanel(false)} aria-label="Close create panel" />
            <section className="soft-create-popover">
              <div className="soft-create-grid">
                <label className="soft-create-field">
                  <span>Name</span>
                  <input className="soft-input" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Rule name" />
                </label>
                <label className="soft-create-field">
                  <span>Button</span>
                  <select className="soft-select" value={draftButton} onChange={(e) => setDraftButton(e.target.value as MouseButtonValue)}>
                    {BUTTON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="soft-create-field">
                  <span>Gesture</span>
                  <select className="soft-select" value={draftGesture} onChange={(e) => setDraftGesture(e.target.value)}>
                    {GESTURE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="soft-create-field">
                  <span>Action</span>
                  <select className="soft-select" value={draftActionId} onChange={(e) => setDraftActionId(e.target.value)}>
                    {actions.map((action) => (
                      <option key={action.id} value={action.id}>
                        {action.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="soft-create-actions">
                <button type="button" className="soft-btn" onClick={() => setShowCreatePanel(false)} disabled={creatingRule}>
                  Cancel
                </button>
                <button type="button" className="soft-btn soft-btn-primary" onClick={() => void handleCreateFromPanel()} disabled={creatingRule}>
                  {creatingRule ? "Adding..." : "Add Gesture"}
                </button>
              </div>
            </section>
          </>
        )}

        <main className="soft-config-main">
          <section>
            <div className="soft-section-head">
              <h2 className="soft-config-title">My Gestures</h2>
              <button type="button" className="soft-advanced-btn" onClick={() => setAdvancedView((v) => !v)}>
                Advanced View <span className="soft-help-dot">?</span>
              </button>
            </div>

            {rulesLoading ? (
              <p className="soft-config-muted">Loading gestures...</p>
            ) : (
              <div className="soft-gesture-grid">
                {rules.slice(0, 3).map((rule) => {
                  const action = actionById[rule.actionType];
                  const arrows = parseGestureArrows(rule.gesture).join("");
                  const usage = usageByRuleId[rule.actionType] ?? 0;
                  return (
                    <article key={rule.id} className="soft-gesture-card">
                      <p className="soft-gesture-shortcut">{formatShortcut(action, `Ctrl + ${arrows}`)}</p>
                      <p className="soft-gesture-name">{action?.name ?? rule.name}</p>
                      <div className="soft-gesture-meta">
                        <span>{arrows || "↔"}</span>
                        <span>{usage === 0 ? "Automated" : `${usage} times`}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="soft-config-chip-row">
              <span className="soft-config-chip">Filters: All</span>
              <span className="soft-config-chip">Sort: By Usage</span>
            </div>
          </section>

          {rulesError && <div className="soft-config-error">{rulesError}</div>}

          {advancedView && (
            <section className="space-y-6">
              <ResultSection lastResult={lastResult} />
              <RuleSection
                rules={rules}
                actions={actions}
                actionById={actionById}
                rulesLoading={rulesLoading}
                rulesError={rulesError}
                creatingRule={creatingRule}
                resettingRules={resettingRules}
                savingRuleId={savingRuleId}
                onCreateRule={() => void createRule()}
                onResetRules={() => void resetRules()}
                onRulePatch={updateRuleLocal}
                onSaveRule={(rule) => void saveRule(rule)}
                onDeleteRule={(id) => void removeRule(id)}
              />
              {screens.length > 0 && (
                <section className="space-y-3">
                  <h2 className="soft-section-title">
                    屏幕布局
                    <span className="ml-2 soft-subtle">{screens.length} 块显示器</span>
                  </h2>
                  <ScreenMap screens={screens} activeIndex={activeScreenIndex} />
                </section>
              )}
            </section>
          )}
        </main>
      </section>
    </div>
  );
}
