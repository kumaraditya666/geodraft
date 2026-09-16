import type { BuiltSolid, ViewKind } from "@/types";

export interface GuideStep {
  title: string;
  /** Concrete instruction using the solid's real numbers */
  how: string;
  views: ViewKind[];
  /** vertex id to pulse across all three views (apex, base-center, ...) */
  pointId?: string;
}

const t = (n: number): string => `${Math.round(n * 10) / 10}`;

export function buildDrawingGuide(solid: BuiltSolid): GuideStep[] {
  switch (solid.kind) {
    case "cone":
      return coneGuide(solid);
    case "cylinder":
      return cylinderGuide(solid);
    case "prism":
    case "pyramid":
      return prismGuide(solid);
    case "line":
      return lineGuide(solid);
    case "plane":
      return planeGuide(solid);
    default:
      return genericGuide(solid);
  }
}

function xyStep(): GuideStep {
  return {
    title: "Draw the XY reference line",
    how: "Take your drafter scale and draw one long horizontal line across the sheet — this is XY, the fold where the floor (HP) meets the wall (VP). Rule of first-angle projection: FRONT view lives above XY, TOP view below it.",
    views: ["front", "top"],
  };
}

function coneGuide(s: BuiltSolid): GuideStep[] {
  const d = t((s.radius ?? 25) * 2);
  const h = t(s.height ?? 70);
  const vp = s.parsed.inclinations.VP;
  const hp = s.parsed.inclinations.HP;
  const inclined = vp !== undefined || hp !== undefined;

  if (!inclined) {
    return [
      xyStep(),
      {
        title: `Top view: draw the base circle ⌀${d} mm`,
        how: `Below XY, mark a center point C and draw a full circle of diameter ${d} mm. This is the cone's base resting flat on HP — from above you see its true shape, so no projector needed yet.`,
        views: ["top"],
        pointId: "base-center",
      },
      {
        title: "Raise vertical projectors across XY",
        how: `From the leftmost and rightmost points of the circle (and its center), draw thin vertical projector lines straight up, crossing XY into the front-view zone. Projectors between front and top are always vertical because both views share the X axis.`,
        views: ["front", "top"],
      },
      {
        title: `Front view: base line + apex ${h} mm up`,
        how: `The base sits ON HP, so where the two outer projectors meet the XY level, join them — that ${d} mm line is the base. On the center projector, mark apex O exactly ${h} mm above XY and join it to both base ends. You now have the triangular elevation.`,
        views: ["front"],
        pointId: "apex",
      },
      {
        title: "Side view with horizontal projectors",
        how: `From the apex and base ends in the front view, draw horizontal projectors (front and side share height Z) to the right and construct the same triangle in side view. Darken what you see, dash the hidden back rim of the base, then write ⌀${d} mm and ${h} mm.`,
        views: ["side", "front"],
        pointId: "apex",
      },
    ];
  }

  const tilt = vp !== undefined ? `${vp}° to VP` : `${hp}° to HP`;
  return [
    xyStep(),
    {
      title: `Top view first: axis tilted ${tilt}`,
      how: `Because the axis is inclined (${tilt}) while the solid still touches HP, start in the TOP view below XY. Draw the axis as a line tilted ${vp ?? hp}° from the X direction. Mark base center C at one end and apex O ${h} mm from it along this tilted axis.`,
      views: ["top"],
      pointId: "apex",
    },
    {
      title: `Top base: ellipse ⌀${d} mm wide`,
      how: `At C, draw the base as an ellipse ${d} mm across (measured perpendicular to the tilted axis). It looks squashed — not a full circle — because you are seeing the tilted base disc at an angle. That foreshortening is the whole point of the inclination.`,
      views: ["top"],
      pointId: "base-center",
    },
    {
      title: "Project every point vertically across XY",
      how: `From C, O and the extreme points of the ellipse, raise thin vertical projectors up across XY. Each projector carries one 3D corner into the front view. The lowest rim point touches HP, so its projector meets the XY level exactly.`,
      views: ["front", "top"],
      pointId: "apex",
    },
    {
      title: "Front view: heights come from true Z",
      how: `On each projector, mark the point at its true height: apex O at full height, rim points lower according to where they sit on the tilted base. Join the dots — the two lines from O that just graze the projected rim are the silhouette generators. Anything on the far side of the solid becomes a dashed hidden line.`,
      views: ["front"],
      pointId: "apex",
    },
    {
      title: "Side view + dimensions",
      how: `Throw horizontal projectors from the front view to the right to build the side view (shared Z). Finish with center lines through C–O, then dimension the true sizes: ⌀${d} mm, height ${h} mm, and the ${vp ?? hp}° tilt — dimensions always show true 3D size, never the foreshortened drawing length.`,
      views: ["side", "front"],
    },
  ];
}

