/** Local fallback knowledge base: answers every listed tutor question with real UI targets. */

export type TutorAction =
  | { type: "route"; to: string; label: string }
  | { type: "example"; id: string; label: string }
  | { type: "show"; tour: string; route?: string; label: string }
  | { type: "tour"; label: string };

export interface TutorAnswer {
  id: string;
  body: string;
  beginnerBody?: string;
  actions: TutorAction[];
}

interface Intent {
  id: string;
  keys: string[];
  body: string;
  beginnerBody?: string;
  actions: TutorAction[];
}

const showQ = (label = "Show me"): TutorAction => ({ type: "show", tour: "question-input", route: "/", label });
const showG = (label = "Show me"): TutorAction => ({ type: "show", tour: "generate-button", route: "/", label });

const INTENTS: Intent[] = [
  {
    id: "start",
    keys: ["how do i start", "how to start", "how do i use", "how to use", "get started", "begin", "new here", "first time"],
    body: "Enter your Engineering Drawing question in the question box, then click Generate Visualization. GeoDraft parses it, builds the 3D solid, and derives every projection from that one model.",
    beginnerBody: "Welcome! Type your drawing question (for example about a cone or a square plate) into the big box, then press the Generate button. The website draws the 3D shape and all its views for you.",
    actions: [showQ("Show me the question box")],
  },
  {
    id: "enter-question",
    keys: ["enter a question", "type a question", "write a question", "input", "paste", "where do i type"],
    body: "Use the large question box on the home page (or the question bar at the top of the workspace). Include the solid, its sizes in mm, and how it rests — e.g. “diameter 50 mm”, “rests on HP”, “30° to VP”.",
    actions: [showQ()],
  },
  {
    id: "generate",
    keys: ["generate", "create a model", "make a model", "build the model", "model appearing", "model appear", "nothing happens", "blank"],
    body: "Click Generate Visualization (or press Enter in the question bar). If parameters are unclear, GeoDraft asks instead of guessing — confirm or fix them in the Question panel, then generate again.",
    actions: [showG("Show me the button")],
  },
  {
    id: "hexagon",
    keys: ["hexagon", "create a hexagon", "hexagonal"],
    body: "Use the hexagon example: a regular hexagon of side 35 mm with one side in HP. It loads a complete worked setup — geometry, projections, dimensions and guide.",
    actions: [{ type: "example", id: "hex-3540", label: "Open Hexagon Example" }],
  },
  {
    id: "views",
    keys: ["top view", "front view", "side view", "see the top", "see the front", "see the side", "elevation", "plan"],
    body: "Open the Projection tab: front view (above XY), top view (below XY in first-angle) and side view, all projected from the same 3D points with shared projector lines.",
    actions: [{ type: "route", to: "/visualizer/projection", label: "Open Projections" }],
  },
  {
    id: "hp",
    keys: ["what is hp", "hp means", "horizontal plane", "h.p."],
    body: "HP means Horizontal Plane — the floor (z = 0). The top view is projected onto HP, and resting solids touch it.",
    beginnerBody: "HP means Horizontal Plane. Think of it as the floor. The top view is what you would see looking straight down at the floor.",
    actions: [],
  },
  {
    id: "vp",
    keys: ["what is vp", "vp means", "vertical plane", "v.p."],
    body: "VP means Vertical Plane — the wall (y = 0). The front view (elevation) is projected onto VP.",
    beginnerBody: "VP means Vertical Plane. Think of it as the wall in front of you. The front view is what you see looking straight at the wall.",
    actions: [],
  },
  {
    id: "xy",
    keys: ["what is xy", "xy line", "xy means", "reference line"],
    body: "XY is the fold where HP meets VP. In first-angle drawings the front view sits above XY and the top view below it; every front↔top projector crosses XY vertically.",
    actions: [],
  },
  {
    id: "first-angle",
    keys: ["first angle", "first-angle", "1st angle"],
    body: "First-angle: the object sits between you and the drawing plane. Front goes above XY, top below, and the right-side view sits left of the front. Switch methods in the Projection Lab toolbar.",
    beginnerBody: "First-angle is just the seating plan of the views: front picture on top, top picture below it. The website arranges this for you automatically.",
    actions: [{ type: "route", to: "/visualizer/projection", label: "See the arrangement" }],
  },
  {
    id: "third-angle",
    keys: ["third angle", "third-angle", "3rd angle"],
    body: "Third-angle: the drawing plane sits between you and the object. Top goes above the front, and the right-side view sits right of the front. Toggle it in the Projection Lab toolbar.",
    actions: [{ type: "route", to: "/visualizer/projection", label: "See the arrangement" }],
  },
  {
    id: "dimensions",
    keys: ["dimension", "diameter", "radius", "height", "length", "width", "true length", "projected length", "size", "measure"],
    body: "Open the Dimensions tab: every value (⌀, heights, angles) is read from the live 3D model — never typed. Where a view foreshortens an edge, both true and projected lengths are shown.",
    beginnerBody: "Dimensions are the numbers on the drawing (like ⌀50 mm). They always come from the real 3D shape, so they can never disagree with it.",
    actions: [{ type: "route", to: "/visualizer/dimensions", label: "Open Dimensions" }],
  },
  {
    id: "hidden",
    keys: ["hidden", "dashed", "invisible", "dotted lines"],
    body: "Dashed lines are hidden edges — geometry on the far side of the solid, detected from face directions, not hand-drawn. Toggle them with the Hidden button in the Projection Lab toolbar.",
    beginnerBody: "Dashed lines show edges hidden behind the solid — parts you can't see from that side. Solid lines are edges you can see.",
    actions: [{ type: "route", to: "/visualizer/projection", label: "See hidden lines" }],
  },
  {
    id: "construction",
    keys: ["construction", "steps", "step by step", "step-by-step", "procedure", "animate", "animation"],
    body: "Open the Construction tab and press Play: it builds the drawing stage by stage — XY, true shape, positioning, inclination, projectors, final views.",
    actions: [{ type: "route", to: "/visualizer/construction", label: "Open Construction" }],
  },
  {
    id: "export",
    keys: ["export", "download", "save my drawing", "pdf", "svg"],
    body: "Open the Export tab (or Drawing Sheet): download the vector SVG, the AutoCAD-editable DXF with real LINE/CIRCLE entities on layers, or print to PDF.",
    actions: [{ type: "route", to: "/visualizer/export", label: "Open Export" }],
  },
  {
    id: "dxf",
    keys: ["generate a dxf", "generate dxf", "dxf file", "dxf", "autocad", "cad file"],
    body: "The DXF button exports true-millimeter vector entities (LINE, CIRCLE, ARC, TEXT) on layers like GEOMETRY_VISIBLE and DIMENSIONS — it opens in AutoCAD as editable geometry, not a picture.",
    actions: [{ type: "route", to: "/visualizer/export", label: "Open Export" }],
  },
  {
    id: "traces",
    keys: ["trace", "ht", "vt", "horizontal trace", "vertical trace"],
    body: "HT is where the lamina's plane meets HP; VT is where it meets VP. A plane parallel to HP has no HT. Toggle Traces in the Projection Lab to draw them from the true plane equation.",
    actions: [{ type: "route", to: "/visualizer/projection", label: "See traces" }],
  },
  {
    id: "inclination",
    keys: ["inclination", "inclined", "tilt", "angle", "30°", "degrees"],
    body: "Angles are measured from the true 3D direction and drawn as arcs in 3D and on the views (e.g. “30.0° VP”). Toggle Angles in the workspace toolbar; the Check Projection tool verifies them.",
    actions: [{ type: "route", to: "/visualizer", label: "See angle arcs" }],
  },
  {
    id: "projector",
    keys: ["projector", "projection rays", "rays", "projectors"],
    body: "Projectors are the thin lines carrying each 3D corner into its 2D views — vertical between front and top, horizontal toward the side. Enable Rays/3D↔2D and click any labeled point to see it pulse in every view.",
    actions: [{ type: "route", to: "/visualizer", label: "See projectors" }],
  },
  {
    id: "example",
    keys: ["example", "sample", "demo", "show me", "try"],
    body: "Let's start with a simple cone example — base ⌀50 mm, height 70 mm, axis 30° to VP. It loads straight into the full workflow.",
    actions: [{ type: "example", id: "cone-vp30", label: "Open Cone Example" }],
  },
  {
    id: "after",
    keys: ["after generating", "what next", "what should i do", "next step", "now what"],
    body: "After generating: orbit the 3D model, check the projections tab, read the true-vs-projected dimensions, play the construction animation, then export SVG/DXF from the Export tab.",
    actions: [{ type: "route", to: "/visualizer/construction", label: "Play construction" }],
  },
  {
    id: "orthographic",
    keys: ["orthographic", "projection mean", "what is projection"],
    body: "Orthographic projection draws a 3D object as flat front/top/side views by projecting every point straight onto a plane — no perspective. Front=(x,z), Top=(x,y), Side=(y,z), all from one model.",
    beginnerBody: "Projection just means flattening: the website squishes the 3D shape flat from the front, the top and the side to make three simple drawings.",
    actions: [{ type: "route", to: "/visualizer/projection", label: "See projections" }],
  },
];

