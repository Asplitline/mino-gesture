import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { listen } from "@tauri-apps/api/event";

type TrailPoint = { x: number; y: number };

type ScreenInfo = {
  name: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  scaleFactor: number;
};

type TrailStart = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
  scaleFactor: number;
  screens: ScreenInfo[];
  activeScreenIndex: number;
};

type GestureResult = {
  gesture: string;
  matched: boolean;
  ruleName?: string;
  actionType?: string;
  trail?: TrailPoint[];
};
type OverlayHistoryItem = {
  gesture: string;
  arrows: string;
  matched: boolean;
  at: number;
};

const DIRECTION_ARROW: Record<string, string> = {
  U: "↑", D: "↓", L: "←", R: "→",
  UL: "↖", UR: "↗", DL: "↙", DR: "↘",
};

function parseArrows(gesture: string): string {
  let result = "";
  let i = 0;
  while (i < gesture.length) {
    const two = gesture.slice(i, i + 2);
    if (DIRECTION_ARROW[two]) { result += DIRECTION_ARROW[two]; i += 2; }
    else { result += DIRECTION_ARROW[gesture[i]] ?? gesture[i]; i += 1; }
  }
  return result;
}

function Overlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [label, setLabel] = useState<{ text: string; x: number; y: number; matched: boolean } | null>(null);
  const [labelFading, setLabelFading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [historyItems, setHistoryItems] = useState<OverlayHistoryItem[]>([]);
  // 当前屏幕信息，由 trail-start 事件同步写入（避免异步 outerPosition 偏差）
  const screenRef = useRef<Pick<TrailStart, "screenX" | "screenY" | "scaleFactor">>({
    screenX: 0,
    screenY: 0,
    scaleFactor: window.devicePixelRatio || 2,
  });
  const screensRef = useRef<ScreenInfo[]>([]);
  const activeScreenIndexRef = useRef<number>(0);
  const capturingRef = useRef(false);
  const trailRef = useRef<TrailPoint[]>([]);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 将 CGEvent 逻辑坐标转为 canvas CSS 像素坐标
  // macOS CGEvent 使用逻辑像素（points）与 CSS 像素同一空间
  // screenX/Y 是 Monitor::position() * scale_factor（物理像素），除以 scaleFactor 得逻辑原点
  const screenToCanvas = (p: TrailPoint) => {
    const { screenX, screenY, scaleFactor } = screenRef.current;
    return {
      x: p.x - screenX / scaleFactor,
      y: p.y - screenY / scaleFactor,
    };
  };

  // 在 canvas 右上角绘制所有屏幕的缩略图布局
  const drawScreenMap = (ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) => {
    const screens = screensRef.current;
    if (screens.length <= 1) return;

    // 计算所有屏幕的包围盒（物理像素）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of screens) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.w);
      maxY = Math.max(maxY, s.y + s.h);
    }
    const totalW = maxX - minX;
    const totalH = maxY - minY;

    // 缩略图区域：右上角，最大 180×120，留 16px 边距
    const mapMaxW = 180;
    const mapMaxH = 120;
    const scale = Math.min(mapMaxW / totalW, mapMaxH / totalH);
    const mapW = totalW * scale;
    const mapH = totalH * scale;
    const marginX = 16;
    const marginY = 16;
    const originX = canvasW - mapW - marginX;
    const originY = marginY;

    // 背景面板
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(originX - 8, originY - 8, mapW + 16, mapH + 16, 8);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();

    const activeIdx = activeScreenIndexRef.current;
    screens.forEach((s, i) => {
      const rx = originX + (s.x - minX) * scale;
      const ry = originY + (s.y - minY) * scale;
      const rw = s.w * scale;
      const rh = s.h * scale;
      const isActive = i === activeIdx;

      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 3);
      ctx.fillStyle = isActive ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.strokeStyle = isActive ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = isActive ? 1.5 : 1;
      ctx.stroke();

      // 屏幕编号
      ctx.fillStyle = isActive ? "rgba(99,102,241,1)" : "rgba(255,255,255,0.45)";
      ctx.font = `bold ${Math.max(9, rh * 0.28)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), rx + rw / 2, ry + rh / 2);
    });

    ctx.restore();
  };

  const drawTrail = (pts: TrailPoint[], active: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const mapped = pts.map(screenToCanvas);
    if (mapped.length < 1) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (mapped.length >= 2) {
      for (let i = 1; i < mapped.length; i++) {
        const t = i / mapped.length;
        ctx.beginPath();
        ctx.strokeStyle = active
          ? `rgba(99,102,241,${0.25 + t * 0.75})`
          : `rgba(99,102,241,${0.15 + t * 0.5})`;
        ctx.lineWidth = 2 + t * 3;
        ctx.moveTo(mapped[i - 1].x, mapped[i - 1].y);
        ctx.lineTo(mapped[i].x, mapped[i].y);
        ctx.stroke();
      }
    }

    // 起点
    const s = mapped[0];
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(99,102,241,0.5)";
    ctx.fill();

    // 末端
    const e = mapped[mapped.length - 1];
    ctx.beginPath();
    ctx.arc(e.x, e.y, active ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = active ? "rgba(236,72,153,0.9)" : "rgba(99,102,241,0.7)";
    ctx.fill();

    // 多屏时右上角显示屏幕布局缩略图
    drawScreenMap(ctx, w, h);
  };

  useEffect(() => {
    const unlistenStart = listen<TrailStart>("trail-start", (e) => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      const { x, y, screenX, screenY, screenW, screenH, scaleFactor, screens, activeScreenIndex } = e.payload;
      console.log(
        `[trail-start] cursor=(${x}, ${y}) screen=(${screenX}, ${screenY}, ${screenW}×${screenH}) scale=${scaleFactor} screens=${screens.length} active=${activeScreenIndex}`,
      );
      // 同步更新屏幕信息，确保 screenToCanvas 使用最新值
      screenRef.current = { screenX, screenY, scaleFactor };
      screensRef.current = screens;
      activeScreenIndexRef.current = activeScreenIndex;
      capturingRef.current = true;
      setCapturing(true);
      trailRef.current = [{ x, y }];
      setLabel(null);
      setLabelFading(false);
      drawTrail(trailRef.current, true);
    });

    const unlistenPoint = listen<TrailPoint>("trail-point", (e) => {
      if (!capturingRef.current) return;
      trailRef.current = [...trailRef.current, e.payload].slice(-300);
      drawTrail(trailRef.current, true);
    });

    const unlistenResult = listen<GestureResult>("gesture-result", (e) => {
      const r = e.payload;
      capturingRef.current = false;
      setCapturing(false);
      const pts = r.trail && r.trail.length > 0 ? r.trail : trailRef.current;
      trailRef.current = pts;
      drawTrail(pts, false);
      const arrowsText = parseArrows(r.gesture);
      setHistoryItems((prev) =>
        [{ gesture: r.gesture, arrows: arrowsText, matched: r.matched, at: Date.now() }, ...prev].slice(0, 3),
      );

      if (r.gesture && pts.length > 0) {
        const last = pts[pts.length - 1];
        const pos = screenToCanvas(last);
        setLabel({
          text: arrowsText,
          x: pos.x,
          y: pos.y,
          matched: r.matched,
        });
      }

      // 400ms 后开始淡出，600ms 后彻底清除
      labelTimerRef.current = setTimeout(() => setLabelFading(true), 400);
      labelTimerRef.current = setTimeout(() => {
        setLabel(null);
        setLabelFading(false);
        trailRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 600);
    });

    return () => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      unlistenStart.then((fn) => fn());
      unlistenPoint.then((fn) => fn());
      unlistenResult.then((fn) => fn());
    };
  }, []);

  const vignetteTransition = "opacity 0.15s ease";
  const formatRelativeTime = (ts: number) => {
    const delta = Math.max(0, Date.now() - ts);
    if (delta < 45_000) return "Just now";
    const mins = Math.floor(delta / 60_000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      {/* 四周渐变蒙层 —— 捕获中淡入，松开后淡出 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,${capturing ? 0.13 : 0}) 100%)`,
          transition: vignetteTransition,
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            left: label.x + 12,
            top: label.y - 24,
            pointerEvents: "none",
            background: label.matched
              ? "rgba(34,197,94,0.55)"
              : "rgba(99,102,241,0.55)",
            color: "rgba(255,255,255,0.92)",
            borderRadius: 7,
            padding: "2px 8px",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: 2,
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            whiteSpace: "nowrap",
            opacity: labelFading ? 0 : 1,
            transition: "opacity 200ms ease",
          }}
        >
          {label.text}
        </div>
      )}
      {historyItems.length > 0 && (
        <div
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            minWidth: 260,
            maxWidth: 320,
            pointerEvents: "none",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.28)",
            background: "linear-gradient(180deg, rgba(25,29,46,0.72) 0%, rgba(20,23,36,0.58) 100%)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.24)",
            backdropFilter: "blur(10px)",
            color: "rgba(240,244,255,0.95)",
            padding: "10px 10px 8px",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, opacity: 0.88, marginBottom: 6 }}>History</div>
          {historyItems.map((item, idx) => (
            <div
              key={`${item.gesture}-${item.at}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "6px 8px",
                borderRadius: 10,
                background: idx === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                marginBottom: idx === historyItems.length - 1 ? 0 : 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 14, letterSpacing: 1 }}>{item.arrows}</span>
                <span style={{ fontSize: 12, opacity: 0.85 }}>{item.gesture}</span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, whiteSpace: "nowrap" }}>{formatRelativeTime(item.at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Overlay />);