function cylinderGuide(s: BuiltSolid): GuideStep[] {
  const d = t((s.radius ?? 20) * 2);
  const h = t(s.height ?? s.length ?? 60);
  const vp = s.parsed.inclinations.VP;
  const hp = s.parsed.inclinations.HP;
  const inclined = vp !== undefined || hp !== undefined;

  if (!inclined) {
    return [
      xyStep(),
      {
        title: `Top view: base circle ⌀${d} mm`,
        how: `Below XY draw the circular base, diameter ${d} mm about center C. From above, a cylinder standing on HP is just its base disc.`,
        views: ["top"],
        pointId: "base-center",
      },
      {
        title: "Vertical projectors upward",
        how: `From the leftmost/rightmost rim points and the center, raise vertical projectors across XY into the front zone — front and top share X, so projectors are vertical.`,
        views: ["front", "top"],
      },
      {
        title: `Front view: ${d} × ${h} mm rectangle`,
        how: `The base edge sits on the XY level (${d} mm wide). The top rim is a second ${d} mm line exactly ${h} mm above it. Join the ends with the two silhouette generators — that rectangle IS the elevation. The back half of the top rim is hidden, so dash it.`,
        views: ["front"],
        pointId: "top-center",
      },
      {
        title: "Side view + dimensions",
        how: `Project horizontally to the right for the side rectangle (same ${h} mm height). Finish with the axis center line C–C', then dimension ⌀${d} mm and ${h} mm true size.`,
        views: ["side", "front"],
      },
    ];
  }
  const tilt = vp !== undefined ? `${vp}° to VP` : `${hp}° to HP`;
  return [
    xyStep(),
    {
      title: `Top view: tilted axis (${tilt})`,
      how: `Draw the cylinder axis below XY tilted ${vp ?? hp}° from X. Mark base center C and top center C' along it, ${h} mm apart — this is the true length, shown un-foreshortened only along this direction.`,
      views: ["top"],
      pointId: "top-center",
    },
    {
      title: "Top rims: two ellipses",
      how: `At C and C' draw the two circular rims as ellipses, each ${d} mm across. Join them with the two outer tangent lines — those tangents are the silhouette generators you would actually see.`,
      views: ["top"],
      pointId: "base-center",
    },
    {
      title: "Vertical projectors across XY",
      how: `From C, C' and the four tangent points, raise vertical projectors across XY. Every 3D rim point travels along its own projector into the front view.`,
      views: ["front", "top"],
    },
    {
      title: "Front view from true heights",
      how: `Plot each projected point at its true Z height — the generator touching HP lands exactly on the XY level. Outline the visible silhouette solid; the far rim and far generator go dashed.`,
      views: ["front"],
      pointId: "top-center",
    },
    {
      title: "Side view + true dimensions",
      how: `Horizontal projectors to the right give the side view. Dimension true sizes only: ⌀${d} mm, length ${h} mm, tilt ${vp ?? hp}°.`,
      views: ["side", "front"],
    },
  ];
}

