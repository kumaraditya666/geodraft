import type { BuiltSolid, Edge3D, Vec3, ViewKind } from "@/types";

/**
 * Visibility kernel: which faces point toward the observer,
 * and therefore which edges are visible (solid) vs hidden (dashed).
 * Pure function of the 3D faces + viewing direction — never hardcoded per solid.
 */

export function viewNormal(view: ViewKind): Vec3 {
  if (view === "front") return { x: 0, y: 1, z: 0 }; // observer at +Y
  if (view === "top") return { x: 0, y: 0, z: 1 }; // observer at +Z
  return { x: 1, y: 0, z: 0 }; // right-side observer at +X
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** A face is visible when its outward normal has a positive component toward the observer. */
export function isFaceVisible(normal: Vec3, view: ViewKind): boolean {
  return dot(normal, viewNormal(view)) > 1e-9;
}

export function faceVisibility(solid: BuiltSolid, view: ViewKind): boolean[] {
  return solid.faces.map((f) => isFaceVisible(f.normal, view));
}

export type EdgeClass = "visible" | "hidden" | "skip";

/**
 * Classify an edge for a view:
 * - silhouetteOnly (smooth surfaces): render only the silhouette rim —
 *   exactly one adjacent face toward the observer (visible), or both away (hidden far side).
 *   Interior facet edges where both faces are visible are skipped (not outlines).
 * - sharp: visible when any adjacent face is visible, hidden otherwise.
 */
export function classifyEdge(e: Edge3D, vis: boolean[]): EdgeClass {
  const vf = e.faces.map((fi) => vis[fi] ?? true);
  if (e.silhouetteOnly) {
    const hasVis = vf.some(Boolean);
    const hasHid = vf.some((x) => !x);
    if (hasVis && hasHid) return "visible";
    if (!hasVis && !hasHid) return "visible";
    if (hasVis) return "skip";
    return "hidden";
  }
  return vf.some(Boolean) ? "visible" : "hidden";
}
