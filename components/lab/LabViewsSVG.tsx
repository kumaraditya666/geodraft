"use client";
import { useMemo, useRef, useState } from "react";
import type { MouseEvent as RMouseEvent, ReactNode } from "react";
import type { BuiltSolid, ProjPoint2D, ProjectionMethod, ViewKind } from "@/types";
import { buildProjection } from "@/lib/projection/projectionEngine";
import { layoutViews, methodInfo } from "@/lib/projection/viewLayout";
import { computeTraces } from "@/lib/projection/tracesEngine";
import { axisCenterLine, centerCrosses, CENTER_DASH } from "@/lib/projection/centerLineEngine";
import { measuredAngles, arcPoints } from "@/lib/projection/angleEngine";
import { useStore } from "@/store/useStore";
import type { Scale } from "@/store/useStore";

const SCALE_MAP: Record<Scale, number> = { "1:1": 1, "1:2": 0.5, "1:5": 0.2, "1:10": 0.1, "2:1": 2 };

interface Palette {
  bg: string;
  grid: string;
  visible: string;
  hidden: string;
  center: string;
  projV: string;
  projH: string;
  xy: string;
  text: string;
  label: string;
  active: string;
  dim: string;
}

const DARK: Palette = {
  bg: "#0a0f1c",
  grid: "rgba(148,163,184,0.09)",
  visible: "#eef3fa",
  hidden: "#5b6b82",
  center: "#22d3ee",
  projV: "#22d3ee",
  projH: "#f472b6",
  xy: "#f43f5e",
  text: "#94a3b8",
  label: "#a5f3fc",
  active: "#fbbf24",
  dim: "#fde68a",
};

const SHEET: Palette = {
  bg: "#ffffff",
  grid: "rgba(15,23,42,0.08)",
  visible: "#111827",
  hidden: "#6b7280",
  center: "#1d4ed8",
  projV: "#0e7490",
  projH: "#be185d",
  xy: "#dc2626",
  text: "#374151",
  label: "#1d4ed8",
  active: "#d97706",
  dim: "#b45309",
};

/**
 * Workstation canvas: first/third-angle layout, layer toggles, angle
 * annotations measured from the 3D axis, zoom/pan/measure tools.
 * reveal: 0=XY, 1=+top, 2=+projectors, 3=+front, 4=+side, 5=+dims
 */
