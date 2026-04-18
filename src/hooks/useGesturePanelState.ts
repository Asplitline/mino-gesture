import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { formatGestureTriggerLabel, formatHotkey } from "../gesture";
import type {
  ActionConfig,
  CreateRuleDraft,
  GestureResult,
  MouseButtonValue,
  RuleConfig,
  ScreenInfo,
  TimedGestureResult,
  TrailStartPayload,
} from "../types/app";

type UseGesturePanelStateOptions = {
  routeSearch: string;
  onIntentHandled: () => void;
};

export function useGesturePanelState({ routeSearch, onIntentHandled }: UseGesturePanelStateOptions) {
  const [isListening, setIsListening] = useState(false);
  const handledIntentRef = useRef<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [advancedView, setAdvancedView] = useState(false);
  const [showCreatePopover, setShowCreatePopover] = useState(false);

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

  const [searchQuery, setSearchQuery] = useState("");
  const [buttonFilter, setButtonFilter] = useState<"all" | MouseButtonValue>("all");
  const [sortBy, setSortBy] = useState<"usage" | "name" | "gesture">("usage");
  const [draft, setDraft] = useState<CreateRuleDraft>({
    name: "新规则",
    button: "middle",
    gesture: "U",
    actionType: "",
  });

  const shouldAutoCreateRule = useMemo(
    () => new URLSearchParams(routeSearch).get("intent") === "create",
    [routeSearch],
  );

  const actionById = useMemo(() => {
    return Object.fromEntries(actions.map((a) => [a.id, a]));
  }, [actions]);

  const usageByActionId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of history) {
      if (!item.actionType) continue;
      counts[item.actionType] = (counts[item.actionType] ?? 0) + 1;
    }
    return counts;
  }, [history]);

  const refreshRulesAndActions = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const [nextRules, nextActions] = await Promise.all([
        invoke<RuleConfig[]>("list_rules"),
        invoke<ActionConfig[]>("list_actions"),
      ]);
      setRules(nextRules);
      setActions(nextActions);
      setDraft((prev) => ({ ...prev, actionType: prev.actionType || nextActions[0]?.id || "" }));
    } catch (err) {
      setRulesError(String(err));
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
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
  }, [refreshRulesAndActions]);

  const updateRuleLocal = useCallback((id: string, patch: Partial<RuleConfig>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const saveRule = useCallback(async (rule: RuleConfig) => {
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
  }, []);

  const removeRule = useCallback(async (id: string) => {
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
  }, []);

  const createRule = useCallback(
    async (payload?: Partial<CreateRuleDraft>) => {
      if (actions.length === 0) {
        setRulesError("当前没有可用操作，请先检查配置。");
        return;
      }
      const finalPayload: CreateRuleDraft = {
        name: payload?.name?.trim() || draft.name || "新规则",
        button: payload?.button ?? draft.button,
        gesture: (payload?.gesture ?? draft.gesture).toUpperCase(),
        actionType: payload?.actionType ?? (draft.actionType || actions[0].id),
      };

      setCreatingRule(true);
      setRulesError(null);
      try {
        const created = await invoke<RuleConfig>("create_rule", {
          payload: {
            name: finalPayload.name,
            scope: "global",
            button: finalPayload.button,
            gesture: finalPayload.gesture,
            actionType: finalPayload.actionType,
          },
        });
        setRules((prev) => [created, ...prev]);
        setShowCreatePopover(false);
      } catch (err) {
        setRulesError(String(err));
      } finally {
        setCreatingRule(false);
      }
    },
    [actions, draft.actionType, draft.button, draft.gesture, draft.name],
  );

  const resetRules = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!shouldAutoCreateRule) return;
    if (rulesLoading || creatingRule || actions.length === 0) return;

    const intentKey = routeSearch;
    if (handledIntentRef.current === intentKey) return;
    handledIntentRef.current = intentKey;

    void createRule().finally(() => {
      onIntentHandled();
    });
  }, [shouldAutoCreateRule, rulesLoading, creatingRule, actions.length, routeSearch, createRule, onIntentHandled]);

  const filteredRules = useMemo(() => {
    let list = rules;
    if (buttonFilter !== "all") list = list.filter((r) => r.button === buttonFilter);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((rule) => {
        const action = actionById[rule.actionType];
        const hotkey = action ? formatHotkey(action) : "";
        const trigger = formatGestureTriggerLabel(rule.gesture);
        const hay = [
          rule.name,
          action?.name ?? "",
          hotkey,
          trigger,
          rule.gesture,
          rule.button,
          rule.enabled ? "active" : "disabled",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...list];
    if (sortBy === "usage") {
      sorted.sort(
        (a, b) => (usageByActionId[b.actionType] ?? 0) - (usageByActionId[a.actionType] ?? 0),
      );
    } else if (sortBy === "name") {
      sorted.sort((a, b) => {
        const na = actionById[a.actionType]?.name ?? a.name;
        const nb = actionById[b.actionType]?.name ?? b.name;
        return na.localeCompare(nb, undefined, { sensitivity: "base" });
      });
    } else {
      sorted.sort((a, b) => a.gesture.localeCompare(b.gesture));
    }
    return sorted;
  }, [rules, buttonFilter, searchQuery, sortBy, actionById, usageByActionId]);

  return {
    isListening,
    searchInputRef,
    advancedView,
    setAdvancedView,
    showCreatePopover,
    setShowCreatePopover,
    lastResult,
    screens,
    activeScreenIndex,
    rules,
    actions,
    rulesLoading,
    rulesError,
    savingRuleId,
    creatingRule,
    resettingRules,
    searchQuery,
    setSearchQuery,
    buttonFilter,
    setButtonFilter,
    sortBy,
    setSortBy,
    draft,
    setDraft,
    actionById,
    filteredRules,
    updateRuleLocal,
    saveRule,
    removeRule,
    createRule,
    resetRules,
  };
}
