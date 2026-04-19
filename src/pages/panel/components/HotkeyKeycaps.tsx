import type { ReactNode } from "react";
import type { ActionHotkeySnapshot } from "../../../types/app";
import { hotkeySnapshotToKeyLabels } from "../../../lib/macKeyboard";
import { cn } from "../../../lib/utils";

/** 单颗键帽外观，可与 {@link KeycapRow} 组合 */
export const keycapClass =
  "inline-flex min-h-[20px] min-w-[1.15rem] shrink-0 items-center justify-center rounded-[7px] border border-[hsl(var(--border)/0.88)] bg-[linear-gradient(180deg,rgba(248,249,252,0.98),rgba(238,241,247,0.98))] px-1.5 py-px text-[10px] font-medium leading-none text-[hsl(var(--foreground)/0.82)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_1px_rgba(15,23,42,0.06)] dark:border-border/55 dark:from-zinc-800/95 dark:to-zinc-950 dark:shadow-none";

const plusClass =
  "select-none px-0.5 text-[9px] font-medium leading-none text-muted-foreground/75";

export type KeycapProps = {
  children: ReactNode;
  className?: string;
};

export function Keycap({ children, className }: KeycapProps) {
  return <kbd className={cn(keycapClass, className)}>{children}</kbd>;
}

export type KeycapRowProps = {
  labels: string[];
  className?: string;
  /** 覆盖默认 `快捷键 a+b` 的 aria-label */
  ariaLabel?: string;
};

/** 多颗键帽，中间用 + 连接 */
export function KeycapRow({ labels, className, ariaLabel }: KeycapRowProps) {
  if (labels.length === 0) return null;
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-y-1", className)}
      aria-label={ariaLabel ?? `快捷键 ${labels.join("+")}`}
    >
      {labels.map((label, i) => (
        <span key={`${i}-${label}`} className="inline-flex items-center">
          {i > 0 && (
            <span className={plusClass} aria-hidden>
              +
            </span>
          )}
          <Keycap>{label}</Keycap>
        </span>
      ))}
    </span>
  );
}

export type HotkeyKeycapSequenceProps = {
  snapshot: ActionHotkeySnapshot;
  className?: string;
};

/** 由 {@link ActionHotkeySnapshot} 生成键帽序列 */
export function HotkeyKeycapSequence({ snapshot, className }: HotkeyKeycapSequenceProps) {
  const labels = hotkeySnapshotToKeyLabels(snapshot);
  return <KeycapRow labels={labels} className={className} />;
}
