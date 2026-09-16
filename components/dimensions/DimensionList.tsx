"use client";
import { useStore } from "@/store/useStore";
import { formatDim, formatDia } from "@/lib/units/units";
import { keySegments, trueVsProjected } from "@/lib/projection/dimensionEngine";

/** Dimension readouts always derived from the shared solid (mm internal). Clicking a chip highlights the linked geometry. */
export default function DimensionList() {
  const solid = useStore((s) => s.solid);
  const unit = useStore((s) => s.unit);
  const set = useStore((s) => s.set);
  const selectedPoint = useStore((s) => s.selectedPoint);
  if (!solid) return null;

  const has = (id: string) => solid.vertices.some((v) => v.id === id);
  const apexId = has("apex") ? "apex" : has("top-center") ? "top-center" : null;
  const linkFor = (k: string): string | null => {
    if (k === "Diameter" || k === "Top ⌀") return has("base-center") ? "base-center" : null;
    if (k === "Height" || k === "Length") return apexId;
    if (k === "Side") return solid.vertices.find((v) => v.label && !["C", "O", "C'"].includes(v.label))?.id ?? null;
    if (k.startsWith("Angle")) return apexId;
    return null;
  };

  const items: [string, string][] = [];
  if (solid.radius !== undefined) items.push(["Diameter", formatDia(solid.radius * 2, unit)]);
  if (solid.kind === "frustum" && solid.parsed.dimensions.topDiameter !== undefined) {
    items.push(["Top ⌀", formatDia(solid.parsed.dimensions.topDiameter, unit)]);
  }
  if (solid.height !== undefined) items.push(["Height", formatDim(solid.height, unit)]);
  if (solid.length !== undefined && solid.kind === "line") items.push(["Length", formatDim(solid.length, unit)]);
  if (solid.parsed.inclinations.HP !== undefined) items.push(["Angle HP", `${solid.parsed.inclinations.HP}°`]);
  if (solid.parsed.inclinations.VP !== undefined) items.push(["Angle VP", `${solid.parsed.inclinations.VP}°`]);

  // true vs projected: only differs from true size when inclined to the view plane
  const truth = keySegments(solid).flatMap((sg) =>
    (["front", "top"] as const).map((v) => {
      const r = trueVsProjected(sg.a, sg.b, v);
      return { name: `${sg.name} (${v})`, ...r };
    })
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {items.map(([k, v]) => {
          const target = linkFor(k);
          return (
            <button
              key={k}
              title={target ? `Highlight linked geometry (${target})` : undefined}
              onClick={() => target && set({ selectedPoint: selectedPoint === target ? null : target })}
              className={`pressable rounded-lg border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 font-mono text-[11px] text-amber-100 ${target ? "cursor-pointer hover:border-amber-300/60" : "cursor-default"}`}
            >
              {k}: <b>{v}</b>
            </button>
          );
        })}
      </div>
      {truth.some((t) => t.foreshortened) && (
        <div className="rounded-xl border border-sky-300/25 bg-sky-300/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-sky-100/90">
          {truth
            .filter((t) => t.foreshortened)
            .map((t) => (
              <div key={t.name}>
                {t.name}: true <b>{t.trueMM.toFixed(1)} mm</b> → projected <b>{t.projMM.toFixed(1)} mm</b> (foreshortened — drawing shows the projection, dimension shows the truth)
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
