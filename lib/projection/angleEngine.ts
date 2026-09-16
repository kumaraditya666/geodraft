import type { BuiltSolid, Vec3, ViewKind } from "@/types";

/**
 * Angle engine: every displayed angle is MEASURED from the actual 3D
 * axis/edge direction — never copied from the question text.
 *
 * For a direction d (unit or not):
 *   angle with HP plane = asin(|dz| / |d|)
 *   angle with VP plane = asin(|dy| / |d|)
 *   azimuth on HP       = atan2(dy, dx)  (for the VP arc)
 */

export interface MeasuredAngles {
  withHP: number;
  withVP: number;
  azimuthDeg: number;
}

export function measuredAngles(dir: Vec3): MeasuredAngles {
  const n = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const withHP = (Math.asin(Math.min(1, Math.abs(dir.z) / n)) * 180) / Math.PI;
  const withVP = (Math.asin(Math.min(1, Math.abs(dir.y) / n)) * 180) / Math.PI;
  const azimuthDeg = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
  return { withHP, withVP, azimuthDeg };
}

/** Axis direction relevant for angle display (solid axis, or the line itself). */
export function displayAxis(solid: BuiltSolid): Vec3 {
  return solid.axisDir;
}

/** Points along an SVG arc from angle a0 to a1 (degrees) around (cx, cy). */
export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, n = 24): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** True 3D length of a segment (mm). */
export function trueLength(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export type { ViewKind };
