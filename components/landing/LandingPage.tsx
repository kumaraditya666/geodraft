"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Box, DraftingCompass, GraduationCap, MousePointerClick, Play, Ruler, ScanLine, Layers, FileOutput, Terminal } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useTutor } from "@/components/tutor/TutorContext";
import type { WorkspaceTab } from "@/store/useStore";
import { EXAMPLES } from "@/lib/examples";
import Footer from "@/components/ui/Footer";
import { engineStatus } from "@/lib/landing/heroContent";

function EngineStatusStrip() {
  const [status] = useState(() => engineStatus());
  return (
    <div className="mt-3 flex items-center gap-2 font-mono text-[10.5px] text-slate-500">
      <span className={`h-1.5 w-1.5 rounded-full ${status.ok ? "animate-pulse bg-emerald-300" : "bg-red-400"}`} />
      <span className={status.ok ? "" : "text-red-300"}>{status.detail}</span>
    </div>
  );
}

const PHASES = ["01 · OBJECT", "02 · PROJECTIONS", "03 · DIMENSIONS", "04 · SHEET"];

function ScrollPhase() {
  const [phase, setPhase] = useState(0);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.55;
      const at = (id: string) => document.getElementById(id)?.offsetTop ?? Infinity;
      let p = 0;
      if (y > at("examples")) p = 1;
      if (y > at("features")) p = 2;
      if (y > at("learn-strip")) p = 3;
      setPhase(p);
      setPast(window.scrollY > window.innerHeight * 0.7);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!past) return null;
  return (
    <div className="fixed bottom-5 left-5 z-40 hidden rounded-full border border-white/10 bg-black/70 px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.2em] text-cyan-200 backdrop-blur md:block">
      {PHASES[phase]}
    </div>
  );
}
import ExampleCard from "./ExampleCard";
import FeaturePreview from "./FeaturePreview";
import { buildProjection } from "@/lib/projection/projectionEngine";
import { measuredAngles } from "@/lib/projection/angleEngine";

const HeroStage = dynamic(() => import("./HeroStage"), { ssr: false, loading: () => <div className="h-[560px] w-full animate-pulse rounded-3xl border border-white/10 bg-[#04060b] md:h-[620px]" /> });

type StorePatch = Partial<ReturnType<typeof useStore.getState>>;

const FEATURES: { icon: typeof Box; title: string; desc: string; route: string; tab: WorkspaceTab; patch?: StorePatch }[] = [
  { icon: Box, title: "3D Visualization", desc: "True-scale solids seated on HP/VP with orbit, pan and preset cameras.", route: "/visualizer", tab: "model" },
  { icon: ScanLine, title: "Orthographic Projection", desc: "Front, top and side views generated from the same 3D coordinates.", route: "/visualizer/projection", tab: "projection" },
  { icon: Ruler, title: "Automatic Dimensions", desc: "⌀, heights, lengths and angles taken from the model — never typed.", route: "/visualizer/dimensions", tab: "dimensions" },
  { icon: Layers, title: "Step-by-Step Construction", desc: "Animated XY → solid → projectors → final views procedure.", route: "/visualizer/construction", tab: "construction" },
  { icon: MousePointerClick, title: "Interactive Projection Rays", desc: "Animate how each 3D vertex drops onto HP and VP.", route: "/visualizer", tab: "model", patch: { showRays: true, showProjectors: true, splitMode: true } },
  { icon: FileOutput, title: "Drawing Sheet + Export", desc: "A4-style sheet with title block, scale and SVG/DXF export.", route: "/visualizer/drawing", tab: "sheet" },
];

const QUICK = ["cone-vp30", "cyl-vp", "prism-hp", "pyr-hp", "line-hp-vp", "plane-hp", "pent-40hp", "hex-3540", "rhombus-sq", "semi-vp", "cone-section", "cyl-hp"];

