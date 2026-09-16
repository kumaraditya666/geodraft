/** Pure tour content: no React/Next imports, safe for tests. */

export interface TourStep {
  tour: string;
  route: string;
  wtab?: string;
  title: string;
  desc: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    tour: "question-input",
    route: "/",
    title: "Enter Your Engineering Drawing Question",
    desc: "Paste or type your Engineering Graphics problem here — for example a cone, cylinder, prism, pyramid, line or lamina problem.",
  },
  {
    tour: "generate-button",
    route: "/",
    title: "Generate the Visualization",
    desc: "GeoDraft reads the problem and creates the corresponding geometry. If anything is unclear, it asks instead of guessing.",
  },
  {
    tour: "3d-view",
    route: "/visualizer",
    wtab: "model",
    title: "Explore the 3D Model",
    desc: "Rotate, zoom and inspect the generated geometry. The 3D model is the same mathematical geometry used for the projections.",
  },
  {
    tour: "projection-view",
    route: "/visualizer/projection",
    wtab: "projection",
    title: "Check Orthographic Projections",
    desc: "Front, top and side views generated from the same geometry — dashed lines are far-side hidden edges.",
  },
  {
    tour: "construction",
    route: "/visualizer/construction",
    wtab: "construction",
    title: "Understand the Construction",
    desc: "The animation shows how the drawing is built: XY, true shape, positioning, inclination, projectors, final views.",
  },
  {
    tour: "dimensions",
    route: "/visualizer/dimensions",
    wtab: "dimensions",
    title: "Check Dimensions",
    desc: "Lengths, diameters, heights and angles come from the generated geometry — compare true vs projected lengths here.",
  },
  {
    tour: "drawing-sheet",
    route: "/visualizer/drawing",
    wtab: "sheet",
    title: "Drawing Sheet & Export",
    desc: "The A4-style sheet with title block, then export SVG, AutoCAD DXF or PDF. Finish whenever you like.",
  },
];

export const SHOW_ME: Record<string, { title: string; desc: string }> = {
  "question-input": { title: "Step 1: question box", desc: "Enter your Engineering Drawing question here." },
  "generate-button": { title: "Step 2: generate", desc: "Click Generate Visualization to build the model." },
  "3d-view": { title: "3D viewport", desc: "Drag to orbit, scroll to zoom, right-drag to pan." },
  "projection-view": { title: "Projection canvas", desc: "Front, top and side views with shared projectors." },
  examples: { title: "Example library", desc: "One click loads a complete worked problem." },
};
