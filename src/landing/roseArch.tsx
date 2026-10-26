import type { ReactElement } from "react";

// The hero window's frame, after the engraved rose-vine frames in the references: two ivory vines twine up
// the arch, leaves alternate along them, tendrils curl off, and roses gather at the crown, springs and sill.

const IVORY = "#fbf4e6"; // petal and leaf fill, a shade lighter than the paper
const LINE = "#5a1420"; // engraving lines
const VINE = "#6e1c2b"; // vines, tendrils and stems
const cx = 260, cy = 260, foot = 640, R = 240;

type P = { x: number; y: number; tx: number; ty: number }; // point + unit tangent

const JAMB = foot - cy;
const ARC = Math.PI * R;
const TOTAL = JAMB * 2 + ARC;

/** Point and tangent at distance s along the arch, starting bottom left, ending bottom right. */
function at(s: number): P {
  if (s <= JAMB) return { x: cx - R, y: foot - s, tx: 0, ty: -1 };
  if (s <= JAMB + ARC) {
    const a = Math.PI - ((s - JAMB) / ARC) * Math.PI;
    return { x: cx + Math.cos(a) * R, y: cy - Math.sin(a) * R, tx: Math.sin(a), ty: Math.cos(a) };
  }
  return { x: cx + R, y: cy + (s - JAMB - ARC), tx: 0, ty: 1 };
}
/** Offset sideways from the arch line (positive = outward). */
function off(p: P, d: number) { return { x: p.x + p.ty * d, y: p.y - p.tx * d }; }

