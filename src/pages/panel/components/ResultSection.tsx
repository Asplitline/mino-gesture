import { parseGestureArrows } from "../../../gesture";
import type { GestureResult } from "../../../types/app";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";

export function ResultSection({ lastResult }: { lastResult: GestureResult | null }) {
  const gestureArrows = lastResult?.gesture ? parseGestureArrows(lastResult.gesture) : [];

  return (
    <Card className="app-panel-surface rounded-[18px]">
      <CardHeader className="border-b border-border/70 px-4 py-3">
        <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">最近识别</p>
        <p className="text-xs text-muted-foreground">确认刚才的手势是否匹配到规则。</p>
      </CardHeader>
      {lastResult ? (
        <CardContent className="space-y-3 px-4 py-3.5 pt-3.5">
          {gestureArrows.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {gestureArrows.map((arrow, i) => (
                <span key={i} className="select-none text-xl font-semibold text-primary">
                  {arrow}
                </span>
              ))}
              <span className="ml-1 rounded-md border border-border/80 bg-muted/35 px-2 py-0.5 font-mono text-xs text-foreground/75">
                {lastResult.gesture}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={lastResult.matched ? "success" : "muted"}>
              {lastResult.matched ? "已匹配规则" : "未匹配规则"}
            </Badge>
            {lastResult.ruleName && <span className="text-xs text-foreground/75">{lastResult.ruleName}</span>}
            <span className="ml-auto text-xs text-muted-foreground">{lastResult.scope}</span>
          </div>
          {lastResult.message && <p className="text-xs leading-relaxed text-muted-foreground">{lastResult.message}</p>}
        </CardContent>
      ) : (
        <CardContent className="px-4 py-5">
          <p className="text-sm text-muted-foreground">创建规则后，在任意位置按住中键或右键并移动鼠标即可测试。</p>
        </CardContent>
      )}
    </Card>
  );
}
