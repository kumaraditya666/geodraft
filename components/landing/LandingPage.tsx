"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, Box, DraftingCompass, MousePointerClick, Play, Ruler, ScanLine, Layers, FileOutput } from "lucide-react";
import { useStore } from "@/store/useStore";
import { EXAMPLES } from "@/lib/examples";
import Footer from "@/components/ui/Footer";

const HeroBackground = dynamic(() => import("./HeroBackground"), { ssr: false });

const FEATURES = [
  { icon: Box, title: "3D Visualization", desc: "True-scale solids seated on HP/VP with orbit, pan and preset cameras." },
  { icon: ScanLine, title: "Orthographic Projection", desc: "Front, top and side views generated from the same 3D coordinates." },
  { icon: Ruler, title: "Automatic Dimensions", desc: "⌀, heights, lengths and angles taken from the model — never typed." },
  { icon: Layers, title: "Step-by-Step Construction", desc: "Animated XY → solid → projectors → final views procedure." },
  { icon: MousePointerClick, title: "Interactive Projection Rays", desc: "Animate how each 3D vertex drops onto HP and VP." },
  { icon: FileOutput, title: "Drawing Sheet + Export", desc: "A4-style sheet with title block, scale and PNG/SVG export." },
];

const QUICK = ["cone-vp30", "cyl-vp", "prism-hp", "pyr-hp", "line-hp-vp", "plane-hp", "pent-40hp", "hex-3540", "rhombus-sq", "semi-vp", "cone-section", "cyl-hp"];

export default function LandingPage() {
  const question = useStore((s) => s.question);
  const setQuestion = useStore((s) => s.setQuestion);
  const generate = useStore((s) => s.generate);
  const loadExample = useStore((s) => s.loadExample);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d]">
      <div className="ed-grid-bg absolute inset-0" />
      <HeroBackground />

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
            onClick={() => loadExample("cone-vp30")}
            className="rounded-full bg-cyan-400 px-4 py-1.5 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Open Visualizer
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-16">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[12px] text-cyan-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            AI Engineering Drawing & Orthographic Visualizer
          </div>
          <h1 className="font-display mt-5 max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
            Turn Engineering Drawing Questions <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">Into 3D.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-400">
            Describe a solid. See its 3D orientation, orthographic projections, dimensions and construction steps.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="glass glow-border mt-8 rounded-2xl p-4 md:p-5"
        >
          <label className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Describe your Engineering Drawing question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-[15px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
            placeholder="A cone of base diameter 50 mm and height 70 mm rests on HP. Its axis makes 30° with VP. Draw its orthographic projections."
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => generate()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Generate Visualization <ArrowRight size={16} />
            </button>
            <button
              onClick={() => loadExample("cone-vp30")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-slate-200 hover:border-cyan-300/40 hover:text-cyan-200"
            >
              <Play size={15} /> Try Example
            </button>
            <span className="ml-auto hidden font-mono text-[11px] text-slate-500 md:block">deterministic parser • no API key needed</span>
          </div>
        </motion.div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {QUICK.map((id) => {
            const ex = EXAMPLES.find((e) => e.id === id)!;
            return (
              <button
                key={id}
                onClick={() => loadExample(id)}
                className="glass group rounded-xl p-3.5 text-left transition hover:border-cyan-300/40"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">{ex.tag}</div>
                <div className="mt-1 text-sm font-semibold text-slate-100 group-hover:text-cyan-100">{ex.title}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-5">
              <f.icon size={20} className="text-cyan-300" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <div className="mt-1 text-sm leading-relaxed text-slate-400">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="glass mt-8 rounded-2xl p-6">
          <div className="font-display text-lg font-bold">See Engineering Drawing in 3D.</div>
          <p className="mt-1 text-sm text-slate-400">
            Turn confusing CAD questions into interactive 3D solids and mathematically generated orthographic projections.
            Every view — 3D mesh, SVG projection, dimension — comes from one shared geometry kernel.
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => generate()} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950">
              Visualize a Problem
            </button>
            <button onClick={() => loadExample("cone-hp")} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-slate-200">
              Explore Examples
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
