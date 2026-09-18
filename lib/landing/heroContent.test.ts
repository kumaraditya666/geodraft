import { describe, expect, it } from "vitest";
import { canonicalSolid, canonicalEdgeFacts, engineStatus, MORPHS, morphSource, CANONICAL_Q } from "@/lib/landing/heroContent";
import { buildProjection } from "@/lib/projection/projectionEngine";
import { EXAMPLES } from "@/lib/examples";

describe("hero canonical demo", () => {
  it("uses the cone 50/70 question through the real engine", () => {
    expect(CANONICAL_Q).toContain("50 mm");
    const s = canonicalSolid();
    expect(s.kind).toBe("cone");
    expect(s.radius).toBe(25);
    expect(s.height).toBe(70);
  });
  it("PROJECT views come from the engine, non-empty", () => {
    const s = canonicalSolid();
    for (const v of ["front", "top", "side"] as const) {
      expect(buildProjection(s, v).segments.length).toBeGreaterThan(0);
    }
  });
  it("edge facts are true slant geometry, projections foreshortened or equal", () => {
    const f = canonicalEdgeFacts();
    expect(f.trueMM).toBeCloseTo(Math.sqrt(25 * 25 + 70 * 70), 4);
    expect(f.frontMM).toBeLessThanOrEqual(f.trueMM + 1e-9);
    expect(f.topMM).toBeLessThanOrEqual(f.trueMM + 1e-9);
    expect(f.frontMM).toBeGreaterThan(0);
  });
  it("engine self-test passes", () => {
    expect(engineStatus().ok).toBe(true);
  });
});

describe("morph set integrity", () => {
  it("covers all eight shapes with dims", () => {
    expect(MORPHS.map((m) => m.key)).toEqual(["cone", "cylinder", "sphere", "pyramid", "prism", "hex", "plane", "rhombus"]);
    for (const m of MORPHS) expect(m.dims.length).toBeGreaterThan(0);
  });
  it("example-backed morphs match their real preset dimensions", () => {
    const checks: [string, (d: Record<string, number>) => boolean][] = [
      ["cone", (d) => d.diameter === 50 && d.height === 70],
      ["cylinder", (d) => d.diameter === 40 && (d.height === 60 || d.length === 60)],
      ["pyramid", (d) => d.side === 40 && d.height === 60],
      ["prism", (d) => d.side === 30 && d.height === 65],
      ["hex", (d) => d.side === 35],
      ["plane", (d) => (d.width === 60 && (d.length === 40 || d.height === 40)) || d.side === 30],
      ["rhombus", (d) => d.diag1 === 60 && d.diag2 === 40],
    ];
    for (const [key, ok] of checks) {
      const src = morphSource(key);
      expect(src.exampleId).not.toBeNull();
      const ex = EXAMPLES.find((e) => e.id === src.exampleId)!;
      expect(ex, `${key} example exists`).toBeDefined();
      expect(ok(ex.preset.dimensions), `${key} preset matches hero dims`).toBe(true);
    }
  });
  it("unknown morph keys throw instead of faking", () => {
    expect(() => morphSource("nope")).toThrow();
  });
});
