import type { Vec3 } from "@/types";

/**
 * Trace engine: HT (plane ∩ HP) and VT (plane ∩ VP) from the true
 * 3D plane equation. Returns null when the plane is parallel
 * (a parallel plane never meets that reference plane — "no HT/VT").
 */

export interface TraceLine {
  /** a point on the trace (mm, 3D) */
  p: Vec3;
  /** unit direction of the trace (mm, 3D) */
  d: Vec3;
}

export interface Traces {
  ht: TraceLine | null;
  vt: TraceLine | null;
}

const EPS = 1e-9;

function norm3(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z) || 1;
}

function unit(a: Vec3): Vec3 {
  const n = norm3(a);
  return { x: a.x / n, y: a.y / n, z: a.z / n };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

/** HT: intersection with HP (z = 0). Direction = n × ẑ. Null iff plane ∥ HP. */
function horizontalTrace(n: Vec3, q: Vec3): TraceLine | null {
  if (Math.hypot(n.x, n.y) < EPS) return null; // normal ∥ ẑ ⇒ plane parallel to HP
  const d = unit(cross(n, { x: 0, y: 0, z: 1 }));
  // point on plane with z = 0: n.x(px−qx) + n.y(py−qy) − n.z·qz = 0
  let p: Vec3;
  if (Math.abs(n.y) >= Math.abs(n.x)) {
    p = { x: q.x, y: q.y + (n.z * q.z) / n.y, z: 0 };
  } else {
    p = { x: q.x + (n.z * q.z) / n.x, y: q.y, z: 0 };
  }
  return { p, d };
}

/** VT: intersection with VP (y = 0). Direction = n × ŷ. Null iff plane ∥ VP. */
function verticalTrace(n: Vec3, q: Vec3): TraceLine | null {
  if (Math.hypot(n.x, n.z) < EPS) return null; // normal ∥ ŷ ⇒ plane parallel to VP
  const d = unit(cross(n, { x: 0, y: 1, z: 0 }));
  // point on plane with y = 0: n.x(px−qx) − n.y·qy + n.z(pz−qz) = 0
  let p: Vec3;
  if (Math.abs(n.x) >= Math.abs(n.z)) {
    p = { x: q.x + (n.y * q.y) / n.x, y: 0, z: q.z };
  } else {
    p = { x: q.x, y: 0, z: q.z + (n.y * q.y) / n.z };
  }
  return { p, d };
}

export function computeTraces(normal: Vec3, pointOnPlane: Vec3): Traces {
  const n = unit(normal);
  return { ht: horizontalTrace(n, pointOnPlane), vt: verticalTrace(n, pointOnPlane) };
}

/** Is the trace horizontal (parallel to XY) in its drawing view? */
export function traceAngleXY(t: TraceLine, view: "front" | "top"): number {
  const a = view === "front" ? { x: t.d.x, y: t.d.z } : { x: t.d.x, y: -t.d.y };
  return (Math.atan2(a.y, a.x) * 180) / Math.PI;
}
