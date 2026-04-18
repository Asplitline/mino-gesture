import { useEffect, useRef, useState } from "react";
// TrailPoint 仅用于类型声明（overlay 窗口负责绘制）
import { listen } from "@tauri-apps/api/event";

// ── 类型 ─────────────────────────────────────────────────────────────────────

type TrailPoint = { x: number; y: number };

type GestureResult = {
  matched: boolean;
  scope: string;
  gesture: string;
  ruleName?: string;
  actionType?: string;
  success: boolean;
  message: string;
  trigger?: string;
  trail?: TrailPoint[];
};

const DIRECTION_ARROW: Record<string, string> = {
  U: "↑", D: "↓", L: "←", R: "→",
  UL: "↖", UR: "↗", DL: "↙", DR: "↘",
};

function parseGestureArrows(gesture: string): string[] {
  const arrows: string[] = [];
  let i = 0;
  while (i < gesture.length) {
    const two = gesture.slice(i, i + 2);
    if (DIRECTION_ARROW[two]) { arrows.push(DIRECTION_ARROW[two]); i += 2; }
    else { arrows.push(DIRECTION_ARROW[gesture[i]] ?? gesture[i]); i += 1; }
  }
  return arrows;
}

// ── 主应用 ────────────────────────────────────────────────────────────────────

export function App() {
  const [isListening, setIsListening] = useState(false);
  const capturingRef = useRef(false);
  const [lastResult, setLastResult] = useState<GestureResult | null>(null);
  const [history, setHistory] = useState<GestureResult[]>([]);

  useEffect(() => {
    setIsListening(true);

    const unlistenStart = listen<TrailPoint>("trail-start", () => {
      capturingRef.current = true;
      setLastResult(null);
    });

    const unlistenResult = listen<GestureResult>("gesture-result", (e) => {
      const r = e.payload;
      capturingRef.current = false;
      setLastResult(r);
      if (r.gesture) setHistory((prev) => [r, ...prev].slice(0, 20));
    });

    return () => {
      setIsListening(false);
      unlistenStart.then((fn) => fn());
      unlistenResult.then((fn) => fn());
    };
  }, []);

  const gestureArrows = lastResult?.gesture ? parseGestureArrows(lastResult.gesture) : [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Mino Gesture</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">按住鼠标中键画手势</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{isListening ? "监听中" : "未连接"}</span>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-2xl mx-auto">

        {/* 识别结果 */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">识别结果</h2>

          {lastResult ? (
            <div className={`rounded-xl border p-4 space-y-3 ${
              lastResult.matched
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
            }`}>
              {gestureArrows.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {gestureArrows.map((arrow, i) => (
                    <span key={i} className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 select-none">
                      {arrow}
                    </span>
                  ))}
                  <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {lastResult.gesture}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  lastResult.matched
                    ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}>
                  {lastResult.matched ? "✓ 已匹配" : "× 未匹配"}
                </span>
                {lastResult.ruleName && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">{lastResult.ruleName}</span>
                )}
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">{lastResult.scope}</span>
              </div>
              {lastResult.message && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{lastResult.message}</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
              <p className="text-4xl mb-2 select-none">🖱️</p>
              <p className="text-sm text-gray-400 dark:text-gray-600">在任意位置按住中键并移动鼠标</p>
            </div>
          )}
        </section>

        {/* 手势历史 */}
        {history.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</h2>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                清空
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              {history.map((r, i) => {
                const arrows = parseGestureArrows(r.gesture);
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex gap-0.5">
                      {arrows.map((a, j) => (
                        <span key={j} className="text-base text-indigo-500 dark:text-indigo-400">{a}</span>
                      ))}
                    </div>
                    <span className="font-mono text-xs text-gray-400">{r.gesture}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                      r.matched
                        ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                    }`}>
                      {r.matched ? "匹配" : "未匹配"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 8 方向参考 */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">方向参考</h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
            <div className="grid grid-cols-3 gap-1 w-28 mx-auto text-center">
              {[
                ["UL", "↖"], ["U", "↑"], ["UR", "↗"],
                ["L", "←"],  ["",  "●"], ["R",  "→"],
                ["DL", "↙"], ["D", "↓"], ["DR", "↘"],
              ].map(([code, sym], i) => (
                <div
                  key={i}
                  className={`text-xs py-1.5 rounded select-none ${
                    code === ""
                      ? "text-gray-300 dark:text-gray-700"
                      : "font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }`}
                  title={code || undefined}
                >
                  {sym}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-600">
              右→下 = <span className="font-mono">RD</span>　右下斜 = <span className="font-mono">DR</span>
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}
