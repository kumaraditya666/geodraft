import type { BuiltSolid, ProjectionMethod } from "@/types";
import { buildProjection } from "./projectionEngine";
import { axisCenterLine, centerCrosses } from "./centerLineEngine";
import { trueDims } from "./dimensionEngine";

/**
 * Minimal DXF (R12-compatible ASCII) exporter.
 * Emits real vector entities — LINE, CIRCLE, ARC, POLYLINE, TEXT —
 * on engineering layers, in true millimeter coordinates.
 * Opens in AutoCAD as editable, zoomable, measurable geometry.
 */

const LAYERS = [
  "GEOMETRY_VISIBLE",
  "GEOMETRY_HIDDEN",
  "CENTER_LINES",
  "CONSTRUCTION",
  "DIMENSIONS",
  "TEXT",
  "REFERENCE",
  "ANGLES",
];

const f = (n: number): string => {
  const r = Math.round(n * 10000) / 10000;
  return `${r}`;
};

function layerTable(): string {
  let s = "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n8\n";
  for (const l of LAYERS) {
    s += `0\nLAYER\n2\n${l}\n70\n0\n62\n7\n6\nContinuous\n`;
  }
  s += "0\nENDTAB\n";
  s += "0\nTABLE\n2\nLTYPE\n70\n3\n";
  s += "0\nLTYPE\n2\nContinuous\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n";
  s += "0\nLTYPE\n2\nDASHED\n70\n0\n3\nDashed __ __ __\n72\n65\n73\n2\n40\n6.0\n49\n3.0\n49\n-3.0\n";
  s += "0\nLTYPE\n2\nCENTER\n70\n0\n3\nCenter ____ _ ____\n72\n65\n73\n4\n40\n12.0\n49\n8.0\n49\n-2.0\n49\n1.0\n49\n-2.0\n";
  s += "0\nENDTAB\n0\nENDSEC\n";
  return s;
}

function line(x1: number, y1: number, x2: number, y2: number, layer: string, ltype = "Continuous"): string {
  return `0\nLINE\n8\n${layer}\n6\n${ltype}\n10\n${f(x1)}\n20\n${f(y1)}\n30\n0.0\n11\n${f(x2)}\n21\n${f(y2)}\n31\n0.0\n`;
}

function circle(cx: number, cy: number, r: number, layer: string): string {
  return `0\nCIRCLE\n8\n${layer}\n10\n${f(cx)}\n20\n${f(cy)}\n30\n0.0\n40\n${f(r)}\n`;
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number, layer: string): string {
  return `0\nARC\n8\n${layer}\n10\n${f(cx)}\n20\n${f(cy)}\n30\n0.0\n40\n${f(r)}\n50\n${f(a0)}\n51\n${f(a1)}\n`;
}

function text(x: number, y: number, h: number, str: string, layer: string): string {
  const safe = str.replace(/\n/g, " ");
  return `0\nTEXT\n8\n${layer}\n10\n${f(x)}\n20\n${f(y)}\n30\n0.0\n40\n${f(h)}\n1\n${safe}\n`;
}

export interface DxfOptions {
  method: ProjectionMethod;
  unit: "mm" | "cm" | "m";
}

