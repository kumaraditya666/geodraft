"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore } from "@/store/useStore";
import type { BuiltSolid, Vec3 } from "@/types";
import { measuredAngles } from "@/lib/projection/angleEngine";

const K = 0.045; // mm -> scene units

export function engToScene(p: Vec3): [number, number, number] {
  return [p.x * K, p.z * K, p.y * K];
}

function useSolidGeometry(solid: BuiltSolid | null) {
  return useMemo(() => {
    if (!solid || solid.kind === "sphere" || solid.kind === "line") return null;
    const pts = solid.vertices.map((vv) => engToScene(vv.p));
    const positions: number[] = [];
    const pushTri = (a: number, b: number, c: number) => {
      positions.push(...pts[a], ...pts[b], ...pts[c]);
    };
    for (const f of solid.faces) {
      if (f.id === "lamina-back") continue; // avoid double
      if (f.verts.length === 3) {
        const [a, b, c] = f.verts;
        pushTri(a, b, c);
      } else if (f.verts.length > 3) {
        for (let i = 1; i < f.verts.length - 1; i++) {
          pushTri(f.verts[0], f.verts[i], f.verts[i + 1]);
        }
      } else if (f.verts.length === 2) {
        continue;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [solid]);
}

function CameraRig() {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const preset = useStore((s) => s.cameraPreset);
  const nonce = useStore((s) => s.cameraNonce);
  const solid = useStore((s) => s.solid);

  useEffect(() => {
    if (!controls) return;
    const maxDim = solid ? Math.max(solid.bbox.size.x, solid.bbox.size.y, solid.bbox.size.z, 60) * K : 3;
    const d = Math.max(5, maxDim * 2.6);
    const cx = 0;
    const cy = solid ? ((solid.bbox.min.z + solid.bbox.max.z) / 2) * K : 1.2;
    const cz = solid ? ((solid.bbox.min.y + solid.bbox.max.y) / 2) * K : 0.8;
    const target = new THREE.Vector3(cx, cy, cz);
    const pos = new THREE.Vector3();
    if (preset === "front") pos.set(cx, cy, cz + d);
    else if (preset === "top") pos.set(cx, cy + d, cz + 0.01);
    else if (preset === "right") pos.set(cx + d, cy, cz);
    else if (preset === "left") pos.set(cx - d, cy, cz);
    else if (preset === "reset" || preset === "iso") pos.set(cx + d * 0.62, cy + d * 0.5, cz + d * 0.62);
    else return;
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, nonce, controls]);

  return null;
}

function SolidMesh({ solid }: { solid: BuiltSolid }) {
  const geom = useSolidGeometry(solid);

  const edgeLines = useMemo(() => {
    // 3D sharp edges only (avoid smooth tessellation clutter)
    const pts: [number, number, number][][] = [];
    for (const e of solid.edges) {
      if (e.silhouetteOnly) continue;
      const a = engToScene(solid.vertices[e.a].p);
      const b = engToScene(solid.vertices[e.b].p);
      pts.push([a, b]);
    }
    return pts;
  }, [solid]);

  if (solid.kind === "sphere" && solid.radius) {
    const c = engToScene(solid.baseCenter);
    return (
      <mesh position={c}>
        <sphereGeometry args={[solid.radius * K, 40, 28]} />
        <meshStandardMaterial color="#b9e7ff" emissive="#0ea5e9" emissiveIntensity={0.45} roughness={0.3} metalness={0.05} transparent opacity={0.96} />
      </mesh>
    );
  }

  if (solid.kind === "line") {
    const a = engToScene(solid.vertices[0].p);
    const b = engToScene(solid.vertices[1].p);
    return (
      <group>
<Line points={[a, b]} color="#22d3ee" lineWidth={3} />
        {[a, b].map((pp, i) => (
          <mesh key={i} position={pp}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color={i === 0 ? "#f472b6" : "#22d3ee"} />
          </mesh>
        ))}
      </group>
    );
  }

  if (!geom) return null;
  const isFlat = solid.kind === "prism" || solid.kind === "pyramid" || solid.kind === "plane" || solid.kind === "box";
  return (
    <group>
      <mesh geometry={geom}>
        <meshStandardMaterial
          color={solid.kind === "plane" ? "#fcd34d" : "#aee4ff"}
          emissive={solid.kind === "plane" ? "#b45309" : "#0ea5e9"}
          emissiveIntensity={0.35}
          roughness={0.32}
          metalness={0.05}
          transparent
          opacity={0.96}
          side={THREE.DoubleSide}
          flatShading={isFlat}
        />
      </mesh>
      {edgeLines.map((seg, i) => (
        <Line key={i} points={seg} color="#0b1220" transparent opacity={0.55} lineWidth={1.2} />
      ))}
    </group>
  );
}

function Overlays({ solid }: { solid: BuiltSolid }) {
  const showLabels = useStore((s) => s.showLabels);
  const showRays = useStore((s) => s.showRays);
  const isolate = useStore((s) => s.isolate3d);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const set = useStore((s) => s.set);
  const stepIndex = useStore((s) => s.stepIndex);

  const important = useMemo(() => {
    // apex, centers + up to 6 ring points
    const pts = [...solid.vertices];
    const pri = pts.filter((p) => ["apex", "base-center", "top-center", "p0", "p1"].includes(p.id));
    const ring = pts.filter((p) => !["apex", "base-center", "top-center", "p0", "p1", "c"].includes(p.id)).filter((_, i) => i % 6 === 0).slice(0, 6);
    return [...pri, ...ring];
  }, [solid]);

  const raysOn = showRays && stepIndex >= 3 && !isolate;

  return (
    <group>
      {/* projection rays: vertical to HP + depth to VP */}
      {raysOn &&
        important.map((vp) => {
          const top = engToScene(vp.p);
          const hp: [number, number, number] = [top[0], 0, top[2]];
          const fwd: [number, number, number] = [top[0], top[1], 0];
          return (
            <group key={vp.id}>
<Line points={[top, hp]} color="#22d3ee" transparent opacity={0.5} dashed dashSize={0.08} gapSize={0.05} lineWidth={1} />
<Line points={[top, fwd]} color="#f472b6" transparent opacity={0.45} dashed dashSize={0.08} gapSize={0.05} lineWidth={1} />
              <mesh position={hp}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshBasicMaterial color="#22d3ee" />
              </mesh>
            </group>
          );
        })}

      {/* vertex labels */}
      {showLabels &&
        important.map((vp) => {
          const pp = engToScene(vp.p);
          const active = selectedPoint === vp.id;
          if (!vp.label) return null;
          return (
            <Html key={vp.id} position={pp} center distanceFactor={10} style={{ pointerEvents: "auto" }}>
              <button
                onClick={() => set({ selectedPoint: active ? null : vp.id })}
                className={`grid h-5 min-w-5 place-items-center rounded-full border px-1 font-mono text-[10px] font-bold backdrop-blur ${
                  active
                    ? "border-amber-300 bg-amber-300 text-slate-950"
                    : "border-cyan-300/60 bg-slate-950/80 text-cyan-200 hover:border-cyan-200"
                }`}
              >
                {vp.label}
              </button>
            </Html>
          );
        })}

      {/* dimensions: height line */}
      <HeightDimension solid={solid} />
      <AngleGizmo solid={solid} />
    </group>
  );
}

function HeightDimension({ solid }: { solid: BuiltSolid }) {
  const isolate = useStore((s) => s.isolate3d);
  if (isolate) return null;
  if (solid.height === undefined || solid.kind === "line" || solid.kind === "plane" || solid.kind === "sphere") return null;
  const min = solid.bbox.min;
  const max = solid.bbox.max;
  const x = (min.x - Math.max(10, (max.x - min.x) * 0.28)) * K;
  const z0: [number, number, number] = [x, min.z * K, max.y * K];
  const z1: [number, number, number] = [x, max.z * K, max.y * K];
  const mid: [number, number, number] = [x, ((min.z + max.z) / 2) * K, max.y * K];
  return (
    <group>
      <Line points={[z0, z1]} color="#fbbf24" lineWidth={1.6} />
      <Html position={mid} center distanceFactor={10}>
        <div className="whitespace-nowrap rounded bg-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
          {Math.round(solid.height)} mm
        </div>
      </Html>
    </group>
  );
}

/**
 * Engineering angle gizmo. All arcs/labels are MEASURED from the true 3D
 * axis direction (asin of components) — the specified question values are
 * shown alongside for comparison, never as the source of truth.
 */
function AngleGizmo({ solid }: { solid: BuiltSolid }) {
  const showAngles = useStore((s) => s.showAngles);
  const set = useStore((s) => s.set);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const inc = solid.parsed.inclinations;
  const hasInc = inc.HP !== undefined || inc.VP !== undefined;
  if (!showAngles || !hasInc) return null;

  const m = measuredAngles(solid.axisDir);
  const tip = solid.apex ?? solid.topCenter ?? solid.vertices[1]?.p ?? solid.baseCenter;
  const tipId = solid.vertices.some((v) => v.id === "apex")
    ? "apex"
    : solid.vertices.some((v) => v.id === "top-center")
      ? "top-center"
      : null;
  const pingTip = () => {
    if (tipId) set({ selectedPoint: selectedPoint === tipId ? null : tipId });
  };
  const c = engToScene(solid.baseCenter);
  const t3 = engToScene(tip);
  const r = 1.05;
  const N = 26;

  // plane lamina: show surface-normal + measured surface tilt (90° − normal↔HP)
  if (solid.kind === "plane") {
    const surfTilt = 90 - m.withHP;
    return (
      <group>
        <Line points={[c, t3]} color="#fbbf24" lineWidth={2.4} />
        <Html position={[(c[0] + t3[0]) / 2, (c[1] + t3[1]) / 2 + 0.25, (c[2] + t3[2]) / 2]} center distanceFactor={10}>
          <div className="whitespace-nowrap rounded bg-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
            surface {surfTilt.toFixed(1)}° to HP (measured)
          </div>
        </Html>
      </group>
    );
  }

  const ax = solid.axisDir.x;
  const ay = solid.axisDir.y;
  const az = solid.axisDir.z;
  const gLen = Math.hypot(ax, ay);
  const azim = Math.atan2(ay, ax);
  const showVP = inc.VP !== undefined && gLen > 1e-6;
  const showHP = inc.HP !== undefined && gLen > 1e-6;

  // VP arc on the HP plane: +X reference → ground projection of axis
  const vpPts: [number, number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * azim;
    vpPts.push([c[0] + Math.cos(a) * r, 0.03, c[2] + Math.sin(a) * r]);
  }
  const vpEnd: [number, number, number] = [c[0] + Math.cos(azim) * (r + 0.6), 0.03, c[2] + Math.sin(azim) * (r + 0.6)];
  const vpRef: [number, number, number] = [c[0] + r + 0.6, 0.03, c[2]];

  // HP arc in the vertical plane of the axis: ground projection → axis
  const el = (m.withHP * Math.PI) / 180;
  const gx = Math.cos(azim);
  const gz = Math.sin(azim);
  const hpPts: [number, number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * el;
    hpPts.push([c[0] + (Math.cos(a) * gx) * r, Math.sin(a) * r + 0.03, c[2] + (Math.cos(a) * gz) * r]);
  }

  return (
    <group>
      {/* highlighted axis */}
      <Line points={[c, t3]} color="#fbbf24" lineWidth={2.6} />
      {/* HP reference stub */}
      <Line points={[[c[0], 0.03, c[2]], vpRef]} color="#64748b" lineWidth={1.2} transparent opacity={0.8} />
      {showVP && (
        <group>
          <Line points={[[c[0], 0.03, c[2]], vpEnd]} color="#f472b6" lineWidth={1.6} />
          <Line points={vpPts} color="#f472b6" lineWidth={1.8} />
          <Html position={[c[0] + Math.cos(azim / 2) * (r + 0.42), 0.14, c[2] + Math.sin(azim / 2) * (r + 0.42)]} center distanceFactor={10}>
            <div onClick={pingTip} title="Highlight the inclined axis in 3D + 2D" className="cursor-pointer whitespace-nowrap rounded bg-pink-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
              {m.withVP.toFixed(1)}° VP (spec {inc.VP}°)
            </div>
          </Html>
        </group>
      )}
      {showHP && (
        <group>
          <Line points={hpPts} color="#4ade80" lineWidth={1.8} />
          <Html
            position={[
              c[0] + Math.cos(el / 2) * gx * (r + 0.45),
              Math.sin(el / 2) * (r + 0.45) + 0.1,
              c[2] + Math.cos(el / 2) * gz * (r + 0.45),
            ]}
            center distanceFactor={10}
          >
            <div onClick={pingTip} title="Highlight the inclined axis in 3D + 2D" className="cursor-pointer whitespace-nowrap rounded bg-green-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
              {m.withHP.toFixed(1)}° HP (spec {inc.HP}°)
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

function ReferencePlanes({ solid }: { solid: BuiltSolid | null }) {
  const showHP = useStore((s) => s.showHP);
  const showVP = useStore((s) => s.showVP);
  const ext = useMemo(() => {
    const m = solid ? Math.max(solid.bbox.size.x, solid.bbox.size.y, 80) * K : 3.6;
    return Math.max(4.5, m * 1.9);
  }, [solid]);
  const h = solid ? solid.bbox.max.z * K + 1.6 : 3.4;
  return (
    <group>
      {showHP && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, ext * 0.18]}>
            <planeGeometry args={[ext * 2, ext]} />
            <meshBasicMaterial color="#0ea5e9" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <gridHelper args={[ext * 2, 24, "#155e75", "#123043"]} position={[0, 0, ext * 0.18]} />
          <Html position={[-ext * 0.95, 0.05, ext * 0.55]} center distanceFactor={12}>
            <div className="rounded border border-cyan-300/40 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-200">HP</div>
          </Html>
        </group>
      )}
      {showVP && (
        <group>
          <mesh position={[0, h / 2, 0]}>
            <planeGeometry args={[ext * 2, h]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* profile plane (side-view plane, x = 0) */}
          <mesh position={[0, h / 2, ext * 0.18]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[ext, h]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <Html position={[ext * 0.95, h - 0.25, 0]} center distanceFactor={12}>
            <div className="rounded border border-violet-300/40 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-200">VP</div>
          </Html>
          <Html position={[-0.35, h - 0.25, ext * 0.55]} center distanceFactor={12}>
            <div className="rounded border border-emerald-300/40 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-200">PP</div>
          </Html>
        </group>
      )}
      {/* XY reference line */}
      <Line points={[[-ext, 0.015, 0], [ext, 0.015, 0]]} color="#f43f5e" lineWidth={2.2} />
      <Html position={[ext - 0.5, 0.12, 0]} center distanceFactor={12}>
        <div className="rounded bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">XY</div>
      </Html>
      {/* axes triad */}
      <Line points={[[0, 0.02, 0], [1.1, 0.02, 0]]} color="#f87171" lineWidth={2} />
      <Line points={[[0, 0.02, 0], [0, 0.02, 1.1]]} color="#4ade80" lineWidth={2} />
      <Line points={[[0, 0.02, 0], [0, 1.1, 0]]} color="#60a5fa" lineWidth={2} />
    </group>
  );
}

export default function Viewer3D() {
  const solid = useStore((s) => s.solid);
  const ortho = useStore((s) => s.ortho3d);
  const isolate = useStore((s) => s.isolate3d);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-[#070c16]">
      <Canvas
        key={ortho ? "ortho" : "persp"}
        orthographic={ortho}
        camera={ortho ? { position: [5.2, 4.4, 6.4], zoom: 90 } : { position: [5.2, 4.4, 6.4], fov: 40 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#070c16"]} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[6, 9, 6]} intensity={1.9} />
        <directionalLight position={[-5, 4, -6]} intensity={0.45} color="#818cf8" />
        {!isolate && <ReferencePlanes solid={solid} />}
        {solid && (
          <group>
            <SolidMesh solid={solid} />
            <Overlays solid={solid} />
          </group>
        )}
        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI * 0.495} />
        <CameraRig />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5 font-mono text-[10px]">
        <span className="rounded bg-black/60 px-2 py-1 text-rose-300">X — width</span>
        <span className="rounded bg-black/60 px-2 py-1 text-emerald-300">Y — depth</span>
        <span className="rounded bg-black/60 px-2 py-1 text-sky-300">Z — height</span>
      </div>
    </div>
  );
}
