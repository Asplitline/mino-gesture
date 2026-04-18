import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

type TrailPoint = { x: number; y: number };

type GestureResult = {
  gesture: string;
  matched: boolean;
  trail?: TrailPoint[];
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
  // 当前窗口在屏幕上的物理像素偏移
  const winOffsetRef = useRef({ x: 0, y: 0 });
  const capturingRef = useRef(false);
  const trailRef = useRef<TrailPoint[]>([]);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 获取窗口偏移
  useEffect(() => {
    const update = async () => {
      const pos = await getCurrentWindow().outerPosition();
      winOffsetRef.current = { x: pos.x, y: pos.y };
    };
    update();
    const unlisten = getCurrentWindow().onMoved(() => update());
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // 将屏幕物理像素坐标转为 canvas 逻辑像素
  const screenToCanvas = (p: TrailPoint) => {
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (p.x - winOffsetRef.current.x) / dpr,
      y: (p.y - winOffsetRef.current.y) / dpr,
    };
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
  };

  useEffect(() => {
    const unlistenStart = listen<TrailPoint>("trail-start", (e) => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      capturingRef.current = true;
      trailRef.current = [e.payload];
      setLabel(null);
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
      const pts = r.trail && r.trail.length > 0 ? r.trail : trailRef.current;
      trailRef.current = pts;
      drawTrail(pts, false);

      if (r.gesture && pts.length > 0) {
        const last = pts[pts.length - 1];
        const pos = screenToCanvas(last);
        setLabel({
          text: parseArrows(r.gesture),
          x: pos.x,
          y: pos.y,
          matched: r.matched,
        });
      }

      // 1.2s 后清除
      labelTimerRef.current = setTimeout(() => {
        setLabel(null);
        trailRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 1200);
    });

    return () => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      unlistenStart.then((fn) => fn());
      unlistenPoint.then((fn) => fn());
      unlistenResult.then((fn) => fn());
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            left: label.x + 14,
            top: label.y - 28,
            pointerEvents: "none",
            background: label.matched
              ? "rgba(34,197,94,0.9)"
              : "rgba(99,102,241,0.9)",
            color: "#fff",
            borderRadius: 8,
            padding: "3px 10px",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          {label.text}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Overlay />);