function prismGuide(s: BuiltSolid): GuideStep[] {
  const n = s.parsed.sides ?? (s.kind === "pyramid" ? 4 : 6);
  const name = s.kind === "pyramid" ? "pyramid" : `${n}-sided prism`;
  const side = t(s.parsed.dimensions.side ?? s.parsed.dimensions.edge ?? 30);
  const h = t(s.height ?? 65);
  const tiltBits =
    s.parsed.inclinations.HP !== undefined || s.parsed.inclinations.VP !== undefined
      ? ` Tilted ${s.parsed.inclinations.HP !== undefined ? `${s.parsed.inclinations.HP}° to HP` : ""}${s.parsed.inclinations.HP !== undefined && s.parsed.inclinations.VP !== undefined ? " and " : ""}${s.parsed.inclinations.VP !== undefined ? `${s.parsed.inclinations.VP}° to VP` : ""} —`
      : "";
  return [
    xyStep(),
    {
      title: `Top view: regular ${n}-gon (side ${side} mm)`,
      how: `Below XY, draw the base as a regular ${n}-gon with each edge ${side} mm.${tiltBits} label the corners A, B, C… — every corner gets its own projector, so neat labeling now saves confusion later.`,
      views: ["top"],
      pointId: "base-center",
    },
    {
      title: "One vertical projector per corner",
      how: `From EVERY corner of the ${n}-gon, draw a thin vertical projector up across XY. With flat-faced solids nothing may be skipped: a missing projector means a missing edge in the front view.`,
      views: ["front", "top"],
    },
    {
      title: `Front view: rise ${h} mm per edge`,
      how: s.kind === "pyramid"
        ? `The base corners land on the XY level (base on HP). On the center projector mark apex O ${h} mm above XY and join it to each base corner — each sloping line is a true lateral edge.`
        : `Base corners land on the XY level; the matching top corners land ${h} mm above it on the same projectors. Join base-to-top corner pairs with vertical edges and close the top rim — each rectangle you see is one lateral face.`,
      views: ["front"],
      pointId: s.kind === "pyramid" ? "apex" : "top-center",
    },
    {
      title: "Visibility: solid vs dashed",
      how: `Look at each lateral face: if it points toward you, its boundary stays solid; edges belonging only to back faces go dashed. That is the entire hidden-line rule — no memorising, just face direction.`,
      views: ["front", "top"],
    },
    {
      title: "Side view + dimensions",
      how: `Horizontal projectors (shared Z) carry the ${name}'s corners rightward into the side view. Finish with center lines and true dimensions: side ${side} mm, height ${h} mm.`,
      views: ["side", "front"],
    },
  ];
}

function lineGuide(s: BuiltSolid): GuideStep[] {
  const Lnum = s.length ?? s.parsed.dimensions.length ?? 80;
  const L = t(Lnum);
  const hp = s.parsed.inclinations.HP ?? 30;
  const vp = s.parsed.inclinations.VP;
  return [
    xyStep(),
    {
      title: "Mark end A on XY",
      how: `End A rests on HP, so its front view (a') and top view (a) both sit exactly ON the XY line at the same X. One point, two views, zero height — that is your anchor.`,
      views: ["front", "top"],
      pointId: "p0",
    },
    {
      title: `Locus of B: ${t(Lnum * Math.sin((hp * Math.PI) / 180))} mm above XY`,
      how: `B floats above HP. Its height is fixed by geometry: ${L}·sin(${hp}°) = ${t(Lnum * Math.sin((hp * Math.PI) / 180))} mm. Draw a horizontal locus line at exactly that height above XY in the front zone — B's front view b' must lie somewhere on it.`,
      views: ["front"],
      pointId: "p1",
    },
    vp !== undefined
      ? {
          title: `Locus of B in plan: ${t(Lnum * Math.sin((vp * Math.PI) / 180))} mm below XY`,
          how: `Similarly the depth is fixed: ${L}·sin(${vp}°) = ${t(Lnum * Math.sin((vp * Math.PI) / 180))} mm. Draw a second locus below XY in the top zone — B's plan view b must lie on it.`,
          views: ["top"],
          pointId: "p1",
        }
      : {
          title: "Top view direction",
          how: `The line is parallel to VP, so its plan shows the full horizontal component: draw from a at ${hp}°-derived plan length and drop a vertical projector to meet the front locus — where projector meets locus is b'.`,
          views: ["top", "front"],
          pointId: "p1",
        },
    {
      title: "Join, project, verify",
      how: `Join a'b' (front) and ab (top). Drop a vertical projector between b and b' — they MUST line up vertically; if they don't, a locus is wrong. That vertical check is your built-in error detector.`,
      views: ["front", "top"],
      pointId: "p1",
    },
  ];
}

