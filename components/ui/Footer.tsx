"use client";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Instagram } from "lucide-react";
import { useRouter } from "next/navigation";

const ADITYA_URL = "https://www.instagram.com/aadiiii___666/";
const ATHARV_URL = "https://www.instagram.com/atharvvarshney7/";

const CREATORS = [
  {
    id: "01",
    tag: "GEODRAFT / CREATOR 01",
    name: "ADITYA KUMAR",
    handle: "@aadiiii___666",
    role: "Co-Creator • GeoDraft AI",
    url: ADITYA_URL,
  },
  {
    id: "02",
    tag: "GEODRAFT / CREATOR 02",
    name: "ATHARV VARSHNEY",
    handle: "@atharvvarshney7",
    role: "Co-Creator • GeoDraft AI",
    url: ATHARV_URL,
  },
];

const anim = (reduced: boolean | null, delay: number) =>
  reduced
    ? { initial: { opacity: 0 }, whileInView: { opacity: 1 }, transition: { duration: 0.2, delay } }
    : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: "easeOut" as const } };

function CreatorCard({ c, index, reduced }: { c: (typeof CREATORS)[number]; index: number; reduced: boolean | null }) {
  return (
    <motion.a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${c.name} on Instagram (${c.handle})`}
      {...anim(reduced, 0.35 + index * 0.18)}
      viewport={{ once: true, margin: "-60px" }}
      whileHover={reduced ? undefined : { y: -5 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      className="creator-card group relative block overflow-hidden rounded-2xl border border-white/10 bg-[#070c16] p-6 text-left transition-colors duration-300 hover:border-cyan-300/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 md:p-7"
    >
      {/* hover technical grid */}
      <div className="ed-grid-bg pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      {/* animated engineering line */}
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent transition-transform duration-700 group-hover:scale-x-100" />
      <div className="pointer-events-none absolute bottom-6 left-6 right-6 h-px origin-left scale-x-0 bg-cyan-300/25 transition-transform delay-100 duration-700 group-hover:scale-x-100" />

      <div className="relative">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-slate-500">
          <span>{c.tag}</span>
          <span className="text-cyan-300/60">CREATOR-{c.id}</span>
        </div>
        <div className="font-display mt-4 text-2xl font-bold tracking-tight text-slate-100 md:text-[26px]">
          {c.name}
        </div>
        <div className="mt-1 font-mono text-[13px] text-cyan-300">{c.handle}</div>
        <div className="mt-1 text-[13px] text-slate-400">{c.role}</div>
        <div className="mt-5 inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-cyan-300/30 text-cyan-300 transition-all duration-300 group-hover:border-cyan-300/70 group-hover:bg-cyan-300/10 group-hover:shadow-[0_0_18px_rgba(34,211,238,0.35)]">
            <Instagram size={16} className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          </span>
          <span className="text-sm text-slate-400">Instagram</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-200 transition-all duration-300 group-hover:gap-2 group-hover:text-cyan-200">
            View Profile <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

export default function Footer({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const reduced = useReducedMotion();

  if (compact) {
    return (
      <footer className="border-t border-white/10 px-4 py-2.5 text-center font-mono text-[11px] text-slate-500">
        Built by{" "}
        <a href={ADITYA_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200">
          Aditya Kumar
        </a>{" "}
        &{" "}
        <a href={ATHARV_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200">
          Atharv Varshney
        </a>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10">
      <motion.div
        {...anim(reduced, 0)}
        viewport={{ once: true, margin: "-60px" }}
        className="text-center font-mono text-[11px] uppercase tracking-[0.35em] text-slate-500"
      >
        Built by
      </motion.div>
      <motion.p
        {...anim(reduced, 0.12)}
        viewport={{ once: true, margin: "-60px" }}
        className="font-display mt-2 text-center text-lg text-slate-300 md:text-xl"
      >
        Made with mathematics, code <span className="text-slate-500">&</span> a little obsession.
      </motion.p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {CREATORS.map((c, i) => (
          <CreatorCard key={c.id} c={c} index={i} reduced={reduced} />
        ))}
      </div>

      <motion.div
        {...anim(reduced, 0.55)}
        viewport={{ once: true, margin: "-60px" }}
        className="glass mt-3 rounded-2xl p-5 text-center"
      >
        <div className="font-display text-[15px] font-bold tracking-tight">GEODRAFT AI</div>
        <p className="mx-auto mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-400">
          An AI-powered Engineering Graphics workspace that turns drawing problems into mathematically
          generated 3D geometry, orthographic projections and construction steps.
        </p>
        <button
          onClick={() => router.push("/visualizer")}
          className="pressable mt-3 inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-5 py-2 text-[13px] font-bold text-slate-950 hover:bg-cyan-300"
        >
          Explore GeoDraft <ArrowRight size={14} />
        </button>
      </motion.div>
    </footer>
  );
}
