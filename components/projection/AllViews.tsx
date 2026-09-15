"use client";
import { useMemo } from "react";
import type { BuiltSolid } from "@/types";
import { buildProjection } from "@/lib/projection/orthographic";
import { useStore } from "@/store/useStore";

/**
 * Combined first-angle sheet: FRONT top-left, TOP bottom-left (shared X),
 * RIGHT side top-right (shared Z). One shared XY + projector lines.
 */
export default function AllViews({ solid }: { solid: BuiltSolid }) {
  const showLabels = useStore((s) => s.showLabels);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const set = useStore((s) => s.set);

  const front = useMemo(() => buildProjection(solid, "front"), [solid]);
  const top = useMemo(() => buildProjection(solid, "top"), [solid]);
  const side = useMemo(() => buildProjection(solid, "side"), [solid]);

  const W = 640;
  const H = 460;
  // shared scale
  const allW = Math.max(front.bounds.w, top.bounds.w);
  const allH = front.bounds.h + top.bounds.h + 60;
  const s = Math.min((W * 0.58) / allW, (H * 0.9) / allH, 3.2);

  const fx = 40 - front.bounds.minX * s;
  const fy = 30 - front.bounds.minY * s;
  const tx = 40 - top.bounds.minX * s;
  const xyGap = 34;
  const ty = fy + front.bounds.h * s + xyGap - top.bounds.minY * s;
  const xyY = fy + front.bounds.h * s + xyGap / 2;
  const sx = fx + front.bounds.w * s + 70 - side.bounds.minX * s;
  const sy = fy + (front.bounds.h - side.bounds.h) / 2 * s;

  const FX = (x: number) => x * s + fx;
  const FY = (y: number) => y * s + fy;
  const TX = (x: number) => x * s + tx;
  const TY = (y: number) => y * s + ty;
  const SX = (x: number) => x * s + sx;
  const SY = (y: number) => y * s + sy;

  const renderSegs = (
    segs: typeof front.segments,
    X: (x: number) => number,
    Y: (y: number) => number,
    key: string
  ) => (
    <g key={key}>
      {segs.map((sg) => (
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

  // vertical projectors linking front/top via shared x
  const projX = [front.bounds.minX, (front.bounds.minX + front.bounds.maxX) / 2, front.bounds.maxX];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full bg-[#0a0f1c]">
      <defs>
        <pattern id="allgrid" width={22} height={22} patternUnits="userSpaceOnUse">
          <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#allgrid)" />

      {/* projector lines front<->top */}
      {projX.map((x, i) => (
        <line key={i} x1={FX(x)} y1={FY(front.bounds.minY) - 6} x2={TX(x)} y2={TY(top.bounds.maxY) + 6} stroke="#22d3ee" strokeWidth={0.8} strokeDasharray="4 4" opacity={0.5} />
      ))}
      {/* horizontal projectors front<->side */}
      {[front.bounds.minY, front.bounds.maxY].map((y, i) => (
        <line key={`h${i}`} x1={FX(front.bounds.maxX) + 6} y1={FY(y)} x2={SX(side.bounds.minX) - 6} y2={SY(y)} stroke="#f472b6" strokeWidth={0.8} strokeDasharray="4 4" opacity={0.5} />
      ))}

      {/* XY line */}
      <line x1={10} y1={xyY} x2={W - 10} y2={xyY} stroke="#f43f5e" strokeWidth={1.8} />
      <text x={W - 40} y={xyY - 6} fill="#fb7185" fontSize={11} fontWeight={700} fontFamily="JetBrains Mono, monospace">
        XY
      </text>

      {renderSegs(front.segments, FX, FY, "f")}
      {renderSegs(top.segments, TX, TY, "t")}
      {renderSegs(side.segments, SX, SY, "s")}
      {renderLabels(front.points, FX, FY, "f")}
      {renderLabels(top.points, TX, TY, "t")}

      <text x={FX(front.bounds.minX)} y={FY(front.bounds.minY) - 10} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace">FRONT (Elevation)</text>
      <text x={TX(top.bounds.minX)} y={TY(top.bounds.maxY) + 20} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace">TOP (Plan)</text>
      <text x={SX(side.bounds.minX)} y={SY(side.bounds.minY) - 10} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace">SIDE</text>
    </svg>
  );
}
