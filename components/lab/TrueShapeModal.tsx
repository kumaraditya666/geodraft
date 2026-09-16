"use client";
import { useMemo } from "react";
import { X as XIcon } from "lucide-react";
import type { BuiltSolid } from "@/types";
import { trueShapeOf } from "@/lib/geometry/lamina/index";
import { dist2 } from "@/lib/geometry/lamina/Lamina";

/** TRUE SHAPE modal: the lamina's exact flat geometry with measured edge lengths. */
export default function TrueShapeModal({ solid, onClose }: { solid: BuiltSolid; onClose: () => void }) {
  const { shape, notes } = useMemo(() => trueShapeOf(solid.parsed), [solid]);
  const W = 460;
  const H = 380;
  const xs = shape.points.map((p) => p.x);
  const ys = shape.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const s = Math.min((W - 120) / Math.max(1, maxX - minX), (H - 120) / Math.max(1, maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2 - minX * s;
  const oy = (H - (maxY - minY) * s) / 2;
  const X = (x: number) => x * s + ox;
  // flip Y so shape-up stays up on screen
  const Yf = (y: number) => oy + (maxY - y) * s;

  const poly = shape.points.map((p) => `${X(p.x)},${Yf(p.y)}`).join(" ");
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[#f8fafc] p-5 text-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">True shape — undistorted</div>
            <div className="font-display text-lg font-bold">{shape.kind}</div>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5"><XIcon size={15} /></button>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full rounded-xl border border-slate-300 bg-white">
          <polygon points={poly} fill="rgba(14,116,144,0.08)" stroke="#0f172a" strokeWidth={2} strokeLinejoin="round" />
          {shape.edges.map(([a, b], i) => {
            const mx = (X(shape.points[a].x) + X(shape.points[b].x)) / 2;
            const my = (Yf(shape.points[a].y) + Yf(shape.points[b].y)) / 2;
            return (
              <text key={i} x={mx} y={my - 6} fill="#b45309" fontSize={11} fontWeight={700} textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                {dist2(shape.points[a], shape.points[b]).toFixed(1)}
              </text>
            );
          })}
          {shape.points.map((p, i) => (
            <g key={i}>
              <circle cx={X(p.x)} cy={Yf(p.y)} r={3} fill="#0e7490" />
              {i < 8 && (
                <text x={X(p.x) + 7} y={Yf(p.y) - 5} fill="#0e7490" fontSize={11} fontWeight={700} fontFamily="JetBrains Mono, monospace">
                  {abc[i]}
                </text>
              )}
            </g>
          ))}
          {shape.diagonals.map(([a, b], i) => (
            <line
              key={`d${i}`}
              x1={X(shape.points[a].x)} y1={Yf(shape.points[a].y)}
              x2={X(shape.points[b].x)} y2={Yf(shape.points[b].y)}
              stroke="#be185d" strokeWidth={1.2} strokeDasharray="5 4"
            />
          ))}
          {shape.diagonals.length > 0 && (
            <text x={12} y={H - 12} fill="#be185d" fontSize={11} fontFamily="JetBrains Mono, monospace">
              diagonals: {shape.diagonals.map(([a, b]) => dist2(shape.points[a], shape.points[b]).toFixed(1)).join(" / ")} mm
            </text>
          )}
        </svg>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">
          Every edge measured from true coordinates (mm). Pink dashes = diagonals.
        </p>
        {notes.map((n) => (
          <p key={n} className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-800">{n}</p>
        ))}
      </div>
    </div>
  );
}
