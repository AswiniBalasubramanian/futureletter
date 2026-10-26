import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import Typewriter from "./Typewriter";
import { woodTexture } from "./textures";

export type Stage = "intro" | "typing" | "sealing" | "sent" | "showcase";

// where the camera sits and what it looks at, per stage
const SHOTS: Record<Stage, { pos: [number, number, number]; look: [number, number, number] }> = {
  intro: { pos: [4.2, 3.6, 7.2], look: [0, 1.2, 0] },
  typing: { pos: [0, 3.55, 4.55], look: [0, 1.3, -0.25] },
  sealing: { pos: [0, 4.2, 3.2], look: [0, 3.2, -0.5] },
  sent: { pos: [4.2, 3.6, 7.2], look: [0, 1.2, 0] },
  showcase: { pos: [1.6, 3.2, 5.6], look: [0, 1.45, -0.2] },
};

function Rig({ stage }: { stage: Stage }) {
  const look = useRef(new THREE.Vector3(...SHOTS.intro.look));
  const pos = useRef(new THREE.Vector3(...SHOTS.intro.pos));
  useFrame(({ camera, pointer, clock, size }, delta) => {
    const shot = SHOTS[stage];
    // on wide screens the compose card sits left, so frame the machine to the right
    const shift = (stage === "intro" || stage === "sent") && size.width / size.height > 1.15 ? -2.3 : 0;
    const k = 1 - Math.exp(-(stage === "typing" ? 2.2 : 1.4) * Math.min(delta, 0.05));
    const t = clock.elapsedTime;
    const drift = stage === "intro" || stage === "sent" ? Math.sin(t * 0.12) * 0.9 : stage === "showcase" ? Math.sin(t * 0.15) * 0.6 : 0;
    const target = new THREE.Vector3(shot.pos[0] + drift + pointer.x * 0.25, shot.pos[1] + pointer.y * 0.12, shot.pos[2]);
    pos.current.lerp(target, k);
    look.current.lerp(new THREE.Vector3(shot.look[0] + shift, shot.look[1], shot.look[2]), k);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });
  return null;
}

function Desk() {
  const map = useMemo(() => woodTexture(["#2a1309", "#4d2412", "#6e3a1d"], 3, 3), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshPhysicalMaterial map={map} roughness={0.55} clearcoat={0.35} clearcoatRoughness={0.4} />
    </mesh>
  );
}

export default function Scene({ stage, page }: { stage: Stage; page: HTMLCanvasElement }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
      camera={{ fov: 34, near: 0.1, far: 60, position: SHOTS.intro.pos }}
    >
      <fog attach="fog" args={["#561320", 7, 16]} />
      <Rig stage={stage} />
      <ambientLight intensity={0.18} color="#ffd9b0" />
      <hemisphereLight args={["#ffdcb0", "#2a120a", 0.35]} />
      {/* low afternoon sun from a window to the left */}
      <directionalLight
        position={[-5, 5.5, 3]}
        intensity={3.1}
        color="#ffc98f"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[4, 3, -4]} intensity={0.7} color="#ffb27a" />
      <pointLight position={[0, 2.6, 2.2]} intensity={0.55} distance={6} color="#ffe2bf" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffd7a3" position={[-5, 4, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffeeda" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ff9f60" position={[5, 2, -3]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#fff2df" position={[2, 3, 5]} scale={2} />
      </Environment>
      <Desk />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.65} scale={9} blur={2.4} far={2} color="#120604" />
      <Typewriter page={page} />
    </Canvas>
  );
}
