// Ornament pressed into wine paper: drawn in the paper's own colour and lit by a highlight above and a
// shadow below, the way a blind-embossed card catches light. Gold appears only as foil hairlines.

export const WINE = "#5a1420";
const RAISE = "#651a29"; // a breath lighter than the paper, so pressed shapes read as raised

/** Points every `step` px along an arch of radius r: up the left jamb, over the crown, down the right. */
function archPoints(r: number, cx: number, cy: number, foot: number, step: number) {
  const pts: [number, number][] = [];
  for (let y = foot; y > cy; y -= step) pts.push([cx - r, y]);
  const n = Math.round((Math.PI * r) / step);
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * r, cy - Math.sin(a) * r]);
  }
  for (let y = cy + step; y <= foot; y += step) pts.push([cx + r, y]);
  return pts;
}
const arch = (r: number, cx: number, cy: number, foot: number) => `M${cx - r} ${foot} V${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} V${foot}`;

const LEAF = "M0 0 C 6 -7, 19 -8, 28 0 C 19 8, 6 7, 0 0 Z";

/** Half of the crown: an acanthus scroll riding the outer moulding, mirrored for the other side. */
function CrownScroll() {
  return (
    <g>
      <path d="M292 6 C 330 -16, 384 -8, 414 22 C 440 48, 450 84, 434 104 C 421 120, 397 111, 402 93 C 406 80, 422 83, 421 94" fill="none" stroke={RAISE} strokeWidth="5" strokeLinecap="round" />
      <path d="M300 22 C 330 12, 358 18, 374 36 C 386 50, 381 66, 366 66 C 355 66, 353 53, 362 50" fill="none" stroke={RAISE} strokeWidth="3.2" strokeLinecap="round" />
      {[[338, -10, -14], [386, 0, 28], [424, 44, 66], [356, 30, 30], [440, 82, 96]].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d={LEAF} fill={RAISE} />
          <path d="M3 0 H 24" stroke={WINE} strokeWidth="0.9" />
        </g>
      ))}
      <circle cx="421" cy="94" r="3.2" fill={RAISE} />
    </g>
  );
}

/** A small eight-petal rosette, pressed. */
export function Rosette({ cx = 0, cy = 0, r = 16 }: { cx?: number; cy?: number; r?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${r / 16})`}>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-9" rx="4.6" ry="7.5" fill={RAISE} transform={`rotate(${i * 45})`} />
      ))}
      <circle r="5.2" fill={RAISE} />
      <circle r="5.2" fill="none" stroke={WINE} strokeWidth="0.9" />
      {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={Math.cos((i * Math.PI) / 4) * 2.6} cy={Math.sin((i * Math.PI) / 4) * 2.6} r="0.9" fill={WINE} />)}
    </g>
  );
}

/** The hero window's frame: moulded arch, beaded rim, acanthus crown, rosettes at the sill, one foil line. */
export function PressedArch() {
  const cx = 260, cy = 260, foot = 640;
  const beads = archPoints(237, cx, cy, foot, 10.5);
  return (
    <svg className="arch-frame" viewBox="0 0 520 660" aria-hidden>
      <defs>
        <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dca0" /><stop offset="0.35" stopColor="#b98a3c" /><stop offset="0.6" stopColor="#ecd08c" /><stop offset="1" stopColor="#9c7130" />
        </linearGradient>
      </defs>
      <g className="pressed">
        {/* moulding: a wide flat band between two fine ribs */}
        <path d={arch(256, cx, cy, foot)} fill="none" stroke={RAISE} strokeWidth="2" />
        <path d={arch(246.5, cx, cy, foot)} fill="none" stroke={RAISE} strokeWidth="11" />
        <path d={arch(229, cx, cy, foot)} fill="none" stroke={RAISE} strokeWidth="2.4" />
        {beads.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.7" fill={RAISE} />)}
        {/* sill */}
        <rect x="2" y="636" width="516" height="22" rx="2" fill={RAISE} />
        <path d="M2 646 H518" stroke={WINE} strokeWidth="1" />
        {/* crown scrolls, mirrored */}
        <CrownScroll />
        <g transform="translate(520 0) scale(-1 1)"><CrownScroll /></g>
        {/* brackets where the arch springs from the jambs */}
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${cx + s * 256} ${cy}) scale(${s} 1)`}>
            <path d="M0 -10 C 14 -12, 22 -2, 18 8 C 15 15, 6 14, 7 8" fill="none" stroke={RAISE} strokeWidth="3.4" strokeLinecap="round" />
            <path transform="translate(4 -18) rotate(-24)" d={LEAF} fill={RAISE} />
          </g>
        ))}
        <Rosette cx={22} cy={612} r={14} />
        <Rosette cx={498} cy={612} r={14} />
      </g>
      {/* the one gold accent: a foil hairline just inside the moulding */}
      <path d={arch(221, cx, cy, foot - 6)} fill="none" stroke="url(#foil)" strokeWidth="1.3" />
    </svg>
  );
}

