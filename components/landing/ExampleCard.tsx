"use client";
import { useMemo } from "react";
import type { ExampleItem } from "@/lib/examples";
import { buildSolid } from "@/lib/geometry/solids";
import { buildProjection } from "@/lib/projection/projectionEngine";
import { trueShapeOf } from "@/lib/geometry/lamina/index";

/**
 * Example card preview rendered from the example's REAL structured
 * parameters through the real geometry + projection engine.
 * Plane examples show the true-shape polygon; solids show the true
 * front-elevation outline proportions. Hover sweeps a projector line.
 */
export default function ExampleCard({ ex, onOpen }: { ex: ExampleItem; onOpen: (id: string) => void }) {
  const preview = useMemo(() => {
    try {
      if (ex.preset.solid === "plane") {
        const { shape } = trueShapeOf(ex.preset);
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const W = 120;
        const H = 64;
        const s = Math.min(W / Math.max(1, maxX - minX), H / Math.max(1, maxY - minY)) * 0.8;
        const ox = W / 2 - ((minX + maxX) / 2) * s;
        const oy = H / 2 + ((minY + maxY) / 2) * s;
        const pts = shape.points.map((p) => `${p.x * s + ox},${oy - p.y * s}`).join(" ");
        return { kind: "poly" as const, W, H, pts };
      }
      const solid = buildSolid(ex.preset);
      const proj = buildProjection(solid, "front");
      const b = proj.bounds;
      const W = 120;
      const H = 64;
      const s = Math.min(W / b.w, H / b.h) * 0.8;
      const ox = W / 2 - ((b.minX + b.maxX) / 2) * s;
      const oy = H / 2 - ((b.minY + b.maxY) / 2) * s;
      const segs = proj.segments
        .filter((sg) => sg.visible)
        .slice(0, 60)
        .map((sg) => ({ x1: sg.a.x * s + ox, y1: sg.a.y * s + oy, x2: sg.b.x * s + ox, y2: sg.b.y * s + oy }));
      return { kind: "segs" as const, W, H, segs };
    } catch {
      return null;
    }
  }, [ex]);

  const d = ex.preset.dimensions;
  const dimTxt = [
    d.diameter !== undefined ? `⌀${d.diameter}` : null,
    d.side !== undefined ? `${d.side}mm` : null,
    d.height !== undefined ? `${d.height}mm` : null,
    d.length !== undefined ? `${d.length}mm` : null,
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");

  return (
    <button
      onClick={() => onOpen(ex.id)}
      className="glass group cursor-pointer rounded-xl p-3 text-left transition hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-cyan-300/5 hover:shadow-[0_10px_36px_rgba(34,211,238,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
    >
      <div className="relative h-16 overflow-hidden rounded-lg border border-white/5 bg-black/40">
        {preview?.kind === "poly" && (
          <svg viewBox={`0 0 ${preview.W} ${preview.H}`} className="h-full w-full">
            <polygon points={preview.pts} fill="rgba(34,211,238,0.10)" stroke="#7dd3fc" strokeWidth={1.4} strokeLinejoin="round" />
          </svg>
        )}
        {preview?.kind === "segs" && (
          <svg viewBox={`0 0 ${preview.W} ${preview.H}`} className="h-full w-full">
            {preview.segs.map((sg, i) => (
              <line key={i} x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} stroke="#e8eef7" strokeWidth={1.4} strokeLinecap="round" />
            ))}
          </svg>
        )}
        {/* hover projector sweep */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-cyan-300/0 transition-opacity duration-200 group-hover:animate-[card-sweep_1.1s_linear_infinite] group-hover:bg-cyan-300/80" />
        <div className="absolute bottom-1 right-1.5 font-mono text-[9px] text-amber-200/90">{dimTxt}</div>
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">{ex.tag}</div>
      <div className="mt-0.5 text-[13px] font-semibold leading-snug text-slate-100 group-hover:text-cyan-100">{ex.title}</div>
      <div className="mt-1 font-mono text-[10px] text-cyan-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        View Example →
      </div>
    </button>
  );
}
