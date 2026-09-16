import type { BuiltSolid, Vec3, ViewKind } from "@/types";
import { projectedLength } from "./projectionEngine";
import { trueLength } from "./angleEngine";

/**
 * Dimension engine: every dimension value originates from the source
 * 3D parameters (mm). Nothing is estimated from pixels or hardcoded.
 */

export interface DimSpec {
  id: string;
  label: string;
  trueMM: number;
  kind: "diameter" | "radius" | "height" | "length" | "width" | "side" | "angle" | "axis";
}

export function trueDims(solid: BuiltSolid, unit: "mm" | "cm" | "m"): DimSpec[] {
  const d = solid.parsed.dimensions;
  const out: DimSpec[] = [];
  const push = (id: DimSpec["id"], label: string, trueMM: number, kind: DimSpec["kind"]) =>
    out.push({ id, label: `${label}${fmt(trueMM, unit)}`, trueMM, kind });
  if (solid.radius !== undefined) {
    const dia = solid.kind === "hemisphere" || solid.kind === "sphere" ? solid.radius * 2 : solid.radius * 2;
    push("dia", "⌀", dia, "diameter");
  }
  if (solid.kind === "frustum" && d.topDiameter !== undefined) {
    push("topdia", "⌀top ", d.topDiameter, "diameter");
  }
  if (solid.height !== undefined) push("h", "", solid.height, solid.kind === "line" ? "length" : "height");
  if (solid.length !== undefined && solid.kind === "line") push("len", "", solid.length, "length");
  if (d.width !== undefined && solid.kind === "plane") push("w", "", d.width, "width");
  if (d.length !== undefined && solid.kind === "plane") push("l", "", d.length, "length");
  if (d.side !== undefined || d.edge !== undefined) push("side", "", d.side ?? (d.edge as number), "side");
  if (solid.parsed.inclinations.HP !== undefined) push("ahp", "", solid.parsed.inclinations.HP, "angle");
  if (solid.parsed.inclinations.VP !== undefined) push("avp", "", solid.parsed.inclinations.VP, "angle");
  return out;
}

function fmt(mm: number, unit: "mm" | "cm" | "m"): string {
  if (unit === "cm") return `${Math.round((mm / 10) * 10) / 10} cm`;
  if (unit === "m") return `${Math.round((mm / 1000) * 100) / 100} m`;
  return `${Math.round(mm)} mm`;
}

/** True vs projected length of a 3D segment in a view (both mm, computed). */
export function trueVsProjected(a: Vec3, b: Vec3, view: ViewKind): { trueMM: number; projMM: number; foreshortened: boolean } {
  const trueMM = trueLength(a, b);
  const projMM = projectedLength(a, b, view);
  return { trueMM, projMM, foreshortened: projMM < trueMM - 1e-6 };
}

/** Key measurable segments of a solid: axis/height + (for lines) the line itself. */
export function keySegments(solid: BuiltSolid): { id: string; a: Vec3; b: Vec3; name: string }[] {
  const segs: { id: string; a: Vec3; b: Vec3; name: string }[] = [];
  const tip = solid.apex ?? solid.topCenter;
  if (tip && (solid.height !== undefined || solid.length !== undefined)) {
    segs.push({ id: "axis", a: solid.baseCenter, b: tip, name: "Axis / height" });
  }
  if (solid.kind === "line" && solid.vertices.length >= 2) {
    segs.push({ id: "line", a: solid.vertices[0].p, b: solid.vertices[1].p, name: "Line AB" });
  }
  return segs;
}
