"use client";

/**
 * Decorative hero scene: a looping point → VP ray → front point →
 * HP ray → top point story told with XY/HP/VP/axes context.
 * Purely illustrative — never used for calculations.
 */
export default function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
      <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#05070d" stopOpacity="0.2" />
            <stop offset="55%" stopColor="#05070d" stopOpacity="0" />
            <stop offset="100%" stopColor="#05070d" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* VP hint (wall) */}
        <polygon points="80,60 720,60 660,250 140,250" fill="rgba(167,139,250,0.05)" stroke="rgba(167,139,250,0.18)" strokeWidth="1" />
        {/* HP hint (floor grid) */}
        <g stroke="rgba(34,211,238,0.10)" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1={140 + i * 10} y1={250} x2={60 + i * 78} y2={400} />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <line key={`v${i}`} x1={140 - i * 26} y1={250 + i * 38} x2={660 + i * 26} y2={250 + i * 38} />
          ))}
        </g>
        {/* XY reference */}
        <line x1={20} y1={250} x2={780} y2={250} stroke="#f43f5e" strokeWidth={1.6} opacity={0.7} />
        <text x={748} y={242} fill="#fb7185" fontSize={11} fontFamily="JetBrains Mono, monospace" fontWeight={700}>XY</text>
        <text x={96} y={80} fill="#a78bfa" fontSize={11} fontFamily="JetBrains Mono, monospace" opacity={0.8}>VP</text>
        <text x={700} y={330} fill="#22d3ee" fontSize={11} fontFamily="JetBrains Mono, monospace" opacity={0.8}>HP</text>

        {/* drifting wireframes */}
        <g className="hero-drift" opacity={0.5}>
          <polygon points="620,110 660,110 640,145" fill="none" stroke="#22d3ee" strokeWidth={1.2} />
          <circle cx={640} cy={122} r={1.6} fill="#22d3ee" />
        </g>
        <g className="hero-drift2" opacity={0.4}>
          <polygon points="120,120 140,120 150,137 140,154 120,154 110,137" fill="none" stroke="#818cf8" strokeWidth={1.2} />
        </g>
        {/* slow construction lines */}
        <line x1={60} y1={120} x2={740} y2={120} stroke="rgba(148,163,184,0.25)" strokeWidth={1} strokeDasharray="3 9" className="lab-march" />
        <line x1={60} y1={330} x2={740} y2={330} stroke="rgba(148,163,184,0.22)" strokeWidth={1} strokeDasharray="3 9" className="lab-march" />

        {/* THE LOOP: 3D point -> VP ray -> front point -> HP ray -> top point */}
        <g>
          <circle cx={400} cy={150} r={4} fill="#fbbf24" className="hero-loop-dot" />
          <line x1={400} y1={150} x2={400} y2={205} stroke="#f472b6" strokeWidth={1.4} strokeDasharray="4 4" className="hero-loop-ray1" />
          <circle cx={400} cy={208} r={3.4} fill="#f472b6" className="hero-loop-front" />
          <text x={412} y={212} fill="#f9a8d4" fontSize={10} fontFamily="JetBrains Mono, monospace" className="hero-loop-front">front</text>
          <line x1={400} y1={250} x2={400} y2={300} stroke="#22d3ee" strokeWidth={1.4} strokeDasharray="4 4" className="hero-loop-ray2" />
          <circle cx={400} cy={303} r={3.4} fill="#22d3ee" className="hero-loop-top" />
          <text x={412} y={307} fill="#a5f3fc" fontSize={10} fontFamily="JetBrains Mono, monospace" className="hero-loop-top">top</text>
        </g>

        <rect width={800} height={420} fill="url(#hero-fade)" />
      </svg>
    </div>
  );
}
