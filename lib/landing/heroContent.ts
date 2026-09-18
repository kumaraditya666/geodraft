import { parseEngineeringQuestion } from "@/lib/parser/engineeringParser";
import { buildSolid } from "@/lib/geometry/solids";
import { buildProjection, projectedLength } from "@/lib/projection/projectionEngine";
import { trueLength } from "@/lib/projection/angleEngine";
import { trueDims } from "@/lib/projection/dimensionEngine";
import type { BuiltSolid } from "@/types";

/**
 * Hero display content. The canonical demo solid + PROJECT views come from
 * the REAL engine (same pipeline as the visualizer). Morph shapes reuse real
 * example presets where they exist; the rest are documented display values.
 */

export const CANONICAL_Q =
  "A cone of base diameter 50 mm and height 70 mm rests on HP. Its axis makes 30° with VP. Draw its orthographic projections.";

let cache: BuiltSolid | null = null;
export function canonicalSolid(): BuiltSolid {
  if (!cache) cache = buildSolid(parseEngineeringQuestion(CANONICAL_Q));
  return cache;
}

export interface MorphShape {
  key: string;
  label: string;
  dims: string;
  kind: "cone" | "cylinder" | "sphere" | "pyramid" | "prism" | "hex" | "plane" | "rhombus";
}

export const MORPHS: MorphShape[] = [
  { key: "cone", label: "CONE", dims: "Ø50 · H70 · α30°VP", kind: "cone" },
  { key: "cylinder", label: "CYLINDER", dims: "Ø40 · H60", kind: "cylinder" },
  { key: "sphere", label: "SPHERE", dims: "Ø50", kind: "sphere" },
  { key: "pyramid", label: "PYRAMID", dims: "SQ40 · H60", kind: "pyramid" },
  { key: "prism", label: "PRISM", dims: "HEX S30 · H65", kind: "prism" },
  { key: "hex", label: "HEX PLATE", dims: "S35", kind: "hex" },
  { key: "plane", label: "LAMINA", dims: "60 × 40", kind: "plane" },
  { key: "rhombus", label: "RHOMBUS", dims: "60 × 40 diag", kind: "rhombus" },
];

/** Display dims sourced from real example presets (verified in tests). */
export function morphSource(key: string): { dims: string; exampleId: string | null } {
  const table: Record<string, { dims: string; exampleId: string | null }> = {
    cone: { dims: "Ø50 · H70 · α30°VP", exampleId: "cone-vp30" },
    cylinder: { dims: "Ø40 · H60", exampleId: "cyl-hp" },
    sphere: { dims: "Ø50", exampleId: null }, // display canonical; no sphere example exists
    pyramid: { dims: "SQ40 · H60", exampleId: "pyr-hp" },
    prism: { dims: "HEX S30 · H65", exampleId: "prism-hp" },
    hex: { dims: "S35", exampleId: "hex-3540" },
    plane: { dims: "60 × 40", exampleId: "plane-hp" },
    rhombus: { dims: "60 × 40 diag", exampleId: "rhombus-sq" },
  };
  const row = table[key];
  if (!row) throw new Error(`unknown morph ${key}`);
  return row;
}

export interface EdgeFacts {
  name: string;
  trueMM: number;
  frontMM: number;
  topMM: number;
}

/** Apex→rim edge of the canonical cone: true + projected lengths from the engine. */
export function canonicalEdgeFacts(): EdgeFacts {
  const s = canonicalSolid();
  const apex = s.apex!;
  const rim = s.vertices.find((v) => v.id === "rim-0")!.p;
  return {
    name: "EDGE apex–rim",
    trueMM: trueLength(apex, rim),
    frontMM: projectedLength(apex, rim, "front"),
    topMM: projectedLength(apex, rim, "top"),
  };
}

export interface EngineStatus {
  ok: boolean;
  detail: string;
}

/** Honest self-test: runs the real pipeline on the canonical question. */
export function engineStatus(): EngineStatus {
  try {
    const s = canonicalSolid();
    const f = buildProjection(s, "front").segments.length;
    const t = buildProjection(s, "top").segments.length;
    const d = buildProjection(s, "side").segments.length;
    const dims = trueDims(s, "mm").length;
    const ok = f > 0 && t > 0 && d > 0 && dims > 0 && s.vertices.length > 0;
    return {
      ok,
      detail: ok
        ? `PARSER OK · GEOMETRY OK (${s.vertices.length}v) · PROJECTION OK (${f}/${t}/${d}) · DIMS OK (${dims})`
        : "PIPELINE FAULT — see console",
    };
  } catch (e) {
    return { ok: false, detail: `FAULT: ${e instanceof Error ? e.message : "unknown"}` };
  }
}
