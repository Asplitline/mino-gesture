import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BUTTON_OPTIONS,
  formatGestureSelectOption,
  GESTURE_OPTIONS,
  formatGestureTriggerLabel,
  formatGestureTriggerLabelZh,
  formatHotkey,
} from "../../gesture";
import { hotkeySnapshotToKeyLabels } from "../../lib/macKeyboard";
import type {
  BindableAppInfo,
  MouseButtonValue,
  RuleConfig,
} from "../../types/app";
import { GestureLogOverlay } from "./components/GestureLogOverlay";
import { GestureRuleCard } from "./components/GestureRuleCard";
import { KeybindingRecorder } from "./components/KeybindingRecorder";
import { ResultSection } from "./components/ResultSection";
import { ScreenMap } from "./components/ScreenMap";
import { SettingsSheet } from "./components/SettingsSheet";
import { PageLayout } from "../../components/layout/PageLayout";
import {
  IconHome,
  IconPlus,
  IconSearch,
  IconSettings,
} from "../../components/icons";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { useGesturePanelState } from "./useGesturePanelState";

type PanelPageProps = {
  routeSearch: string;
  onIntentHandled: () => void;
  onBackHome: () => void;
};

function appInitial(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

function AppIcon({ app }: { app: BindableAppInfo }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-border/70 bg-[linear-gradient(145deg,hsl(var(--muted)),hsl(var(--background)))] text-xs font-semibold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      {appInitial(app.name)}
    </span>
  );
}

