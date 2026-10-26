import { useId, type CSSProperties, type ReactNode } from "react";

/** A gummed stamp with perforated edges. */
export function Stamp({ children, tone = "#f3e7cf", style, className = "" }: { children: ReactNode; tone?: string; style?: CSSProperties; className?: string }) {
  return (
    <div className={`stamp ${className}`} style={style}>
      <div className="stamp-paper" style={{ background: tone }}>{children}</div>
    </div>
  );
}

export function CupidStampArt({ ink = "#7c1d24", value = "14" }: { ink?: string; value?: string }) {
  return (
    <svg viewBox="0 0 100 120" className="stamp-art">
      <rect x="5" y="5" width="90" height="110" fill="none" stroke={ink} strokeWidth="1.2" />
      <rect x="9" y="9" width="82" height="102" fill="none" stroke={ink} strokeWidth="0.5" />
      <g transform="translate(6 18) scale(0.4)"><CupidFigure fill={ink} detail="#f3e7cf" /></g>
      <text x="50" y="20" textAnchor="middle" fontSize="8" fill={ink} fontFamily="Special Elite" letterSpacing="2">AMOR POST</text>
      <text x="14" y="106" fontSize="15" fill={ink} fontFamily="Cormorant Garamond Variable" fontWeight="700">{value}</text>
      <text x="86" y="106" textAnchor="end" fontSize="6" fill={ink} fontFamily="Special Elite" letterSpacing="1">FOR LATER</text>
    </svg>
  );
}