function planeGuide(s: BuiltSolid): GuideStep[] {
  if (s.parsed.planeMode === "diagonal") return diagonalLaminaGuide(s);
  if (s.parsed.planeMode === "diagonalVP") return diagonalVPLaminaGuide(s);
  if (s.parsed.planeMode === "vertical") return verticalLaminaGuide(s);
  if (s.parsed.planeMode === "vpHinge") return vpHingeGuide(s);
  if (s.parsed.planeMode === "rhombus") return rhombusGuide(s);
  const tilt = s.parsed.inclinations.HP ?? 30;
  const shape = s.parsed.planeShape ?? "rectangular";
  const w = t(s.parsed.dimensions.width ?? s.parsed.dimensions.side ?? 60);
  const l = t(s.parsed.dimensions.length ?? s.parsed.dimensions.height ?? 40);
  return [
    xyStep(),
    {
      title: `Edge view: a ${w} mm line tilted ${tilt}°`,
      how: `A flat lamina seen edge-on collapses to a straight line. In the front zone draw a ${w} mm line tilted ${tilt}° to XY with its lower end touching XY — that end is the edge resting on HP. This single line encodes the whole inclination.`,
      views: ["front"],
    },
    {
      title: "Project both ends down",
      how: `From each end of the tilted edge-view line, drop vertical projectors down across XY into the top zone. The distance between these two projectors is the FORESHORTENED width — shorter than ${w} mm by cos(${tilt}°). Never dimension this squashed length as the true size.`,
      views: ["front", "top"],
    },
    {
      title: `Build the ${shape} ${w} × ${l} mm in plan`,
      how: `Between the two projectors, construct the true ${shape} outline (${w} × ${l} mm): its width is squeezed between the projectors while its other direction (${l} mm) shows full size if parallel to VP. Join corners A, B, C… and darken the outline.`,
      views: ["top"],
    },
    {
      title: "Side view + true-size dimensions",
      how: `Horizontal projectors give the narrow side strip. Dimension the TRUE ${w} × ${l} mm and the ${tilt}° surface tilt — dimensions always quote the flat lamina, not its squashed projection.`,
      views: ["side", "front"],
    },
  ];
}

