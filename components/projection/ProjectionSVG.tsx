"use client";
import { useMemo } from "react";
import type { BuiltSolid, ViewKind } from "@/types";
import { buildProjection } from "@/lib/projection/orthographic";
import { useStore } from "@/store/useStore";

const SCALE_MAP: Record<string, number> = { "1:1": 1, "1:2": 0.5, "1:5": 0.2, "2:1": 2 };

function DimArrow({ x1, y1, x2, y2, label, vertical }: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) {
  return (
    <g fontFamily="JetBrains Mono, monospace">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth={1} />
      <polygon
        points={vertical ? `${x2},${y2} ${x2 - 4},${y2 - 7} ${x2 + 4},${y2 - 7}` : `${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}`}
        fill="#fbbf24"
      />
      <polygon
        points={vertical ? `${x1},${y1} ${x1 - 4},${y1 + 7} ${x1 + 4},${y1 + 7}` : `${x1},${y1} ${x1 + 7},${y1 - 4} ${x1 + 7},${y1 + 4}`}
        fill="#fbbf24"
      />
      <text
        x={(x1 + x2) / 2 + (vertical ? 8 : 0)}
        y={(y1 + y2) / 2 + (vertical ? 0 : -6)}
        fill="#fde68a"
        fontSize={11}
        textAnchor="middle"
        fontWeight={700}
      >
        {label}
      </text>
    </g>
  );
}

