"use client";
import { useMemo } from "react";
import type { ReactNode } from "react";
import type { BuiltSolid } from "@/types";
import { trueDims } from "@/lib/projection/dimensionEngine";
import { measuredAngles } from "@/lib/projection/angleEngine";
import { trueShapeOf } from "@/lib/geometry/lamina/index";
import { useStore } from "@/store/useStore";

/** Shoelace area of the true-shape polygon (rigid motions preserve area). */
function laminaArea(solid: BuiltSolid): number | null {
  try {
    if (solid.kind !== "plane") return null;
    const { shape } = trueShapeOf(solid.parsed);
    if (shape.kind === "circle" || shape.kind === "semicircle") {
      const r = (shape.dims.diameter ?? 50) / 2;
      const full = Math.PI * r * r;
      return shape.kind === "circle" ? full : full / 2;
    }
    const pts = shape.points;
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a) / 2;
  } catch {
    return null;
  }
}

/** Technical inspector: only values actually calculated from the live model. */
export default function ModelInspector({ solid }: { solid: BuiltSolid }) {
  const unit = useStore((s) => s.unit);
  const data = useMemo(() => {
    const dims = trueDims(solid, unit);
    const m = measuredAngles(solid.axisDir);
    const minZ = Math.min(...solid.vertices.map((v) => v.p.z));
    const minY = Math.min(...solid.vertices.map((v) => v.p.y));
    const area = laminaArea(solid);
    return { dims, m, minZ, minY, area };
  }, [solid, unit]);

  const dimName = (kind: string): string =>
    kind === "diameter" ? "Diameter" : kind === "height" ? "Height" : kind === "length" ? "Length" : kind === "side" ? "Side" : kind === "angle" ? "Angle" : "Width";

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <Section title="Geometry">
        <Row k="Type" v={solid.kind.toUpperCase()} />
        <Row k="Vertices" v={`${solid.vertices.length}`} />
        <Row k="Edges" v={`${solid.edges.length}`} />
        {data.dims.map((d) => (
          <Row key={d.id} k={dimName(d.kind)} v={d.label} />
        ))}
        {data.area !== null && <Row k="Area" v={`${Math.round(data.area * 10) / 10} mm²`} />}
      </Section>
      <Section title="Orientation">
        <Row k="Centroid" v={`(${Math.round(solid.baseCenter.x)}, ${Math.round(solid.baseCenter.y)}, ${Math.round(solid.baseCenter.z)})`} />
        <Row k="Incl. HP" v={`${data.m.withHP.toFixed(1)}°`} />
        <Row k="Incl. VP" v={`${data.m.withVP.toFixed(1)}°`} />
      </Section>
      <Section title="Reference">
        <Row k="HP" v={Math.abs(data.minZ) < 1e-6 ? "✓ touches" : `${data.minZ.toFixed(1)} mm off`} />
        <Row k="VP" v={Math.abs(data.minY) < 0.02 ? "✓ touches" : `${data.minY.toFixed(1)} mm off`} />
        <Row k="XY" v="✓ reference" />
      </Section>
      <p className="font-mono text-[10.5px] leading-relaxed text-slate-500">
        Inclinations measured from the true 3D direction; contacts from vertex coordinates.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="mt-1.5 space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-[12.5px]">
      <span className="text-slate-500">{k}</span>
      <span className="font-mono font-bold text-slate-200">{v}</span>
    </div>
  );
}
