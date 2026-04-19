import { parseGestureArrows } from "../../../gesture";
import type { GestureResult } from "../../../types/app";

export function ResultSection({ lastResult }: { lastResult: GestureResult | null }) {
  const gestureArrows = lastResult?.gesture ? parseGestureArrows(lastResult.gesture) : [];

  return (
    <section className="space-y-3">
      <h2 className="soft-section-title">识别结果</h2>
      {lastResult ? (
        <div
          className={`soft-card space-y-3 ${
            lastResult.matched
              ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(236,255,249,0.8))]"
              : "bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,247,255,0.76))]"
          }`}
        >
          {gestureArrows.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {gestureArrows.map((arrow, i) => (
                <span key={i} className="select-none text-2xl font-bold text-[var(--primary)]">
                  {arrow}
                </span>
              ))}
              <span className="ml-2 rounded-[10px] border border-[var(--border)] bg-white/70 px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
                {lastResult.gesture}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={`soft-chip ${lastResult.matched ? "soft-chip-success" : "soft-chip-muted"}`}>
              {lastResult.matched ? "✓ 已匹配" : "× 未匹配"}
            </span>
            {lastResult.ruleName && <span className="text-xs text-[var(--text-secondary)]">{lastResult.ruleName}</span>}
            <span className="ml-auto text-xs text-[var(--text-tertiary)]">{lastResult.scope}</span>
          </div>
          {lastResult.message && <p className="text-xs text-[var(--text-secondary)]">{lastResult.message}</p>}
        </div>
      ) : (
        <div className="soft-empty">
          <p className="text-sm text-[var(--text-tertiary)]">在任意位置按住中/右键并移动鼠标</p>
        </div>
      )}
    </section>
  );
}
