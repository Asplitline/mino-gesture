import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HistorySection } from "./components/HistorySection";
import { ResultSection } from "./components/ResultSection";
import { RuleSection } from "./components/RuleSection";
import { ScreenMap } from "./components/ScreenMap";
import bannerImage from "./images/banner.webp";
import type { ActionConfig, GestureResult, RuleConfig, ScreenInfo, TrailStartPayload } from "./types/app";

type ViewRoute = "home" | "panel";

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
  const capturingRef = useRef(false);
  const handledIntentRef = useRef<string>("");
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
  const shouldAutoCreateRule = useMemo(() => new URLSearchParams(routeState.search).get("intent") === "create", [routeState.search]);

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

  if (route === "home") {
    return (
      <div className="soft-home-shell">
        <section className="soft-home-panel">
          <div className="soft-home-glow" aria-hidden="true" />
          <div className="soft-home-stack">
            {/* <img className="soft-home-banner-image" src={bannerImage} alt="" /> */}
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
    <div className="soft-page-shell">
      <div className="soft-main-wrap">
        <header className="soft-header">
          <div className="flex items-center justify-between gap-3">
            <div>
              <button
                type="button"
                className="mb-2 inline-flex items-center rounded-[12px] border border-[var(--border)] bg-white/70 px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-all hover:-translate-y-[1px] hover:bg-white"
                onClick={() => navigateTo("/")}
              >
                返回首页
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${isListening ? "bg-[var(--success)] shadow-[0_0_12px_rgba(116,215,188,0.7)]" : "bg-[var(--text-tertiary)]"}`}
              />
              <span className="text-xs text-[var(--text-secondary)]">{isListening ? "监听中" : "未连接"}</span>
            </div>
          </div>
        </header>

        <main className="soft-main">
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

          <HistorySection history={history} onClear={() => setHistory([])} />

          {screens.length > 0 && (
            <section className="space-y-3">
              <h2 className="soft-section-title">
                屏幕布局
                <span className="ml-2 soft-subtle">{screens.length} 块显示器</span>
              </h2>
              <ScreenMap screens={screens} activeIndex={activeScreenIndex} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
