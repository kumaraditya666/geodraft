import type { Vec3 } from "@/types";
import { norm, sub } from "@/lib/geometry/vectors";

/** True length of a 3D segment (mm). Apparent lengths come from projecting first. */
export function trueLength(a: Vec3, b: Vec3): number {
  return norm(sub(b, a));
}

/** Inclination of a line with HP (deg): asin(|dz| / true length). */
export function inclinationWithHP(a: Vec3, b: Vec3): number {
  const t = trueLength(a, b) || 1;
  return (Math.asin(Math.min(1, Math.abs(b.z - a.z) / t)) * 180) / Math.PI;
}

/** Inclination of a line with VP (deg): asin(|dy| / true length). */
export function inclinationWithVP(a: Vec3, b: Vec3): number {
  const t = trueLength(a, b) || 1;
  return (Math.asin(Math.min(1, Math.abs(b.y - a.y) / t)) * 180) / Math.PI;
}
