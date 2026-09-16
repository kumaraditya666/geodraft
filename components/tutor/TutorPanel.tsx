"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, GraduationCap, LifeBuoy, Send, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTutor } from "./TutorContext";
import { GuidedTour, SpotOverlay } from "./GuidedTour";
import { QUICK_HELP, STUCK_OPTIONS, type TutorAction, type TutorAnswer } from "@/lib/tutor/knowledgeBase";
import { tutorProvider } from "@/lib/tutor/tutorProvider";
import { useStore } from "@/store/useStore";

interface Msg {
  from: "user" | "tutor";
  text: string;
  actions?: TutorAction[];
}

function contextHint(pathname: string, wtab: string, hasSolid: boolean): string | null {
  if (pathname === "/") return "You're on the home page — type a problem below, or take the tour to learn each workspace.";
  if (!hasSolid) return "Generate a problem first — every tutor demo needs a live model to point at.";
  switch (wtab) {
    case "model":
      return "You're viewing the 3D model. Drag to orbit, scroll to zoom — or ask me what HP, VP or an angle means.";
    case "projection":
      return "You're viewing orthographic projections. Compare front, top and side — dashed lines are hidden far-side edges.";
    case "construction":
      return "This animation builds the drawing stage by stage: XY, shape, position, tilt, projectors, views.";
    case "dimensions":
      return "Every number here is read from the live 3D model. Watch for true vs projected lengths on tilted edges.";
    case "sheet":
      return "You're preparing the final drawing sheet — check the title block, then export.";
    case "export":
      return "Export SVG for the web, DXF for AutoCAD (editable vectors), or print to PDF.";
    default:
      return null;
  }
}

