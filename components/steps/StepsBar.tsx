"use client";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { useStore } from "@/store/useStore";
import { buildSteps } from "@/lib/parser/engineeringParser";

export default function StepsBar() {
  const parsed = useStore((s) => s.parsed);
  const stepIndex = useStore((s) => s.stepIndex);
  const playing = useStore((s) => s.playing);
  const studentMode = useStore((s) => s.studentMode);
  const set = useStore((s) => s.set);

  const steps = parsed ? buildSteps(parsed) : [];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const i = useStore.getState().stepIndex;
      if (i >= steps.length - 1) {
        useStore.getState().set({ playing: false });
        clearInterval(t);
      } else {
        useStore.getState().set({ stepIndex: i + 1 });
      }
    }, 1600);
    return () => clearInterval(t);
  }, [playing, steps.length]);

  if (!steps.length) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Step-by-step construction</div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => set({ stepIndex: Math.max(0, stepIndex - 1) })} className="rounded-lg border border-white/10 p-1.5 hover:border-cyan-300/40">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => set({ playing: !playing })} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-[12px] font-bold text-slate-950">
            {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pause" : "Animate"}
          </button>
          <button onClick={() => set({ stepIndex: Math.min(steps.length - 1, stepIndex + 1) })} className="rounded-lg border border-white/10 p-1.5 hover:border-cyan-300/40">
            <ChevronRight size={15} />
          </button>
          <button onClick={() => set({ studentMode: !studentMode })} className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${studentMode ? "bg-fuchsia-400 text-slate-950" : "border border-white/10"}`}>
            Student Mode
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {steps.map((st, i) => {
          const active = i === stepIndex;
          const done = i < stepIndex;
          return (
            <button
              key={st.title}
              onClick={() => set({ stepIndex: i })}
              className={`rounded-xl border p-3 text-left transition ${
                active ? "border-cyan-300/60 bg-cyan-300/10" : done ? "border-emerald-300/25 bg-emerald-300/5" : "border-white/10 bg-black/30 opacity-70"
              }`}
            >
              <div className={`font-mono text-[10px] font-bold ${active ? "text-cyan-200" : "text-slate-500"}`}>STEP {i + 1}</div>
              <div className="mt-1 text-[12.5px] font-semibold leading-snug">{st.title}</div>
              <div className="mt-1 line-clamp-3 text-[11.5px] leading-snug text-slate-400">{studentMode ? st.student : st.detail}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
