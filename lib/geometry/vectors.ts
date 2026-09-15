import type { Vec3 } from "@/types";

export const v = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const normalize = (a: Vec3): Vec3 => {
  const n = norm(a) || 1;
  return { x: a.x / n, y: a.y / n, z: a.z / n };
};
export const deg = (d: number): number => (d * Math.PI) / 180;

/** Orthonormal basis (e1,e2) perpendicular to unit axis u */
export function basisForAxis(u: Vec3): { e1: Vec3; e2: Vec3 } {
  const up = Math.abs(u.z) < 0.9 ? v(0, 0, 1) : v(0, 1, 0);
  const e1 = normalize(cross(up, u));
  // cross gives perpendicular; ensure unit. If u parallel to up fallback:
  const e1n = norm(e1) < 1e-9 ? v(1, 0, 0) : normalize(e1);
  const e2 = normalize(cross(u, e1n));
  return { e1: e1n, e2 };
}

/**
 * Axis direction from engineering angles.
 * alphaHP = angle between axis line and HP plane (0=parallel, 90=perpendicular)
 * alphaVP = angle between axis line and VP plane
 * Uses direction cosines: |n| = sin(alphaHP), |m| = sin(alphaVP), l = sqrt(1-m^2-n^2)
 * Returns unit vector with +x dominant, +y (in front of VP), +z up.
 * Throws if impossible (sin^2 sum > 1).
 */
export function axisFromAngles(alphaHP?: number, alphaVP?: number): Vec3 {
  const aH = alphaHP ?? undefined;
  const aV = alphaVP ?? undefined;
  if (aH === undefined && aV === undefined) return v(0, 0, 1); // standing vertical
  const sH = aH !== undefined ? Math.sin(deg(aH)) : 0;
  const sV = aV !== undefined ? Math.sin(deg(aV)) : 0;
  // If only VP given -> axis parallel to HP (n=0), inclined to VP
  // If only HP given -> axis parallel to VP in elevation (l dominant, m=0)
  let m: number, n: number, l: number;
  if (aH !== undefined && aV !== undefined) {
    m = Math.abs(sV);
    n = Math.abs(sH);
    const rem = 1 - m * m - n * n;
    if (rem < -1e-9) throw new Error("impossible-angles");
    l = Math.sqrt(Math.max(0, rem));
  } else if (aV !== undefined) {
    // parallel to HP
    n = 0;
    m = Math.abs(sV);
    l = Math.sqrt(Math.max(0, 1 - m * m));
  } else {
    // only HP: parallel to VP (m = 0), tilt in X-Z plane
    m = 0;
    n = Math.abs(sH);
    l = Math.sqrt(Math.max(0, 1 - n * n));
    // special: 90 deg => vertical
    if (aH !== undefined && Math.abs(aH - 90) < 1e-9) return v(0, 0, 1);
  }
  // For VP angle: 0 => along X (parallel VP), 90 => along Y (perpendicular)
  return normalize(v(l, m, n));
}

export function bboxOf(points: Vec3[]): { min: Vec3; max: Vec3; size: Vec3 } {
  let min = v(Infinity, Infinity, Infinity);
  let max = v(-Infinity, -Infinity, -Infinity);
  for (const p of points) {
    min = v(Math.min(min.x, p.x), Math.min(min.y, p.y), Math.min(min.z, p.z));
    max = v(Math.max(max.x, p.x), Math.max(max.y, p.y), Math.max(max.z, p.z));
  }
  return { min, max, size: sub(max, min) };
}
