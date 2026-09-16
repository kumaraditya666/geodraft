import { describe, expect, it } from "vitest";
import { matchIntent, stuckAnswer, QUICK_HELP, STUCK_OPTIONS } from "@/lib/tutor/knowledgeBase";
import { LocalTutorProvider } from "@/lib/tutor/tutorProvider";
import { TOUR_STEPS } from "@/lib/tutor/tourSteps";

describe("tutor knowledge base", () => {
  const cases: [string, string][] = [
    ["How do I use this website?", "start"],
    ["How do I enter a question?", "enter-question"],
    ["How do I generate a model?", "generate"],
    ["How do I create a hexagon?", "hexagon"],
    ["How do I see the top view?", "views"],
    ["What is HP?", "hp"],
    ["What is VP?", "vp"],
    ["What is XY?", "xy"],
    ["How do I understand first-angle projection?", "first-angle"],
    ["How do I see dimensions?", "dimensions"],
    ["How do I see hidden lines?", "hidden"],
    ["How do I use construction steps?", "construction"],
    ["How do I export my drawing?", "export"],
    ["How do I generate a DXF?", "dxf"],
    ["Why isn't my model appearing?", "generate"],
    ["What should I do after generating a model?", "after"],
    ["What is a trace?", "traces"],
    ["What is true length?", "dimensions"],
    ["Show me an example", "example"],
  ];
  for (const [q, id] of cases) {
    it(`answers "${q}"`, () => {
      expect(matchIntent(q).id).toBe(id);
    });
  }
  it("falls back gracefully on unknown input", () => {
    const a = matchIntent("blorb florp zzz");
    expect(a.body.length).toBeGreaterThan(20);
  });
  it("quick help and stuck options are non-empty", () => {
    expect(QUICK_HELP.length).toBeGreaterThanOrEqual(6);
    expect(STUCK_OPTIONS.length).toBeGreaterThanOrEqual(6);
  });
  it("stuck-generate uses real unclear params instead of inventing errors", () => {
    const a = stuckAnswer("__stuck_generate", { hasSolid: true, needsConfirm: true, unclear: ["Top diameter assumed 50% of base — confirm"] });
    expect(a.body).toContain("Top diameter assumed");
  });
});

describe("tutor provider", () => {
  it("answers through the provider abstraction with actions", async () => {
    const p = new LocalTutorProvider();
    const a = await p.answer("How do I export my drawing?", { route: "/", wtab: "model", hasSolid: false, solidKind: null, beginner: true });
    expect(a.body.length).toBeGreaterThan(20);
    expect(a.actions.length).toBeGreaterThan(0);
  });
  it("beginner variant exists where promised", async () => {
    const p = new LocalTutorProvider();
    const a = await p.answer("What is HP?", { route: "/", wtab: "model", hasSolid: false, solidKind: null, beginner: true });
    expect(a.beginnerBody).toContain("floor");
  });
});

describe("guided tour", () => {
  it("covers all seven workspaces in order with routes", () => {
    expect(TOUR_STEPS.length).toBe(7);
    expect(TOUR_STEPS.map((s) => s.route)).toEqual([
      "/",
      "/",
      "/visualizer",
      "/visualizer/projection",
      "/visualizer/construction",
      "/visualizer/dimensions",
      "/visualizer/drawing",
    ]);
    for (const s of TOUR_STEPS) {
      expect(s.tour.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.desc.length).toBeGreaterThan(0);
    }
  });
});