export function TutorMount() {
  const { open, setOpen, tourIndex, startTour } = useTutor();
  const router = useRouter();
  const loadExample = useStore((s) => s.loadExample);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("geodraft_tutor_seen") && !localStorage.getItem("geodraft_tutorial_completed")) {
        const t = setTimeout(() => setNudge(true), 2500);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }, []);

  const dismissNudge = (mark = true) => {
    setNudge(false);
    if (!mark) return;
    try {
      localStorage.setItem("geodraft_tutor_seen", "yes");
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {/* floating button */}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
        <AnimatePresence>
          {nudge && !open && tourIndex === null && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="glass max-w-[250px] rounded-2xl rounded-br-md p-3.5"
            >
              <div className="font-display text-[13.5px] font-bold">Welcome to GeoDraft.</div>
              <p className="mt-0.5 text-[12px] text-slate-400">See a cone become an engineering drawing →</p>
              <div className="mt-2 flex flex-col gap-1.5">
                <button
                  onClick={() => { loadExample("cone-vp30"); dismissNudge(); router.push("/visualizer"); }}
                  className="rounded-lg bg-cyan-400 px-3 py-1.5 text-[12px] font-bold text-slate-950"
                >
                  Try an Example
                </button>
                <button
                  onClick={() => { dismissNudge(); router.push("/"); setTimeout(() => document.getElementById("problem-input")?.focus(), 400); }}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-slate-200"
                >
                  Enter My Problem
                </button>
                <button
                  onClick={() => { dismissNudge(); startTour(0); }}
                  className="rounded-lg border border-cyan-300/30 px-3 py-1.5 text-[12px] font-bold text-cyan-200"
                >
                  Take a 60-sec Tour
                </button>
              </div>
              <button onClick={() => dismissNudge()} className="mt-1.5 font-mono text-[10px] text-slate-500 hover:text-slate-300">
                dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => {
            setOpen(!open);
            try {
              localStorage.setItem("geodraft_tutor_seen", "yes");
            } catch {
              /* ignore */
            }
            setNudge(false);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Need help? Ask GeoDraft Tutor"
          className="glow-border inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-[#0b1220]/95 px-4 py-2.5 text-sm font-bold text-cyan-200 backdrop-blur"
        >
          <Bot size={17} /> GeoDraft Tutor
        </motion.button>
      </div>

      <AnimatePresence>{open && <Panel />}</AnimatePresence>
      <GuidedTour />
      <SpotOverlay />
    </>
  );
}

function Panel() {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpen, beginner, setBeginner, startTour, showSpot, inject, clearInject } = useTutor();
  const wtab = useStore((s) => s.wtab);
  const solid = useStore((s) => s.solid);
  const loadExample = useStore((s) => s.loadExample);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stuck, setStuck] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const hint = useMemo(() => contextHint(pathname ?? "/", wtab, !!solid), [pathname, wtab, solid]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  useEffect(() => {
    if (inject) {
      setMsgs((m) => [...m, { from: "tutor", text: inject.text, actions: inject.actions }]);
      clearInject();
    }
  }, [inject, clearInject]);

  const runAction = (a: TutorAction) => {
    if (a.type === "route") {
      setOpen(false);
      router.push(a.to);
    } else if (a.type === "example") {
      loadExample(a.id);
      setOpen(false);
      router.push("/visualizer");
    } else if (a.type === "show") {
      setOpen(false);
      showSpot({ tour: a.tour, route: a.route, title: "Tutor highlight", desc: "", once: true });
    } else if (a.type === "tour") {
      startTour(0);
    }
  };

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setMsgs((m) => [...m, { from: "user", text: query }]);
    setInput("");
    setBusy(true);
    try {
      const st = useStore.getState();
      const ans: TutorAnswer = await tutorProvider.answer(query, {
        route: pathname ?? "/",
        wtab,
        hasSolid: !!st.solid,
        solidKind: st.solid?.kind ?? null,
        beginner,
      });
      const text = beginner && ans.beginnerBody ? ans.beginnerBody : ans.body;
      setMsgs((m) => [...m, { from: "tutor", text, actions: ans.actions }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ duration: 0.22 }}
      className="glass glow-border fixed bottom-20 right-5 z-[65] flex max-h-[70vh] w-[360px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-2xl"
    >
      <div className="border-b border-white/10 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300">
              <GraduationCap size={17} />
            </div>
            <div>
              <div className="font-display text-[15px] font-bold">GeoDraft Tutor</div>
              <div className="font-mono text-[10px] text-slate-500">Learn how to use GeoDraft</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:text-slate-200">
            <X size={15} />
          </button>
        </div>
        {hint && <div className="mt-2 rounded-xl bg-cyan-300/5 px-2.5 py-2 text-[12px] leading-snug text-cyan-100/90">{hint}</div>}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setBeginner(!beginner)}
            className={`rounded-lg px-2.5 py-1 font-mono text-[10.5px] font-bold ${beginner ? "bg-fuchsia-400 text-slate-950" : "border border-white/10 text-slate-400"}`}
          >
            Beginner Mode {beginner ? "ON" : "OFF"}
          </button>
          <button onClick={() => startTour(0)} className="rounded-lg border border-cyan-300/30 px-2.5 py-1 font-mono text-[10.5px] font-bold text-cyan-200">
            60-sec tour
          </button>
          <button onClick={() => setStuck(!stuck)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 font-mono text-[10.5px] font-bold text-slate-300">
            <LifeBuoy size={11} /> I&apos;m Stuck
          </button>
        </div>
      </div>

      <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.length === 0 && !stuck && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Quick Help</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {QUICK_HELP.map((q) => (
                <button key={q.label} onClick={() => ask(q.query)} className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[12px] text-slate-200 hover:border-cyan-300/40 hover:text-cyan-100">
                  {q.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-cyan-300/70" />
              Ask anything — “What is HP?”, “How do I export?”, “Show me an example”.
            </div>
          </div>
        )}
        {stuck && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">What are you stuck on?</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STUCK_OPTIONS.map((o) => (
                <button key={o.label} onClick={() => { setStuck(false); ask(o.query); }} className="rounded-lg border border-amber-300/30 bg-amber-300/5 px-2.5 py-1.5 text-[12px] text-amber-100 hover:border-amber-300/60">
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${m.from === "user" ? "ml-auto bg-cyan-400 text-slate-950" : "border border-white/10 bg-black/40 text-slate-200"}`}>
            {m.text}
            {m.actions && m.actions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.actions.map((a, j) => (
                  <button key={j} onClick={() => runAction(a)} className="rounded-lg bg-cyan-400/90 px-2.5 py-1 text-[11.5px] font-bold text-slate-950">
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="font-mono text-[11px] text-slate-500">thinking…</div>}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-1.5 border-t border-white/10 p-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask how to use GeoDraft…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px] outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
        />
        <button type="submit" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400 text-slate-950" aria-label="Send">
          <Send size={15} />
        </button>
      </form>
    </motion.div>
  );
}
