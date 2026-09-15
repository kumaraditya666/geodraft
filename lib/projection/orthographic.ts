import type { BuiltSolid, ProjPoint2D, ProjectionResult, Vec3, ViewKind } from "@/types";

export function projectToFrontView(p: Vec3): { x: number; y: number } {
  // Front = elevation onto VP: (x, z). y (depth) collapses.
  return { x: p.x, y: p.z };
}

export function projectToTopView(p: Vec3): { x: number; y: number } {
  // Top = plan onto HP: (x, y). In drawing, y points downward below XY.
  return { x: p.x, y: -p.y };
}

export function projectToSideView(p: Vec3): { x: number; y: number } {
  // Right side view: (y, z) — depth horizontal, height vertical
  return { x: -p.y, y: p.z };
}

export function projectPoint(p: Vec3, view: ViewKind): { x: number; y: number } {
  if (view === "front") return projectToFrontView(p);
  if (view === "top") return projectToTopView(p);
  return projectToSideView(p);
}

function viewNormal(view: ViewKind): Vec3 {
  if (view === "front") return { x: 0, y: 1, z: 0 }; // observer at +Y
  if (view === "top") return { x: 0, y: 0, z: 1 }; // observer at +Z
  return { x: 1, y: 0, z: 0 }; // right side observer at +X
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Face visibility: normal points toward observer */
export function faceVisibleForView(normal: Vec3, view: ViewKind): boolean {
  const n = viewNormal(view);
  return dot(normal, n) > 1e-9;
}

export function buildProjection(solid: BuiltSolid, view: ViewKind): ProjectionResult {
  const pts: ProjPoint2D[] = solid.vertices.map((vp) => {
    const q = projectPoint(vp.p, view);
    return { id: vp.id, label: vp.label, x: q.x, y: q.y, visible: true, source: vp.p };
  });
  const byIndex = (i: number) => pts[i];

  const faceVis = solid.faces.map((f) => faceVisibleForView(f.normal, view));

  // Special-case: sphere -> circle outline in each view
  if (solid.kind === "sphere" && solid.radius) {
    const c = solid.baseCenter;
    const q = projectPoint(c, view);
    const r = solid.radius;
    // approximate circle as polygon segments for SVG
    const N = 48;
    const segs = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      segs.push({
        id: `circ-${i}`,
        a: { id: `c${i}`, label: "", x: q.x + Math.cos(a0) * r, y: q.y + Math.sin(a0) * r, visible: true, source: c },
        b: { id: `c${i + 1}`, label: "", x: q.x + Math.cos(a1) * r, y: q.y + Math.sin(a1) * r, visible: true, source: c },
        visible: true as boolean,
        kind: "outline" as const,
      });
    }
    return { view, points: pts, segments: segs, bounds: boundsOf(segs) };
  }

  // Special-case: line -> single segment always visible
  if (solid.kind === "line") {
    const a = byIndex(0);
    const b = byIndex(1);
    const seg = { id: "line", a, b, visible: true, kind: "outline" as const };
    return { view, points: pts, segments: [seg], bounds: boundsOf([seg]) };
  }

  const segments: ProjectionResult["segments"] = [];
  for (const e of solid.edges) {
    const visFaces = e.faces.map((fi) => faceVis[fi] ?? true);
    let render = true;
    let visible = true;
    if (e.silhouetteOnly) {
      // smooth surface: render only silhouette (one side visible, other hidden)
      const hasVis = visFaces.some(Boolean);
      const hasHid = visFaces.some((x) => !x);
      if (hasVis && hasHid) {
        render = true;
        visible = true;
      } else if (!hasVis && !hasHid) {
        render = true;
        visible = true;
      } else if (hasVis && !hasHid) {
        render = false; // interior, facing viewer — not an outline
      } else {
        // both hidden -> far-side silhouette, dashed
        render = true;
        visible = false;
      }
    } else if (e.sharp) {
      const anyVis = visFaces.some(Boolean);
      visible = anyVis;
      render = true;
    } else {
      visible = visFaces.some(Boolean);
      render = true;
    }
    if (!render) continue;
    const a = byIndex(e.a);
    const b = byIndex(e.b);
    // skip degenerate (projected to same point)
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) continue;
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

function boundsOf(segs: ProjectionResult["segments"]): ProjectionResult["bounds"] {
  if (!segs.length) return { minX: 0, minY: 0, maxX: 10, maxY: 10, w: 10, h: 10 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    for (const p of [s.a, s.b]) {
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