export function buildDXF(solid: BuiltSolid, opts: DxfOptions): string {
  const { method } = opts;
  const front = buildProjection(solid, "front");
  const top = buildProjection(solid, "top");
  const side = buildProjection(solid, "side");

  // Arrange views in mm space (same convention as the on-screen layout engine)
  const gap = Math.max(20, Math.max(front.bounds.w, top.bounds.w) * 0.45);
  const gapX = Math.max(20, front.bounds.w * 0.55);
  let e = "";

  const place = (
    view: "front" | "top" | "side",
    ox: number,
    oy: number
  ): void => {
    const proj = view === "front" ? front : view === "top" ? top : side;
    for (const sg of proj.segments) {
      const layer = sg.visible ? "GEOMETRY_VISIBLE" : "GEOMETRY_HIDDEN";
      const lt = sg.visible ? "Continuous" : "DASHED";
      e += line(sg.a.x + ox, sg.a.y + oy, sg.b.x + ox, sg.b.y + oy, layer, lt);
    }
    const cl = axisCenterLine(solid, view);
    if (cl) e += line(cl.x1 + ox, cl.y1 + oy, cl.x2 + ox, cl.y2 + oy, "CENTER_LINES", "CENTER");
    for (const c of centerCrosses(solid, view)) {
      e += line(c.x - 6 + ox, c.y + oy, c.x + 6 + ox, c.y + oy, "CENTER_LINES", "CENTER");
      e += line(c.x + ox, c.y - 6 + oy, c.x + ox, c.y + 6 + oy, "CENTER_LINES", "CENTER");
    }
    // labels
    const seen = new Set<string>();
    for (const p of proj.points) {
      if (!p.label || seen.has(p.id)) continue;
      seen.add(p.id);
      e += text(p.x + 2.5 + ox, p.y + 2.5 + oy, 3.2, p.label, "TEXT");
    }
    e += text(proj.bounds.minX + ox, proj.bounds.maxY + 6 + oy, 4, view.toUpperCase() + " VIEW", "TEXT");
  };

  const dims = trueDims(solid, "mm");
  const dimBlock = (x: number, y: number): void => {
    let yy = y;
    for (const d of dims) {
      // R12 DXF is plain ASCII: %%C renders as the diameter symbol in AutoCAD
      const ascii = d.label.replace(/⌀/g, "%%C").replace(/°/g, "deg");
      e += text(x, yy, 3.5, ascii, "DIMENSIONS");
      yy -= 7;
    }
  };

  if (method === "first") {
    // FRONT top, TOP below, SIDE left of front
    const colX = side.bounds.w + gapX;
    const oyF = top.bounds.h + gap;
    place("side", 0, oyF + (front.bounds.h - side.bounds.h) / 2);
    place("front", colX, oyF);
    place("top", colX, 0);
    const xyY = oyF - gap / 2;
    e += line(-10, xyY, colX + Math.max(front.bounds.w, top.bounds.w) + 10, xyY, "REFERENCE");
    e += text(-10, xyY + 4, 4, "XY", "REFERENCE");
    // vertical construction projectors front<->top
    for (const x of [front.bounds.minX, (front.bounds.minX + front.bounds.maxX) / 2, front.bounds.maxX]) {
      e += line(colX + x, oyF + front.bounds.minY - 4, colX + x, top.bounds.maxY + 4, "CONSTRUCTION", "DASHED");
    }
    dimBlock(colX + Math.max(front.bounds.w, top.bounds.w) + 12, oyF + front.bounds.maxY);
  } else {
    // THIRD: TOP above, FRONT below, SIDE right of front
    const oyT = front.bounds.h + gap;
    place("top", 0, oyT);
    place("front", 0, 0);
    place("side", Math.max(front.bounds.w, top.bounds.w) + gapX, (front.bounds.h - side.bounds.h) / 2);
    const xyY = oyT - gap / 2;
    e += line(-10, xyY, Math.max(front.bounds.w, top.bounds.w) + 10, xyY, "REFERENCE");
    e += text(-10, xyY + 4, 4, "XY", "REFERENCE");
    for (const x of [front.bounds.minX, (front.bounds.minX + front.bounds.maxX) / 2, front.bounds.maxX]) {
      e += line(x, front.bounds.maxY + 4, x, oyT + top.bounds.minY - 4, "CONSTRUCTION", "DASHED");
    }
    dimBlock(Math.max(front.bounds.w, top.bounds.w, side.bounds.w) + gapX + Math.max(front.bounds.w, top.bounds.w) + 12, front.bounds.maxY);
  }

  // angle annotation from specified inclinations (geometry-verified elsewhere)
  const ang: string[] = [];
  if (solid.parsed.inclinations.HP !== undefined) ang.push(`${solid.parsed.inclinations.HP} deg HP`);
  if (solid.parsed.inclinations.VP !== undefined) ang.push(`${solid.parsed.inclinations.VP} deg VP`);
  if (ang.length) {
    const bc = solid.baseCenter;
    e += arc(bc.x, 0, 14, 0, solid.parsed.inclinations.VP ?? 30, "ANGLES");
    e += text(bc.x + 16, 2, 3.5, ang.join(" "), "ANGLES");
  }

  // title block
  e += text(0, -18, 4, `GeoDraft AI - ${solid.kind} - ${method === "first" ? "FIRST" : "THIRD"} ANGLE - mm - scale 1:1`, "TEXT");

  const header =
    "0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n9\n$MEASUREMENT\n70\n1\n0\nENDSEC\n";
  return header + layerTable() + "0\nSECTION\n2\nENTITIES\n" + e + "0\nENDSEC\n0\nEOF\n";
}
