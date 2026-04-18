import { BUTTON_OPTIONS, GESTURE_OPTIONS, formatGestureTriggerLabel, formatHotkey } from "../gesture";
import { useGesturePanelState } from "../hooks/useGesturePanelState";
import type { MouseButtonValue } from "../types/app";
import { GestureRuleCard } from "./GestureRuleCard";
import { IconChevronDown, IconMore, IconSearch } from "./icons/AppIcons";
import { ResultSection } from "./ResultSection";
import { RuleSection } from "./RuleSection";
import { ScreenMap } from "./ScreenMap";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Switch } from "./ui/switch";

type GesturePanelProps = {
  routeSearch: string;
  onIntentHandled: () => void;
};

export function GesturePanel({ routeSearch, onIntentHandled }: GesturePanelProps) {
  const {
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
  } = useGesturePanelState({ routeSearch, onIntentHandled });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f2fa] to-[#eef3ff] p-0 dark:from-zinc-950 dark:to-zinc-900">
      <div className="relative mx-auto flex h-screen w-full max-w-[1400px] flex-col overflow-hidden border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm dark:border-border/50 dark:bg-card/85">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-3 py-2 sm:px-4 dark:border-border/50 dark:bg-background/70">
          <h1 className="min-w-0 text-lg font-semibold tracking-tight text-foreground">Gestures</h1>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <label htmlFor="panel-sort-usage" className="sr-only">
              Sort gestures
            </label>
            <Select
              id="panel-sort-usage"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-9 w-[min(9.5rem,42vw)] shrink-0 border-border/80 bg-background/95 text-xs sm:text-sm"
            >
              <option value="usage">Sort Usage</option>
              <option value="name">Sort Name</option>
              <option value="gesture">Sort Gesture</option>
            </Select>
            <Button
              size="sm"
              className="h-9 gap-1 px-3"
              onClick={() => setShowCreatePopover((v) => !v)}
              disabled={rulesLoading || actions.length === 0}
              aria-label="New gesture"
              aria-haspopup="dialog"
              aria-expanded={showCreatePopover}
            >
              <span aria-hidden className="text-base leading-none">
                +
              </span>
              New Gesture
              <IconChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
            <Switch checked={isListening} disabled aria-label="Gestures on" />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/55 px-3 py-2 sm:px-4 dark:border-border/50 dark:bg-background/50">
          <div className="relative min-h-10 min-w-0 flex-1 basis-[min(100%,14rem)]">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search gestures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-border/80 bg-background/95 pl-9 text-sm placeholder:text-muted-foreground/80"
              aria-label="Search gestures"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <label htmlFor="panel-button-filter" className="sr-only">
              Filter by mouse button
            </label>
            <Select
              id="panel-button-filter"
              value={buttonFilter}
              onChange={(e) => setButtonFilter(e.target.value as typeof buttonFilter)}
              className="h-10 w-[min(8.5rem,36vw)] shrink-0 border-border/80 bg-background/95 text-sm"
            >
              <option value="all">All buttons</option>
              {BUTTON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <span className="text-xs font-medium tabular-nums text-muted-foreground" aria-live="polite">
              {filteredRules.length} rules
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              aria-label={advancedView ? "Hide advanced options" : "More options"}
              aria-expanded={advancedView}
              onClick={() => setAdvancedView((v) => !v)}
            >
              <IconMore className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showCreatePopover && (
          <>
            <button className="absolute inset-0 z-20 bg-transparent" onClick={() => setShowCreatePopover(false)} aria-label="Close" />
            <Card className="absolute right-3 top-14 z-30 w-[400px] max-w-[calc(100%-24px)] border-border/60 bg-background/95 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add Gesture</CardTitle>
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreatePopover(false)} disabled={creatingRule}>
                    Cancel
                  </Button>
                  <Button onClick={() => void createRule()} disabled={creatingRule}>
                    {creatingRule ? "Adding..." : "Add"}
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
              <p className="text-sm font-medium text-foreground">No rules match</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another search term, or switch mouse button filter to All buttons.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRules.map((rule) => {
                const action = actionById[rule.actionType];
                const triggerLabel = formatGestureTriggerLabel(rule.gesture);
                const hotkeyText = action ? formatHotkey(action) : "—";
                return (
                  <GestureRuleCard
                    key={rule.id}
                    rule={rule}
                    action={action}
                    triggerLabel={triggerLabel}
                    hotkeyText={hotkeyText}
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

          {advancedView && (
            <section className="space-y-6 border-t border-border/60 pt-4">
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
                  <h2 className="text-lg font-semibold text-foreground">
                    屏幕布局
                    <span className="ml-2 text-sm font-normal text-muted-foreground">{screens.length} 块显示器</span>
                  </h2>
                  <ScreenMap screens={screens} activeIndex={activeScreenIndex} />
                </section>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