function vine(phase: number, amp: number, wave: number) {
  const pts: string[] = [];
  for (let s = 0; s <= TOTAL; s += 4) {
    const p = at(s);
    const o = off(p, -amp * Math.sin((2 * Math.PI * s) / wave + phase));
    pts.push(`${o.x.toFixed(1)} ${o.y.toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}

const deg = (p: P) => (Math.atan2(p.ty, p.tx) * 180) / Math.PI;

function Leaf({ s, side, size = 1 }: { s: number; side: 1 | -1; size?: number }) {
  const p = at(s);
  const o = off(p, side * 6);
  return (
    <g transform={`translate(${o.x} ${o.y}) rotate(${deg(p) + side * -58}) scale(${size})`}>
      <path d="M0 0 C 5 -6 15 -7 22 0 C 15 7 5 6 0 0 Z" fill={IVORY} stroke={LINE} strokeWidth="0.5" strokeOpacity="0.5" />
      <path d="M2 0 H 19 M7 0 L 10 -3 M11 0 L 14 -3 M7 0 L 10 3 M11 0 L 14 3" stroke={LINE} strokeWidth="0.55" strokeOpacity="0.55" fill="none" />
    </g>
  );
}

function Tendril({ s, side }: { s: number; side: 1 | -1 }) {
  const p = at(s);
  const o = off(p, side * 4);
  return (
    <path transform={`translate(${o.x} ${o.y}) rotate(${deg(p) + side * -70}) scale(1 ${side})`}
      d="M0 0 C 6 -8 17 -9 18 -1 C 19 5 12 7 10 3 C 9 0 12 -1 13 1" fill="none" stroke={VINE} strokeWidth="1" strokeLinecap="round" />
  );
}

/** An engraved rose: five outer petals, a cupped centre, a spiral of inner petals. */
function Rose({ x, y, r = 1, turn = 0 }: { x: number; y: number; r?: number; turn?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${r})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} transform={`rotate(${i * 72})`} d="M0 -3 C -8 -6 -13 -13 -6 -16.5 C -2 -18.5 2 -18.5 6 -16.5 C 13 -13 8 -6 0 -3 Z" fill={IVORY} stroke={LINE} strokeWidth="0.7" strokeOpacity="0.75" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={"v" + i} transform={`rotate(${i * 72 + 36})`} d="M0 -9 C -2 -12 -2 -14 0 -15" fill="none" stroke={LINE} strokeWidth="0.5" strokeOpacity="0.5" />
      ))}
      <circle r="7.5" fill={IVORY} stroke={LINE} strokeWidth="0.7" strokeOpacity="0.8" />
      <path d="M0.5 0.5 C 3 -1 4 2 2 4 C -1 6 -5 3 -4 -1 C -3 -5 2 -7 5.5 -4 C 7.5 -2 7 2 5.5 4.5" fill="none" stroke={LINE} strokeWidth="0.8" strokeOpacity="0.85" strokeLinecap="round" />
    </g>
  );
}

function Bud({ x, y, turn = 0, r = 1 }: { x: number; y: number; turn?: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${r})`}>
      <path d="M0 -12 C 5 -8 6 -2 0 2 C -6 -2 -5 -8 0 -12 Z" fill={IVORY} stroke={LINE} strokeWidth="0.6" strokeOpacity="0.7" />
      <path d="M0 2 C -5 0 -7 -4 -6 -7 M0 2 C 5 0 7 -4 6 -7 M0 2 V 8" fill="none" stroke={VINE} strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

/** A small gathering of roses where the vines meet: one open bloom, two smaller ones, a bud. */
function Cluster({ s, scale = 1 }: { s: number; scale?: number }) {
  const p = at(s);
  const along = (d: number, side = 0) => off({ ...p, x: p.x + p.tx * d, y: p.y + p.ty * d }, side);
  const a = along(-24 * scale, 4), b = along(24 * scale, 4), c = along(0, 16 * scale);
  return (
    <g>
      <Rose x={a.x} y={a.y} r={0.78 * scale} turn={20} />
      <Rose x={b.x} y={b.y} r={0.72 * scale} turn={-30} />
      <Bud x={c.x} y={c.y} turn={deg(p) - 90} r={0.9 * scale} />
      <Rose x={p.x} y={p.y} r={1.08 * scale} turn={8} />
    </g>
  );
}

export function RoseArch() {
  const leaves: ReactElement[] = [];
  const keep = (s: number) => ![TOTAL / 2, JAMB, JAMB + ARC, 34, TOTAL - 34].some((c) => Math.abs(s - c) < 46);
  for (let s = 20, i = 0; s < TOTAL - 10; s += 30, i++) if (keep(s)) leaves.push(<Leaf key={s} s={s} side={i % 2 ? 1 : -1} size={0.75 + (i % 3) * 0.1} />);
  const tendrils: ReactElement[] = [];
  for (let s = 70, i = 0; s < TOTAL - 40; s += 104, i++) if (keep(s)) tendrils.push(<Tendril key={s} s={s} side={i % 2 ? 1 : -1} />);

  return (
    <svg className="arch-frame rose-arch" viewBox="0 0 520 660" aria-hidden>
      <defs>
        <linearGradient id="foil-arch" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dca0" /><stop offset="0.35" stopColor="#b98a3c" /><stop offset="0.6" stopColor="#ecd08c" /><stop offset="1" stopColor="#9c7130" />
        </linearGradient>
      </defs>
      {/* a single fine rule and the foil hairline hold the window's edge */}
      <path d={`M${cx - 226} ${foot} V${cy} A226 226 0 0 1 ${cx + 226} ${cy} V${foot}`} fill="none" stroke={VINE} strokeOpacity="0.4" strokeWidth="1" />
      <path d={`M${cx - 221} ${foot} V${cy} A221 221 0 0 1 ${cx + 221} ${cy} V${foot}`} fill="none" stroke="url(#foil-arch)" strokeWidth="1.2" />
      <g className="engraved">
        <path d={vine(0, 7, 96)} fill="none" stroke={VINE} strokeWidth="1.7" strokeLinecap="round" />
        <path d={vine(Math.PI, 6, 96)} fill="none" stroke={VINE} strokeWidth="1.1" strokeLinecap="round" />
        {tendrils}
        {leaves}
        <Cluster s={TOTAL / 2} scale={1.25} />
        <Cluster s={JAMB} scale={0.9} />
        <Cluster s={JAMB + ARC} scale={0.9} />
        <Cluster s={34} scale={1} />
        <Cluster s={TOTAL - 34} scale={1} />
        <Bud {...off(at(JAMB / 2), -8)} turn={-90} r={0.8} />
        <Bud {...off(at(TOTAL - JAMB / 2), -8)} turn={90} r={0.8} />
      </g>
    </svg>
  );
}
