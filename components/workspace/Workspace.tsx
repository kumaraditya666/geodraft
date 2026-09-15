"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  DraftingCompass, Plus, LayoutGrid, HelpCircle, Save, FolderOpen, GraduationCap,
  Settings2, Home, Eye, MessageSquareText, FileImage, SplitSquareHorizontal, Tag, PencilRuler,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { EXAMPLES } from "@/lib/examples";
import QuestionPanel from "@/components/question/QuestionPanel";
import CameraBar from "@/components/controls/CameraBar";
import ProjectionSVG from "@/components/projection/ProjectionSVG";
import AllViews from "@/components/projection/AllViews";
import StepsBar from "@/components/steps/StepsBar";
import DrawingSheet from "@/components/sheet/DrawingSheet";
import ProjectionLab from "@/components/lab/ProjectionLab";

const Viewer3D = dynamic(() => import("@/components/viewer3d/Viewer3D"), { ssr: false });

type ViewTab = "front" | "top" | "side" | "all";

export default function Workspace() {
  const set = useStore((s) => s.set);
  const setQuestion = useStore((s) => s.setQuestion);
  const generate = useStore((s) => s.generate);
  const loadExample = useStore((s) => s.loadExample);
  const solid = useStore((s) => s.solid);
  const question = useStore((s) => s.question);
  const showLabels = useStore((s) => s.showLabels);
  const showRays = useStore((s) => s.showRays);
  const showHP = useStore((s) => s.showHP);
  const showVP = useStore((s) => s.showVP);
  const splitMode = useStore((s) => s.splitMode);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const scale = useStore((s) => s.scale);
  const unit = useStore((s) => s.unit);
  const saved = useStore((s) => s.saved);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const loadSaved = useStore((s) => s.loadSaved);
  const sidebar = useStore((s) => s.sidebar);
  const explain = useStore((s) => s.explain);

  const [tab, setTab] = useState<ViewTab>("all");
  const [qbox, setQbox] = useState(question);

  const explainView = () => {
    if (!solid) return;
    const v = tab === "all" ? "front + top (first-angle)" : tab;
    const hiddenNote =
      solid.kind === "cone" || solid.kind === "cylinder"
        ? "The far half of the base rim is dashed because it sits behind the solid from this viewpoint — face normals point away from the observer, so the projection engine marks those rim segments hidden."
        : "Edges whose adjacent faces both point away from the observer are dashed hidden lines; edges with at least one face toward you stay solid.";
    const shortNote =
      solid.parsed.inclinations.VP !== undefined
        ? `The ${solid.parsed.inclinations.VP}° tilt foreshortens lengths along the depth direction — that is why the ${tab === "top" ? "top" : "front"} view looks compressed compared to true size.`
        : "True heights appear only where the measured direction is parallel to the projection plane; tilted directions appear foreshortened.";
    set({
      explain: `This is the ${v.toUpperCase()} view because it projects 3D→2D with ${tab === "front" ? "Front=(x,z) onto VP" : tab === "top" ? "Top=(x,−y) onto HP" : tab === "side" ? "Side=(−y,z)" : "Front=(x,z), Top=(x,−y), Side=(−y,z)"} from one shared 3D source. ${hiddenNote} ${shortNote}`,
    });
  };

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      {/* sidebar */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-white/10 bg-[#070b14] p-3 md:flex">
        <button onClick={() => set({ screen: "landing" })} className="flex items-center gap-2 rounded-xl p-2 hover:bg-white/5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300"><DraftingCompass size={17} /></div>
          <span className="font-display font-bold">GeoDraft <span className="text-cyan-300">AI</span></span>
        </button>
        <nav className="mt-4 space-y-1 text-sm">
          {[
            { k: "Visualizer", label: "Visualizer", icon: Home },
            { k: "Lab", label: "Projection Lab", icon: PencilRuler },
            { k: "Examples", label: "Examples", icon: LayoutGrid },
            { k: "Saved", label: "Saved", icon: FolderOpen },
            { k: "Learn", label: "Learn", icon: GraduationCap },
            { k: "Settings", label: "Settings", icon: Settings2 },
          ].map((it) => (
            <button
              key={it.k}
              onClick={() => set({ sidebar: it.k })}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 ${sidebar === it.k ? "bg-cyan-300/10 text-cyan-200" : "text-slate-400 hover:bg-white/5"}`}
            >
              <it.icon size={16} /> {it.label}
              {it.k === "Saved" && saved.length > 0 && (
                <span className="ml-auto rounded-full bg-white/10 px-1.5 font-mono text-[10px]">{saved.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11.5px] leading-relaxed text-slate-500">
          Single geometry kernel → 3D mesh, SVG views & dimensions stay consistent.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top nav */}
        <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#070b14]/80 px-4 py-2.5 backdrop-blur">
          <button onClick={() => set({ screen: "landing" })} className="font-mono text-[11px] text-slate-500 hover:text-cyan-200">← Home</button>
          <div className="flex items-center gap-2">
            <button onClick={() => { setQbox(""); set({ screen: "landing" }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-[12px] font-bold text-slate-950">
              <Plus size={13} /> New Question
            </button>
            <button onClick={() => set({ sidebar: "Examples" })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-200">
              <LayoutGrid size={13} /> Examples
            </button>
            <button onClick={() => set({ sidebar: sidebar === "Learn" ? "Visualizer" : "Learn" })} className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-200 sm:inline-flex">
              <HelpCircle size={13} /> Help
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={saveCurrent} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-200 hover:border-amber-300/40">
              <Save size={13} /> Save
            </button>
            <button onClick={() => set({ sheetOpen: true })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-200 hover:border-cyan-300/40">
              <FileImage size={13} /> Drawing Sheet
            </button>
          </div>
        </header>

        {/* question bar */}
        <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-2.5 lg:flex-row">
          <input
            value={qbox}
            onChange={(e) => setQbox(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setQuestion(qbox); generate(qbox); } }}
            className="w-full flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm outline-none focus:border-cyan-300/50"
            placeholder="Describe your Engineering Drawing question…"
          />
          <button onClick={() => { setQuestion(qbox); generate(qbox); }} className="rounded-xl bg-cyan-400 px-5 py-2 text-sm font-bold text-slate-950">
            Generate
          </button>
        </div>

        {sidebar === "Visualizer" || sidebar === "Home" ? (
          <>
            <div className="grid min-h-0 flex-1 gap-3 p-3 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
              {/* left */}
              <div className="min-h-[300px]"><QuestionPanel /></div>

              {/* center */}
              <div className="flex min-h-[420px] flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CameraBar />
                  <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px]">
                    <Toggle on={showHP} label="HP" onClick={() => set({ showHP: !showHP })} />
                    <Toggle on={showVP} label="VP" onClick={() => set({ showVP: !showVP })} />
                    <Toggle on={showLabels} label="Labels" icon={<Tag size={11} />} onClick={() => set({ showLabels: !showLabels })} />
                    <Toggle on={showRays} label="Rays" icon={<Eye size={11} />} onClick={() => set({ showRays: !showRays })} />
                    <Toggle on={splitMode} label="3D↔2D" icon={<SplitSquareHorizontal size={11} />} onClick={() => set({ splitMode: !splitMode })} />
                  </div>
                </div>
                <div className="min-h-[380px] flex-1"><Viewer3D /></div>
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-slate-400">
                  <span className="font-mono">SCALE</span>
                  {(["1:1", "1:2", "1:5", "2:1"] as const).map((sc) => (
                    <button key={sc} onClick={() => set({ scale: sc })} className={`rounded-md px-2 py-1 font-mono ${scale === sc ? "bg-white text-slate-950" : "border border-white/10"}`}>{sc}</button>
                  ))}
                  <span className="ml-2 font-mono">UNIT</span>
                  {(["mm", "cm", "m"] as const).map((u) => (
                    <button key={u} onClick={() => set({ unit: u })} className={`rounded-md px-2 py-1 font-mono ${unit === u ? "bg-white text-slate-950" : "border border-white/10"}`}>{u}</button>
                  ))}
                  {selectedPoint && (
                    <span className="ml-auto rounded-md bg-amber-300/15 px-2 py-1 font-mono text-amber-200">
                      ● {selectedPoint} selected — highlighted in 3D + 2D
                      <button onClick={() => set({ selectedPoint: null })} className="ml-2 underline">clear</button>
                    </span>
                  )}
                </div>
              </div>

              {/* right */}
              <div className="glass flex min-h-[420px] flex-col rounded-2xl p-3">
                <div className="flex items-center gap-1.5">
                  {(["front", "top", "side", "all"] as ViewTab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase ${tab === t ? "bg-cyan-400 text-slate-950" : "border border-white/10 text-slate-300"}`}
                    >
                      {t === "all" ? "All Views" : t}
                    </button>
                  ))}
                  <button onClick={explainView} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-fuchsia-300/30 px-2.5 py-1.5 text-[11px] text-fuchsia-200">
                    <MessageSquareText size={12} /> Explain
                  </button>
                </div>
                <div className="mt-2 min-h-[340px] flex-1 overflow-hidden rounded-xl border border-white/10">
                  {solid && (tab === "all" ? <AllViews solid={solid} /> : <ProjectionSVG solid={solid} view={tab} />)}
                </div>
                <button onClick={() => set({ sidebar: "Lab" })} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 px-3 py-2 text-[12.5px] font-bold text-slate-950">
                  <PencilRuler size={14} /> Open Projection Lab — animated projectors + drawing guide
                </button>
                {explain && (
                  <div className="mt-2 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/5 p-3 text-[12.5px] leading-relaxed text-fuchsia-100/90">
                    {explain}
                  </div>
                )}
                {splitMode && (
                  <div className="mt-2 rounded-xl border border-amber-300/25 bg-amber-300/5 p-2.5 text-[12px] text-amber-100/90">
                    Split mode: click a label (A, B, O…) in 3D or 2D — the matching point lights up in every view.
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 pt-0"><StepsBar /></div>
          </>
        ) : sidebar === "Lab" ? (
          <div className="min-h-0 flex-1 p-3">
            <ProjectionLab />
          </div>
        ) : sidebar === "Examples" ? (
          <ExamplesGrid onOpen={(id) => { loadExample(id); set({ sidebar: "Visualizer" }); }} />
        ) : sidebar === "Saved" ? (
          <div className="mx-auto w-full max-w-3xl p-6">
            <h2 className="font-display text-xl font-bold">Saved Problems</h2>
            {saved.length === 0 && <p className="mt-2 text-sm text-slate-400">Nothing saved yet — generate a visualization and press Save.</p>}
            <div className="mt-4 space-y-2">
              {saved.map((sv) => (
                <button key={sv.id} onClick={() => { loadSaved(sv.id); set({ sidebar: "Visualizer" }); }} className="glass w-full rounded-xl p-4 text-left hover:border-cyan-300/40">
                  <div className="font-semibold">{sv.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[13px] text-slate-400">{sv.question}</div>
                </button>
              ))}
            </div>
          </div>
        ) : sidebar === "Learn" ? (
          <div className="mx-auto grid w-full max-w-4xl gap-3 p-6 md:grid-cols-2">
            {[
              ["Why does the cone look like this?", "The cone touches HP, so its lowest generator sits at z=0. Because the axis is inclined to VP, depth (y) mixes into the front view width — the elevation looks wider/narrower while the plan shows the true tilt."],
              ["Why are some lines dashed?", "Dashed = hidden. The engine checks each face normal against the viewing direction; edges with no face toward you are behind the solid, so they render dashed."],
              ["Why do dimensions look shortened?", "Only directions parallel to the drawing plane show true length. Tilted directions foreshorten by cos/sin of the inclination — the 3D value is still full size."],
              ["What is XY?", "XY is the fold where HP (floor, z=0) meets VP (wall, y=0). Front view lives above XY, top view below it in first-angle projection."],
            ].map(([t, d]) => (
              <div key={t} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 font-semibold"><GraduationCap size={17} className="text-cyan-300" /> {t}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-xl p-6">
            <h2 className="font-display text-xl font-bold">Settings</h2>
            <div className="glass mt-4 space-y-3 rounded-2xl p-5 text-sm">
              <Row label="Display unit" value={unit} opts={["mm", "cm", "m"]} onPick={(v) => set({ unit: v as "mm" | "cm" | "m" })} />
              <Row label="Drawing scale" value={scale} opts={["1:1", "1:2", "1:5", "2:1"]} onPick={(v) => set({ scale: v as "1:1" | "1:2" | "1:5" | "2:1" })} />
            </div>
          </div>
        )}
      </div>
      <DrawingSheet />
    </div>
  );
}

function Toggle({ on, label, onClick, icon }: { on: boolean; label: string; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-mono font-bold ${on ? "bg-cyan-400/90 text-slate-950" : "border border-white/10 text-slate-400"}`}
    >
      {icon}{label}
    </button>
  );
}

function Row({ label, value, opts, onPick }: { label: string; value: string; opts: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{label}</span>
      <div className="flex gap-1.5">
        {opts.map((o) => (
          <button key={o} onClick={() => onPick(o)} className={`rounded-lg px-3 py-1 font-mono ${value === o ? "bg-cyan-400 text-slate-950" : "border border-white/10"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function ExamplesGrid({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <h2 className="font-display text-xl font-bold">Example Library</h2>
      <p className="mt-1 text-sm text-slate-400">Ten preset problems with structured parameters — opens instantly, no parsing needed.</p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <button key={ex.id} onClick={() => onOpen(ex.id)} className="glass rounded-2xl p-4 text-left hover:border-cyan-300/40">
            <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">{ex.tag}</div>
            <div className="mt-1 font-semibold">{ex.title}</div>
            <div className="mt-1 line-clamp-3 text-[12.5px] text-slate-400">{ex.question}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
