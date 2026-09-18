"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { canonicalSolid, canonicalEdgeFacts, engineStatus, MORPHS, morphSource } from "@/lib/landing/heroContent";
import { buildProjection } from "@/lib/projection/projectionEngine";
import type { ProjectionResult } from "@/types";

const REDUCED = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type CamMode = "iso" | "top" | "front" | "side";

const CAMS: Record<CamMode, [number, number, number]> = {
  iso: [6.5, 4.6, 8.2],
  top: [0.4, 11.5, 1.4],
  front: [0, 2.2, 11.5],
  side: [11.5, 2.2, 0.4],
};

function Tag({ position, children, tone = "cyan" }: { position: [number, number, number]; children: ReactNode; tone?: "cyan" | "violet" | "rose" | "amber" | "slate" }) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-300/40 text-cyan-200",
    violet: "border-violet-300/40 text-violet-200",
    rose: "border-rose-400/50 text-rose-300",
    amber: "border-amber-300/50 text-amber-200",
    slate: "border-white/15 text-slate-300",
  };
  return (
    <Html position={position} center distanceFactor={11} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap rounded border bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold backdrop-blur ${colors[tone]}`}>
        {children}
      </div>
    </Html>
  );
}

function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const pos = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 26;
      arr[i * 3 + 1] = Math.random() * 9 - 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    return arr;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current && !REDUCED()) ref.current.rotation.y += dt * 0.014;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#38bdf8" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Environment() {
  const arc = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 0.5;
      pts.push([2.6 + Math.cos(a) * 0.9, 0.03, 1.2 + Math.sin(a) * 0.9]);
    }
    return pts;
  }, []);
  return (
    <group>
      {/* HP */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 1.5]}>
        <planeGeometry args={[24, 13]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <gridHelper args={[24, 24, "#155e75", "#10293d"]} position={[0, 0, 1.5]} />
      {/* VP */}
      <mesh position={[0, 2.6, 0]}>
        <planeGeometry args={[24, 5.2]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* XY */}
      <Line points={[[-12, 0.015, 0], [12, 0.015, 0]]} color="#f43f5e" lineWidth={2} />
      {/* axes */}
      <Line points={[[0, 0.02, 0], [3.4, 0.02, 0]]} color="#f87171" lineWidth={1.6} />
      <Line points={[[0, 0.02, 0], [0, 0.02, 3.4]]} color="#4ade80" lineWidth={1.6} />
      <Line points={[[0, 0.02, 0], [0, 3.4, 0]]} color="#60a5fa" lineWidth={1.6} />
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      {/* construction arc */}
      <Line points={arc} color="#22d3ee" transparent opacity={0.5} lineWidth={1} />
      <Tag position={[3.6, 0.1, 0]} tone="slate">X</Tag>
      <Tag position={[0, 0.1, 3.6]} tone="slate">Y</Tag>
      <Tag position={[0, 3.6, 0]} tone="slate">Z</Tag>
      <Tag position={[-9.5, 0.1, 5.4]}>HP</Tag>
      <Tag position={[9.5, 4.4, 0]} tone="violet">VP</Tag>
      <Tag position={[11.2, 0.15, 0]} tone="rose">XY</Tag>
    </group>
  );
}

function DistantSolids() {
  const g1 = useRef<THREE.Group>(null);
  const g2 = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (REDUCED()) return;
    if (g1.current) g1.current.rotation.y += dt * 0.12;
    if (g2.current) g2.current.rotation.y -= dt * 0.09;
  });
  return (
    <group>
      <group ref={g1} position={[-7.5, 2.4, -4]}>
        <mesh>
          <icosahedronGeometry args={[1.1, 0]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.28} />
        </mesh>
      </group>
      <group ref={g2} position={[7.6, 1.8, -5]}>
        <mesh>
          <torusGeometry args={[0.9, 0.28, 8, 18]} />
          <meshBasicMaterial color="#818cf8" wireframe transparent opacity={0.22} />
        </mesh>
      </group>
    </group>
  );
}

function MorphMesh({ kind, opacity, scale }: { kind: string; opacity: number; scale: number }) {
  const mat = { transparent: true, opacity };
  if (kind === "cone")
    return (
      <group scale={scale}>
        <mesh position={[0, 1.575, 0]}>
          <coneGeometry args={[1.125, 3.15, 28]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.1} {...mat} opacity={opacity * 0.32} />
        </mesh>
        <mesh position={[0, 1.575, 0]}>
          <coneGeometry args={[1.125, 3.15, 12, 1, true]} />
          <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={opacity * 0.55} />
        </mesh>
      </group>
    );
  if (kind === "cylinder")
    return (
      <group scale={scale}>
        <mesh position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 2.7, 24, 1, true]} />
          <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={opacity * 0.55} />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 2.7, 24]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.1} {...mat} opacity={opacity * 0.28} />
        </mesh>
      </group>
    );
  if (kind === "sphere")
    return (
      <group scale={scale}>
        <mesh position={[0, 1.125, 0]}>
          <sphereGeometry args={[1.125, 24, 18]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.1} {...mat} opacity={opacity * 0.3} />
        </mesh>
        <mesh position={[0, 1.125, 0]}>
          <sphereGeometry args={[1.125, 12, 8]} />
          <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={opacity * 0.5} />
        </mesh>
      </group>
    );
  if (kind === "pyramid")
    return (
      <group scale={scale}>
        <mesh position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.001, 1.27, 2.7, 4, 1]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.1} {...mat} opacity={opacity * 0.32} flatShading />
        </mesh>
        <mesh position={[0, 1.35, 0]} rotation={[0, Math.PI / 4, 0]}>
          <cylinderGeometry args={[0.001, 1.27, 2.7, 4, 1, true]} />
          <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={opacity * 0.6} />
        </mesh>
      </group>
    );
  if (kind === "prism")
    return (
      <group scale={scale}>
        <mesh position={[0, 1.46, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 2.93, 6, 1]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.1} {...mat} opacity={opacity * 0.32} flatShading />
        </mesh>
        <mesh position={[0, 1.46, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 2.93, 6, 1, true]} />
          <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={opacity * 0.6} />
        </mesh>
      </group>
    );
  if (kind === "hex")
    return (
      <group scale={scale}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[1.35, 1.35, 0.12, 6]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.1} {...mat} opacity={opacity * 0.5} flatShading />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[1.35, 1.35, 0.12, 6, 1, true]} />
          <meshBasicMaterial color="#fde68a" wireframe transparent opacity={opacity * 0.7} />
        </mesh>
      </group>
    );
  if (kind === "plane")
    return (
      <group scale={scale}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0.5]}>
          <planeGeometry args={[2.7, 1.8]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.1} {...mat} opacity={opacity * 0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  return (
    <group scale={scale}>
      <mesh position={[0, 0.9, 0]} scale={[1.35, 0.55, 0.9]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f472b6" roughness={0.35} metalness={0.1} {...mat} opacity={opacity * 0.4} flatShading />
      </mesh>
      <mesh position={[0, 0.9, 0]} scale={[1.35, 0.55, 0.9]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#f9a8d4" wireframe transparent opacity={opacity * 0.65} />
      </mesh>
    </group>
  );
}

function HeroObject({
  shape,
  prev,
  trans,
  setHover,
  spin,
}: {
  shape: string;
  prev: string | null;
  trans: MutableRefObject<number>;
  setHover: (v: boolean) => void;
  spin: MutableRefObject<boolean>;
}) {
  const g = useRef<THREE.Group>(null);
  const prevG = useRef<THREE.Group>(null);
  const curG = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (REDUCED()) return;
    if (g.current && spin.current) g.current.rotation.y += dt * 0.22;
    trans.current = Math.min(1, trans.current + dt * 2.4);
    const t = trans.current;
    if (prevG.current) {
      prevG.current.visible = t < 1;
      prevG.current.scale.setScalar(Math.max(0.001, 1 - t * 0.45));
      prevG.current.rotation.y -= dt * 1.4;
    }
    if (curG.current) {
      curG.current.scale.setScalar(0.62 + 0.38 * Math.min(1, t * 1.35));
    }
  });
  // canonical cone dressing (dims/axis/angle from the real example values)
  const cone = shape === "cone" && !prev;
  return (
    <group position={[0, 0, 1.2]}>
      <group ref={g}>
        {prev && prev !== shape && (
          <group ref={prevG}>
            <MorphMesh kind={prev} opacity={1} scale={1} />
          </group>
        )}
        <group
          ref={curG}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
          }}
          onPointerOut={() => setHover(false)}
        >
          <MorphMesh kind={shape} opacity={1} scale={1} />
        </group>
      </group>
      {cone && (
        <group>
          <Line points={[[0, 0, 0], [0, 3.5, 0]]} color="#fbbf24" lineWidth={2} />
          <Line points={[[0, 0.02, 0], [1.9, 0.02, 0.62]]} color="#f472b6" lineWidth={1.2} transparent opacity={0.8} />
          <Tag position={[0, 3.65, 0]} tone="amber">70 mm</Tag>
          <Tag position={[1.35, 0.12, 0]} tone="amber">Ø50</Tag>
          <Tag position={[2.15, 0.12, 0.72]} tone="rose">30° VP</Tag>
          <Tag position={[0.32, 1.9, 0]} tone="slate">axis</Tag>
        </group>
      )}
      {/* projector rays from apex region toward HP */}
      <Line points={[[0, 3.15, 0], [0, 0.02, 0]]} color="#22d3ee" transparent opacity={0.55} dashed dashSize={0.12} gapSize={0.09} lineWidth={1} />
      <Line points={[[1.125, 0.02, 0], [1.125, 0.02, 0]]} color="#22d3ee" transparent opacity={0.001} lineWidth={1} />
      <PulseDot />
    </group>
  );
}

function PulseDot() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || REDUCED()) return;
    const t = (clock.elapsedTime * 0.35) % 1;
    ref.current.position.set(0, 3.15 - t * 3.1, 0);
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.9 - t * 0.55;
  });
  return (
    <mesh ref={ref} position={[0, 3.15, 0]}>
      <sphereGeometry args={[0.06, 10, 10]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} />
    </mesh>
  );
}

function CameraRig({ mode, par }: { mode: CamMode; par: MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const base = CAMS[mode];
    const k = REDUCED() ? 0 : 1;
    const dx = base[0] + par.current.x * 1.1 * k;
    const dy = base[1] + par.current.y * 0.7 * k;
    const dz = base[2];
    camera.position.x = THREE.MathUtils.damp(camera.position.x, dx, 2.2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, dy, 2.2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dz, 2.2, dt);
    target.set(0, 1.4, 1.0);
    camera.lookAt(target);
  });
  return null;
}

function miniView(proj: ProjectionResult): { W: number; H: number; d: string } {
  const b = proj.bounds;
  const W = 150;
  const H = 110;
  const s = Math.min(W / b.w, H / b.h) * 0.82;
  const cx = W / 2 - ((b.minX + b.maxX) / 2) * s;
  const cy = H / 2 + ((b.minY + b.maxY) / 2) * s;
  const d = proj.segments
    .filter((sg) => sg.visible)
    .map((sg) => `M${sg.a.x * s + cx},${-sg.a.y * s + cy} L${sg.b.x * s + cx},${-sg.b.y * s + cy}`)
    .join(" ");
  return { W, H, d };
}

export default function HeroStage() {
  const [cam, setCam] = useState<CamMode>("iso");
  const [mi, setMi] = useState(0);
  const [prev, setPrev] = useState<string | null>(null);
  const [projecting, setProjecting] = useState(false);
  const [hover, setHover] = useState(false);
  const par = useRef({ x: 0, y: 0 });
  const spin = useRef(true);
  const trans = useRef(1);
  const tip = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const shape = MORPHS[mi].kind;
  const facts = useMemo(() => canonicalEdgeFacts(), []);
  const status = useMemo(() => engineStatus(), []);
  const parts = useMemo(() => {
    const s = canonicalSolid();
    return {
      front: miniView(buildProjection(s, "front")),
      top: miniView(buildProjection(s, "top")),
      side: miniView(buildProjection(s, "side")),
    };
  }, []);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;

  const goShape = (i: number) => {
    if (i === mi || projecting) return;
    setPrev(MORPHS[mi].kind);
    setMi(i);
    trans.current = 0;
  };

  // auto-cycle morphs (paused for reduced motion / projection mode)
  useEffect(() => {
    if (REDUCED() || projecting) return;
    const t = setInterval(() => {
      setMi((cur) => {
        const nxt = (cur + 1) % MORPHS.length;
        setPrev(MORPHS[cur].kind);
        trans.current = 0;
        return nxt;
      });
    }, 4600);
    return () => clearInterval(t);
  }, [projecting]);

  return (
    <div
      ref={wrap}
      className="relative h-[560px] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#04060b] md:h-[620px]"
      onPointerMove={(e) => {
        const r = wrap.current?.getBoundingClientRect();
        if (par.current && r) {
          par.current.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
          par.current.y = -((e.clientY - r.top) / r.height - 0.5) * 2;
        }
        if (tip.current && hover) {
          tip.current.style.left = `${e.clientX - (wrap.current?.getBoundingClientRect().left ?? 0) + 16}px`;
          tip.current.style.top = `${e.clientY - (wrap.current?.getBoundingClientRect().top ?? 0) - 10}px`;
        }
      }}
    >
      <Canvas
        dpr={[1, mobile ? 1.5 : 1.75]}
        camera={{ position: CAMS.iso, fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => setHover(false)}
      >
        <color attach="background" args={["#04060b"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 9, 6]} intensity={1.4} />
        <pointLight position={[-6, 3, -4]} intensity={8} color="#0ea5e9" />
        <Environment />
        <DistantSolids />
        <Particles count={mobile ? 60 : 150} />
        <HeroObject shape={shape} prev={prev} trans={trans} setHover={(v) => setHover(v)} spin={spin} />
        <CameraRig mode={projecting ? "front" : cam} par={par} />
      </Canvas>

      {/* cursor tooltip with REAL edge numbers */}
      <div
        ref={tip}
        className={`pointer-events-none absolute z-20 rounded-xl border border-amber-300/40 bg-black/85 px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed text-amber-100 transition-opacity ${hover ? "opacity-100" : "opacity-0"}`}
      >
        <div className="font-bold">{facts.name}</div>
        <div>TRUE LENGTH: {facts.trueMM.toFixed(1)} mm</div>
        <div>FRONT: {facts.frontMM.toFixed(1)} mm · TOP: {facts.topMM.toFixed(1)} mm</div>
      </div>

      {/* HUD: geometry */}
      <div className="pointer-events-none absolute left-4 top-4 hidden rounded-2xl border border-white/10 bg-[#070c16]/80 p-3.5 backdrop-blur md:block">
        <div className="font-mono text-[9.5px] tracking-[0.25em] text-slate-500">GEOMETRY</div>
        <div className="font-display mt-1 text-xl font-bold tracking-tight">{MORPHS[mi].label}</div>
        <div className="mt-1 font-mono text-[11px] text-cyan-300">{morphSource(MORPHS[mi].key).dims}</div>
        <div className="mt-2 flex gap-1">
          {MORPHS.map((m, i) => (
            <span key={m.key} className={`h-1 flex-1 rounded-full ${i === mi ? "bg-cyan-300" : i < mi ? "bg-cyan-300/40" : "bg-white/10"}`} />
          ))}
        </div>
      </div>

      {/* HUD: projection */}
      <div className="pointer-events-none absolute right-4 top-4 hidden rounded-2xl border border-white/10 bg-[#070c16]/80 p-3.5 backdrop-blur md:block">
        <div className="font-mono text-[9.5px] tracking-[0.25em] text-slate-500">PROJECTION</div>
        <div className="mt-1 font-mono text-[11px] font-bold text-slate-200">FIRST ANGLE</div>
        {(["FRONT", "TOP", "SIDE"] as const).map((v) => (
          <div key={v} className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-slate-400">
            <span className="text-emerald-300">✓</span> {v}
          </div>
        ))}
      </div>

      {/* HUD: system */}
      <div className="pointer-events-none absolute bottom-4 left-4 hidden items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 font-mono text-[10px] text-slate-400 backdrop-blur md:flex">
        <span className={`h-1.5 w-1.5 rounded-full ${status.ok ? "animate-pulse bg-emerald-300" : "bg-red-400"}`} />
        {status.detail}
      </div>

      {/* camera + morph + project controls */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
        {(["iso", "top", "front", "side"] as CamMode[]).map((c) => (
          <button
            key={c}
            aria-label={`${c} camera`}
            onClick={() => setCam(c)}
            className={`pressable rounded-lg px-2.5 py-1.5 font-mono text-[10.5px] font-bold uppercase backdrop-blur ${cam === c && !projecting ? "bg-cyan-400 text-slate-950" : "border border-white/15 bg-black/60 text-slate-300"}`}
          >
            {c}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/15" />
        <button
          aria-label="Project 3D into 2D views"
          onClick={() => {
            setProjecting(!projecting);
            spin.current = projecting;
          }}
          className="pressable rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-400 px-3.5 py-1.5 font-mono text-[10.5px] font-bold uppercase text-slate-950"
        >
          {projecting ? "Back to 3D" : "Project ▼"}
        </button>
      </div>

      {/* morph dots */}
      <div className="absolute bottom-[62px] left-1/2 flex -translate-x-1/2 gap-1.5">
        {MORPHS.map((m, i) => (
          <button
            key={m.key}
            aria-label={`Morph to ${m.label}`}
            onClick={() => goShape(i)}
            className={`h-1.5 rounded-full transition-all ${i === mi ? "w-5 bg-cyan-300" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
          />
        ))}
      </div>

      {/* PROJECT overlay: REAL projections from the engine */}
      {projecting && (
        <div className="absolute inset-y-4 right-4 flex w-[210px] flex-col gap-2">
          {(
            [
              ["FRONT", parts.front],
              ["TOP", parts.top],
              ["SIDE", parts.side],
            ] as const
          ).map(([label, v], i) => (
            <div
              key={label}
              className="draw-on rounded-xl border border-white/10 bg-[#070c16]/90 p-2 backdrop-blur"
              style={{ animationDelay: `${i * 0.25}s`, ["--draw-len" as string]: 300 } as CSSProperties}
            >
              <div className="font-mono text-[9px] tracking-[0.2em] text-slate-500">{label}</div>
              <svg viewBox={`0 0 ${v.W} ${v.H}`} className="mt-1 h-[86px] w-full">
                <path d={v.d} fill="none" stroke="#e8eef7" strokeWidth={1.6} strokeLinejoin="round" />
              </svg>
            </div>
          ))}
          <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/5 p-2 font-mono text-[9.5px] leading-relaxed text-cyan-100/80">
            Same cone · same coordinates — projected, not redrawn.
          </div>
        </div>
      )}
    </div>
  );
}