export default function LabViewsSVG({
  solid,
  reveal,
  activePointId,
  animateProjectors,
  sweeping,
  sheet,
  focus,
}: {
  solid: BuiltSolid;
  reveal: number;
  activePointId: string | null;
  animateProjectors: boolean;
  sweeping: boolean;
  sheet?: boolean;
  focus?: "all" | ViewKind;
}) {
  const showLabels = useStore((s) => s.showLabels);
  const showHidden = useStore((s) => s.showHiddenLines);
  const showCenter = useStore((s) => s.showCenterLines);
  const showDims = useStore((s) => s.showDims);
  const showProj = useStore((s) => s.showProjectors);
  const showTraces = useStore((s) => s.showTraces);
  const showAngles = useStore((s) => s.showAngles);
  const method = useStore((s) => s.projectionMethod);
  const scale = useStore((s) => s.scale);
  const unit = useStore((s) => s.unit);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const set = useStore((s) => s.set);

  const P = sheet ? SHEET : DARK;
  const W = 920;
  const H = 600;

  const front = useMemo(() => buildProjection(solid, "front"), [solid]);
  const top = useMemo(() => buildProjection(solid, "top"), [solid]);
  const side = useMemo(() => buildProjection(solid, "side"), [solid]);
  const L = useMemo(
    () => layoutViews(front, top, side, method as ProjectionMethod, W, H, { focus: focus ?? "all" }),
    [front, top, side, method, focus]
  );
  const k = SCALE_MAP[scale] ?? 1;
  // display scale only affects drawing size around layout center
  const cx = W / 2;
  const cy = H / 2;
  const X = (u: number, o: number) => cx + (o + u * L.s * k - cx);
  const FX = (x: number) => X(x, L.fx);
  const FY = (y: number) => X(y, L.fy);
  const TX = (x: number) => X(x, L.tx);
  const TY = (y: number) => X(y, L.ty);
  const SX = (x: number) => X(x, L.sx);
  const SY = (y: number) => X(y, L.sy);

  // ---- zoom / pan / measure ----
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: H });
  const [measure, setMeasure] = useState(false);
  const [picks, setPicks] = useState<{ vb: { x: number; y: number }; src: ProjPoint2D["source"]; view: string }[]>([]);
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);

  const toVB = (clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: vb.x + ((clientX - r.left) / r.width) * vb.w, y: vb.y + ((clientY - r.top) / r.height) * vb.h };
  };

  const nearestVertex = (p: { x: number; y: number }) => {
    // search in screen px so the threshold is stable under zoom
    const el = svgRef.current;
    const rect = el?.getBoundingClientRect();
    const pxPerUnit = (rect?.width ?? W) / vb.w;
    let best: { d: number; src: ProjPoint2D["source"]; view: string; sx: number; sy: number } | null = null;
    const groups: { pts: ProjPoint2D[]; Xf: (x: number) => number; Yf: (y: number) => number; v: string }[] = [
      { pts: front.points, Xf: FX, Yf: FY, v: "front" },
      { pts: top.points, Xf: TX, Yf: TY, v: "top" },
      { pts: side.points, Xf: SX, Yf: SY, v: "side" },
    ];
    for (const g of groups) {
      for (const q of g.pts) {
        const sx = g.Xf(q.x);
        const sy = g.Yf(q.y);
        const d = Math.hypot(sx - p.x, sy - p.y) * pxPerUnit;
        if (d < 22 && (!best || d < best.d)) best = { d, src: q.source, view: g.v, sx, sy };
      }
    }
    return best;
  };

  const onClick = (e: RMouseEvent) => {
    if (!measure) return;
    const p = toVB(e.clientX, e.clientY);
    const hit = nearestVertex(p);
    if (!hit) return;
    setPicks((prev) => [...prev.slice(-1), { vb: { x: hit.sx, y: hit.sy }, src: hit.src, view: hit.view }]);
  };

  const measDist = picks.length === 2 ? Math.hypot(picks[1].src.x - picks[0].src.x, picks[1].src.y - picks[0].src.y, picks[1].src.z - picks[0].src.z) : null;

  const zoomBy = (f: number, cxp?: number, cyp?: number) => {
    setVb((v) => {
      const nk = Math.min(8, Math.max(0.4, (W / v.w) * f)) ;
      const nw = W / nk;
      const nh = H / nk;
      const ax = cxp ?? v.x + v.w / 2;
      const ay = cyp ?? v.y + v.h / 2;
      const rx = (ax - v.x) / v.w;
      const ry = (ay - v.y) / v.h;
      return { w: nw, h: nh, x: ax - rx * nw, y: ay - ry * nh };
    });
  };

  // ---- active point ----
  const find = (pts: ProjPoint2D[], id: string) => pts.find((p) => p.id === id);
  const aF = activePointId ? find(front.points, activePointId) : undefined;
  const aT = activePointId ? find(top.points, activePointId) : undefined;
  const aS = activePointId ? find(side.points, activePointId) : undefined;

  const march = animateProjectors ? "lab-march" : undefined;
  const marchFast = animateProjectors ? "lab-march-fast" : undefined;
  const mi = methodInfo(method as ProjectionMethod);

  const renderSegs = (
    segs: typeof front.segments,
    Xf: (x: number) => number,
    Yf: (y: number) => number,
    key: string
  ) => (
    <g key={key}>
      {segs
        .filter((sg) => sg.visible || showHidden)
        .map((sg) => (
          <line
            key={`${key}-${sg.id}`}
            x1={Xf(sg.a.x)}
            y1={Yf(sg.a.y)}
            x2={Xf(sg.b.x)}
            y2={Yf(sg.b.y)}
            stroke={sg.visible ? P.visible : P.hidden}
            strokeWidth={sg.visible ? 2.4 : 1.5}
            strokeDasharray={sg.visible ? undefined : "7 5"}
            strokeLinecap="round"
          />
        ))}
    </g>
  );

  const renderCenter = (view: ViewKind, Xf: (x: number) => number, Yf: (y: number) => number, key: string) => {
    if (!showCenter) return null;
    const cl = axisCenterLine(solid, view);
    return (
      <g key={`${key}-c`} stroke={P.center} strokeWidth={1.2} strokeDasharray={CENTER_DASH} opacity={0.9}>
        {cl && <line x1={Xf(cl.x1)} y1={Yf(cl.y1)} x2={Xf(cl.x2)} y2={Yf(cl.y2)} />}
        {centerCrosses(solid, view).map((c, i) => (
          <g key={i}>
            <line x1={Xf(c.x) - 9} y1={Yf(c.y)} x2={Xf(c.x) + 9} y2={Yf(c.y)} />
            <line x1={Xf(c.x)} y1={Yf(c.y) - 9} x2={Xf(c.x)} y2={Yf(c.y) + 9} />
          </g>
        ))}
      </g>
    );
  };

  const renderLabels = (
    pts: ProjPoint2D[],
    Xf: (x: number) => number,
    Yf: (y: number) => number,
    key: string
  ) => {
    if (!showLabels) return null;
    return (
      <g key={`${key}-lbl`}>
        {pts
          .filter((p) => p.label)
          .slice(0, 8)
          .map((p) => {
            const active = (selectedPoint ?? activePointId) === p.id;
            return (
              <g key={`${key}-${p.id}`} onClick={(ev) => { ev.stopPropagation(); set({ selectedPoint: active ? null : p.id }); }} style={{ cursor: "pointer" }}>
                <circle cx={Xf(p.x)} cy={Yf(p.y)} r={active ? 6 : 3.4} fill={active ? P.active : P.center} stroke={sheet ? "#fff" : "#020617"} strokeWidth={1.2} />
                {active && (
                  <circle cx={Xf(p.x)} cy={Yf(p.y)} r={6} fill="none" stroke={P.active} strokeWidth={1.6} opacity={0.9}>
                    <animate attributeName="r" values="6;13;6" dur="1.3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.3s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x={Xf(p.x) + 9} y={Yf(p.y) - 7} fill={active ? P.active : P.label} fontSize={12} fontWeight={700} fontFamily="JetBrains Mono, monospace">
                  {p.label}
                </text>
              </g>
            );
          })}
      </g>
    );
  };

  // 2D angle annotations measured from the true 3D axis
  const mAng = measuredAngles(solid.axisDir);
  const inc = solid.parsed.inclinations;
  const axisLen = (v: ViewKind) => {
    const a = solid.baseCenter;
    const b = solid.apex ?? solid.topCenter ?? a;
    if (v === "front") return Math.hypot(b.x - a.x, b.z - a.z);
    if (v === "top") return Math.hypot(b.x - a.x, b.y - a.y);
    return Math.hypot(b.y - a.y, b.z - a.z);
  };
  const renderAngles = () => {
    if (!showAngles) return null;
    const out: ReactNode[] = [];
    // VP tilt shows in TOP view: arc from +X to axis ground azimuth (x, -y plane)
    if (inc.VP !== undefined && axisLen("top") > 1e-6 && (focus === undefined || focus === "all" || focus === "top")) {
      const bc = { x: TX(solid.baseCenter.x), y: TY(-solid.baseCenter.y) };
      const az = Math.atan2(-solid.axisDir.y, solid.axisDir.x);
      const pts = arcPoints(bc.x, bc.y, 30, 0, (az * 180) / Math.PI);
      out.push(
        <g key="avp" stroke={sheet ? "#be185d" : "#f472b6"} strokeWidth={1.8} fill="none">
          <line x1={bc.x} y1={bc.y} x2={bc.x + 44} y2={bc.y} stroke={P.text} strokeWidth={1} opacity={0.7} />
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} />
          <text x={bc.x + Math.cos(az / 2) * 52} y={bc.y + Math.sin(az / 2) * 52} fill={sheet ? "#be185d" : "#f9a8d4"} fontSize={12} fontWeight={700} fontFamily="JetBrains Mono, monospace" stroke="none">
            {mAng.withVP.toFixed(1)}° VP
          </text>
        </g>
      );
    }
    // HP tilt shows in FRONT view: arc from horizontal to axis elevation
    if (inc.HP !== undefined && axisLen("front") > 1e-6 && (focus === undefined || focus === "all" || focus === "front")) {
      const p0 = { x: FX(solid.baseCenter.x), y: FY(solid.baseCenter.z) };
      const el = Math.atan2(solid.axisDir.z, solid.axisDir.x);
      const pts = arcPoints(p0.x, p0.y, 30, 0, (-el * 180) / Math.PI);
      out.push(
        <g key="ahp" stroke={sheet ? "#15803d" : "#4ade80"} strokeWidth={1.8} fill="none">
          <line x1={p0.x} y1={p0.y} x2={p0.x + 44} y2={p0.y} stroke={P.text} strokeWidth={1} opacity={0.7} />
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} />
          <text x={p0.x + Math.cos(el / 2) * 56} y={p0.y - Math.sin(el / 2) * 56} fill={sheet ? "#15803d" : "#86efac"} fontSize={12} fontWeight={700} fontFamily="JetBrains Mono, monospace" stroke="none">
            {mAng.withHP.toFixed(1)}° HP
          </text>
        </g>
      );
    }
    return <g>{out}</g>;
  };

  const diaMM = solid.radius !== undefined ? solid.radius * 2 : undefined;
  const heightMM = solid.height ?? solid.length ?? solid.bbox.size.z;
  const dim = (mm: number) => {
    if (unit === "cm") return `${Math.round((mm / 10) * 10) / 10} cm`;
    if (unit === "m") return `${Math.round((mm / 1000) * 100) / 100} m`;
    return `${Math.round(mm)} mm`;
  };

  const traces = useMemo(
    () => (solid.kind === "plane" ? computeTraces(solid.axisDir, solid.baseCenter) : { ht: null, vt: null }),
    [solid]
  );
  const projX = [front.bounds.minX, (front.bounds.minX + front.bounds.maxX) / 2, front.bounds.maxX];

  const renderTraces = () => {
    if (solid.kind !== "plane" || !showTraces) return null;
    const px = L.s * k; // mm -> px
    const out: ReactNode[] = [];
    if (showT) {
      if (traces.ht) {
        const bx = TX(traces.ht.p.x);
        const by = TY(-traces.ht.p.y);
        const dl = Math.hypot(traces.ht.d.x, traces.ht.d.y) || 1;
        const ux = traces.ht.d.x / dl;
        const uy = -traces.ht.d.y / dl;
        const half = (top.bounds.w * px) / 2 + 34;
        out.push(
          <g key="ht">
            <line x1={bx - ux * half} y1={by - uy * half} x2={bx + ux * half} y2={by + uy * half} stroke={P.xy} strokeWidth={1.4} strokeDasharray="14 5 3 5" opacity={0.85} />
            <text x={bx + ux * half + 6} y={by + uy * half} fill={P.xy} fontSize={12} fontWeight={700} fontFamily="JetBrains Mono, monospace">HT</text>
          </g>
        );
      } else {
        out.push(
          <text key="noht" x={TX(top.bounds.minX)} y={TY(top.bounds.maxY) + 42} fill={P.text} fontSize={11} fontFamily="JetBrains Mono, monospace">
            No HT — plane parallel to HP
          </text>
        );
      }
    }
    if (showF) {
      if (traces.vt) {
        const bx = FX(traces.vt.p.x);
        const by = FY(traces.vt.p.z);
        const dl = Math.hypot(traces.vt.d.x, traces.vt.d.z) || 1;
        const ux = traces.vt.d.x / dl;
        const uy = traces.vt.d.z / dl;
        const half = (front.bounds.w * px) / 2 + 34;
        out.push(
          <g key="vt">
            <line x1={bx - ux * half} y1={by - uy * half} x2={bx + ux * half} y2={by + uy * half} stroke={P.xy} strokeWidth={1.4} strokeDasharray="14 5 3 5" opacity={0.85} />
            <text x={bx + ux * half + 6} y={by + uy * half} fill={P.xy} fontSize={12} fontWeight={700} fontFamily="JetBrains Mono, monospace">VT</text>
          </g>
        );
      } else {
        out.push(
          <text key="novt" x={FX(front.bounds.minX)} y={FY(front.bounds.minY) - 28} fill={P.text} fontSize={11} fontFamily="JetBrains Mono, monospace">
            No VT — plane parallel to VP
          </text>
        );
      }
    }
    return <g>{out}</g>;
  };
  const showSingle = focus !== undefined && focus !== "all";
  const showF = !showSingle || focus === "front";
  const showT = !showSingle || focus === "top";
  const showS = !showSingle || focus === "side";

  return (
    <div className="relative h-full w-full">
      <svg
        id="lab-canvas"
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="h-full w-full"
        style={{ background: P.bg, cursor: measure ? "crosshair" : "grab" }}
        onClick={onClick}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, ...(() => { const p = toVB(e.clientX, e.clientY); return [p.x, p.y] as const; })())}
        onPointerDown={(e) => {
          if (measure) return;
          (e.target as SVGElement).setPointerCapture?.(e.pointerId);
          drag.current = { sx: e.clientX, sy: e.clientY, vx: vb.x, vy: vb.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current || measure) return;
          const r = svgRef.current?.getBoundingClientRect();
          if (!r) return;
          setVb((v) => ({ ...v, x: drag.current!.vx - ((e.clientX - drag.current!.sx) / r.width) * v.w, y: drag.current!.vy - ((e.clientY - drag.current!.sy) / r.height) * v.h }));
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <defs>
          <pattern id={sheet ? "labgrid-sheet" : "labgrid"} width={24} height={24} patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={P.grid} strokeWidth={1} />
          </pattern>
          <filter id="labglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={3.2} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={vb.x - 50} y={vb.y - 50} width={vb.w + 100} height={vb.h + 100} fill={`url(#${sheet ? "labgrid-sheet" : "labgrid"})`} />

        {sweeping && <rect x={0} y={10} width={26} height={H - 20} fill={sheet ? "rgba(14,116,144,0.12)" : "rgba(34,211,238,0.13)"} className="lab-sweep" />}

        {!showSingle && <line x1={14} y1={L.xyY} x2={W - 14} y2={L.xyY} stroke={P.xy} strokeWidth={2.2} />}
        {!showSingle && (
          <text x={W - 46} y={L.xyY - 8} fill={P.xy} fontSize={13} fontWeight={700} fontFamily="JetBrains Mono, monospace">
            XY
          </text>
        )}

        {reveal >= 1 && showT && (
          <g>
            {renderSegs(top.segments, TX, TY, "t")}
            {renderCenter("top", TX, TY, "t")}
            {renderLabels(top.points, TX, TY, "t")}
            <text x={TX(top.bounds.minX)} y={TY(top.bounds.maxY) + 24} fill={P.text} fontSize={12} fontFamily="JetBrains Mono, monospace">
              TOP (Plan) — (x, y) on HP
            </text>
          </g>
        )}

        {reveal >= 2 && renderTraces()}

        {reveal >= 2 && showProj && !showSingle && (
          <g>
            {projX.map((x, i) => (
              <g key={i}>
                <line x1={FX(x)} y1={FY(front.bounds.minY) - 8} x2={TX(x)} y2={TY(top.bounds.maxY) + 8} stroke={P.projV} strokeWidth={3.4} opacity={0.25} />
                <line x1={FX(x)} y1={FY(front.bounds.minY) - 8} x2={TX(x)} y2={TY(top.bounds.maxY) + 8} stroke={P.projV} strokeWidth={1.6} className={march} />
              </g>
            ))}
          </g>
        )}

        {reveal >= 3 && showF && (
          <g>
            {renderSegs(front.segments, FX, FY, "f")}
            {renderCenter("front", FX, FY, "f")}
            {renderLabels(front.points, FX, FY, "f")}
            <text x={FX(front.bounds.minX)} y={FY(front.bounds.minY) - 12} fill={P.text} fontSize={12} fontFamily="JetBrains Mono, monospace">
              FRONT (Elevation) — (x, z) on VP
            </text>
          </g>
        )}

        {reveal >= 4 && showS && (
          <g>
            {showProj && !showSingle && [front.bounds.minY, (front.bounds.minY + front.bounds.maxY) / 2, front.bounds.maxY].map((y, i) => (
              <g key={i}>
                <line x1={FX(front.bounds.maxX) + 8} y1={FY(y)} x2={SX(side.bounds.minX) - 8} y2={SY(y)} stroke={P.projH} strokeWidth={3.4} opacity={0.25} />
                <line x1={FX(front.bounds.maxX) + 8} y1={FY(y)} x2={SX(side.bounds.minX) - 8} y2={SY(y)} stroke={P.projH} strokeWidth={1.6} className={march} />
              </g>
            ))}
            {renderSegs(side.segments, SX, SY, "s")}
            {renderCenter("side", SX, SY, "s")}
            <text x={SX(side.bounds.minX)} y={SY(side.bounds.minY) - 12} fill={P.text} fontSize={12} fontFamily="JetBrains Mono, monospace">
              {L.sideLabel} — (y, z)
            </text>
          </g>
        )}

        {activePointId && aF && aT && reveal >= 2 && !showSingle && (
          <g>
            <line x1={FX(aF.x)} y1={FY(aF.y)} x2={TX(aT.x)} y2={TY(aT.y)} stroke={P.active} strokeWidth={3} className={marchFast} />
            <circle cx={FX(aF.x)} cy={FY(aF.y)} r={5} fill={P.active}>
              <animate attributeName="r" values="5;10;5" dur="1.1s" repeatCount="indefinite" />
            </circle>
            <circle cx={TX(aT.x)} cy={TY(aT.y)} r={5} fill={P.active}>
              <animate attributeName="r" values="5;10;5" dur="1.1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
        {activePointId && aF && aS && reveal >= 4 && !showSingle && (
          <g>
            <line x1={FX(aF.x)} y1={FY(aF.y)} x2={SX(aS.x)} y2={SY(aS.y)} stroke={P.active} strokeWidth={3} className={marchFast} />
            <circle cx={SX(aS.x)} cy={SY(aS.y)} r={5} fill={P.active}>
              <animate attributeName="r" values="5;10;5" dur="1.1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {reveal >= 3 && renderAngles()}

        {reveal >= 5 && showDims && (
          <g fontFamily="JetBrains Mono, monospace">
            {diaMM !== undefined && showT && (
              <text x={TX((top.bounds.minX + top.bounds.maxX) / 2)} y={TY(top.bounds.maxY) + 44} fill={P.dim} fontSize={14} fontWeight={700} textAnchor="middle">
                ⌀{dim(diaMM)} true size
              </text>
            )}
            {showF && (
              <text x={FX(front.bounds.maxX) + 30} y={FY((front.bounds.minY + front.bounds.maxY) / 2)} fill={P.dim} fontSize={14} fontWeight={700} textAnchor="middle" transform={`rotate(90 ${FX(front.bounds.maxX) + 30} ${FY((front.bounds.minY + front.bounds.maxY) / 2)})`}>
                {dim(heightMM)}
              </text>
            )}
          </g>
        )}

        {/* projection symbol */}
        <g transform={`translate(${W - 150},${H - 64})`}>
          {method === "first" ? (
            <g stroke={P.text} fill="none" strokeWidth={1.6}>
              <circle cx={18} cy={20} r={12} />
              <circle cx={18} cy={20} r={5} />
              <path d="M44 8 L68 8 L62 32 L50 32 Z" />
            </g>
          ) : (
            <g stroke={P.text} fill="none" strokeWidth={1.6}>
              <path d="M8 8 L32 8 L26 32 L14 32 Z" />
              <circle cx={56} cy={20} r={12} />
              <circle cx={56} cy={20} r={5} />
            </g>
          )}
          <text x={0} y={52} fill={P.text} fontSize={10} fontFamily="JetBrains Mono, monospace">
            {mi.title}
          </text>
        </g>

        {/* measure markers */}
        {picks.map((p, i) => (
          <g key={i}>
            <circle cx={p.vb.x} cy={p.vb.y} r={5} fill="none" stroke={P.active} strokeWidth={2} />
            <text x={p.vb.x + 8} y={p.vb.y - 8} fill={P.active} fontSize={11} fontWeight={700} fontFamily="JetBrains Mono, monospace">
              P{i + 1}·{p.view}
            </text>
          </g>
        ))}
        {picks.length === 2 && (
          <line x1={picks[0].vb.x} y1={picks[0].vb.y} x2={picks[1].vb.x} y2={picks[1].vb.y} stroke={P.active} strokeWidth={1.6} strokeDasharray="5 4" />
        )}
      </svg>

      {/* floating tools */}
      <div className={`absolute right-2 top-2 flex gap-1 ${sheet ? "opacity-90" : ""}`}>
        {(
          [
            ["+", () => zoomBy(1.25)],
            ["−", () => zoomBy(1 / 1.25)],
            ["Fit", () => setVb({ x: 0, y: 0, w: W, h: H })],
          ] as [string, () => void][]
        ).map(([label, fn]) => (
          <button key={label} onClick={fn} className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold ${sheet ? "border border-slate-300 bg-white text-slate-700" : "border border-white/10 bg-black/60 text-slate-200"}`}>
            {label}
          </button>
        ))}
        <button
          onClick={() => { setMeasure(!measure); setPicks([]); }}
          className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold ${measure ? "bg-amber-300 text-slate-950" : sheet ? "border border-slate-300 bg-white text-slate-700" : "border border-white/10 bg-black/60 text-slate-200"}`}
        >
          Measure
        </button>
      </div>
      {measure && (
        <div className={`absolute left-2 top-2 max-w-[300px] rounded-xl px-3 py-2 font-mono text-[11px] ${sheet ? "border border-slate-300 bg-white/95 text-slate-700" : "border border-amber-300/30 bg-black/70 text-amber-100"}`}>
          {picks.length === 0 && "Measure: click two vertices on the drawing. Distance is computed from the true 3D geometry."}
          {picks.length === 1 && "First point locked. Click a second vertex."}
          {picks.length === 2 && measDist !== null && (
            <span>
              3D distance P1–P2 = <b>{measDist.toFixed(2)} mm</b> (true, from model coordinates).{" "}
              <button className="underline" onClick={() => setPicks([])}>clear</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
