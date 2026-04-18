import { BUTTON_OPTIONS, GESTURE_OPTIONS, formatGestureTriggerLabel, formatHotkey } from "../../gesture";
import type { MouseButtonValue } from "../../types/app";
import { GestureRuleCard } from "../../components/GestureRuleCard";
import { ResultSection } from "../../components/ResultSection";
import { ScreenMap } from "../../components/ScreenMap";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { useGesturePanelState } from "./useGesturePanelState";

type PanelPageProps = {
  routeSearch: string;
  onIntentHandled: () => void;
};

export function PanelPage({ routeSearch, onIntentHandled }: PanelPageProps) {
  const {
    ruleFormOpen,
    editingRuleId,
    draftEnabled,
    setDraftEnabled,
    openRuleFormCreate,
    openRuleFormEdit,
    closeRuleForm,
    submitRuleForm,
    formBusy,
    lastResult,
    screens,
    activeScreenIndex,
    rules,
    actions,
    rulesLoading,
    rulesError,
    savingRuleId,
    resettingRules,
    draft,
    setDraft,
    actionById,
    filteredRules,
    removeRule,
    resetRules,
    saveRule,
  } = useGesturePanelState({ routeSearch, onIntentHandled });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f2fa] to-[#eef3ff] p-0 dark:from-zinc-950 dark:to-zinc-900">
      <div className="relative mx-auto flex h-screen w-full max-w-[1400px] flex-col overflow-hidden border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm dark:border-border/50 dark:bg-card/85">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-3 py-3 sm:px-4 dark:border-border/50 dark:bg-background/70">
          <h1 className="min-w-0 text-lg font-semibold tracking-tight text-foreground">Gestures</h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void resetRules()}
              disabled={resettingRules || rulesLoading}
            >
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
              disabled={rulesLoading || actions.length === 0}
              aria-label="New gesture"
              aria-haspopup="dialog"
              aria-expanded={ruleFormOpen}
            >
              <span aria-hidden className="text-base leading-none">
                +
              </span>
              New Gesture
            </Button>
          </div>
        </header>

        {ruleFormOpen && (
          <>
            <button className="absolute inset-0 z-20 bg-transparent" onClick={() => closeRuleForm()} aria-label="Close" />
            <Card className="absolute right-3 top-[72px] z-30 w-[400px] max-w-[calc(100%-24px)] border-border/60 bg-background/95 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{editingRuleId ? "Edit Gesture" : "Add Gesture"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Name</p>
                    <Input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Button</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Gesture</p>
                    <Select value={draft.gesture} onChange={(e) => setDraft((prev) => ({ ...prev, gesture: e.target.value }))}>
                      {GESTURE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Action</p>
                    <Select value={draft.actionType} onChange={(e) => setDraft((prev) => ({ ...prev, actionType: e.target.value }))}>
                      {actions.map((action) => (
                        <option key={action.id} value={action.id}>
                          {action.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {editingRuleId && (
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 dark:border-border/50 dark:bg-muted/20">
                    <span className="text-sm text-muted-foreground">启用</span>
                    <Switch checked={draftEnabled} onCheckedChange={setDraftEnabled} aria-label="启用规则" />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => closeRuleForm()} disabled={formBusy}>
                    Cancel
                  </Button>
                  <Button onClick={() => void submitRuleForm()} disabled={formBusy}>
                    {editingRuleId ? (formBusy ? "Saving..." : "Save") : formBusy ? "Adding..." : "Add"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {rulesLoading ? (
            <p className="text-sm text-muted-foreground">Loading gestures...</p>
          ) : filteredRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-background/30 px-4 py-10 text-center dark:bg-background/20">
              <p className="text-sm font-medium text-foreground">No gestures yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Click &quot;New Gesture&quot; above to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRules.map((rule) => {
                const action = actionById[rule.actionType];
                const triggerLabel = formatGestureTriggerLabel(rule.gesture);
                const hotkeyText = action ? formatHotkey(action) : "—";
                const busy = savingRuleId === rule.id;
                return (
                  <GestureRuleCard
                    key={rule.id}
                    rule={rule}
                    action={action}
                    triggerLabel={triggerLabel}
                    hotkeyText={hotkeyText}
                    busy={busy}
                    onToggleEnabled={(enabled) => void saveRule({ ...rule, enabled })}
                    onEdit={() => openRuleFormEdit(rule)}
                    onDelete={() => void removeRule(rule.id)}
                  />
                );
              })}
            </div>
          )}

          {rulesError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {rulesError}
            </div>
          )}

          <section className="space-y-6 border-t border-border/60 pt-4">
            <ResultSection lastResult={lastResult} />
            {screens.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  屏幕布局
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{screens.length} 块显示器</span>
                </h2>
                <ScreenMap screens={screens} activeIndex={activeScreenIndex} />
              </section>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