export function matchIntent(query: string): Intent {
  const q = query.toLowerCase().trim();
  let best: Intent | null = null;
  let bestScore = 0;
  for (const it of INTENTS) {
    let score = 0;
    for (const k of it.keys) {
      if (q.includes(k)) score += k.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return (
    best ?? {
      id: "fallback",
      keys: [],
      body: "I can guide you through GeoDraft: starting a problem, 3D and projections, dimensions, construction steps, traces, or export. Try a Quick Help button below, or ask e.g. “What is HP?”.",
      actions: [],
    }
  );
}

export const QUICK_HELP: { label: string; query: string }[] = [
  { label: "How do I start?", query: "How do I start?" },
  { label: "How do I solve a question?", query: "How do I generate a model?" },
  { label: "How do I understand projections?", query: "What is orthographic projection?" },
  { label: "How do I use 3D?", query: "How do I use 3D?" },
  { label: "How do dimensions work?", query: "How do dimensions work?" },
  { label: "How do I export?", query: "How do I export my drawing?" },
];

export const STUCK_OPTIONS: { label: string; query: string }[] = [
  { label: "Question not generating", query: "__stuck_generate" },
  { label: "3D model looks wrong", query: "__stuck_model" },
  { label: "Projection looks wrong", query: "__stuck_projection" },
  { label: "Can't understand dimensions", query: "How do dimensions work?" },
  { label: "Can't understand construction", query: "How do I use construction steps?" },
  { label: "Can't export", query: "How do I export my drawing?" },
  { label: "Something else", query: "__stuck_other" },
];

export interface StuckContext {
  hasSolid: boolean;
  needsConfirm: boolean;
  unclear: string[];
}

export function stuckAnswer(id: string, ctx: StuckContext): TutorAnswer {
  switch (id) {
    case "__stuck_generate":
      return {
        id,
        body: ctx.needsConfirm
          ? `GeoDraft held back because these need confirming: ${ctx.unclear.join("; ")}. Fix them in the Question panel (it may offer HP/VP buttons), then press Generate again — it never guesses silently.`
          : "Check the question has a solid, sizes in mm, and a resting plane (e.g. “cone, diameter 50 mm, height 70 mm, rests on HP”). Then press Generate Visualization.",
        actions: [{ type: "show", tour: "question-input", route: "/", label: "Show me the question box" }],
      };
    case "__stuck_model":
      return {
        id,
        body: "First check the Parsed parameters panel — a misread size or angle changes everything. Use Edit Parameters to correct numbers, toggle HP/VP and Angles to verify orientation, and orbit to inspect all sides.",
        actions: [{ type: "route", to: "/visualizer", label: "Open 3D view" }],
      };
    case "__stuck_projection":
      return {
        id,
        body: "Compare the three views against the 3D orientation: dashed lines are far-side edges (correct, not an error). Confirm first/third-angle arrangement matches your syllabus, and run Check Projection for a factual audit.",
        actions: [{ type: "route", to: "/visualizer/projection", label: "Open projections" }],
      };
    case "__stuck_other":
      return {
        id,
        body: "Tell me what you see in a few words (e.g. “top view circle missing”), or take the 60-second guided tour to learn each workspace area.",
        actions: [{ type: "tour", label: "Start guided tour" }],
      };
    default:
      return { id, body: "Try a Quick Help topic below.", actions: [] };
  }
}
