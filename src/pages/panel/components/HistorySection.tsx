import { parseGestureArrows } from "../../../gesture";
import type { GestureResult } from "../../../types/app";

export function HistorySection({
  history,
  onClear,
}: {
  history: GestureResult[];
  onClear: () => void;
}) {
  if (history.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="soft-section-title">历史记录</h2>
        <button onClick={onClear} className="text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]">
          清空
        </button>
      </div>
      <div className="soft-scroll-list">
        {history.map((r, i) => {
          const arrows = parseGestureArrows(r.gesture);
          return (
            <div key={i} className="soft-scroll-item">
              <div className="flex gap-0.5">
                {arrows.map((a, j) => (
                  <span key={j} className="text-base text-[var(--primary)]">
                    {a}
                  </span>
                ))}
              </div>
              <span className="font-mono text-xs text-[var(--text-tertiary)]">{r.gesture}</span>
              <span className={`soft-chip ml-auto ${r.matched ? "soft-chip-success" : "soft-chip-muted"}`}>
                {r.matched ? "匹配" : "未匹配"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