export default function ProjectionSVG({
  solid,
  view,
  compact,
}: {
  solid: BuiltSolid;
  view: ViewKind;
  compact?: boolean;
}) {
  const showLabels = useStore((s) => s.showLabels);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const set = useStore((s) => s.set);
  const scale = useStore((s) => s.scale);
  const unit = useStore((s) => s.unit);
  const stepIndex = useStore((s) => s.stepIndex);

  const proj = useMemo(() => buildProjection(solid, view), [solid, view]);
  const k = SCALE_MAP[scale] ?? 1;

  // fit bounds into viewBox with fixed pixel size
  const W = compact ? 300 : 460;
  const H = compact ? 220 : 330;
  const s = Math.min(W / proj.bounds.w, H / proj.bounds.h) * k;
  const ox = (W - proj.bounds.w * s) / 2 - proj.bounds.minX * s;
  const oy = (H - proj.bounds.h * s) / 2 - proj.bounds.minY * s;
  const X = (x: number) => x * s + ox;
  const Y = (y: number) => y * s + oy;

  const dimLabel = (mm: number) => {
    if (unit === "cm") return `${Math.round((mm / 10) * 10) / 10} cm`;
    if (unit === "m") return `${Math.round((mm / 1000) * 100) / 100} m`;
    return `${Math.round(mm)} mm`;
  };

  // axis projection for center line: baseCenter -> apex/topCenter
  const axis2D = useMemo(() => {
    const a = solid.baseCenter;
    const b = solid.apex ?? solid.topCenter ?? solid.vertices[1]?.p ?? a;
    const pa = view === "front" ? { x: a.x, y: a.z } : view === "top" ? { x: a.x, y: -a.y } : { x: -a.y, y: a.z };
    const pb = view === "front" ? { x: b.x, y: b.z } : view === "top" ? { x: b.x, y: -b.y } : { x: -b.y, y: b.z };
    return { pa: { x: X(pa.x), y: Y(pa.y) }, pb: { x: X(pb.x), y: Y(pb.y) } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solid, view, s, ox, oy]);

  const showDims = stepIndex >= 5;
  const showRaysBg = stepIndex >= 1;

  // XY line position in this view's coords:
  // front: z=0 -> y=0 ; top: y=0 -> -y=0 ; side: z=0 -> y=0
  const xyY = Y(0);
  const showXY = view !== "side" ? true : true;

  const heightMM = solid.height ?? solid.length ?? solid.bbox.size.z;
  const diaMM = solid.radius !== undefined ? solid.radius * 2 : undefined;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full bg-[#0a0f1c]">
      <defs>
        <pattern id={`grid-${view}`} width={22} height={22} patternUnits="userSpaceOnUse">
          <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(148,163,184,0.09)" strokeWidth={1} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill={`url(#grid-${view})`} />
      {showRaysBg && (
        <g opacity={0.5}>
          {view === "front" && (
            <line x1={8} y1={xyY} x2={W - 8} y2={xyY} stroke="#f43f5e" strokeWidth={1.6} />
          )}
          {view === "top" && (
            <line x1={8} y1={xyY} x2={W - 8} y2={xyY} stroke="#f43f5e" strokeWidth={1.6} />
          )}
          {view === "side" && (
            <line x1={8} y1={xyY} x2={W - 8} y2={xyY} stroke="#f43f5e" strokeWidth={1.2} strokeDasharray="8 4" opacity={0.7} />
          )}
          <text x={W - 34} y={xyY - 6} fill="#fb7185" fontSize={10} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
            XY
          </text>
        </g>
      )}

      {/* center / axis line */}
      {solid.kind !== "line" && (
        <line
          x1={axis2D.pa.x}
          y1={axis2D.pa.y}
          x2={axis2D.pb.x}
          y2={axis2D.pb.y}
          stroke="#22d3ee"
          strokeWidth={1}
          strokeDasharray="10 3 2 3"
          opacity={0.65}
        />
      )}

      {/* geometry */}
      {proj.segments.map((sg) => (
        <line
          key={sg.id}
          x1={X(sg.a.x)}
          y1={Y(sg.a.y)}
          x2={X(sg.b.x)}
          y2={Y(sg.b.y)}
          stroke={sg.visible ? "#e8eef7" : "#5b6b82"}
          strokeWidth={sg.visible ? 2.1 : 1.4}
          strokeDasharray={sg.visible ? undefined : "6 4"}
          strokeLinecap="round"
          opacity={stepIndex < 2 ? 0.35 : 1}
        />
      ))}

      {/* labels */}
      {showLabels &&
        proj.points
          .filter((p) => p.label)
          .filter((p, i, arr) => arr.findIndex((q) => q.id === p.id) === i)
          .slice(0, 14)
          .map((p) => {
            const active = selectedPoint === p.id;
            return (
              <g
                key={p.id}
                onClick={() => set({ selectedPoint: active ? null : p.id })}
                style={{ cursor: "pointer" }}
              >
                <circle cx={X(p.x)} cy={Y(p.y)} r={active ? 5 : 3} fill={active ? "#fbbf24" : "#22d3ee"} stroke="#020617" strokeWidth={1} />
                <text
                  x={X(p.x) + 8}
                  y={Y(p.y) - 6}
                  fill={active ? "#fbbf24" : "#a5f3fc"}
                  fontSize={11}
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

      {/* dimensions */}
      {showDims && (
        <g>
          {diaMM !== undefined && (
            <DimArrow
              x1={X(proj.bounds.minX + 2)}
              y1={Y(proj.bounds.maxY) + 26}
              x2={X(proj.bounds.maxX - 2)}
              y2={Y(proj.bounds.maxY) + 26}
              label={view === "front" && solid.kind === "cone" ? `⌀${dimLabel(diaMM)}` : dimLabel(diaMM)}
            />
          )}
          <DimArrow
            x1={X(proj.bounds.maxX) + 26}
            y1={Y(proj.bounds.minY)}
            x2={X(proj.bounds.maxX) + 26}
            y2={Y(proj.bounds.maxY)}
            label={dimLabel(heightMM)}
            vertical
          />
          {(solid.parsed.inclinations.VP !== undefined || solid.parsed.inclinations.HP !== undefined) && (
            <text x={14} y={H - 12} fill="#f9a8d4" fontSize={11} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
              {solid.parsed.inclinations.HP !== undefined ? `${solid.parsed.inclinations.HP}° HP ` : ""}
              {solid.parsed.inclinations.VP !== undefined ? `${solid.parsed.inclinations.VP}° VP` : ""}
            </text>
          )}
          <text x={14} y={18} fill="#64748b" fontSize={10} fontFamily="JetBrains Mono, monospace">
            {view.toUpperCase()} VIEW • {scale}
          </text>
        </g>
      )}
      {showXY && null}
    </svg>
  );
}
