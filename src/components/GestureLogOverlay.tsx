import type { SVGProps } from "react";
import type { TimedGestureResult } from "../types/app";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

function IconScrollText(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

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

export function GestureLogOverlay({
  open,
  onOpenChange,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: TimedGestureResult[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(72vh,560px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b border-border/60 px-4 pb-3 pt-4 dark:border-border/50">
          <div className="flex min-w-0 items-center gap-2">
            <IconScrollText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <DialogTitle id="gesture-log-title" className="text-base font-semibold">
              识别日志
            </DialogTitle>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {entries.length}
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-0 pt-1">
          {entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无记录，触发手势后会出现在这里。</p>
          ) : (
            <ul className="divide-y divide-border/60 dark:divide-border/50" role="list">
              {entries.map((entry, index) => (
                <LogRow key={`${entry.at}-${index}`} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogRow({ entry }: { entry: TimedGestureResult }) {
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 gap-y-1">
        <time className="shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={new Date(entry.at).toISOString()}>
          {formatLogTime(entry.at)}
        </time>
        <span
          className={cn(
            "rounded-md px-1.5 py-px text-[11px] font-medium",
            entry.matched ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-muted text-muted-foreground",
          )}
        >
          {entry.matched ? "已匹配" : "未匹配"}
        </span>
        {entry.matched ? (
          entry.success ? (
            <span className="text-[11px] text-muted-foreground">执行成功</span>
          ) : (
            <span className="text-[11px] text-destructive/90">执行失败</span>
          )
        ) : null}
      </div>
      <p className="mt-1.5 font-mono text-xs text-foreground">
        {entry.gesture}
        {entry.ruleName ? <span className="ml-2 font-sans text-muted-foreground">· {entry.ruleName}</span> : null}
      </p>
      {entry.message ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.message}</p> : null}
      <p className="mt-1 text-[11px] text-muted-foreground/80">{entry.scope}</p>
    </li>
  );
}

export { IconScrollText };