function diagonalLaminaGuide(s: BuiltSolid): GuideStep[] {
  const side = t(s.parsed.dimensions.side ?? 30);
  const tilt = s.parsed.inclinations.HP ?? 45;
  const yaw = s.parsed.diagonalAngleVP ?? s.parsed.inclinations.VP ?? 0;
  const dist = s.parsed.dimensions.distVP;
  return [
    xyStep(),
    {
      title: `Top view: diagonal DB at ${yaw}° to VP`,
      how: `Below XY, draw the diagonal DB as a line tilted ${yaw}° from the X direction — a horizontal line's angle to VP is just its plan angle. Mark D toward the front (larger Y) and B behind. True diagonal length = ${side}√2 ≈ ${t(Number(side) * 1.414)} mm.`,
      views: ["top"],
      pointId: "corner-d",
    },
    {
      title: `Corner C on HP, surface ${tilt}° up`,
      how: `The square is hinged about DB: corner C dips to touch HP exactly on the XY level in front view, while A rises. In plan, C sits off the DB line by (diagonal/2)·cos(${tilt}°) perpendicular to it. That single rotation about DB creates the whole ${tilt}° surface tilt.`,
      views: ["top", "front"],
      pointId: "corner-c",
    },
    {
      title: "Raise one projector per corner",
      how: `From A, B, C, D in the top view, draw vertical projectors up across XY. C's projector meets the XY level itself (C rests on HP); B and D land at the diagonal's height; A lands highest.`,
      views: ["front", "top"],
      pointId: "corner-a",
    },
    {
      title: "Front view: plot true heights",
      how: `On each projector mark the corner's true Z: C on XY, B and D level with each other (DB is horizontal — that is the check), A at the top. Join A-B-C-D in order; the edge facing away goes dashed.`,
      views: ["front"],
      pointId: "corner-b",
    },
    {
      title: `Side view${dist !== undefined ? ` — D ${dist} mm from VP` : " + finish"}`,
      how: dist !== undefined
        ? `Shift the whole lamina in depth until D sits ${dist} mm in front of VP (horizontal projectors carry every corner sideways by the same amount). Complete the side outline, then dimension side ${side} mm, tilt ${tilt}°, DB ${yaw}° to VP.`
        : `Horizontal projectors build the narrow side strip. Dimension side ${side} mm, tilt ${tilt}°, DB ${yaw}° to VP — all true sizes.`,
      views: ["side", "front"],
      pointId: "corner-d",
    },
  ];
}

function verticalLaminaGuide(s: BuiltSolid): GuideStep[] {
  const dist = s.parsed.dimensions.distVP;
  return [
    xyStep(),
    {
      title: "Front view first: true shape, sides parallel to VP",
      how: `Because every side stays parallel to VP, the FRONT view (above XY) shows the undistorted true shape. Draw it with the resting corner sitting exactly on the XY level.${dist !== undefined ? ` The whole plane floats ${dist} mm in front of VP.` : ""}`,
      views: ["front"],
    },
    {
      title: "Top view collapses to a line",
      how: `A plane parallel to VP has zero depth variation — in the top view (below XY) the entire lamina collapses to one straight horizontal line${dist !== undefined ? `, ${dist} mm below XY` : ""}. That line IS the top view; nothing hides behind it.`,
      views: ["top", "front"],
    },
    {
      title: "Projectors + traces",
      how: `Vertical projectors still link each corner front↔top. The plane never meets VP, so there is No VT; its HT is the single line where it would meet HP — extended in the top view.`,
      views: ["front", "top"],
    },
    {
      title: "Side view + true dimensions",
      how: `Horizontal projectors give the edge-on side strip. Dimension true sizes only — the front view already shows them un-foreshortened.`,
      views: ["side", "front"],
    },
  ];
}

function diagonalVPLaminaGuide(s: BuiltSolid): GuideStep[] {
  const tilt = s.parsed.inclinations.VP ?? 30;
  const fa = s.parsed.frontDiagXY;
  return [
    xyStep(),
    {
      title: "True shape stood into VP",
      how: `Draw the true shape upright in the VP plane with the resting corner at the origin. In the front view you see it undistorted at this stage.`,
      views: ["front"],
    },
    {
      title: `Hinge ${tilt}° off VP about the corner`,
      how: `Rotate the plate about the vertical line through the resting corner until its surface makes ${tilt}° with VP. The corner stays pinned in VP; the rest swings forward. Front heights never change — only depths do.`,
      views: ["front", "top"],
    },
    ...(fa !== undefined
      ? [
          {
            title: `Corner diagonal hits ${fa}° in front`,
            how: `Before hinging, the plate is spun in its own plane so that after the ${tilt}° hinge squeeze (×cos ${tilt}° horizontally) the corner diagonal lands at exactly ${fa}° to XY. Verify with a protractor on the front view.`,
            views: ["front"] as ("front" | "top" | "side")[],
          },
        ]
      : []),
    {
      title: "Top view + traces + dimensions",
      how: `Project down to the foreshortened top outline. Draw VT (the plate meets VP along the hinge line) and HT, then dimension true side lengths — projections show them squeezed, dimensions show the truth.`,
      views: ["top", "side", "front"],
    },
  ];
}

