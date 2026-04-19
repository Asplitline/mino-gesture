import { formatGestureTriggerLabelZh, parseGestureArrows } from "../../../gesture";
import { cn } from "../../../lib/utils";
import type { TimedGestureResult } from "../../../types/app";
import { IconClear, IconScrollText } from "../../../components/icons";
import { Button } from "../../../components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../../../components/ui/sheet";

function formatLogTime(at: number) {
  try {
    return new Date(at).toLocaleString(undefined, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatScopeLabel(scope: string) {
  if (scope === "global") return "全局";
  return scope || "未标注";
}

function formatTriggerLabel(trigger?: string) {
  if (trigger === "middle") return "中键";
  if (trigger === "right") return "右键";
  return trigger ?? null;
}

export function GestureLogOverlay({
  open,
  onOpenChange,
  onClear,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
  entries: TimedGestureResult[];
}) {
  const matchedCount = entries.filter((entry) => entry.matched).length;
  const failedCount = entries.filter((entry) => entry.matched && !entry.success).length;
  const latestEntry = entries[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex min-h-0 h-auto max-h-[calc(100vh-1.5rem)] flex-col rounded-l-[24px] p-0 sm:top-3 sm:bottom-3 sm:max-w-[540px]"
      >
        <SheetHeader className="shrink-0 border-b border-border/70 px-5 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <IconScrollText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <SheetTitle id="gesture-log-title">识别日志</SheetTitle>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{entries.length}</span>
          </div>
          <SheetDescription>查看最近的手势识别结果、命中状态和执行反馈。</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <SummaryCard label="已匹配" value={matchedCount} tone="success" />
            <SummaryCard label="执行失败" value={failedCount} tone={failedCount > 0 ? "danger" : "neutral"} />
            <SummaryCard
              label="最近更新"
              value={latestEntry ? formatLogTime(latestEntry.at).slice(-8) : "暂无"}
              tone="neutral"
            />
          </div>

          {entries.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 text-center">
              <IconScrollText className="h-10 w-10 text-muted-foreground/65" />
              <p className="mt-4 text-sm font-medium text-foreground">暂无识别记录</p>
              <p className="mt-1 max-w-[26ch] text-sm leading-relaxed text-muted-foreground">
                按住中键或右键并移动鼠标，新的识别记录会按时间倒序显示在这里。
              </p>
            </div>
          ) : (
            <ul className="space-y-3" role="list">
              {entries.map((entry, index) => (
                <LogRow key={`${entry.at}-${index}`} entry={entry} />
              ))}
            </ul>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-border/70 px-5 py-3">
          <div className="flex w-full items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">仅保留最近 500 条识别记录。</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onClear} disabled={entries.length === 0}>
                <IconClear className="h-4 w-4" />
                清空日志
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "neutral" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        tone === "success" && "border-emerald-200/80 bg-emerald-500/8",
        tone === "danger" && "border-rose-200/80 bg-rose-500/8",
        tone === "neutral" && "border-border/75 bg-muted/35",
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function LogRow({ entry }: { entry: TimedGestureResult }) {
  const arrows = parseGestureArrows(entry.gesture).join("");
  const gestureLabel = formatGestureTriggerLabelZh(entry.gesture);
  const triggerLabel = formatTriggerLabel(entry.trigger);

  return (
    <li className="rounded-2xl border border-border/75 bg-background/85 p-4 shadow-[0_10px_24px_rgba(36,48,83,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-sm font-semibold tracking-[0.08em] text-foreground">
              {arrows || entry.gesture}
            </span>
            <p className="text-sm font-medium text-foreground">{entry.ruleName || gestureLabel}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <time className="tabular-nums" dateTime={new Date(entry.at).toISOString()}>
              {formatLogTime(entry.at)}
            </time>
            <span>动作 {entry.gesture}</span>
            <span>范围 {formatScopeLabel(entry.scope)}</span>
            {triggerLabel ? <span>按键 {triggerLabel}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[11px] font-medium",
              entry.matched ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-muted text-muted-foreground",
            )}
          >
            {entry.matched ? "规则已命中" : "未命中规则"}
          </span>
          {entry.matched ? (
            <span
              className={cn(
                "rounded-full px-2 py-1 text-[11px] font-medium",
                entry.success ? "bg-sky-500/15 text-sky-800 dark:text-sky-300" : "bg-destructive/12 text-destructive",
              )}
            >
              {entry.success ? "执行成功" : "执行失败"}
            </span>
          ) : null}
        </div>
      </div>

      {entry.message ? (
        <p className="mt-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {entry.message}
        </p>
      ) : null}
    </li>
  );
}
