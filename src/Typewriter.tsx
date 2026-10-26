import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { ROWS, PRINTING, machine } from "./machine";
import { PAGE, CW } from "./page";
import { woodTexture, keyFace, plateTexture } from "./textures";

// world units are decimetres: the machine is ~33 cm wide, the sheet is A4
const PAPER_W = 2.1, PAPER_H = 2.97;
const STRIKE = new THREE.Vector3(0, 1.25, -0.28); // front of the platen
const SEGMENT = new THREE.Vector3(0, 0.72, -0.3); // centre of the typebar pivots
const SEG_R = 0.36;
const BAR_H = STRIKE.y - SEGMENT.y;
const BAR_L = Math.hypot(SEG_R, BAR_H);
const BAR_REST = 0.5;
const BAR_HIT = Math.atan2(-BAR_H, -SEG_R);

const deckY = (z: number) => 0.36 + (1.28 - z) * (0.26 / 1.03);
const ROW_Z = [0.4, 0.63, 0.86, 1.09];
const PITCH = 0.235;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const damp = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));

function sideProfile(points: [number, number][], width: number, bevel = 0.015) {
  const s = new THREE.Shape();
  points.forEach(([z, y], i) => (i ? s.lineTo(-z, y) : s.moveTo(-z, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -width / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

function gearGeometry(teeth: number, r: number, depth: number) {
  const s = new THREE.Shape();
  const inner = r * 0.86;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, step = (Math.PI * 2) / teeth;
    const pts: [number, number][] = [[inner, a], [r, a + step * 0.2], [r, a + step * 0.5], [inner, a + step * 0.7]];
    pts.forEach(([rad, ang], j) => {
      const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
      if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  const hub = new THREE.Path(); hub.absarc(0, 0, r * 0.18, 0, Math.PI * 2, true); s.holes.push(hub);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, h = new THREE.Path();
    h.absarc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.17, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
}

export default function Typewriter({ page }: { page: HTMLCanvasElement }) {
  const mats = useMemo(() => {
    const wood = woodTexture(["#24100a", "#55291a", "#7a4026"], 11, 2);
    const dark = woodTexture(["#120806", "#26120b", "#3d1e12"], 5, 2);
    return {
      wood: new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
      dark: new THREE.MeshPhysicalMaterial({ map: dark, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
      brass: new THREE.MeshStandardMaterial({ color: "#c08f45", metalness: 1, roughness: 0.27 }),
      oldBrass: new THREE.MeshStandardMaterial({ color: "#9a6c30", metalness: 1, roughness: 0.42 }),
      enamel: new THREE.MeshPhysicalMaterial({ color: "#120b08", roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 }),
      steel: new THREE.MeshStandardMaterial({ color: "#2c2a28", metalness: 0.9, roughness: 0.32 }),
      chrome: new THREE.MeshStandardMaterial({ color: "#e4ddd2", metalness: 1, roughness: 0.16 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#16110f", roughness: 0.78 }),
      ribbon: new THREE.MeshStandardMaterial({ color: "#5c1018", roughness: 0.65 }),
      plate: new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.35 }),
    };
  }, []);

  const keys = useMemo(() => ROWS.flatMap((row, ri) => row.map(([code, label], ci) => {
    const z = ROW_Z[ri];
    const x = (ci - (row.length - 1) / 2) * PITCH + (ri % 2 ? 0.05 : -0.03);
    const face = new THREE.MeshStandardMaterial({ map: keyFace(label), roughness: 0.42 });
    return { code, x, z, y: deckY(z), stem: 0.16 + ri * 0.012, face };
  })), []);

  const pageTex = useMemo(() => {
    const t = new THREE.CanvasTexture(page);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [page]);
  // one sheet that feeds up out of the platen; everything below the paper bail is clipped away
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.3)], []);

  const geo = useMemo(() => ({
    cheek: sideProfile([[1.28, 0.21], [1.28, 0.36], [0.25, 0.62], [0.1, 0.98], [-0.2, 1.06], [-1.02, 1.04], [-1.15, 0.9], [-1.15, 0.21]], 0.12),
    deck: sideProfile([[1.28, 0.21], [1.28, 0.36], [0.25, 0.62], [0.2, 0.21]], 2.86, 0.01),
    gearBig: gearGeometry(22, 0.27, 0.035),
    gearSmall: gearGeometry(13, 0.16, 0.035),
    bar: new THREE.BoxGeometry(0.016, 0.012, BAR_L).translate(0, 0, BAR_L / 2),
    keyCap: new THREE.CylinderGeometry(0.086, 0.086, 0.032, 40),
    keyRim: new THREE.TorusGeometry(0.086, 0.011, 10, 40),
    stem: new THREE.CylinderGeometry(0.011, 0.011, 1, 8).translate(0, 0.5, 0),
    sheet: (() => {
      // a sheet with a little life in it: the top leans back and the sides cup slightly
      const g = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 24, 48).translate(0, PAPER_H / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) / (PAPER_W / 2), y = p.getY(i) / PAPER_H;
        p.setZ(i, -0.05 * y * y + 0.025 * x * x);
      }
      g.computeVertexNormals();
      return g;
    })(),
  }), []);

  const keyRefs = useRef<(THREE.Group | null)[]>([]);
  const keyDepth = useRef(new Float32Array(keys.length));
  const barRefs = useRef<(THREE.Group | null)[]>([]);
  const carriage = useRef<THREE.Group>(null);
  const platen = useRef<THREE.Group>(null);
  const sheet = useRef<THREE.Mesh>(null);
  const paper = useRef<THREE.Group>(null);
  const lever = useRef<THREE.Group>(null);
  const vibrator = useRef<THREE.Mesh>(null);
  const space = useRef<THREE.Group>(null);
  const gears = useRef<(THREE.Mesh | null)[]>([]);
  const spools = useRef<(THREE.Group | null)[]>([]);
  const st = useRef({ x: 0, feed: 0, space: 0, spin: 0, first: true, ver: -1 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const now = (machine.now = state.clock.elapsedTime);
    const s = st.current;

    keys.forEach((k, i) => {
      const t = machine.taps.get(k.code);
      const down = machine.held.has(k.code) || (t !== undefined && now - t < 0.085);
      if (t !== undefined && now - t > 0.3) machine.taps.delete(k.code);
      keyDepth.current[i] = damp(keyDepth.current[i], down ? 1 : 0, down ? 60 : 22, dt);
      const g = keyRefs.current[i];
      if (g) g.position.y = k.y - keyDepth.current[i] * 0.05;
    });
    const spaceT = machine.taps.get("Space");
    const spaceDown = machine.held.has("Space") || (spaceT !== undefined && now - spaceT < 0.085);
    s.space = damp(s.space, spaceDown ? 1 : 0, spaceDown ? 60 : 22, dt);
    if (space.current) space.current.position.y = -s.space * 0.04;

    // typebars: snap up to the platen, hang a beat, fall back into the basket
    let striking = 0;
    PRINTING.forEach((_, i) => {
      const g = barRefs.current[i];
      if (!g) return;
      const t0 = machine.strikes.get(i);
      let f = 0;
      if (t0 !== undefined) {
        const t = now - t0;
        f = t < 0.055 ? ease(t / 0.055) : t < 0.075 ? 1 : t < 0.22 ? 1 - ease((t - 0.075) / 0.145) : 0;
        if (t >= 0.22) machine.strikes.delete(i);
        striking = Math.max(striking, f);
      }
      g.rotation.x = THREE.MathUtils.lerp(BAR_REST, BAR_HIT, f);
    });
    if (vibrator.current) vibrator.current.position.y = 1.14 + striking * 0.06;

    // carriage: the escapement steps it one pitch per letter, the return lever sweeps it home
    const u = (PAGE.left + machine.col * CW) / PAGE.w;
    const targetX = -(u - 0.5) * PAPER_W;
    const far = Math.abs(targetX - s.x) > 0.2;
    s.x = s.first ? targetX : damp(s.x, targetX, far ? 7 : 34, dt);
    const v = Math.min(1, (PAGE.top + (machine.line + 2.4) * PAGE.lh) / PAGE.h);
    s.feed = s.first ? v : damp(s.feed, v, 9, dt);
    s.first = false;
    if (carriage.current) carriage.current.position.x = s.x;
    if (platen.current) platen.current.rotation.x = -s.feed * 9;
    const r = now - machine.returnAt;
    if (lever.current) lever.current.rotation.z = r < 0.5 ? Math.sin(Math.min(r / 0.5, 1) * Math.PI) * 0.55 : 0;

    // the paper rises out of the platen line by line; the typed line sits just above the bail
    if (sheet.current) sheet.current.position.y = (s.feed - 1) * PAPER_H;
    if (s.ver !== machine.pageVersion) { pageTex.needsUpdate = true; s.ver = machine.pageVersion; }
    if (paper.current) {
      const e = machine.ejectAt < 0 ? 0 : ease(Math.min((now - machine.ejectAt) / 1.1, 1));
      paper.current.position.y = e * 3.4;
      clip[0].constant = -1.3 - e * 3.4;
    }

    s.spin += (Math.abs(targetX - s.x) * 4 + striking * 0.02) * dt * 10;
    gears.current.forEach((g, i) => { if (g) g.rotation.z = (i % 2 ? -1 : 1.69) * s.x * 2.4 + (i % 2 ? 0.14 : 0); });
    spools.current.forEach((g, i) => { if (g) g.rotation.y = (i ? -1 : 1) * s.spin * 0.3; });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* feet and plinth */}
      {[[-1.45, 0.95], [1.45, 0.95], [-1.45, -1.0], [1.45, -1.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} material={mats.brass} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.06, 24]} />
        </mesh>
      ))}
      <RoundedBox args={[3.3, 0.16, 2.55]} radius={0.04} position={[0, 0.13, 0.06]} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 0.215, 1.335]} material={mats.brass}><boxGeometry args={[3.24, 0.014, 0.014]} /></mesh>

      {/* side cheeks with brass trim and gear trains */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.5, 0, 0]}>
          <mesh geometry={geo.cheek} material={mats.wood} castShadow receiveShadow />
          <mesh geometry={geo.cheek} material={mats.oldBrass} scale={[0.8, 1.018, 1.016]} position={[0, -0.003, 0.002]} />
          <mesh position={[side * 0.075, 0.62, -0.42]} rotation={[0, 0, Math.PI / 2]} material={mats.oldBrass}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
          </mesh>
          <group position={[side * 0.08, 0, 0]} rotation={[0, side * Math.PI / 2, 0]}>
            <mesh ref={(m) => { gears.current[side < 0 ? 0 : 2] = m; }} geometry={geo.gearBig} material={mats.brass} position={[side * 0.42, 0.62, 0]} castShadow />
            <mesh ref={(m) => { gears.current[side < 0 ? 1 : 3] = m; }} geometry={geo.gearSmall} material={mats.oldBrass} position={[side * -0.02, 0.4, 0.02]} castShadow />
          </group>
        </group>
      ))}

      {/* keyboard deck and the dark basket behind it */}
      <mesh geometry={geo.deck} material={mats.enamel} receiveShadow castShadow />
      <mesh position={[0, 0.4, -0.05]} rotation={[-Math.PI / 2, 0, 0]} material={mats.enamel} receiveShadow>
        <circleGeometry args={[1.05, 48, 0, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.3, -0.05]} material={mats.enamel}><boxGeometry args={[2.86, 0.2, 0.62]} /></mesh>

      {/* side ledges and the ribbon spools */}
      {[-1, 1].map((side, i) => (
        <group key={side}>
          <RoundedBox args={[0.56, 0.08, 0.66]} radius={0.02} position={[side * 1.16, 0.97, -0.05]} material={mats.wood} castShadow />
          <group ref={(g) => { spools.current[i] = g; }} position={[side * 1.12, 1.03, -0.08]}>
            <mesh material={mats.brass} castShadow><cylinderGeometry args={[0.2, 0.2, 0.025, 40]} /></mesh>
            <mesh position={[0, 0.04, 0]} material={mats.ribbon}><cylinderGeometry args={[0.15, 0.15, 0.05, 40]} /></mesh>
            <mesh position={[0, 0.07, 0]} material={mats.brass}><cylinderGeometry args={[0.035, 0.035, 0.05, 16]} /></mesh>
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} position={[0, 0.013, 0]} rotation={[0, (k * Math.PI) / 4, 0]} material={mats.oldBrass}><boxGeometry args={[0.36, 0.008, 0.02]} /></mesh>
            ))}
          </group>
        </group>
      ))}
      {/* ribbon running across to the type guide */}
      <mesh position={[0, 1.08, -0.16]} material={mats.ribbon}><boxGeometry args={[2.0, 0.035, 0.004]} /></mesh>

      {/* body behind the basket with the maker's plate */}
      <RoundedBox args={[2.88, 0.82, 0.76]} radius={0.04} position={[0, 0.62, -0.75]} material={mats.wood} castShadow receiveShadow />
      <mesh position={[0, 0.78, -0.365]} material={mats.plate}><planeGeometry args={[0.9, 0.28]} /></mesh>
      <mesh position={[0, 1.035, -0.55]} material={mats.brass}><boxGeometry args={[2.9, 0.02, 0.02]} /></mesh>

      {/* type segment and the bars that fan out from it */}
      <mesh position={[SEGMENT.x, SEGMENT.y, SEGMENT.z]} rotation={[Math.PI / 2, 0, 0]} material={mats.brass} castShadow>
        <torusGeometry args={[SEG_R, 0.035, 12, 48, Math.PI]} />
      </mesh>
      {PRINTING.map((code, i) => {
        const theta = -1.35 + (i / (PRINTING.length - 1)) * 2.7;
        return (
          <group key={code} position={[SEGMENT.x + Math.sin(theta) * SEG_R, SEGMENT.y, SEGMENT.z + Math.cos(theta) * SEG_R]} rotation={[0, theta, 0]}>
            <group ref={(g) => { if (g) { g.rotation.order = "YXZ"; g.rotation.x = BAR_REST; } barRefs.current[i] = g; }}>
              <mesh geometry={geo.bar} material={mats.steel} castShadow />
              <mesh position={[0, 0.012, BAR_L - 0.015]} material={mats.brass}><boxGeometry args={[0.03, 0.03, 0.04]} /></mesh>
            </group>
          </group>
        );
      })}
      <mesh ref={vibrator} position={[0, 1.14, -0.22]} material={mats.chrome}><boxGeometry args={[0.14, 0.05, 0.008]} /></mesh>
      <mesh position={[0, 1.2, -0.215]} material={mats.chrome}><boxGeometry args={[0.24, 0.012, 0.01]} /></mesh>

      {/* keys */}
      {keys.map((k, i) => (
        <group key={k.code} ref={(g) => { keyRefs.current[i] = g; }} position={[k.x, k.y, k.z]}>
          <mesh geometry={geo.stem} scale={[1, k.stem, 1]} material={mats.chrome} />
          <group position={[0, k.stem, 0]}>
            <mesh geometry={geo.keyCap} material={[mats.brass, k.face, mats.brass]} castShadow />
            <mesh geometry={geo.keyRim} position={[0, 0.017, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.brass} />
          </group>
        </group>
      ))}
      <group ref={space}>
        <mesh position={[0, deckY(1.28) + 0.075, 1.33]} material={mats.chrome} castShadow><boxGeometry args={[1.7, 0.028, 0.07]} /></mesh>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, deckY(1.24) + 0.03, 1.29]} rotation={[0.6, 0, 0]} material={mats.chrome}><boxGeometry args={[0.025, 0.11, 0.025]} /></mesh>
        ))}
      </group>

      {/* fixed rails the carriage rides on */}
      {[-0.55, -0.98].map((z) => (
        <mesh key={z} position={[0, 1.07, z]} rotation={[0, 0, Math.PI / 2]} material={mats.chrome}><cylinderGeometry args={[0.022, 0.022, 3.6, 12]} /></mesh>
      ))}

      {/* the carriage */}
      <group ref={carriage}>
        <RoundedBox args={[2.75, 0.07, 0.62]} radius={0.02} position={[0, 1.1, -0.74]} material={mats.enamel} castShadow />
        <group ref={platen} position={[0, 1.25, -0.45]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.rubber} castShadow><cylinderGeometry args={[0.17, 0.17, 2.5, 48]} /></mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 1.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh material={mats.brass} castShadow><cylinderGeometry args={[0.15, 0.15, 0.13, 36]} /></mesh>
              {[-0.045, 0, 0.045].map((y) => (
                <mesh key={y} position={[0, y, 0]} material={mats.oldBrass}><torusGeometry args={[0.15, 0.012, 8, 36]} /></mesh>
              ))}
              <mesh position={[0, side * 0.12, 0]} material={mats.chrome}><cylinderGeometry args={[0.03, 0.03, 0.12, 12]} /></mesh>
            </group>
          ))}
        </group>
        {/* chrome paper rests behind the platen */}
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, 1.36, -0.66]} rotation={[0, Math.PI / 2, 0]} material={mats.chrome} castShadow>
            <torusGeometry args={[0.26, 0.012, 8, 28, Math.PI * 0.55]} />
          </mesh>
        ))}
        <mesh position={[0, 1.44, -0.33]} rotation={[0, 0, Math.PI / 2]} material={mats.chrome}><cylinderGeometry args={[0.011, 0.011, 2.3, 10]} /></mesh>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 1.44, -0.33]} rotation={[0, 0, Math.PI / 2]} material={mats.rubber}><cylinderGeometry args={[0.03, 0.03, 0.09, 16]} /></mesh>
        ))}
        <group ref={lever} position={[-1.36, 1.32, -0.3]}>
          <mesh position={[-0.06, 0.14, 0.05]} rotation={[0.3, 0, 0.5]} material={mats.chrome} castShadow><cylinderGeometry args={[0.018, 0.018, 0.34, 10]} /></mesh>
          <mesh position={[-0.16, 0.28, 0.15]} rotation={[Math.PI / 2.4, 0, 0]} material={mats.chrome}><cylinderGeometry args={[0.018, 0.018, 0.3, 10]} /></mesh>
          <mesh position={[-0.16, 0.24, 0.3]} material={mats.dark}><sphereGeometry args={[0.04, 16, 16]} /></mesh>
        </group>
        <group ref={paper}>
          <group position={[0, 1.36, -0.37]} rotation={[-0.18, 0, 0]}>
            <mesh ref={sheet} geometry={geo.sheet} castShadow>
              <meshStandardMaterial map={pageTex} color="#e9dfcb" roughness={0.93} side={THREE.DoubleSide} clippingPlanes={clip} clipShadows />
            </mesh>
          </group>
        </group>
      </group>

      {/* margin bell */}
      <mesh position={[1.32, 1.12, -1.0]} material={mats.brass} castShadow><sphereGeometry args={[0.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    </group>
  );
}
