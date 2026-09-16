import type { BuiltSolid, ProjPoint2D, ProjectionResult, Vec3, ViewKind } from "@/types";
import { classifyEdge, faceVisibility } from "./visibility";

/**
 * Canonical orthographic projection engine.
 * Input: 3D vertices/edges/faces + view direction.
 * Output: 2D projected points + classified segments + bounds.
 *
 * Convention (engineering, first-angle compatible):
 *   Front = elevation onto VP: (x, z)   — depth collapses
 *   Top   = plan onto HP:      (x, -y)  — height collapses (y drawn downward)
 *   Side  = right side view:   (-y, z)  — width collapses
 */

export function projectToFrontView(p: Vec3): { x: number; y: number } {
  return { x: p.x, y: p.z };
}

export function projectToTopView(p: Vec3): { x: number; y: number } {
  return { x: p.x, y: -p.y };
}

export function projectToSideView(p: Vec3): { x: number; y: number } {
  return { x: -p.y, y: p.z };
}

export function projectPoint(p: Vec3, view: ViewKind): { x: number; y: number } {
  if (view === "front") return projectToFrontView(p);
  if (view === "top") return projectToTopView(p);
  return projectToSideView(p);
}

/** 2D length of a projected 3D segment in a view (mm). Compare with true 3D length. */
export function projectedLength(a: Vec3, b: Vec3, view: ViewKind): number {
  const pa = projectPoint(a, view);
  const pb = projectPoint(b, view);
  return Math.hypot(pb.x - pa.x, pb.y - pa.y);
}

export function buildProjection(solid: BuiltSolid, view: ViewKind): ProjectionResult {
  const pts: ProjPoint2D[] = solid.vertices.map((vp) => {
    const q = projectPoint(vp.p, view);
    return { id: vp.id, label: vp.label, x: q.x, y: q.y, visible: true, source: vp.p };
  });
  const byIndex = (i: number) => pts[i];
  const vis = faceVisibility(solid, view);

  // Sphere: analytic circle outline (radius preserved in every orthographic view)
  if (solid.kind === "sphere" && solid.radius) {
    const c = solid.baseCenter;
    const q = projectPoint(c, view);
    const r = solid.radius;
    const N = 48;
    const segs: ProjectionResult["segments"] = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      segs.push({
        id: `circ-${i}`,
        a: { id: `c${i}`, label: "", x: q.x + Math.cos(a0) * r, y: q.y + Math.sin(a0) * r, visible: true, source: c },
        b: { id: `c${i + 1}`, label: "", x: q.x + Math.cos(a1) * r, y: q.y + Math.sin(a1) * r, visible: true, source: c },
        visible: true,
        kind: "outline",
      });
    }
    return { view, points: pts, segments: segs, bounds: boundsOf(segs) };
  }

  // Line: single segment, always visible
  if (solid.kind === "line") {
    const seg = { id: "line", a: byIndex(0), b: byIndex(1), visible: true, kind: "outline" as const };
    return { view, points: pts, segments: [seg], bounds: boundsOf([seg]) };
  }

  const segments: ProjectionResult["segments"] = [];
  for (const e of solid.edges) {
    const cls = classifyEdge(e, vis);
    if (cls === "skip") continue;
    const a = byIndex(e.a);
    const b = byIndex(e.b);
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) continue; // degenerate in this view
    const visible = cls === "visible";
    segments.push({
      id: e.id,
      a: { ...a, visible },
      b: { ...b, visible },
      visible,
      kind: visible ? "outline" : "hidden",
    });
  }
  return { view, points: pts, segments, bounds: boundsOf(segments) };
}

export function boundsOf(segs: ProjectionResult["segments"]): ProjectionResult["bounds"] {
  if (!segs.length) return { minX: 0, minY: 0, maxX: 10, maxY: 10, w: 10, h: 10 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sg of segs) {
    for (const p of [sg.a, sg.b]) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const pad = Math.max(4, Math.max(maxX - minX, maxY - minY) * 0.12);
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}
