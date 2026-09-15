"use client";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function WireSolid() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) {
      g.current.rotation.y += dt * 0.35;
      g.current.rotation.x = 0.35 + Math.sin(Date.now() * 0.0004) * 0.08;
    }
  });
  return (
    <group ref={g} scale={1.15}>
      <mesh>
        <coneGeometry args={[1.1, 2.2, 6, 1, true]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh position={[2.3, -0.2, -0.6]}>
        <cylinderGeometry args={[0.8, 0.8, 1.8, 24, 1, true]} />
        <meshBasicMaterial color="#818cf8" wireframe transparent opacity={0.35} />
      </mesh>
      <mesh position={[-2.4, 0.1, -0.4]}>
        <cylinderGeometry args={[0, 1.0, 1.8, 4, 1]} />
        <meshBasicMaterial color="#f472b6" wireframe transparent opacity={0.3} />
      </mesh>
      <gridHelper args={[14, 28, "#164e63", "#0f2536"]} position={[0, -1.6, 0]} />
    </group>
  );
}

export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-70">
      <Canvas camera={{ position: [0, 1.4, 7.5], fov: 42 }} dpr={[1, 1.5]}>
        <WireSolid />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/30 via-transparent to-[#05070d]" />
    </div>
  );
}
