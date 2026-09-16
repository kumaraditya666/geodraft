"use client";

/** Tiny conceptual previews for feature cards — CSS/SMIL motion only, no engine cost. */
export default function FeaturePreview({ kind }: { kind: string }) {
  const common = "h-16 w-full";
  if (kind === "3D Visualization") {
    return (
      <svg viewBox="0 0 120 64" className={common}>
        <line x1={8} y1={52} x2={112} y2={52} stroke="#f43f5e" strokeWidth={1.2} opacity={0.7} />
        <g className="feat-spin" style={{ transformOrigin: "60px 30px" }}>
          <polygon points="60,8 78,44 42,44" fill="rgba(56,189,248,0.12)" stroke="#7dd3fc" strokeWidth={1.4} />
          <line x1={60} y1={8} x2={60} y2={44} stroke="#22d3ee" strokeWidth={1} strokeDasharray="4 2" />
        </g>
        <ellipse cx={60} cy={44} rx={18} ry={4} fill="none" stroke="#5b6b82" strokeWidth={1} strokeDasharray="3 3" />
      </svg>
    );
  }
  if (kind === "Orthographic Projection") {
    return (
      <svg viewBox="0 0 120 64" className={common}>
        <polygon points="28,10 44,10 36,26" fill="none" stroke="#e8eef7" strokeWidth={1.4} />
        <line x1={14} y1={32} x2={106} y2={32} stroke="#f43f5e" strokeWidth={1.2} />
        <circle cx={36} cy={46} r={8} fill="none" stroke="#e8eef7" strokeWidth={1.4} />
        <line x1={28} y1={26} x2={28} y2={38} stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 3" className="lab-march" />
        <line x1={44} y1={26} x2={44} y2={38} stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 3" className="lab-march" />
      </svg>
    );
  }
  if (kind === "Automatic Dimensions") {
    return (
      <svg viewBox="0 0 120 64" className={common}>
        <line x1={30} y1={14} x2={30} y2={50} stroke="#5b6b82" strokeWidth={1} />
        <line x1={90} y1={14} x2={90} y2={50} stroke="#5b6b82" strokeWidth={1} />
        <g className="feat-dim">
          <line x1={30} y1={32} x2={90} y2={32} stroke="#fbbf24" strokeWidth={1.4} />
          <polygon points="30,32 37,29.5 37,34.5" fill="#fbbf24" />
          <polygon points="90,32 83,29.5 83,34.5" fill="#fbbf24" />
        </g>
        <text x={60} y={24} fill="#fde68a" fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono, monospace">⌀50</text>
      </svg>
    );
  }
  if (kind === "Step-by-Step Construction") {
    return (
      <svg viewBox="0 0 120 64" className={common}>
        <line x1={10} y1={50} x2={110} y2={50} stroke="#f43f5e" strokeWidth={1.2} />
        <polyline points="24,50 24,30 60,30 60,14 96,14" fill="none" stroke="#22d3ee" strokeWidth={1.6} className="draw-on" style={{ ["--draw-len" as string]: 220 }} />
        {[24, 60, 96].map((x, i) => (
          <circle key={i} cx={x} cy={i === 0 ? 50 : i === 1 ? 30 : 14} r={2.4} fill="#fbbf24" />
        ))}
      </svg>
    );
  }
  if (kind === "Interactive Projection Rays") {
    return (
      <svg viewBox="0 0 120 64" className={common}>
        <circle cx={60} cy={10} r={3.4} fill="#fbbf24" className="feat-drop" />
        <line x1={60} y1={14} x2={60} y2={48} stroke="#22d3ee" strokeWidth={1.2} strokeDasharray="4 3" />
        <line x1={20} y1={52} x2={100} y2={52} stroke="#f43f5e" strokeWidth={1.2} />
        <circle cx={60} cy={52} r={2.6} fill="#22d3ee" className="feat-drop-dot" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 64" className={common}>
      <rect x={38} y={6} width={44} height={52} rx={2} fill="#f8fafc" stroke="#475569" strokeWidth={1.2} />
      <line x1={42} y1={16} x2={78} y2={16} stroke="#0f172a" strokeWidth={1.4} />
      <line x1={42} y1={26} x2={60} y2={26} stroke="#0f172a" strokeWidth={1.2} />
      <line x1={42} y1={34} x2={78} y2={34} stroke="#f43f5e" strokeWidth={1} />
      <line x1={42} y1={44} x2={70} y2={44} stroke="#0f172a" strokeWidth={1.2} strokeDasharray="3 2" />
      <rect x={42} y1={48} width={26} height={6} fill="none" stroke="#0f172a" strokeWidth={0.8} />
    </svg>
  );
}
