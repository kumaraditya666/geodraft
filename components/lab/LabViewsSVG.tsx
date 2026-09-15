"use client";
import { useMemo } from "react";
import type { BuiltSolid } from "@/types";
import { buildProjection } from "@/lib/projection/orthographic";
import { useStore } from "@/store/useStore";

/**
 * Large first-angle layout for the Projection Lab:
 * FRONT top-left, TOP bottom-left (shared X, cyan vertical projectors),
 * SIDE top-right (shared Z, pink horizontal projectors).
 * reveal: 0=XY only, 1=+top, 2=+projectors, 3=+front, 4=+side, 5=+dims
 */
export default function LabViewsSVG({
  solid,
  reveal,
  activePointId,
  animateProjectors,
  sweeping,
}: {
  solid: BuiltSolid;
  reveal: number;
  activePointId: string | null;
  animateProjectors: boolean;
  sweeping: boolean;
}) {
  const showLabels = useStore((s) => s.showLabels);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const set = useStore((s) => s.set);
  const unit = useStore((s) => s.unit);

  const front = useMemo(() => buildProjection(solid, "front"), [solid]);
  const top = useMemo(() => buildProjection(solid, "top"), [solid]);
  const side = useMemo(() => buildProjection(solid, "side"), [solid]);

  const W = 920;
  const H = 600;
  const allW = Math.max(front.bounds.w, top.bounds.w);
  const allH = front.bounds.h + top.bounds.h + 70;
  const s = Math.min((W * 0.58) / allW, (H * 0.88) / allH, 3.4);

  const fx = 60 - front.bounds.minX * s;
  const fy = 46 - front.bounds.minY * s;
  const tx = 60 - top.bounds.minX * s;
  const gap = 46;
  const ty = fy + front.bounds.h * s + gap - top.bounds.minY * s;
  const xyY = fy + front.bounds.h * s + gap / 2;
  const sx = fx + front.bounds.w * s + 96 - side.bounds.minX * s;
  const sy = fy + ((front.bounds.h - side.bounds.h) / 2) * s;

  const FX = (x: number) => x * s + fx;
  const FY = (y: number) => y * s + fy;
  const TX = (x: number) => x * s + tx;
  const TY = (y: number) => y * s + ty;
  const SX = (x: number) => x * s + sx;
  const SY = (y: number) => y * s + sy;

  const find = (pts: typeof front.points, id: string) => pts.find((p) => p.id === id);
  const aF = activePointId ? find(front.points, activePointId) : undefined;
  const aT = activePointId ? find(top.points, activePointId) : undefined;
  const aS = activePointId ? find(side.points, activePointId) : undefined;

  const march = animateProjectors ? "lab-march" : undefined;
  const marchFast = animateProjectors ? "lab-march-fast" : undefined;

  const projX = [front.bounds.minX, (front.bounds.minX + front.bounds.maxX) / 2, front.bounds.maxX];

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
          stroke={sg.visible ? "#eef3fa" : "#5b6b82"}
          strokeWidth={sg.visible ? 2.4 : 1.5}
          strokeDasharray={sg.visible ? undefined : "7 5"}
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
          .slice(0, 8)
          .map((p) => {
            const active = (selectedPoint ?? activePointId) === p.id;
            return (
              <g key={`${key}-${p.id}`} onClick={() => set({ selectedPoint: active ? null : p.id })} style={{ cursor: "pointer" }}>
                <circle cx={X(p.x)} cy={Y(p.y)} r={active ? 6 : 3.4} fill={active ? "#fbbf24" : "#22d3ee"} stroke="#020617" strokeWidth={1.2} />
                {active && (
                  <circle cx={X(p.x)} cy={Y(p.y)} r={6} fill="none" stroke="#fbbf24" strokeWidth={1.6} opacity={0.9}>
                    <animate attributeName="r" values="6;13;6" dur="1.3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.3s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x={X(p.x) + 9} y={Y(p.y) - 7} fill={active ? "#fbbf24" : "#a5f3fc"} fontSize={12} fontWeight={700} fontFamily="JetBrains Mono, monospace">
                  {p.label}
                </text>
              </g>
            );
          })}
      </g>
    );
  };

  const diaMM = solid.radius !== undefined ? solid.radius * 2 : undefined;
  const heightMM = solid.height ?? solid.length ?? solid.bbox.size.z;
  const dim = (mm: number) => {
    if (unit === "cm") return `${Math.round((mm / 10) * 10) / 10} cm`;
    if (unit === "m") return `${Math.round((mm / 1000) * 100) / 100} m`;
    return `${Math.round(mm)} mm`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full bg-[#0a0f1c]">
      <defs>
        <pattern id="labgrid" width={24} height={24} patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.09)" strokeWidth={1} />
        </pattern>
        <filter id="labglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={3.2} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#labgrid)" />

      {sweeping && <rect x={0} y={10} width={26} height={H - 20} fill="rgba(34,211,238,0.13)" className="lab-sweep" />}

      {/* XY */}
      <line x1={14} y1={xyY} x2={W - 14} y2={xyY} stroke="#f43f5e" strokeWidth={2.2} filter="url(#labglow)" />
      <text x={W - 46} y={xyY - 8} fill="#fb7185" fontSize={13} fontWeight={700} fontFamily="JetBrains Mono, monospace">
        XY
      </text>

      {/* TOP */}
      {reveal >= 1 && (
        <g>
          {renderSegs(top.segments, TX, TY, "t")}
          {renderLabels(top.points, TX, TY, "t")}
          <text x={TX(top.bounds.minX)} y={TY(top.bounds.maxY) + 24} fill="#94a3b8" fontSize={12} fontFamily="JetBrains Mono, monospace">
            TOP (Plan) — (x, y) on HP
          </text>
        </g>
      )}

      {/* vertical projectors front<->top */}
      {reveal >= 2 && (
        <g>
          {projX.map((x, i) => (
            <g key={i}>
              <line x1={FX(x)} y1={FY(front.bounds.minY) - 8} x2={TX(x)} y2={TY(top.bounds.maxY) + 8} stroke="#164e63" strokeWidth={3.4} opacity={0.8} />
              <line x1={FX(x)} y1={FY(front.bounds.minY) - 8} x2={TX(x)} y2={TY(top.bounds.maxY) + 8} stroke="#22d3ee" strokeWidth={1.6} className={march} filter="url(#labglow)" />
            </g>
          ))}
        </g>
      )}

      {/* FRONT */}
      {reveal >= 3 && (
        <g>
          {renderSegs(front.segments, FX, FY, "f")}
          {renderLabels(front.points, FX, FY, "f")}
          <text x={FX(front.bounds.minX)} y={FY(front.bounds.minY) - 12} fill="#94a3b8" fontSize={12} fontFamily="JetBrains Mono, monospace">
            FRONT (Elevation) — (x, z) on VP
          </text>
        </g>
      )}

      {/* SIDE + horizontal projectors */}
      {reveal >= 4 && (
        <g>
          {[front.bounds.minY, (front.bounds.minY + front.bounds.maxY) / 2, front.bounds.maxY].map((y, i) => (
            <g key={i}>
              <line x1={FX(front.bounds.maxX) + 8} y1={FY(y)} x2={SX(side.bounds.minX) - 8} y2={SY(y)} stroke="#4c1d3f" strokeWidth={3.4} opacity={0.9} />
              <line x1={FX(front.bounds.maxX) + 8} y1={FY(y)} x2={SX(side.bounds.minX) - 8} y2={SY(y)} stroke="#f472b6" strokeWidth={1.6} className={march} filter="url(#labglow)" />
            </g>
          ))}
          {renderSegs(side.segments, SX, SY, "s")}
          <text x={SX(side.bounds.minX)} y={SY(side.bounds.minY) - 12} fill="#94a3b8" fontSize={12} fontFamily="JetBrains Mono, monospace">
            SIDE — (y, z)
          </text>
        </g>
      )}

      {/* active-point projector highlight */}
      {activePointId && aF && aT && reveal >= 2 && (
        <g filter="url(#labglow)">
          <line x1={FX(aF.x)} y1={FY(aF.y)} x2={TX(aT.x)} y2={TY(aT.y)} stroke="#fbbf24" strokeWidth={3} className={marchFast} />
          <circle cx={FX(aF.x)} cy={FY(aF.y)} r={5} fill="#fbbf24">
            <animate attributeName="r" values="5;10;5" dur="1.1s" repeatCount="indefinite" />
          </circle>
          <circle cx={TX(aT.x)} cy={TY(aT.y)} r={5} fill="#fbbf24">
            <animate attributeName="r" values="5;10;5" dur="1.1s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {activePointId && aF && aS && reveal >= 4 && (
        <g filter="url(#labglow)">
          <line x1={FX(aF.x)} y1={FY(aF.y)} x2={SX(aS.x)} y2={SY(aS.y)} stroke="#fbbf24" strokeWidth={3} className={marchFast} />
          <circle cx={SX(aS.x)} cy={SY(aS.y)} r={5} fill="#fbbf24">
            <animate attributeName="r" values="5;10;5" dur="1.1s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {/* dims */}
      {reveal >= 5 && (
        <g fontFamily="JetBrains Mono, monospace" filter="url(#labglow)">
          {diaMM !== undefined && (
            <text x={TX((top.bounds.minX + top.bounds.maxX) / 2)} y={TY(top.bounds.maxY) + 44} fill="#fde68a" fontSize={14} fontWeight={700} textAnchor="middle">
              ⌀{dim(diaMM)} true size
            </text>
          )}
          <text x={FX(front.bounds.maxX) + 30} y={FY((front.bounds.minY + front.bounds.maxY) / 2)} fill="#fde68a" fontSize={14} fontWeight={700} textAnchor="middle" transform={`rotate(90 ${FX(front.bounds.maxX) + 30} ${FY((front.bounds.minY + front.bounds.maxY) / 2)})`}>
            {dim(heightMM)}
          </text>
        </g>
      )}
    </svg>
  );
}
