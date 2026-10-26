// Hand-drawn ornament in the spirit of the references: a gilded rococo arch, stained glass roses,
// and Art Nouveau whiplash corners. All SVG, all themable through currentColor where it matters.

const GOLD = "#d4a959";
const LEAD = "#2a0f0c";

/** A stained glass rose: petals in leaded panes, two sage leaves. */
export function GlassRose({ size = 64, tone = "rose" }: { size?: number; tone?: "rose" | "blush" }) {
  const [outer, mid, inner] = tone === "rose" ? ["#c25b67", "#9b2c3a", "#6e1424"] : ["#efc3c3", "#dc9aa0", "#b86b78"];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <g stroke={LEAD} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M50 64 C 30 70, 12 62, 8 50 C 22 46, 38 52, 50 64 Z" fill="#8fa58b" />
        <path d="M50 64 C 70 72, 88 64, 93 52 C 78 47, 62 52, 50 64 Z" fill="#7d9478" />
        <path d="M50 14 C 72 14, 86 30, 84 48 C 82 66, 66 76, 50 76 C 34 76, 18 66, 16 48 C 14 30, 28 14, 50 14 Z" fill={outer} />
        <path d="M50 24 C 66 24, 76 36, 74 50 C 72 62, 62 68, 50 68 C 38 68, 28 62, 26 50 C 24 36, 34 24, 50 24 Z" fill={mid} />
        <path d="M50 34 C 60 34, 66 42, 64 50 C 62 58, 56 60, 50 60 C 44 60, 38 56, 37 50 C 36 42, 42 34, 50 34 Z" fill={inner} />
        <path d="M50 42 C 56 42, 58 48, 54 52 C 50 55, 45 52, 46 48" fill="none" />
        <path d="M50 14 L 50 24 M 84 48 L 74 50 M 16 48 L 26 50 M 50 76 L 50 68 M 27 24 L 36 30 M 73 24 L 64 30" fill="none" />
      </g>
    </svg>
  );
}

/** A small stained glass heart with a diamond drop, the keystone of the arch. */
export function GlassHeart({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <g stroke={LEAD} strokeWidth="2.4" strokeLinejoin="round">
        <path d="M50 86 C 20 64, 6 48, 6 30 C 6 16, 17 6, 30 6 C 39 6, 46 11, 50 18 C 54 11, 61 6, 70 6 C 83 6, 94 16, 94 30 C 94 48, 80 64, 50 86 Z" fill="#7c1d24" />
        <path d="M50 70 C 30 56, 20 45, 20 33 C 20 25, 26 19, 33 19 C 40 19, 46 24, 50 31 C 54 24, 60 19, 67 19 C 74 19, 80 25, 80 33 C 80 45, 70 56, 50 70 Z" fill="#a4313c" />
        <path d="M50 31 L 50 70 M 20 33 L 50 50 L 80 33" fill="none" />
        <path d="M50 88 L 56 95 L 50 100 L 44 95 Z" fill={GOLD} />
      </g>
    </svg>
  );
}

/** The gilded arch frame that crowns the hero window. Sits over the 3D view. */
export function ArchFrame() {
  return (
    <svg className="arch-frame" viewBox="0 0 520 660" preserveAspectRatio="none" aria-hidden>
      <g fill="none" stroke={GOLD} strokeLinecap="round">
        {/* double moulding following the arch */}
        <path d="M14 652 V 262 A 246 246 0 0 1 506 262 V 652" strokeWidth="3" />
        <path d="M30 652 V 266 A 230 230 0 0 1 490 266 V 652" strokeWidth="1.2" opacity="0.7" />
        <path d="M2 660 V 258 A 258 258 0 0 1 518 258 V 660" strokeWidth="1" opacity="0.35" />
        {/* pilaster capitals */}
        {[14, 506].map((x, i) => (
          <g key={x} transform={`translate(${x} 262) scale(${i ? -1 : 1} 1)`}>
            <path d="M-6 0 H 26 M -6 10 H 22 M 0 10 C 6 20, 18 20, 22 12" strokeWidth="1.6" />
            <path d="M8 -6 C 22 -24, 46 -26, 54 -12 C 60 -2, 50 8, 42 2 C 36 -4, 42 -12, 48 -8" strokeWidth="1.8" />
            <path d="M8 -6 C 4 -18, 10 -34, 26 -40" strokeWidth="1.2" />
          </g>
        ))}
        {/* C-scrolls climbing the arch */}
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(260 0) scale(${s} 1)`}>
            <path d="M-150 66 C -176 92, -206 122, -214 162 C -218 184, -200 196, -188 184 C -178 174, -186 160, -196 166" strokeWidth="1.8" />
            <path d="M-96 30 C -120 36, -140 50, -150 66" strokeWidth="1.4" />
            <path d="M-170 118 C -160 112, -150 114, -146 122 M -196 144 C -186 140, -178 144, -176 152" strokeWidth="1.2" />
            <path d="M-60 18 C -72 0, -96 -2, -104 10 C -110 20, -100 30, -92 24" strokeWidth="1.6" />
          </g>
        ))}
        {/* base scallop with a shell */}
        <path d="M14 652 C 70 632, 120 636, 170 650 C 200 658, 230 640, 260 626 C 290 640, 320 658, 350 650 C 400 636, 450 632, 506 652" strokeWidth="1.4" opacity="0.8" />
        <path d="M240 636 C 244 618, 276 618, 280 636 M 250 636 L 254 622 M 260 634 L 260 618 M 270 636 L 266 622" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

/** Art Nouveau corner: a whiplash curve with a bud, mirrored onto all four corners by CSS. */
export function NouveauCorner() {
  return (
    <svg viewBox="0 0 64 64" className="nv-corner" aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M4 60 V 26 C 4 12, 12 4, 26 4 H 60" strokeWidth="2.4" />
        <path d="M12 60 V 30 C 12 20, 20 12, 30 12 H 60" strokeWidth="1" opacity="0.6" />
        <path d="M4 26 C 14 30, 22 24, 22 16 C 22 10, 16 8, 13 12 C 10 16, 14 20, 17 18" strokeWidth="1.6" />
      </g>
      <path d="M26 4 C 30 -1, 37 0, 38 4 C 37 8, 30 9, 26 4 Z" fill="#d9a3a8" opacity="0.9" />
    </svg>
  );
}

/** A small fleur used as a divider. */
export function Fleur({ size = 20, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <path d="M20 4 C 26 12, 26 20, 20 26 C 14 20, 14 12, 20 4 Z M 20 26 C 12 22, 6 24, 4 30 C 10 32, 16 30, 20 26 Z M 20 26 C 28 22, 34 24, 36 30 C 30 32, 24 30, 20 26 Z M 16 32 H 24 L 20 38 Z" fill={color} />
    </svg>
  );
}

/** A flourished rule: line, fleur, line. */
export function Rule() {
  return (
    <div className="lp-rule" aria-hidden>
      <span /><Fleur size={16} /><span />
    </div>
  );
}