export function PanelPage({
  routeSearch,
  onIntentHandled,
  onBackHome,
}: PanelPageProps) {
  const [logOverlayOpen, setLogOverlayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [scopeSearch, setScopeSearch] = useState("");
  const [ruleFormLayerNode, setRuleFormLayerNode] = useState<HTMLDivElement | null>(
    null,
  );
  const [rulePendingDelete, setRulePendingDelete] = useState<RuleConfig | null>(
    null,
  );

  const {
    ruleFormOpen,
    editingRuleId,
    openRuleFormCreate,
    openRuleFormEdit,
    closeRuleForm,
    submitRuleForm,
    formBusy,
    bindableApps,
    bindableAppsLoading,
    bindableAppsLoaded,
    bindableAppsError,
    loadBindableApps,
    lastResult,
    gestureLog,
    screens,
    activeScreenIndex,
    rules,
    rulesLoading,
    rulesError,
    savingRuleId,
    resettingRules,
    draft,
    setDraft,
    actionById,
    filteredRules,
    clearGestureLog,
    removeRule,
    resetRules,
    saveRule,
  } = useGesturePanelState({ routeSearch, onIntentHandled });

  const handleGoRulesHome = () => {
    setLogOverlayOpen(false);
    setSettingsOpen(false);
    closeRuleForm();
    onBackHome();
  };

  const appByBundleId = useMemo(
    () => Object.fromEntries(bindableApps.map((app) => [app.bundleId, app])),
    [bindableApps],
  );
  const selectedScopeSet = useMemo(() => new Set(draft.scopes), [draft.scopes]);
  const normalizedScopeSearch = scopeSearch.trim().toLocaleLowerCase();
  const visibleBindableApps = bindableApps.filter((app) => {
    if (!normalizedScopeSearch) return true;
    return (
      app.name.toLocaleLowerCase().includes(normalizedScopeSearch) ||
      app.bundleId.toLocaleLowerCase().includes(normalizedScopeSearch)
    );
  });
  const draftHotkeyLabels = draft.actionHotkey
    ? hotkeySnapshotToKeyLabels(draft.actionHotkey).join(" + ")
    : "等待录制快捷键";
  const draftTriggerPreview = `${BUTTON_OPTIONS.find((item) => item.value === draft.button)?.label ?? draft.button} · ${formatGestureTriggerLabelZh(draft.gesture)}`;

  const toggleScope = (bundleId: string) => {
    setDraft((prev) => {
      const exists = prev.scopes.includes(bundleId);
      return {
        ...prev,
        scopes: exists
          ? prev.scopes.filter((scope) => scope !== bundleId)
          : [...prev.scopes, bundleId],
      };
    });
  };

  useEffect(() => {
    if (!scopeExpanded) return;
    void loadBindableApps();
  }, [scopeExpanded, loadBindableApps]);

  const openCreateRuleForm = () => {
    setScopeExpanded(false);
    setScopeSearch("");
    openRuleFormCreate();
  };

  const openEditRuleForm = (rule: RuleConfig) => {
    setScopeExpanded(false);
    setScopeSearch("");
    openRuleFormEdit(rule);
  };
  const handleRuleFormLayerRef = useCallback((node: HTMLDivElement | null) => {
    setRuleFormLayerNode(node);
  }, []);

  const formatRuleScope = (scope: string) => {
    const scopes = scope
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (scopes.length === 0 || scopes.includes("global")) return "全部 App";
    return scopes.map((item) => appByBundleId[item]?.name ?? item).join("、");
  };

  const header = (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            onClick={handleGoRulesHome}
            aria-label="返回规则首页"
          >
            <IconHome className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
            手势规则
          </h1>
          <button
            type="button"
            className="app-panel-subtle shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
          >
            {filteredRules.length} 条规则
          </button>
          <button
            type="button"
            className="app-panel-subtle shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
            onClick={() => setLogOverlayOpen(true)}
            aria-label={`查看识别日志，${gestureLog.length} 条`}
            aria-haspopup="dialog"
            aria-expanded={logOverlayOpen}
          >
            {gestureLog.length} 条日志
          </button>
        </div>
        <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
          管理触发方式、快捷键映射和最近一次识别结果。
        </p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <Button
          size="sm"
          className="h-9 flex-1 gap-1.5 px-3 sm:flex-none"
          onClick={() => {
            if (ruleFormOpen && editingRuleId === null) {
              closeRuleForm();
            } else {
              openCreateRuleForm();
            }
          }}
          disabled={rulesLoading}
          aria-label="新建规则"
          aria-haspopup="dialog"
          aria-expanded={ruleFormOpen}
        >
          <IconPlus className="h-4 w-4" />
          新建规则
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 flex-1 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground sm:flex-none"
          onClick={() => setSettingsOpen(true)}
          aria-label="打开设置"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
        >
          <IconSettings className="h-4 w-4" />
          设置
        </Button>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-2 py-2.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>{filteredRules.length} 条规则</span>
        <span>{gestureLog.length} 条识别记录</span>
        <span>
          {screens.length > 0
            ? `${screens.length} 块显示器`
            : "未检测到显示器信息"}
        </span>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <ResultSection lastResult={lastResult} />
      {screens.length > 0 ? (
        <ScreenMap screens={screens} activeIndex={activeScreenIndex} />
      ) : null}
    </>
  );

  return (
    <PageLayout
      header={header}
      footer={footer}
      sidebar={sidebar}
      containerSize="xl"
      stickyHeader
      stickyFooter
      stickySidebar
      contentClassName="overflow-x-hidden"
      contentContainerClassName="py-4 lg:py-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      headerClassName="app-chrome-surface border-b border-border/65"
      footerClassName="app-chrome-surface border-t border-border/65"
    >
      <GestureLogOverlay
        open={logOverlayOpen}
        onOpenChange={setLogOverlayOpen}
        onClear={clearGestureLog}
        entries={gestureLog}
      />
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onResetRules={resetRules}
        resettingRules={resettingRules || rulesLoading}
      />

      <Sheet
        open={ruleFormOpen}
        onOpenChange={(open) => !open && closeRuleForm()}
      >
        <SheetContent
          ref={handleRuleFormLayerRef}
          side="right"
          className="flex min-h-0 h-full max-h-none flex-col overflow-hidden rounded-none bg-card p-0 sm:top-3 sm:bottom-3 sm:h-auto sm:max-h-[calc(100vh-1.5rem)] sm:max-w-[440px] sm:rounded-l-[24px]"
        >
          <SheetHeader className="border-b border-border/70">
            <SheetTitle>{editingRuleId ? "编辑规则" : "新建规则"}</SheetTitle>
            <SheetDescription>
              设置生效范围、触发按键、滑动方向和需要执行的快捷键。
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    名称
                  </p>
                  <Input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    触发按键
                  </p>
                  <Select
                    value={draft.button}
                    onValueChange={(value) =>
                      setDraft((prev) => ({
                        ...prev,
                        button: value as MouseButtonValue,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent container={ruleFormLayerNode}>
                      {BUTTON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      生效范围
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      className={[
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        draft.scopes.length === 0
                          ? "border-primary/45 bg-primary/[0.08] text-foreground"
                          : "border-border/70 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/35",
                      ].join(" ")}
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, scopes: [] }));
                        setScopeExpanded(false);
                      }}
                    >
                      <span>
                        <span className="block font-medium">全部 App</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          默认方式，先让规则全局生效。
                        </span>
                      </span>
                      <span className="text-xs">
                        {draft.scopes.length === 0 ? "当前" : "切换"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={[
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        draft.scopes.length > 0 || scopeExpanded
                          ? "border-primary/45 bg-primary/[0.08] text-foreground"
                          : "border-border/70 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/35",
                      ].join(" ")}
                      onClick={() => {
                        setScopeExpanded((prev) => !prev);
                      }}
                      aria-expanded={scopeExpanded}
                    >
                      <span>
                        <span className="block font-medium">限定 App</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {draft.scopes.length > 0
                            ? `已限定 ${draft.scopes.length} 个 App，展开后可调整。`
                            : "只在选中的应用中触发，适合覆盖应用内快捷键。"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs">
                        {scopeExpanded ? "收起" : "选择"}
                      </span>
                    </button>
                  </div>

                  {scopeExpanded && (
                    <div className="space-y-2 rounded-xl border border-border/55 bg-muted/10 p-2">
                      <div className="relative">
                        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={scopeSearch}
                          onChange={(e) => setScopeSearch(e.target.value)}
                          className="h-9 pl-8"
                          placeholder="搜索 App 或 Bundle ID"
                        />
                      </div>
                      <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                        {bindableAppsLoading ? (
                          <div className="col-span-full rounded-lg bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                            正在读取 App 列表…
                          </div>
                        ) : bindableAppsError ? (
                          <div className="col-span-full rounded-lg bg-background/70 px-3 py-3 text-sm text-destructive">
                            {bindableAppsError}
                          </div>
                        ) : bindableAppsLoaded && bindableApps.length === 0 ? (
                          <div className="col-span-full rounded-lg bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                            暂未读取到可绑定 App，仍可使用“全部 App”。
                          </div>
                        ) : bindableAppsLoaded &&
                          visibleBindableApps.length === 0 ? (
                          <div className="col-span-full rounded-lg bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                            没有匹配的 App。
                          </div>
                        ) : (
                          visibleBindableApps.map((app) => {
                            const selected = selectedScopeSet.has(app.bundleId);
                            return (
                              <button
                                key={app.bundleId}
                                type="button"
                                className={[
                                  "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                                  selected
                                    ? "border-primary/50 bg-primary/[0.08] text-foreground"
                                    : "border-transparent bg-background/70 text-muted-foreground hover:border-border/70 hover:text-foreground",
                                ].join(" ")}
                                onClick={() => toggleScope(app.bundleId)}
                                aria-pressed={selected}
                                aria-label={`${selected ? "取消选择" : "选择"} ${app.name}`}
                              >
                                <AppIcon app={app} />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">
                                    {app.name}
                                  </span>
                                  <span className="block truncate text-[11px] text-muted-foreground">
                                    {app.bundleId}
                                  </span>
                                </span>
                                <span className="shrink-0 text-xs font-medium">
                                  {selected ? "已选" : ""}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    滑动方向
                  </p>
                  <Select
                    value={draft.gesture.toUpperCase()}
                    onValueChange={(value) =>
                      setDraft((prev) => ({
                        ...prev,
                        gesture: value.toUpperCase(),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent container={ruleFormLayerNode}>
                      {GESTURE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {formatGestureSelectOption(g)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-snug text-muted-foreground">
                    当前选择：{formatGestureTriggerLabelZh(draft.gesture)}
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    执行快捷键
                  </p>
                  <KeybindingRecorder
                    value={draft.actionHotkey}
                    onChange={(v) =>
                      setDraft((p) => ({ ...p, actionHotkey: v }))
                    }
                    disabled={formBusy}
                  />
                </div>
              </div>
            </div>
          </SheetBody>
          <SheetFooter className="mt-1 border-t border-border/70">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => closeRuleForm()}
                disabled={formBusy}
              >
                取消
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => void submitRuleForm()}
                disabled={formBusy}
              >
                {editingRuleId
                  ? formBusy
                    ? "保存中…"
                    : "保存"
                  : formBusy
                    ? "创建中…"
                    : "创建规则"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="min-w-0 space-y-4">
          {rulesError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {rulesError}
            </div>
          )}

          {rulesLoading ? (
            <Card className="app-panel-surface rounded-[20px]">
              <CardContent className="px-4 py-8 text-sm text-muted-foreground">
                正在加载规则…
              </CardContent>
            </Card>
          ) : filteredRules.length === 0 ? (
            <Card className="app-panel-surface rounded-[20px]">
              <CardContent className="px-5 py-6 pt-6">
                <p className="text-base font-semibold text-foreground">
                  先创建第一条规则
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  这页的流程很简单：1. 新建规则；2. 录入快捷键；3.
                  按住中键或右键测试手势。
                </p>
                <div className="mt-4 grid gap-2 text-sm text-foreground/80 lg:grid-cols-3">
                  <div className="app-panel-subtle rounded-xl px-3 py-3">
                    1. 选择触发按键和滑动方向
                  </div>
                  <div className="app-panel-subtle rounded-xl px-3 py-3">
                    2. 录入需要执行的快捷键
                  </div>
                  <div className="app-panel-subtle rounded-xl px-3 py-3">
                    3. 创建后在桌面上直接测试
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredRules.map((rule) => {
                const action = rule.actionHotkey
                  ? undefined
                  : actionById[rule.actionType];
                const triggerLabel = formatGestureTriggerLabel(rule.gesture);
                const hotkeyLabels = rule.actionHotkey
                  ? hotkeySnapshotToKeyLabels(rule.actionHotkey)
                  : action
                    ? formatHotkey(action)
                        .split(/\s+\+\s+/)
                        .map((s) => s.trim())
                    : [];
                const busy = savingRuleId === rule.id;
                return (
                  <GestureRuleCard
                    key={rule.id}
                    rule={rule}
                    action={action}
                    triggerLabel={triggerLabel}
                    scopeLabel={formatRuleScope(rule.scope)}
                    hotkeyLabels={hotkeyLabels}
                    busy={busy}
                    onToggleEnabled={(enabled) =>
                      void saveRule({ ...rule, enabled })
                    }
                    onEdit={() => openEditRuleForm(rule)}
                    onDelete={() => setRulePendingDelete(rule)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={rulePendingDelete !== null}
        onOpenChange={(open) => !open && setRulePendingDelete(null)}
      >
        <DialogContent className="max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>删除这条规则？</DialogTitle>
            <DialogDescription>
              {rulePendingDelete
                ? `“${rulePendingDelete.name}” 删除后不会再响应对应手势。`
                : "删除后不会再响应对应手势。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRulePendingDelete(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!rulePendingDelete) return;
                const id = rulePendingDelete.id;
                setRulePendingDelete(null);
                void removeRule(id);
              }}
            >
              删除规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
