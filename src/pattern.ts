// An ogee lattice with fleurs-de-lis: the classic royal wallpaper repeat, built from mirrored S-curves so
// every line meets its neighbour exactly. Used tone on tone, so it reads as a woven or pressed ground.

function fleur(x: number, y: number, s: number, flip = false) {
  const t = `translate(${x} ${y}) scale(${s} ${flip ? -s : s})`;
  return `<g transform="${t}">
    <path d="M0 -14 C 4 -9 4 -3 0 2 C -4 -3 -4 -9 0 -14 Z"/>
    <path d="M0 2 C -3 -4 -9 -5 -11 -1 C -12 2 -9 4 -7 2 C -5 0 -3 1 0 2 Z"/>
    <path d="M0 2 C 3 -4 9 -5 11 -1 C 12 2 9 4 7 2 C 5 0 3 1 0 2 Z"/>
    <rect x="-5" y="3" width="10" height="2" rx="1"/>
    <path d="M0 5 L 2.5 10 L 0 12 L -2.5 10 Z"/>
  </g>`;
}

/** Returns a CSS url() for one tile. `line` is the stroke colour, `alpha` its strength. */
export function ogee(line: string, alpha: number, accent = line) {
  const w = 132, h = 184;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<g fill="none" stroke="${line}" stroke-opacity="${alpha}" stroke-width="1.1">
  <path d="M66 0 C 66 46 0 46 0 92 C 0 138 66 138 66 184"/>
  <path d="M66 0 C 66 46 132 46 132 92 C 132 138 66 138 66 184"/>
  <path d="M66 14 C 66 52 12 54 12 92 C 12 130 66 132 66 170" stroke-opacity="${alpha * 0.55}"/>
  <path d="M66 14 C 66 52 120 54 120 92 C 120 130 66 132 66 170" stroke-opacity="${alpha * 0.55}"/>
</g>
<g fill="${accent}" fill-opacity="${alpha * 1.1}">
  ${fleur(66, 92, 1.15)}
  ${fleur(0, 0, 0.7)}${fleur(132, 0, 0.7)}${fleur(0, 184, 0.7)}${fleur(132, 184, 0.7)}
  <circle cx="66" cy="0" r="2.2"/><circle cx="66" cy="184" r="2.2"/><circle cx="0" cy="92" r="2.2"/><circle cx="132" cy="92" r="2.2"/>
</g>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
