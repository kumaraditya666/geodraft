"use client";
import { useMemo } from "react";
import type { ProjectionMethod } from "@/types";
import { buildProjection } from "@/lib/projection/projectionEngine";
import { layoutViews, methodInfo } from "@/lib/projection/viewLayout";
import { axisCenterLine, CENTER_DASH } from "@/lib/projection/centerLineEngine";
import type { BuiltSolid } from "@/types";
import { useStore } from "@/store/useStore";

/** Combined arrangement honoring the selected first/third-angle method. */
export default function AllViews({ solid }: { solid: BuiltSolid }) {
  const showLabels = useStore((s) => s.showLabels);
  const showHidden = useStore((s) => s.showHiddenLines);
  const showCenter = useStore((s) => s.showCenterLines);
  const method = useStore((s) => s.projectionMethod);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const set = useStore((s) => s.set);

  const front = useMemo(() => buildProjection(solid, "front"), [solid]);
  const top = useMemo(() => buildProjection(solid, "top"), [solid]);
  const side = useMemo(() => buildProjection(solid, "side"), [solid]);
  const L = useMemo(
    () => layoutViews(front, top, side, method as ProjectionMethod, 640, 460, {}),
    [front, top, side, method]
  );
  const mi = methodInfo(method as ProjectionMethod);

  const W = 640;
  const H = 460;
  const FX = (x: number) => x * L.s + L.fx;
  const FY = (y: number) => y * L.s + L.fy;
  const TX = (x: number) => x * L.s + L.tx;
  const TY = (y: number) => y * L.s + L.ty;
  const SX = (x: number) => x * L.s + L.sx;
  const SY = (y: number) => y * L.s + L.sy;

  const renderSegs = (
    segs: typeof front.segments,
    X: (x: number) => number,
    Y: (y: number) => number,
    key: string
  ) => (
    <g key={key}>
      {segs
        .filter((sg) => sg.visible || showHidden)
        .map((sg) => (
          <line
            key={`${key}-${sg.id}`}
            x1={X(sg.a.x)}
            y1={Y(sg.a.y)}
            x2={X(sg.b.x)}
            y2={Y(sg.b.y)}
            stroke={sg.visible ? "#e8eef7" : "#5b6b82"}
            strokeWidth={sg.visible ? 2 : 1.3}
            strokeDasharray={sg.visible ? undefined : "6 4"}
            strokeLinecap="round"
          />
        ))}
    </g>
  );

  const renderCenter = (view: "front" | "top" | "side", X: (x: number) => number, Y: (y: number) => number, key: string) => {
    if (!showCenter) return null;
    const cl = axisCenterLine(solid, view);
    if (!cl) return null;
    return <line key={key} x1={X(cl.x1)} y1={Y(cl.y1)} x2={X(cl.x2)} y2={Y(cl.y2)} stroke="#22d3ee" strokeWidth={1} strokeDasharray={CENTER_DASH} opacity={0.65} />;
  };

  const renderLabels = (
    pts: typeof front.points,
    X: (x: number) => number,
    Y: (y: number) => number,
    key: string
  ) => {
    if (!showLabels) return null;
    return (
      <g key={`${key}-lbl`}>
        {pts
          .filter((p) => p.label)
          .slice(0, 10)
          .map((p) => {
            const active = selectedPoint === p.id;
            return (
              <g key={`${key}-${p.id}`} onClick={() => set({ selectedPoint: active ? null : p.id })} style={{ cursor: "pointer" }}>
                <circle cx={X(p.x)} cy={Y(p.y)} r={active ? 4.5 : 2.6} fill={active ? "#fbbf24" : "#22d3ee"} />
                <text x={X(p.x) + 6} y={Y(p.y) - 5} fill={active ? "#fbbf24" : "#a5f3fc"} fontSize={10} fontWeight={700} fontFamily="JetBrains Mono, monospace">
                  {p.label}
                </text>
              </g>
            );
          })}
      </g>
    );
  };

  const projX = [front.bounds.minX, (front.bounds.minX + front.bounds.maxX) / 2, front.bounds.maxX];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full bg-[#0a0f1c]">
      <defs>
        <pattern id="allgrid" width={22} height={22} patternUnits="userSpaceOnUse">
          <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#allgrid)" />

      {projX.map((x, i) => (
        <line key={i} x1={FX(x)} y1={FY(front.bounds.minY) - 6} x2={TX(x)} y2={TY(top.bounds.maxY) + 6} stroke="#22d3ee" strokeWidth={0.8} strokeDasharray="4 4" opacity={0.5} />
      ))}
      {[front.bounds.minY, front.bounds.maxY].map((y, i) => (
        <line key={`h${i}`} x1={(L.sideOnLeft ? SX(side.bounds.maxX) : FX(front.bounds.maxX)) + 6} y1={FY(y)} x2={(L.sideOnLeft ? FX(front.bounds.minX) : SX(side.bounds.minX)) - 6} y2={SY(y)} stroke="#f472b6" strokeWidth={0.8} strokeDasharray="4 4" opacity={0.5} />
      ))}

      <line x1={10} y1={L.xyY} x2={W - 10} y2={L.xyY} stroke="#f43f5e" strokeWidth={1.8} />
      <text x={W - 40} y={L.xyY - 6} fill="#fb7185" fontSize={11} fontWeight={700} fontFamily="JetBrains Mono, monospace">
        XY
      </text>

      {renderSegs(front.segments, FX, FY, "f")}
      {renderSegs(top.segments, TX, TY, "t")}
      {renderSegs(side.segments, SX, SY, "s")}
      {renderCenter("front", FX, FY, "fc")}
      {renderCenter("top", TX, TY, "tc")}
      {renderLabels(front.points, FX, FY, "f")}
      {renderLabels(top.points, TX, TY, "t")}

      <text x={FX(front.bounds.minX)} y={FY(front.bounds.minY) - 10} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace">FRONT (Elevation)</text>
      <text x={TX(top.bounds.minX)} y={TY(top.bounds.maxY) + 20} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace">TOP (Plan)</text>
      <text x={SX(side.bounds.minX)} y={SY(side.bounds.minY) - 10} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace">SIDE</text>
      <text x={12} y={H - 10} fill="#64748b" fontSize={10} fontFamily="JetBrains Mono, monospace">{mi.title}</text>
    </svg>
  );
}
