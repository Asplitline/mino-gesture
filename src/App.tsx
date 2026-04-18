import { useEffect, useRef, useState } from "react";
// TrailPoint 仅用于类型声明（overlay 窗口负责绘制）
import { listen } from "@tauri-apps/api/event";

// ── 类型 ─────────────────────────────────────────────────────────────────────

type TrailPoint = { x: number; y: number };

type ScreenInfo = {
  name: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  scaleFactor: number;
};

type TrailStartPayload = {
  screens: ScreenInfo[];
  activeScreenIndex: number;
};

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

// ── 屏幕布局组件 ──────────────────────────────────────────────────────────────

function ScreenMap({ screens, activeIndex }: { screens: ScreenInfo[]; activeIndex: number }) {
  if (screens.length === 0) return null;

  // 计算所有屏幕的包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of screens) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.w);
    maxY = Math.max(maxY, s.y + s.h);
  }
  const totalW = maxX - minX;
  const totalH = maxY - minY;

  // SVG 视口：最大宽度 320，保持宽高比
  const svgW = 320;
  const svgH = Math.round((totalH / totalW) * svgW);
  const scale = svgW / totalW;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="block mx-auto"
        style={{ maxWidth: "100%" }}
      >
        {screens.map((s, i) => {
          const x = (s.x - minX) * scale;
          const y = (s.y - minY) * scale;
          const w = s.w * scale;
          const h = s.h * scale;
          const isActive = i === activeIndex;
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={w} height={h}
                rx={4} ry={4}
                fill={isActive ? "rgba(99,102,241,0.15)" : "rgba(156,163,175,0.12)"}
                stroke={isActive ? "rgb(99,102,241)" : "rgb(209,213,219)"}
                strokeWidth={isActive ? 2 : 1}
                className="dark:[stroke:rgb(79,82,221)] dark:[fill:rgba(99,102,241,0.2)]"
              />
              {/* 屏幕编号 */}
              <text
                x={x + w / 2}
                y={y + h / 2 - (s.name ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(11, Math.min(18, h * 0.3))}
                fontWeight="700"
                fill={isActive ? "rgb(79,70,229)" : "rgb(156,163,175)"}
              >
                {i + 1}
              </text>
              {/* 屏幕名称 */}
              {s.name && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + Math.max(9, Math.min(14, h * 0.22))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(8, Math.min(11, h * 0.18))}
                  fill={isActive ? "rgb(99,102,241)" : "rgb(156,163,175)"}
                >
                  {s.name.length > 14 ? s.name.slice(0, 13) + "…" : s.name}
                </text>
              )}
              {/* 活跃屏幕角标 */}
              {isActive && (
                <circle cx={x + 8} cy={y + 8} r={4} fill="rgb(99,102,241)" />
              )}
            </g>
          );
        })}
      </svg>
      {/* 图例 */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-600">
        {screens.map((s, i) => (
          <span key={i} className={i === activeIndex ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""}>
            屏幕 {i + 1}
            {s.name ? ` · ${s.name.length > 10 ? s.name.slice(0, 9) + "…" : s.name}` : ""}
            {i === activeIndex ? " ●" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 主应用 ────────────────────────────────────────────────────────────────────

export function App() {
  const [isListening, setIsListening] = useState(false);
  const capturingRef = useRef(false);
  const [lastResult, setLastResult] = useState<GestureResult | null>(null);
  const [history, setHistory] = useState<GestureResult[]>([]);
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [activeScreenIndex, setActiveScreenIndex] = useState<number>(0);

  useEffect(() => {
    setIsListening(true);

    const unlistenStart = listen<TrailStartPayload>("trail-start", (e) => {
      capturingRef.current = true;
      setLastResult(null);
      if (e.payload.screens?.length) {
        setScreens(e.payload.screens);
        setActiveScreenIndex(e.payload.activeScreenIndex);
      }
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

        {/* 屏幕布局 */}
        {screens.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              屏幕布局
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-600">
                {screens.length} 块显示器
              </span>
            </h2>
            <ScreenMap screens={screens} activeIndex={activeScreenIndex} />
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
