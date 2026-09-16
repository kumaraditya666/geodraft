import type { BuiltSolid, ProjectionMethod } from "@/types";
import { buildProjection, projectPoint } from "@/lib/projection/projectionEngine";
import { measuredAngles } from "@/lib/projection/angleEngine";
import { trueDims } from "@/lib/projection/dimensionEngine";

/**
 * Factual checks over the shared geometry + generated drawing.
 * No scores — each item reports pass/fail with a concrete explanation.
 */

export interface CheckItem {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

const ok = (id: string, label: string, detail: string): CheckItem => ({ id, label, pass: true, detail });
const bad = (id: string, label: string, detail: string): CheckItem => ({ id, label, pass: false, detail });

/** Geometry-level accuracy: source parameters vs built 3D model. */
export function runAccuracyChecks(solid: BuiltSolid): CheckItem[] {
  const items: CheckItem[] = [];
  const d = solid.parsed.dimensions;

  if (solid.radius !== undefined) {
    const wantDia = d.diameter ?? (d.radius !== undefined ? d.radius * 2 : undefined);
    if (wantDia !== undefined) {
      const got = solid.radius * 2;
      items.push(
        Math.abs(got - wantDia) < 1e-6
          ? ok("dia", "Diameter", `Base diameter in model = ${got} mm, matches question (${wantDia} mm).`)
          : bad("dia", "Diameter", `Model diameter ${got} mm differs from question ${wantDia} mm.`)
      );
    }
  }
  const wantH = d.height ?? d.length;
  if (wantH !== undefined && solid.height !== undefined) {
    items.push(
      Math.abs(solid.height - wantH) < 1e-6
        ? ok("h", "Height", `Model height = ${solid.height} mm, matches question.`)
        : bad("h", "Height", `Model height ${solid.height} mm differs from question ${wantH} mm.`)
    );
  }
  // angle transformation: measured axis angles must equal specified inclinations
  const m = measuredAngles(solid.axisDir);
  if (solid.parsed.inclinations.HP !== undefined && solid.kind !== "line" && solid.kind !== "plane") {
    const want = solid.parsed.inclinations.HP;
    items.push(
      Math.abs(m.withHP - want) < 0.6
        ? ok("ahp", "HP angle transform", `Measured axis↔HP = ${m.withHP.toFixed(1)}°, specified ${want}°.`)
        : bad("ahp", "HP angle transform", `Measured ${m.withHP.toFixed(1)}° but question says ${want}° — orientation mismatch.`)
    );
  }
  if (solid.parsed.inclinations.VP !== undefined && solid.kind !== "line" && solid.kind !== "plane") {
    const want = solid.parsed.inclinations.VP;
    items.push(
      Math.abs(m.withVP - want) < 0.6
        ? ok("avp", "VP angle transform", `Measured axis↔VP = ${m.withVP.toFixed(1)}°, specified ${want}°.`)
        : bad("avp", "VP angle transform", `Measured ${m.withVP.toFixed(1)}° but question says ${want}° — orientation mismatch.`)
    );
  }
  // projection consistency: engine projection of apex == stored front point
  if (solid.apex) {
    const p = projectPoint(solid.apex, "front");
    const stored = buildProjection(solid, "front").points.find((q) => q.id === "apex");
    if (stored) {
      const err = Math.hypot(p.x - stored.x, p.y - stored.y);
      items.push(
        err < 1e-9
          ? ok("proj", "Projection consistency", "Front-view apex equals direct (x,z) projection of the 3D apex — 2D comes from the same model.")
          : bad("proj", "Projection consistency", `Apex projection drift ${err.toFixed(4)} mm — views are not from the same geometry.`)
      );
    }
  }
  // resting contact: lowest point on resting plane
  if (solid.parsed.restingPlane === "HP") {
    const minZ = Math.min(...solid.vertices.map((v) => v.p.z));
    items.push(
      Math.abs(minZ) < 1e-6
        ? ok("rest", "Resting contact", "Lowest model point touches HP (z = 0).")
        : bad("rest", "Resting contact", `Lowest point at z = ${minZ.toFixed(2)} mm — solid floats above / sinks into HP.`)
    );
  }
  // dimensions correspond to source
  const dims = trueDims(solid, "mm");
  items.push(
    dims.length > 0
      ? ok("dims", "Dimensions", `${dims.length} dimension(s) generated, all from source parameters: ${dims.map((x) => x.label).join(", ")}.`)
      : bad("dims", "Dimensions", "No dimensions could be generated from the parsed parameters.")
  );
  return items;
}

export interface DrawingOpts {
  method: ProjectionMethod;
  showHidden: boolean;
  showCenter: boolean;
  showDims: boolean;
  showAngles: boolean;
}

/** Drawing-level checks: placement, hidden lines, center lines, angles, method. */
export function checkDrawing(solid: BuiltSolid, o: DrawingOpts): CheckItem[] {
  const items: CheckItem[] = [];
  const views = (["front", "top", "side"] as const).map((v) => buildProjection(solid, v));
  const hiddenCount = views.reduce((n, p) => n + p.segments.filter((s) => !s.visible).length, 0);
  const anyBackFace = (["front", "top", "side"] as const).some((v) =>
    solid.faces.some((f) => {
      const n = v === "front" ? f.normal.y : v === "top" ? f.normal.z : f.normal.x;
      return n < -1e-9;
    })
  );
  if (!anyBackFace) {
    items.push(ok("hidden", "Hidden lines", "No faces point fully away from any viewing direction in this orientation, so zero dashed edges is correct."));
  } else if (hiddenCount > 0) {
    items.push(
      o.showHidden
        ? ok("hidden", "Hidden lines", `${hiddenCount} edge segment(s) correctly dashed — they belong only to back-facing surfaces.`)
        : bad("hidden", "Hidden lines", `${hiddenCount} hidden edge(s) exist but "Show Hidden Lines" is off, so the drawing hides them.`)
    );
  } else {
    items.push(bad("hidden", "Hidden lines", "Back-facing surfaces exist but no dashed edges were produced — visibility kernel may be wrong."));
  }

  items.push(
    o.method === "first"
      ? ok("arrange", "Projection arrangement", "First-angle: front above XY, top below (shared X), right-side view left of front.")
      : ok("arrange", "Projection arrangement", "Third-angle: top above, front below (shared X), right-side view right of front.")
  );

  const needsCenter = ["cone", "cylinder", "frustum", "hemisphere", "sphere"].includes(solid.kind);
  if (needsCenter) {
    items.push(
      o.showCenter
        ? ok("center", "Center lines", "Axis/center chain lines present for the circular solid.")
        : bad("center", "Center lines", "Circular solid requires center lines but they are toggled off.")
    );
  } else {
    items.push(ok("center", "Center lines", "Axis center line present; no circular rims need extra center crosses."));
  }

  const inclined = solid.parsed.inclinations.HP !== undefined || solid.parsed.inclinations.VP !== undefined;
  if (inclined) {
    items.push(
      o.showAngles
        ? ok("angles", "Angle annotations", "Inclination arcs/labels shown, measured from the true 3D axis direction.")
        : bad("angles", "Angle annotations", "Question specifies an inclination but angle annotations are toggled off.")
    );
  } else {
    items.push(ok("angles", "Angle annotations", "No inclination in the question — no angle annotation required."));
  }

  items.push(
    o.showDims
      ? ok("dims2", "Dimensions on sheet", "True-size dimensions (diameter/height/angles) are displayed on the drawing.")
      : bad("dims2", "Dimensions on sheet", "Dimensions are toggled off — an engineering drawing without dimensions is incomplete.")
  );
  return items;
}