export function HourglassStampArt({ ink = "#2f4a3a" }: { ink?: string }) {
  return (
    <svg viewBox="0 0 100 120" className="stamp-art">
      <rect x="5" y="5" width="90" height="110" fill="none" stroke={ink} strokeWidth="1.2" />
      <rect x="9" y="9" width="82" height="102" fill="none" stroke={ink} strokeWidth="0.5" />
      <text x="50" y="20" textAnchor="middle" fontSize="8" fill={ink} fontFamily="Special Elite" letterSpacing="2">DEAR ME</text>
      <g stroke={ink} fill="none" strokeWidth="1.6" strokeLinecap="round">
        <path d="M34 30 H66 M34 92 H66" strokeWidth="3" />
        <path d="M37 32 C37 50 49 54 49 61 C49 68 37 72 37 90 M63 32 C63 50 51 54 51 61 C51 68 63 72 63 90" />
      </g>
      <path d="M41 44 C45 52 50 55 50 58 C50 55 55 52 59 44 Z M40 88 C42 78 48 74 50 70 C52 74 58 78 60 88 Z" fill={ink} opacity="0.85" />
      <path d="M50 58 V70" stroke={ink} strokeWidth="0.8" strokeDasharray="1 2" />
      {[[22, 40], [78, 46], [24, 78], [76, 82]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.3" fill={ink} />)}
      <text x="14" y="106" fontSize="15" fill={ink} fontFamily="Cormorant Garamond Variable" fontWeight="700">∞</text>
      <text x="86" y="106" textAnchor="end" fontSize="6" fill={ink} fontFamily="Special Elite" letterSpacing="1">TIME POST</text>
    </svg>
  );
}

/** A circular date stamp with wavy cancellation lines, in worn blue-black ink. */
export function Postmark({ date, place = "FUTURE LETTER POST", id, style, waves = true }: { date: string; place?: string; id: string; style?: CSSProperties; waves?: boolean }) {
  const [d, m, y] = date.toUpperCase().split(" ");
  return (
    <svg viewBox="0 0 260 120" className="postmark" style={style} aria-hidden>
      <defs>
        <filter id={`worn-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" result="inked" />
          <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="1" seed="9" result="w" />
          <feDisplacementMap in="inked" in2="w" scale="2.4" />
        </filter>
        <path id={`ring-${id}`} d="M190 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
      </defs>
      <g filter={`url(#worn-${id})`} fill="none" stroke="currentColor">
        {waves && [0, 1, 2, 3, 4].map((i) => (
          <path key={i} strokeWidth="3" d={`M0 ${30 + i * 15} q 15 -9 30 0 t 30 0 t 30 0 t 30 0 t 25 0`} />
        ))}
        <circle cx="190" cy="60" r="56" strokeWidth="3" />
        <circle cx="190" cy="60" r="36" strokeWidth="2" />
        <text fill="currentColor" stroke="none" fontFamily="Special Elite" fontSize="13" letterSpacing="3">
          <textPath href={`#ring-${id}`} startOffset="2%">{place} ✦ {place.split(" ")[0]}</textPath>
        </text>
        <text x="190" y="54" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Special Elite" fontSize="13">{d} {m?.slice(0, 3)}</text>
        <text x="190" y="72" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Special Elite" fontSize="15">{y}</text>
      </g>
    </svg>
  );
}

// wobbly wax outline: a circle pushed out where the wax pooled
const blob = (() => {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = 54 + Math.sin(i * 2.7) * 2.6 + Math.sin(i * 5.3 + 1) * 1.8 + (i % 7 === 3 ? 3 : 0);
    return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r];
  });
  return pts.map(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length];
    return `${i ? "" : `M${x.toFixed(1)} ${y.toFixed(1)}`} Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }).join(" ") + " Z";
})();

// height map greys: higher is raised. The lighting filter turns this into embossed metal.
const H = { lip: "rgb(118,118,118)", rim: "rgb(222,222,222)", face: "rgb(92,92,92)", relief: "rgb(196,196,196)", groove: "rgb(140,140,140)" };

/** A five-petal flower on a stem with two leaves, pressed into the seal face like the brass stamps in the references. */
function Emblem() {
  return (
    <g>
      <path d="M60.5 57 C 60.5 66, 59.5 74, 58 86" stroke={H.relief} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M59.4 71 C 51 62, 42 63, 37 67 C 43 74, 52 75, 59.4 71 Z" fill={H.relief} />
      <path d="M59 71 C 51 67, 45 67, 39 67.5" stroke={H.groove} strokeWidth="0.8" fill="none" />
      <path d="M59 78 C 67 69, 76 70, 81 73 C 75 80, 66 81, 59 78 Z" fill={H.relief} />
      <path d="M59.4 78 C 67 74, 73 73, 79 73.5" stroke={H.groove} strokeWidth="0.8" fill="none" />
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k} transform={`rotate(${k * 72 - 8} 60.5 47)`}>
          <ellipse cx="60.5" cy="38.6" rx="6.2" ry="8.6" fill={H.relief} stroke={H.groove} strokeWidth="1" />
          <path d="M60.5 44 L60.5 33" stroke={H.groove} strokeWidth="0.6" />
        </g>
      ))}
      <circle cx="60.5" cy="47" r="4.6" fill={H.groove} />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => <circle key={k} cx={60.5 + Math.cos(k * 0.9) * 2.4} cy={47 + Math.sin(k * 0.9) * 2.4} r="0.9" fill={H.rim} />)}
    </g>
  );
}

/** Wax seal with a raised rim, a pressed face and an embossed flower, lit like metal-flecked wax. */
export function WaxSeal({ size = 120, flowers = true, tone = "gold" }: { size?: number; flowers?: boolean; tone?: "gold" | "red" }) {
  const id = useId().replace(/:/g, "");
  const base = tone === "gold" ? "#f4c873" : "#c23a42";
  const shine = tone === "gold" ? "#fff1cc" : "#ffd9d4";
  return (
    <svg viewBox="-30 -30 180 180" width={size * 1.5} height={size * 1.5} className="wax" aria-hidden style={{ margin: -size * 0.25 }}>
      <defs>
        <filter id={`emboss-${id}`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="h0" />
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="5" result="n" />
          <feColorMatrix in="n" type="luminanceToAlpha" result="na" />
          <feComposite in="h0" in2="na" operator="arithmetic" k2="1" k3="0.1" k4="-0.04" result="h1" />
          <feGaussianBlur in="h1" stdDeviation="1.15" result="h" />
          <feDiffuseLighting in="h" surfaceScale="7" diffuseConstant="1.3" lightingColor="#ffffff" result="diff">
            <feDistantLight azimuth="235" elevation="40" />
          </feDiffuseLighting>
          <feSpecularLighting in="h" surfaceScale="7" specularConstant={tone === "gold" ? 1 : 0.55} specularExponent="20" lightingColor={shine} result="spec">
            <feDistantLight azimuth="235" elevation="46" />
          </feSpecularLighting>
          <feFlood floodColor={base} result="col" />
          <feComposite in="col" in2="diff" operator="arithmetic" k1="1" result="shade" />
          <feComposite in="shade" in2="spec" operator="arithmetic" k2="1" k3="0.7" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      {flowers && <DriedFlowers />}
      <g filter={`url(#emboss-${id})`}>
        <path d={blob} fill={H.lip} />
        <circle cx="60" cy="60" r="43" fill="none" stroke={H.rim} strokeWidth="9" />
        <circle cx="60" cy="60" r="38.4" fill={H.face} />
        <Emblem />
      </g>
    </svg>
  );
}

function DriedFlowers() {
  const heads = [[-6, -14, "#e9a9b6"], [6, -22, "#f3c8cf"], [-18, -2, "#d98a9c"], [-2, -30, "#e7b3bd"], [-20, -22, "#f0c0c8"], [10, -8, "#e39fae"]] as const;
  return (
    <g transform="translate(36 30) rotate(-28)">
      {heads.map(([x, y], i) => <path key={i} d={`M0 60 Q ${x / 2} 30 ${x} ${y}`} stroke="#8d7b52" strokeWidth="1.1" fill="none" />)}
      {heads.map(([x, y, col], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 1, 2, 3, 4].map((p) => <circle key={p} cx={Math.cos(p * 1.26) * 3.2} cy={Math.sin(p * 1.26) * 3.2} r="3" fill={col} />)}
          <circle r="1.6" fill="#b9707f" />
        </g>
      ))}
      {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={-24 + ((i * 37) % 40)} cy={-36 + ((i * 23) % 30)} r="1.4" fill="#fbf4ea" />)}
      <path d="M-2 40 q -16 -6 -22 -20 q 14 4 22 20z" fill="#9da57a" opacity="0.8" />
    </g>
  );
}

