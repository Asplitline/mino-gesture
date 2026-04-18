import type { SVGProps } from "react";
import { parseGestureArrows } from "../gesture";
import type { ActionConfig, RuleConfig } from "../types/app";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";

function IconPencil(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export type GestureRuleCardProps = {
  rule: RuleConfig;
  action: ActionConfig | undefined;
  triggerLabel: string;
  hotkeyText: string;
  busy: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function GestureRuleCard({
  rule,
  action,
  triggerLabel,
  hotkeyText,
  busy,
  onToggleEnabled,
  onEdit,
  onDelete,
}: GestureRuleCardProps) {
  const title = action?.name ?? rule.name;
  const arrows = parseGestureArrows(rule.gesture).join("");
  const stateHint = rule.enabled ? "" : " (disabled)";
  const scopeLabel = rule.scope === "global" ? "System" : rule.scope;
  const modeLabel = action?.kind === "hotkey" ? "Automated" : (action?.kind ?? "—");

  return (
    <Card
      className="group border border-border/90 bg-background/95 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.995] dark:border-border/80 dark:bg-background/90"
      role="article"
      aria-label={`${title}, ${triggerLabel}${stateHint}`}
    >
      <CardContent className="space-y-2.5 px-3.5 pb-3.5 pt-5">
        <div className="flex gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/90 bg-secondary/60 text-lg leading-none text-foreground shadow-sm dark:bg-secondary/40"
            aria-hidden
          >
            {arrows || "·"}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground">{title}</h3>
            <p className="text-xs font-medium text-muted-foreground">{triggerLabel}</p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="text-muted-foreground/85">Sends </span>
          <span className="font-mono text-[13px] text-foreground/90">{hotkeyText}</span>
        </p>

        <div className="border-t border-border/70 pt-2.5 text-xs text-muted-foreground dark:border-border/60">
          <span className="font-medium text-foreground/90">{scopeLabel}</span>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="font-medium text-foreground/90">{modeLabel}</span>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3 dark:border-border/60">
          <div className="flex min-w-0 items-center gap-2">
            <Switch
              checked={rule.enabled}
              onCheckedChange={onToggleEnabled}
              disabled={busy}
              aria-label="启用手势规则"
            />
            <span className="text-xs text-muted-foreground">启用</span>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              disabled={busy}
              aria-label="编辑"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <IconPencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              aria-label="删除"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
