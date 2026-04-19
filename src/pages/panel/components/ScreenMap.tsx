import type { ScreenInfo } from "../../../types/app";

export function ScreenMap({ screens, activeIndex }: { screens: ScreenInfo[]; activeIndex: number }) {
  if (screens.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of screens) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.w);
    maxY = Math.max(maxY, s.y + s.h);
  }

  const totalW = maxX - minX;
  const totalH = maxY - minY;
  const svgW = 320;
  const svgH = Math.round((totalH / totalW) * svgW);
  const scale = svgW / totalW;

  return (
    <section className="app-panel-surface rounded-[18px]">
      <div className="border-b border-border/70 px-4 py-3">
        <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">屏幕布局</p>
        <p className="text-xs text-muted-foreground">当前识别手势时使用的显示器排列。</p>
      </div>
      <div className="px-4 py-4">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto block" style={{ maxWidth: "100%" }}>
        {screens.map((s, i) => {
          const x = (s.x - minX) * scale;
          const y = (s.y - minY) * scale;
          const w = s.w * scale;
          const h = s.h * scale;
          const isActive = i === activeIndex;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                ry={4}
                fill={isActive ? "rgba(111,99,246,0.12)" : "rgba(226,231,240,0.58)"}
                stroke={isActive ? "rgba(111,99,246,0.88)" : "rgba(120,130,160,0.32)"}
                strokeWidth={isActive ? 2 : 1}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 - (s.name ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(11, Math.min(18, h * 0.3))}
                fontWeight="700"
                fill={isActive ? "rgb(42,49,71)" : "rgb(113,123,145)"}
              >
                {i + 1}
              </text>
              {s.name && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + Math.max(9, Math.min(14, h * 0.22))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(8, Math.min(11, h * 0.18))}
                  fill={isActive ? "rgb(105,113,137)" : "rgb(138,146,165)"}
                >
                  {s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
    </section>
  );
}