export default function LandingPage() {
  const router = useRouter();
  const { startTour } = useTutor();
  const question = useStore((s) => s.question);
  const setQuestion = useStore((s) => s.setQuestion);
  const generate = useStore((s) => s.generate);
  const loadExample = useStore((s) => s.loadExample);

  /** Deep-link a feature: keep the user's model if one exists, else generate from their text. */
  const goFeature = (route: string, tab: WorkspaceTab, patch?: StorePatch) => {
    const st = useStore.getState();
    if (!st.solid) st.generate();
    st.set({ screen: "workspace", sidebar: "Visualizer", wtab: tab, ...patch });
    router.push(route);
  };

  const openVisualizer = () => {
    const st = useStore.getState();
    if (!st.solid) st.generate();
    st.set({ screen: "workspace", sidebar: "Visualizer", wtab: "model" });
    router.push("/visualizer");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // staged generation overlay: real work runs first, then stages narrate verified artifacts
  const [stages, setStages] = useState<{ label: string; detail: string }[] | null>(null);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (!stages) return;
    if (stageIdx >= stages.length) {
      const t = setTimeout(() => {
        setStages(null);
        setStageIdx(0);
        router.push("/visualizer");
      }, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStageIdx((i) => i + 1), 300);
    return () => clearTimeout(t);
  }, [stages, stageIdx, router]);

  const runGenerate = () => {
    if (stages) return;
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    generate();
    if (reduced) {
      router.push("/visualizer");
      return;
    }
    const st = useStore.getState();
    const solid = st.solid;
    const parsed = st.parsed;
    if (!solid || !parsed) {
      router.push("/visualizer");
      return;
    }
    const dims = Object.entries(parsed.dimensions)
      .map(([k, v]) => `${k} ${v}`)
      .join(" · ");
    const m = measuredAngles(solid.axisDir);
    const tiltTxt =
      parsed.inclinations.HP !== undefined || parsed.inclinations.VP !== undefined
        ? `measured ${m.withHP.toFixed(1)}° HP / ${m.withVP.toFixed(1)}° VP`
        : "seated on " + (parsed.restingPlane ?? "HP");
    const nf = buildProjection(solid, "front").segments.length;
    const nt = buildProjection(solid, "top").segments.length;
    const ns = buildProjection(solid, "side").segments.length;
    setStageIdx(0);
    setStages([
      { label: "PARSING PROBLEM", detail: `Detected ${solid.kind} · confidence ${parsed.confidence}%` },
      { label: "EXTRACTING DIMENSIONS", detail: dims ? `${dims} mm` : "true shape defaults" },
      { label: "BUILDING GEOMETRY", detail: `${solid.vertices.length} vertices · ${solid.edges.length} edges` },
      { label: "SOLVING ORIENTATION", detail: tiltTxt },
      { label: "PROJECTING TO HP / VP", detail: `front ${nf} · top ${nt} · side ${ns} segments` },
      { label: "GENERATING VIEWS", detail: "Front + Top + Side ready" },
    ]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d]">
      <div className="ed-grid-bg pointer-events-none absolute inset-0 opacity-60" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300 glow-border">
            <DraftingCompass size={19} />
          </div>
          <div className="font-display text-lg font-bold tracking-tight">
            GeoDraft <span className="text-cyan-300">AI</span>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-sm text-slate-400 md:flex">
          <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px]">First-angle • mm • XY</span>
          <button
            onClick={openVisualizer}
            className="rounded-full bg-cyan-400 px-4 py-1.5 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Open Visualizer
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-14">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
          <div aria-hidden className="wordmark-outline pointer-events-none absolute -top-10 left-0 select-none md:-top-16">
            GEODRAFT
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[12px] text-cyan-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            SYSTEM // ENGINEERING GRAPHICS · HP · VP · XY
          </div>
          <h1 className="font-display mt-5 max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
            Turn Engineering Problems <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">Into Geometry.</span>
          </h1>
          <p className="font-display mt-4 max-w-2xl text-xl font-semibold tracking-wide text-slate-200">
            Understand. Visualize. Project.
          </p>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-400">
            Describe a solid. See its 3D orientation, orthographic projections, dimensions and construction steps.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6"
        >
          <HeroStage />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          data-tour="question-input"
          className="glass glow-border console-box relative mt-8 overflow-hidden rounded-2xl p-4 md:p-5"
        >
          <div className="console-scan pointer-events-none absolute left-4 right-4 h-px bg-cyan-300/60" />
          <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <Terminal size={12} className="text-cyan-300" /> Describe your engineering drawing problem...
          </label>
          <textarea
            id="problem-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-[15px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
            placeholder="A cone of base diameter 50 mm and height 70 mm rests on HP. Its axis makes 30° with VP. Draw its orthographic projections."
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10.5px] text-slate-500">Try:</span>
            {[
              "Hexagonal plate of side 40 mm resting on a corner in VP, surface 30° to VP.",
              "Cone ⌀50 mm, height 70 mm, axis 30° to VP.",
              "Square lamina 50 mm, corner on HP, sides parallel to VP.",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setQuestion(s)}
                className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10.5px] text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200"
              >
                “{s}”
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              data-tour="generate-button"
              onClick={runGenerate}
              className="pressable inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Generate Visualization <ArrowRight size={16} />
            </button>
            <button
              onClick={() => { loadExample("cone-vp30"); router.push("/visualizer"); }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-slate-200 hover:border-cyan-300/40 hover:text-cyan-200"
            >
              <Play size={15} /> Try Example
            </button>
            <span className="ml-auto hidden font-mono text-[11px] text-slate-500 md:block">deterministic parser • no API key needed</span>
          </div>
          <EngineStatusStrip />
        </motion.div>

        <div id="examples" data-tour="examples" className="mt-6 grid scroll-mt-6 grid-cols-2 gap-2.5 md:grid-cols-4">
          {QUICK.map((id) => {
            const ex = EXAMPLES.find((e) => e.id === id)!;
            return <ExampleCard key={id} ex={ex} onOpen={(eid) => { loadExample(eid); router.push("/visualizer"); }} />;
          })}
        </div>

        <div id="features" className="mt-12 grid scroll-mt-6 gap-3 md:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.button
              key={f.title}
              onClick={() => goFeature(f.route, f.tab, f.patch)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="glass pressable cursor-pointer rounded-2xl p-5 text-left transition hover:border-cyan-300/50 hover:bg-cyan-300/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              <FeaturePreview kind={f.title} />
              <div className="mt-2 flex items-center gap-2">
                <f.icon size={17} className="text-cyan-300" />
                <div className="font-semibold">{f.title}</div>
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-400">{f.desc}</div>
              <div className="mt-3 font-mono text-[11px] text-slate-500 transition group-hover:text-cyan-300">
                <span className="inline-flex items-center gap-1 text-cyan-300/80">Explore <ArrowRight size={12} /></span>
              </div>
            </motion.button>
          ))}
        </div>

        <div id="learn-strip" className="glass mt-8 flex scroll-mt-6 flex-col items-start gap-3 rounded-2xl p-6 sm:flex-row sm:items-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300 glow-border">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-bold">Learn GeoDraft in 60 seconds</div>
            <p className="mt-0.5 text-sm text-slate-400">
              A guided tour across the real app — question box, 3D model, projections, construction, dimensions and export.
            </p>
          </div>
          <button onClick={() => startTour(0)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300">
            Start Tour <ArrowRight size={15} />
          </button>
        </div>

        <div className="glass mt-8 rounded-2xl p-6">
          <div className="font-display text-lg font-bold">See Engineering Drawing in 3D.</div>
          <p className="mt-1 text-sm text-slate-400">
            Turn confusing CAD questions into interactive 3D solids and mathematically generated orthographic projections.
            Every view — 3D mesh, SVG projection, dimension — comes from one shared geometry kernel.
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => { scrollTo("problem-input"); document.getElementById("problem-input")?.focus({ preventScroll: true }); }} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950">
              Visualize a Problem
            </button>
            <button onClick={() => scrollTo("examples")} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-slate-200">
              Explore Examples
            </button>
          </div>
        </div>
      </main>
      <Footer />
      <ScrollPhase />
      {stages && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => { setStages(null); setStageIdx(0); router.push("/visualizer"); }}>
          <div className="glass glow-border w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300">Generating — real pipeline stages</div>
            <div className="mt-3 space-y-2">
              {stages.map((s, i) => (
                <div key={s.label} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition ${i < stageIdx ? "border-emerald-300/30 bg-emerald-300/5" : i === stageIdx ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/5 opacity-40"}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold ${i < stageIdx ? "bg-emerald-300 text-slate-950" : i === stageIdx ? "animate-pulse bg-cyan-400 text-slate-950" : "border border-white/20 text-slate-500"}`}>
                    {i < stageIdx ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-bold tracking-wider">{s.label}</div>
                    {(i <= stageIdx) && <div className="truncate font-mono text-[10.5px] text-slate-400">{s.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center font-mono text-[10px] text-slate-500">click anywhere to skip →</div>
          </div>
        </div>
      )}
    </div>
  );
}
