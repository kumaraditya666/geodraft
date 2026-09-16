import type { BuiltSolid, ViewKind } from "@/types";
import { projectPoint } from "./projectionEngine";

/**
 * Center-line engine: axis projections + circular-feature centers,
 * drawn with the long-short chain convention (— · — · —).
 */

export interface CenterSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Axis center line (baseCenter → apex/topCenter) extended 25% each end, in mm coords. */
export function axisCenterLine(solid: BuiltSolid, view: ViewKind): CenterSeg | null {
  if (solid.kind === "line" || solid.kind === "box") return null;
  const tip = solid.apex ?? solid.topCenter;
  if (!tip) return null;
  const a = projectPoint(solid.baseCenter, view);
  const b = projectPoint(tip, view);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 1e-9) {
    // axis end-on: draw a center cross at the point
    const r = 7;
    return { x1: a.x - r, y1: a.y, x2: a.x + r, y2: a.y };
  }
  const ex = 0.25;
  return { x1: a.x - dx * ex, y1: a.y - dy * ex, x2: b.x + dx * ex, y2: b.y + dy * ex };
}

/** Center crosses for circular rims seen in a view (base/top centers). */
export function centerCrosses(solid: BuiltSolid, view: ViewKind): { x: number; y: number }[] {
  if (solid.kind !== "cone" && solid.kind !== "cylinder" && solid.kind !== "frustum" && solid.kind !== "hemisphere" && solid.kind !== "sphere") return [];
  const pts = [solid.baseCenter];
  if (solid.topCenter) pts.push(solid.topCenter);
  return pts.map((p) => projectPoint(p, view));
}

export const CENTER_DASH = "16 4 3 4";
