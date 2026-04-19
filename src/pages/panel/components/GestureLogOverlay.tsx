import {
  formatGestureTriggerLabelZh,
  parseGestureArrows,
} from "../../../gesture";
import { cn } from "../../../lib/utils";
import type { TimedGestureResult } from "../../../types/app";
import { IconClear, IconScrollText } from "../../../components/icons";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";

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
  const failedCount = entries.filter(
    (entry) => entry.matched && !entry.success,
  ).length;
  const latestEntry = entries[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex min-h-0 h-auto max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-l-[24px] bg-card p-0 sm:top-3 sm:bottom-3 sm:max-w-[540px]"
      >
        <SheetHeader className="border-b border-border/70">
          <div className="flex min-w-0 items-center gap-2">
            <SheetTitle id="gesture-log-title">识别日志</SheetTitle>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {entries.length}
            </span>
          </div>
          <SheetDescription>
            查看最近的手势识别结果、命中状态和执行反馈。
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {/* <div className="app-panel-subtle mb-4 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5">
            <SummaryCard label="已匹配" value={matchedCount} tone="success" />
            <SummaryCard label="执行失败" value={failedCount} tone={failedCount > 0 ? "danger" : "neutral"} />
            <SummaryCard
              label="最近更新"
              value={latestEntry ? formatLogTime(latestEntry.at).slice(-8) : "暂无"}
              tone="neutral"
            />
          </div> */}

          {entries.length === 0 ? (
            <div className="app-panel-subtle flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border-dashed px-6 text-center">
              <IconScrollText className="h-10 w-10 text-muted-foreground/65" />
              <p className="mt-4 text-sm font-medium text-foreground">
                暂无识别记录
              </p>
              <p className="mt-1 max-w-[26ch] text-sm leading-relaxed text-muted-foreground">
                按住中键或右键并移动鼠标，新的识别记录会按时间倒序显示在这里。
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5" role="list">
              {entries.map((entry, index) => (
                <LogRow key={`${entry.at}-${index}`} entry={entry} />
              ))}
            </ul>
          )}
        </SheetBody>

        <SheetFooter className="border-t border-border/70">
          <div className="flex w-full items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              仅保留最近 500 条识别记录。
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={onClear}
                disabled={entries.length === 0}
              >
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
    <Card
      className={cn(
        "inline-flex min-w-[104px] items-center gap-2 rounded-lg px-2.5 py-2 shadow-none",
        tone === "success" && "border-emerald-200/80 bg-emerald-500/8",
        tone === "danger" && "border-rose-200/80 bg-rose-500/8",
        tone === "neutral" && "border-border/60 bg-background/70",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="ml-auto text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </Card>
  );
}

function LogRow({ entry }: { entry: TimedGestureResult }) {
  const arrows = parseGestureArrows(entry.gesture).join("");
  const gestureLabel = formatGestureTriggerLabelZh(entry.gesture);
  const triggerLabel = formatTriggerLabel(entry.trigger);

  return (
    <li>
      <Card className="app-panel-surface rounded-2xl bg-background/72 shadow-[0_1px_0_rgba(255,255,255,0.72),0_6px_18px_rgba(36,48,83,0.03)]">
        <CardContent className="px-4 py-3 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-1 text-sm font-semibold tracking-[0.04em] text-foreground">
                  {arrows || entry.gesture}
                </span>
                <p className="text-sm font-medium text-foreground">
                  {entry.ruleName || gestureLabel}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <time
                  className="tabular-nums"
                  dateTime={new Date(entry.at).toISOString()}
                >
                  {formatLogTime(entry.at)}
                </time>
                <span>动作 {entry.gesture}</span>
                <span>范围 {formatScopeLabel(entry.scope)}</span>
                {triggerLabel ? <span>按键 {triggerLabel}</span> : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={entry.matched ? "success" : "muted"}>
                {entry.matched ? "规则已命中" : "未命中规则"}
              </Badge>
              {entry.matched ? (
                <Badge variant={entry.success ? "info" : "dangerSoft"}>
                  {entry.success ? "执行成功" : "执行失败"}
                </Badge>
              ) : null}
            </div>
          </div>

          {entry.message ? (
            <p className="mt-2.5 rounded-xl border border-border/55 bg-muted/18 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {entry.message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}
