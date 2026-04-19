import { useState } from "react";
import {
  BUTTON_OPTIONS,
  formatGestureSelectOption,
  GESTURE_OPTIONS,
  formatGestureTriggerLabel,
  formatGestureTriggerLabelZh,
  formatHotkey,
} from "../../gesture";
import { hotkeySnapshotToKeyLabels } from "../../lib/macKeyboard";
import type { MouseButtonValue } from "../../types/app";
import { GestureLogOverlay } from "./components/GestureLogOverlay";
import { GestureRuleCard } from "./components/GestureRuleCard";
import { KeybindingRecorder } from "./components/KeybindingRecorder";
import { ResultSection } from "./components/ResultSection";
import { ScreenMap } from "./components/ScreenMap";
import { PageLayout } from "../../components/layout/PageLayout";
import { IconPlus, IconRotateCcw } from "../../components/icons";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { useGesturePanelState } from "./useGesturePanelState";

type PanelPageProps = {
  routeSearch: string;
  onIntentHandled: () => void;
};

export function PanelPage({ routeSearch, onIntentHandled }: PanelPageProps) {
  const [logOverlayOpen, setLogOverlayOpen] = useState(false);

  const {
    ruleFormOpen,
    editingRuleId,
    openRuleFormCreate,
    openRuleFormEdit,
    closeRuleForm,
    submitRuleForm,
    formBusy,
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

  const header = (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-[-0.02em] text-foreground">手势规则</h1>
          <button
            type="button"
            className="rounded-full border border-border/75 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
          >
            {filteredRules.length} 条规则
          </button>
          <button
            type="button"
            className="rounded-full border border-border/75 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
            onClick={() => setLogOverlayOpen(true)}
            aria-label={`查看识别日志，${gestureLog.length} 条`}
            aria-haspopup="dialog"
            aria-expanded={logOverlayOpen}
          >
            {gestureLog.length} 条日志
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理触发方式、快捷键映射和最近一次识别结果。</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-3"
          onClick={() => void resetRules()}
          disabled={resettingRules || rulesLoading}
        >
          <IconRotateCcw className="h-4 w-4 text-muted-foreground" />
          {resettingRules ? "重置中…" : "重置默认"}
        </Button>
        <Button
          size="sm"
          className="h-9 gap-1.5 px-3"
          onClick={() => {
            if (ruleFormOpen && editingRuleId === null) {
              closeRuleForm();
            } else {
              openRuleFormCreate();
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
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>{filteredRules.length} 条规则</span>
        <span>{gestureLog.length} 条识别记录</span>
        <span>{screens.length > 0 ? `${screens.length} 块显示器` : "未检测到显示器信息"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>{lastResult?.matched ? "最近一次识别已匹配规则" : "最近一次识别尚未匹配规则"}</span>
        <span>中键或右键按住后移动即可测试</span>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <ResultSection lastResult={lastResult} />
      {screens.length > 0 ? <ScreenMap screens={screens} activeIndex={activeScreenIndex} /> : null}
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
      contentClassName="overflow-hidden"
      contentContainerClassName="py-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      headerClassName="border-b border-border/65 bg-background/78 backdrop-blur-[14px]"
      footerClassName="border-t border-border/65 bg-background/82 backdrop-blur-[10px]"
    >
      <GestureLogOverlay
        open={logOverlayOpen}
        onOpenChange={setLogOverlayOpen}
        onClear={clearGestureLog}
        entries={gestureLog}
      />

      <Sheet open={ruleFormOpen} onOpenChange={(open) => !open && closeRuleForm()}>
        <SheetContent side="right" className="flex h-full flex-col sm:max-w-[440px]">
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            <SheetHeader className="border-b border-border/70 pb-3">
              <SheetTitle>{editingRuleId ? "编辑规则" : "新建规则"}</SheetTitle>
              <SheetDescription>设置触发按键、滑动方向和需要执行的快捷键。</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">名称</p>
                    <Input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">触发按键</p>
                    <Select
                      value={draft.button}
                      onChange={(e) => setDraft((prev) => ({ ...prev, button: e.target.value as MouseButtonValue }))}
                    >
                      {BUTTON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">滑动方向</p>
                    <Select
                      value={draft.gesture.toUpperCase()}
                      onChange={(e) => setDraft((prev) => ({ ...prev, gesture: e.target.value.toUpperCase() }))}
                    >
                      {GESTURE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {formatGestureSelectOption(g)}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[11px] leading-snug text-muted-foreground">当前选择：{formatGestureTriggerLabelZh(draft.gesture)}</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">执行快捷键</p>
                    <KeybindingRecorder
                      value={draft.actionHotkey}
                      onChange={(v) => setDraft((p) => ({ ...p, actionHotkey: v }))}
                      disabled={formBusy}
                    />
                  </div>
                </div>
              </div>
            </div>
            <SheetFooter className="border-t border-border/70 pt-3">
              <div className="flex w-full justify-end gap-2">
                <Button variant="outline" onClick={() => closeRuleForm()} disabled={formBusy}>
                  取消
                </Button>
                <Button onClick={() => void submitRuleForm()} disabled={formBusy}>
                  {editingRuleId ? (formBusy ? "保存中…" : "保存") : formBusy ? "创建中…" : "创建规则"}
                </Button>
              </div>
            </SheetFooter>
          </div>
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
            <div className="rounded-[20px] border border-border/75 bg-[rgba(255,255,255,0.82)] px-4 py-8 text-sm text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.72),0_10px_24px_rgba(36,48,83,0.04)]">
              正在加载规则…
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="rounded-[20px] border border-border/75 bg-[rgba(255,255,255,0.82)] px-5 py-6 shadow-[0_1px_0_rgba(255,255,255,0.72),0_10px_24px_rgba(36,48,83,0.04)]">
              <p className="text-base font-semibold text-foreground">先创建第一条规则</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                这页的流程很简单：1. 新建规则；2. 录入快捷键；3. 按住中键或右键测试手势。
              </p>
              <div className="mt-4 grid gap-2 text-sm text-foreground/80 sm:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-3">1. 选择触发按键和滑动方向</div>
                <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-3">2. 录入需要执行的快捷键</div>
                <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-3">3. 创建后在桌面上直接测试</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRules.map((rule) => {
                const action = rule.actionHotkey ? undefined : actionById[rule.actionType];
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
                    hotkeyLabels={hotkeyLabels}
                    busy={busy}
                    onToggleEnabled={(enabled) => void saveRule({ ...rule, enabled })}
                    onEdit={() => openRuleFormEdit(rule)}
                    onDelete={() => void removeRule(rule.id)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
