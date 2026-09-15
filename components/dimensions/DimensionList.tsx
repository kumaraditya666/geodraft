"use client";
import { useStore } from "@/store/useStore";
import { formatDim, formatDia } from "@/lib/units/units";

/** Dimension readouts always derived from the shared solid (mm internal). */
export default function DimensionList() {
  const solid = useStore((s) => s.solid);
  const unit = useStore((s) => s.unit);
  if (!solid) return null;
  const items: [string, string][] = [];
  if (solid.radius !== undefined) items.push(["Diameter", formatDia(solid.radius * 2, unit)]);
  if (solid.height !== undefined) items.push(["Height", formatDim(solid.height, unit)]);
  if (solid.length !== undefined) items.push(["Length", formatDim(solid.length, unit)]);
  if (solid.parsed.inclinations.HP !== undefined) items.push(["Angle HP", `${solid.parsed.inclinations.HP}°`]);
  if (solid.parsed.inclinations.VP !== undefined) items.push(["Angle VP", `${solid.parsed.inclinations.VP}°`]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([k, v]) => (
        <span key={k} className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 font-mono text-[11px] text-amber-100">
          {k}: <b>{v}</b>
        </span>
      ))}
    </div>
  );
}