/** A flying cherub with bow and arrow. Wings flap when `flapping`. */
export function CupidFigure({ fill = "#f1dcae", detail = "#7c1d24", flapping = false, drawn = true }: { fill?: string; detail?: string; flapping?: boolean; drawn?: boolean }) {
  const wing = (far: boolean) => ({ className: flapping ? (far ? "flap flap-far" : "flap") : undefined, style: { transformOrigin: "117px 72px", transformBox: "view-box" } as CSSProperties });
  return (
    <g>
      <g {...wing(true)}>
        <path d="M112 70C96 46 74 26 50 22c6 8 2 12-6 12 8 7 4 12-4 14 10 5 8 11 0 14 12 3 16 8 12 13 18 2 40 1 62-3z" fill={fill} opacity="0.55" transform="translate(-10 -6) rotate(-12 112 70)" />
      </g>
      {/* legs, torso, head */}
      <path d="M102 116c-14 8-30 12-44 9-9-2-9-12-1-12 13 0 27-4 39-9z" fill={fill} />
      <path d="M114 120c-2 15-10 27-20 31-7 2-9-6-3-10 8-6 10-14 12-23z" fill={fill} />
      <path d="M112 66c-17 5-26 25-22 43 4 17 24 23 37 12 11-10 13-34 4-50-5-7-12-8-19-5z" fill={fill} />
      <circle cx="128" cy="50" r="19" fill={fill} />
      <circle cx="143" cy="57" r="8" fill={fill} />
      {[[114, 37, 7], [123, 31, 7], [134, 31, 7], [143, 38, 6], [111, 49, 6]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={fill} />)}
      <g fill="none" stroke={detail} strokeWidth="1.3" strokeLinecap="round" opacity="0.7">
        <path d="M132 50q3 2 6 0" />
        <path d="M140 62q-3 2-6 1" />
        <path d="M104 112q8 4 16 0" />
        <path d="M117 34q4-4 9-2M128 30q5-3 9 1" />
      </g>
      {/* bow, string and arrow */}
      <path d="M166 32c26 18 26 66 0 84" fill="none" stroke={fill} strokeWidth="4.5" strokeLinecap="round" />
      <path d={drawn ? "M166 32L116 74L166 116" : "M166 32L170 74L166 116"} fill="none" stroke={fill} strokeWidth="1.2" />
      {drawn && (
        <g fill={fill}>
          <rect x="104" y="72.5" width="96" height="3" rx="1.5" />
          <path d="M214 74l-16-8c3 5 3 11 0 16z" />
          <path d="M104 74c-4-6-10-8-14-8l6 8-6 8c4 0 10-2 14-8z" />
        </g>
      )}
      <path d="M126 74c14-3 30-4 42-3 6 1 6 9 0 9-12 0-27 2-40 4z" fill={fill} />
      <path d="M121 78c-8 4-11 12-5 14 6 2 11-6 12-10z" fill={fill} />
      {/* near wing over the shoulder */}
      <g {...wing(false)}>
        <path d="M118 72C100 42 80 22 52 14c8 9 2 13-8 12 10 8 6 14-4 16 12 6 10 12 2 16 14 4 18 9 14 14 20 2 42 2 62-0z" fill={fill} />
        <g fill="none" stroke={detail} strokeWidth="1" opacity="0.45" strokeLinecap="round">
          <path d="M112 68C98 50 82 36 62 26M110 72C94 60 78 50 56 44M108 74C92 68 76 64 60 62" />
        </g>
      </g>
    </g>
  );
}

export function Heart({ size = 16, color = "#c2323f", style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 22" width={size} height={size} style={style} aria-hidden>
      <path d="M12 21C5 15 1 11 1 6.5 1 3.4 3.4 1 6.4 1 8.5 1 10.6 2.2 12 4.1 13.4 2.2 15.5 1 17.6 1 20.6 1 23 3.4 23 6.5 23 11 19 15 12 21z" fill={color} />
    </svg>
  );
}
