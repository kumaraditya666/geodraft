const ADITYA_URL = "https://instagram.com/aadiiii___666";
const ATHARV_URL = "https://instagram.com/atharvvarshney7";

const linkCls =
  "font-semibold text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200 hover:decoration-cyan-200";

export default function Footer({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="border-t border-white/10 px-4 py-2.5 text-center font-mono text-[11px] text-slate-500">
        Credits — By{" "}
        <a href={ADITYA_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
          Aditya Kumar
        </a>{" "}
        &{" "}
        <a href={ATHARV_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
          Atharv Varshney
        </a>
      </footer>
    );
  }
  return (
    <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8">
      <div className="glass rounded-2xl px-6 py-4 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Credits</div>
        <div className="mt-1 text-sm text-slate-300">
          By{" "}
          <a href={ADITYA_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Aditya Kumar
          </a>{" "}
          &{" "}
          <a href={ATHARV_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Atharv Varshney
          </a>
        </div>
      </div>
    </footer>
  );
}