function vpHingeGuide(s: BuiltSolid): GuideStep[] {
  const tilt = s.parsed.inclinations.VP ?? 30;
  const dia = t(s.parsed.dimensions.diameter ?? 50);
  return [
    xyStep(),
    {
      title: `Diameter ⌀${dia} mm pinned in VP`,
      how: `Draw the diametrical edge as a line in the front view (it lies in VP). This edge never moves again — it is the hinge of the whole construction.`,
      views: ["front"],
    },
    {
      title: `Hinge the surface ${tilt}° off VP`,
      how: `Swing the semicircular bulge forward off VP about the diameter until the surface makes ${tilt}° with VP. In the front view the arc squeezes horizontally by cos ${tilt}°; heights stay true.`,
      views: ["front", "top"],
    },
    {
      title: "Top view + traces + dimensions",
      how: `The top view shows the hinge line (diameter) plus the foreshortened arc. Add HT/VT and dimension the true ⌀${dia} mm — the arc's drawn width is shorter, the dimension is not.`,
      views: ["top", "side", "front"],
    },
  ];
}

function rhombusGuide(s: BuiltSolid): GuideStep[] {
  const d1 = s.parsed.dimensions.diag1 ?? 60;
  const d2 = s.parsed.dimensions.diag2 ?? 40;
  const tilt = s.parsed.inclinations.HP ?? 48.2;
  return [
    xyStep(),
    {
      title: `True rhombus: diagonals ${d1} × ${d2} mm`,
      how: `Draw the rhombus flat with perpendicular diagonals PR = ${d1} mm and QS = ${d2} mm crossing at the center. Verify the crossing is 90° — that is the defining property.`,
      views: ["top"],
    },
    {
      title: `Tilt about QS until the plan reads square (${tilt}°)`,
      how: `Hinge the rhombus about its short diagonal QS. PR foreshortens ${d1} → ${d1}·cos(${tilt}°) = ${d2} mm while QS keeps true length — so the top view becomes a ${d2} mm square. The tilt is solved, not guessed: cos t = ${d2}/${d1}.`,
      views: ["top", "front"],
    },
    {
      title: "Projectors + front heights + traces",
      how: `Raise vertical projectors from every corner across XY and plot true heights (resting points land on XY). Draw HT/VT of the tilted plane, then the side view via horizontal projectors.`,
      views: ["front", "top"],
    },
    {
      title: "Dimensions: true diagonals",
      how: `Dimension PR = ${d1} mm and QS = ${d2} mm true — the top view shows PR squeezed to ${d2} mm, the dimension still says ${d1} mm.`,
      views: ["side", "front"],
    },
  ];
}

function genericGuide(s: BuiltSolid): GuideStep[] {
  const dims = Object.entries(s.parsed.dimensions)
    .map(([k, v]) => `${k} ${t(v)} mm`)
    .join(", ");
  return [
    xyStep(),
    {
      title: "Top view: true shape from above",
      how: `Below XY, draw what the ${s.kind} (${dims}) looks like straight from above — true shape in plan, centered on a vertical center projector.`,
      views: ["top"],
    },
    {
      title: "Vertical projectors across XY",
      how: `From every key corner raise a vertical projector across XY. Front and top share the X axis, so these connectors are always vertical and always thin.`,
      views: ["front", "top"],
    },
    {
      title: "Front view at true heights",
      how: `On each projector mark the corner's true height above XY (parts touching HP land exactly on XY). Join visible edges solid, far-side edges dashed.`,
      views: ["front"],
    },
    {
      title: "Side view + dimensions",
      how: `Horizontal projectors (shared height Z) build the side view to the right. Finish with true-size dimensions: ${dims}.`,
      views: ["side", "front"],
    },
  ];
}