/** Oval keystone medallion: beaded rim, pressed laurel, a foil heart at its centre. */
export function Medallion({ size = 72 }: { size?: number }) {
  const rim = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return [Math.cos(a) * 30, Math.sin(a) * 38]; });
  return (
    <svg viewBox="-44 -52 88 104" width={size} height={size * 1.18} aria-hidden>
      <defs>
        <linearGradient id="foil-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2aa" /><stop offset="0.45" stopColor="#c0913f" /><stop offset="1" stopColor="#8e6428" />
        </linearGradient>
      </defs>
      <g className="pressed">
        <ellipse rx="40" ry="49" fill={RAISE} />
        <ellipse rx="34" ry="42" fill="none" stroke={WINE} strokeWidth="1.4" />
        {rim.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill={WINE} />)}
        {[-1, 1].map((s) => (
          <g key={s} transform={`scale(${s} 1)`}>
            {[[-14, 20, -60], [-18, 8, -80], [-18, -6, -100]].map(([x, y, r], i) => (
              <path key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(0.42)`} d={LEAF} fill={WINE} opacity="0.55" />
            ))}
          </g>
        ))}
      </g>
      <path d="M0 14 C -14 4, -18 -3, -18 -9 C -18 -15, -13 -19, -8 -19 C -4 -19, -1 -17, 0 -14 C 1 -17, 4 -19, 8 -19 C 13 -19, 18 -15, 18 -9 C 18 -3, 14 4, 0 14 Z" fill="url(#foil-m)" />
    </svg>
  );
}

/** A pressed rosette badge for the how-it-works arches. */
export function PressedBadge({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} aria-hidden>
      <g className="pressed"><Rosette r={16} /></g>
    </svg>
  );
}

// A damask repeat for the paper itself, lit with its own highlight and shadow so it reads as a blind deboss.
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320">
<defs><filter id="d" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="-0.8" dy="-0.8" stdDeviation="0.3" flood-color="#ffd6d0" flood-opacity="0.05"/><feDropShadow dx="1" dy="1.2" stdDeviation="0.7" flood-color="#14000a" flood-opacity="0.2"/></filter></defs>
<g filter="url(#d)" fill="none" stroke="${RAISE}" stroke-width="1.8" stroke-linecap="round">
<path d="M120 40 C 150 64 160 100 146 128 C 136 148 120 158 120 158 C 120 158 104 148 94 128 C 80 100 90 64 120 40 Z"/>
<path d="M120 70 C 134 84 136 104 126 120 M120 70 C 106 84 104 104 114 120"/>
<path d="M120 158 V 228 M120 196 C 140 182 166 186 176 204 C 160 210 140 206 120 196 Z M120 196 C 100 182 74 186 64 204 C 80 210 100 206 120 196 Z"/>
<path d="M146 128 C 176 120 196 136 194 160 C 192 176 176 180 170 170 C 165 160 176 154 182 160 M94 128 C 64 120 44 136 46 160 C 48 176 64 180 70 170 C 75 160 64 154 58 160"/>
<path d="M0 0 C 20 20 20 40 0 52 M240 0 C 220 20 220 40 240 52 M0 320 C 20 300 20 280 0 268 M240 320 C 220 300 220 280 240 268"/>
<circle cx="120" cy="250" r="6"/><circle cx="0" cy="160" r="5"/><circle cx="240" cy="160" r="5"/>
</g></svg>`;
export const DAMASK = `url("data:image/svg+xml,${encodeURIComponent(tile)}")`;
