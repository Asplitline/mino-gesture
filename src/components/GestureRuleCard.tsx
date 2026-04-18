import { parseGestureArrows } from "../gesture";
import type { ActionConfig, RuleConfig } from "../types/app";
import { Card, CardContent } from "./ui/card";

export type GestureRuleCardProps = {
  rule: RuleConfig;
  action: ActionConfig | undefined;
  triggerLabel: string;
  hotkeyText: string;
};

export function GestureRuleCard({ rule, action, triggerLabel, hotkeyText }: GestureRuleCardProps) {
  const title = action?.name ?? rule.name;
  const arrows = parseGestureArrows(rule.gesture).join("");
  const stateHint = rule.enabled ? "" : " (disabled)";
  const scopeLabel = rule.scope === "global" ? "System" : rule.scope;
  const modeLabel = action?.kind === "hotkey" ? "Automated" : action?.kind ?? "—";

  return (
    <Card
      className="group border border-border/90 bg-background/95 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.995] dark:border-border/80 dark:bg-background/90"
      role="article"
      aria-label={`${title}, ${triggerLabel}${stateHint}`}
    >
      <CardContent className="space-y-2.5 p-3.5">
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
      </CardContent>
    </Card>
  );
}
