import type { ProjectionMethod, ProjectionResult, ViewKind } from "@/types";

/**
 * View layout engine: positions front/top/side views per projection standard.
 *
 * FIRST angle  (object between observer and plane):
 *   FRONT top, TOP below front (shared X), RIGHT-side view LEFT of front.
 * THIRD angle (plane between observer and object):
 *   TOP above, FRONT below (shared X), RIGHT-side view RIGHT of front.
 *
 * The 2D geometry itself is identical — only arrangement changes.
 */

export interface Arranged {
  s: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  xyY: number;
  sideOnLeft: boolean;
  sideLabel: string;
  W: number;
  H: number;
}

export function layoutViews(
  front: ProjectionResult,
  top: ProjectionResult,
  side: ProjectionResult,
  method: ProjectionMethod,
  W: number,
  H: number,
  opts?: { focus?: "all" | ViewKind; margin?: number }
): Arranged {
  const focus = opts?.focus ?? "all";
  const m = opts?.margin ?? 50;

  if (focus !== "all") {
    const b = focus === "front" ? front.bounds : focus === "top" ? top.bounds : side.bounds;
    const s = Math.min((W - m * 2) / b.w, (H - m * 2) / b.h);
    const ox = (W - b.w * s) / 2 - b.minX * s;
    const oy = (H - b.h * s) / 2 - b.minY * s;
    return { s, fx: ox, fy: oy, tx: ox, ty: oy, sx: ox, sy: oy, xyY: -1e9, sideOnLeft: false, sideLabel: "SIDE", W, H };
  }

  const gapU = Math.max(16, Math.max(front.bounds.w, top.bounds.w) * 0.4);
  const gapX = Math.max(16, front.bounds.w * 0.5);
  const colW = Math.max(front.bounds.w, top.bounds.w);
  const totalW = colW + gapX + side.bounds.w;
  const totalH = method === "first"
    ? front.bounds.h + gapU + top.bounds.h
    : top.bounds.h + gapU + front.bounds.h;
  const s = Math.min((W - m * 2) / totalW, (H - m * 2) / totalH);

  const colX = (W - totalW * s) / 2; // left edge of front/top column
  const gridTop = (H - totalH * s) / 2;

  if (method === "first") {
    const colLeft = colX + (side.bounds.w + gapX) * s;
    const fy = gridTop - front.bounds.minY * s;
    const fx = colLeft - front.bounds.minX * s;
    const ty = gridTop + (front.bounds.h + gapU) * s - top.bounds.minY * s;
    const tx = colLeft - top.bounds.minX * s;
    const sx = colX - side.bounds.minX * s;
    const sy = gridTop + ((front.bounds.h - side.bounds.h) / 2) * s - side.bounds.minY * s;
    const xyY = gridTop + front.bounds.h * s + (gapU * s) / 2;
    return { s, fx, fy, tx, ty, sx, sy, xyY, sideOnLeft: true, sideLabel: "RIGHT SIDE (view from right)", W, H };
  }

  // third angle: top above, front below, side right of front
  const ty = gridTop - top.bounds.minY * s;
  const tx = colX - top.bounds.minX * s;
  const fy = gridTop + (top.bounds.h + gapU) * s - front.bounds.minY * s;
  const fx = colX - front.bounds.minX * s;
  const sx = colX + (colW + gapX) * s - side.bounds.minX * s;
  const sy = fy + ((front.bounds.h - side.bounds.h) / 2) * s;
  const xyY = gridTop + top.bounds.h * s + (gapU * s) / 2;
  return { s, fx, fy, tx, ty, sx, sy, xyY, sideOnLeft: false, sideLabel: "RIGHT SIDE (view from right)", W, H };
}

/** Standard projection symbol description (drawn as truncated-cone glyph by callers). */
export function methodInfo(method: ProjectionMethod): { title: string; blurb: string } {
  if (method === "first") {
    return {
      title: "First-Angle Projection",
      blurb: "The object sits between you and the drawing plane — front above XY, top below, right-side view on the left.",
    };
  }
  return {
    title: "Third-Angle Projection",
    blurb: "The drawing plane sits between you and the object — top above, front below, right-side view on the right.",
  };
}
