import { useEffect, useState } from "react";
import { motion, useAnimate } from "motion/react";
import { play } from "cuelume";
import { Stamp, CupidStampArt, HourglassStampArt, Postmark, WaxSeal, CupidFigure, Heart } from "./Postal";
import { type Letter, longDate, opensAt } from "./letter";

// dev only: ?slow=4 plays the sequence four times slower for frame checks
const SLOW = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get("slow")) || 1 : 1;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms * SLOW));
const soft = [0.65, 0, 0.35, 1] as const;
const out = [0.16, 1, 0.3, 1] as const;

export default function Seal({ letter, image, onDone }: { letter: Letter; image: string; onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const [drawn, setDrawn] = useState(true);
  const [hit, setHit] = useState(false);
  const today = longDate(letter.sealedAt ?? "");

  useEffect(() => {
    let live = true;
    const run = async () => {
      const a = (sel: string, kf: Record<string, unknown>, o: Record<string, unknown> = {}) =>
        live ? animate(sel, kf as never, { ...o, duration: ((o.duration as number) ?? 0.3) * SLOW, delay: ((o.delay as number) ?? 0) * SLOW } as never) : Promise.resolve();
      // envelope parts wait out of sight; the env itself stays opaque so the letter inside can be seen and keep its 3D
      a(".env-inner", { opacity: 0 }, { duration: 0 });
      a(".env-pocket", { opacity: 0, z: 6 }, { duration: 0 });
      a(".env-flap", { opacity: 0, z: 0.5, rotateX: 180 }, { duration: 0 });
      // the page arrives from the top of the screen, still flat
      await a(".letter", { z: 1, y: ["-120vh", "0vh"], rotate: [-4, 0] }, { duration: 1.1, ease: out });
      await wait(250);
      play("select", { emphasis: "subtle" });
      await a(".l-bottom", { z: 0.6, rotateX: [0, 180] }, { duration: 0.75, ease: soft });
      play("select", { emphasis: "subtle", direction: "back" });
      await a(".l-top", { z: 1.2, rotateX: [0, -180] }, { duration: 0.75, ease: soft });
      await wait(150);
      // the envelope comes up open, the folded letter lifts over it
      const lift = a(".letter", { y: "-62%", scale: 0.96 }, { duration: 0.7, ease: out });
      for (const part of [".env-inner", ".env-pocket", ".env-flap"]) a(part, { opacity: [0, 1], y: [160, 0] }, { duration: 0.9, ease: out, delay: 0.28 });
      await lift;
      await wait(500);
      await wait(120);
      play("select");
      await a(".letter", { y: "3%", scale: 0.92 }, { duration: 0.7, ease: [0.5, 0, 0.2, 1] });
      // flap closes: behind the letter until it stands upright, then over everything
      play("close");
      await a(".env-flap", { z: 0.5, rotateX: [180, 90] }, { duration: 0.32, ease: [0.4, 0, 1, 1] });
      await a(".env-flap", { z: 8, rotateX: [90, 0] }, { duration: 0.38, ease: [0, 0, 0.2, 1] });
      await wait(200);
      play("toggle", { theme: "press", emphasis: "strong" });
      await a(".env-seal", { z: 10, opacity: [0, 1], scale: [1.9, 0.94, 1], rotate: [-18, -8] }, { duration: 0.55, ease: out, times: [0, 0.7, 1] });
      a(".env", { scale: [1, 0.985, 1] }, { duration: 0.25 });
      await wait(500);
      // turn it over to address it
      play("navigate", { emphasis: "subtle" });
      await a(".env", { rotateY: 180 }, { duration: 1.0, ease: soft });
      await a(".face-addr", { opacity: [0, 1], y: [6, 0] }, { duration: 0.6, ease: out });
      play("tap", { theme: "press", emphasis: "strong" });
      await a(".face-stamp", { opacity: [0, 1], scale: [1.5, 1], rotate: [12, 4] }, { duration: 0.42, ease: [0.3, 0, 0.2, 1.3] });
      await wait(260);
      play("tap", { theme: "press" });
      await a(".face-mark", { opacity: [0, 0.9], scale: [1.15, 1] }, { duration: 0.18 });
      await wait(700);
      // Cupid comes for it
      await a(".cupid", { x: ["-70vw", "0vw"], y: ["-30vh", "0vh"] }, { duration: 1.6, ease: out });
      await wait(450);
      setDrawn(false);
      play("navigate", { emphasis: "strong" });
      // the arrow flies from the bow to the left third of the envelope
      const env = (scope.current as HTMLElement).querySelector<HTMLElement>(".env")!.getBoundingClientRect();
      const bow = (scope.current as HTMLElement).querySelector<HTMLElement>(".arrow")!.getBoundingClientRect();
      await a(".arrow", { opacity: [1, 1], x: [0, env.left + env.width * 0.32 - bow.right], y: [0, env.top + env.height * 0.5 - (bow.top + bow.height / 2)] }, { duration: 0.32, ease: [0.3, 0, 1, 1] });
      a(".arrow", { opacity: 0 }, { duration: 0.1 });
      setHit(true);
      play("success", { emphasis: "strong" });
      a(".env", { scale: [1, 1.04, 1] }, { duration: 0.35 });
      await wait(1100);
      a(".cupid", { x: "70vw", y: "-90vh", rotate: -10 }, { duration: 1.6, ease: [0.5, 0, 0.75, 0] });
      await a(".env-wrap", { x: "60vw", y: "-95vh", rotate: -14, scale: 0.6 }, { duration: 1.6, ease: [0.5, 0, 0.75, 0], delay: 0.12 });
      if (live) onDone();
    };
    run();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const self = letter.kind === "self";
  const panel = (part: "top" | "mid" | "bottom") => (
    <div className={`l-panel l-${part}`}>
      <div className="l-front" style={{ backgroundImage: `url(${image})`, backgroundPosition: part === "top" ? "0 0" : part === "mid" ? "0 50%" : "0 100%" }} />
      <div className="l-back" />
    </div>
  );

  return (
    <motion.div className="sealing" ref={scope} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
      <div className="seal-stage">
        <div className="env-wrap">
          <div className="env">
            <div className="env-inner" style={{ opacity: 0 }}><Liner /></div>
            <div className="letter" style={{ transform: "translateY(-120vh)" }}>{panel("top")}{panel("mid")}{panel("bottom")}</div>
            <svg className="env-pocket" style={{ opacity: 0 }} viewBox="0 0 116 62" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="pk-l" x1="0" x2="1"><stop offset="0" stopColor="#6d1220" /><stop offset="1" stopColor="#82182a" /></linearGradient>
                <linearGradient id="pk-b" y1="0" y2="1"><stop offset="0" stopColor="#8e1d2f" /><stop offset="1" stopColor="#741424" /></linearGradient>
              </defs>
              <path d="M0 0 L60 34 L0 62Z" fill="url(#pk-l)" />
              <path d="M116 0 L56 34 L116 62Z" fill="url(#pk-l)" transform="" />
              <path d="M0 62 L58 26 L116 62Z" fill="url(#pk-b)" />
              <path d="M0 62 L58 26 L116 62" fill="none" stroke="#3a060d" strokeOpacity="0.35" strokeWidth="0.4" />
            </svg>
            <div className="env-flap" style={{ opacity: 0, transform: "translateZ(0.5px) rotateX(180deg)" }}>
              <svg className="flap-out" viewBox="0 0 116 36" preserveAspectRatio="none" aria-hidden>
                <path d="M0 0 H116 L62 34 Q58 36 54 34 Z" fill="#8a1a2c" />
                <path d="M0 0 L54 34 Q58 36 62 34 L116 0" fill="none" stroke="#3a060d" strokeOpacity="0.4" strokeWidth="0.5" />
              </svg>
              <svg className="flap-in" viewBox="0 0 116 36" preserveAspectRatio="none" aria-hidden>
                <defs><linearGradient id="flap-shade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#5a3b1c" stopOpacity="0.22" /><stop offset="0.35" stopColor="#5a3b1c" stopOpacity="0" /></linearGradient></defs>
                {/* drawn upside down: the face is flipped once more when the flap opens, so the tip ends up pointing away */}
                <path d="M0 36 H116 L62 2 Q58 0 54 2 Z" fill="#efe4cf" />
                <path d="M4 34 H112 L60 4 Q58 3 56 4 Z" fill="none" stroke="#b9a37c" strokeWidth="0.3" />
                <path d="M0 36 H116 L62 2 Q58 0 54 2 Z" fill="url(#flap-shade)" />
              </svg>
            </div>
            <div className="seal-pos"><div className="env-seal" style={{ opacity: 0 }}><WaxSeal size={96} /></div></div>

            <div className="env-face">
              <p className="face-from caps small">From {letter.from}</p>
              <div className="face-stamp" style={{ opacity: 0 }}>
                <Stamp tone={self ? "#e8eedf" : "#f6e6da"}>{self ? <HourglassStampArt /> : <CupidStampArt />}</Stamp>
              </div>
              <div className="face-mark" style={{ opacity: 0 }}><Postmark id="env" date={today} style={{ color: "#1b1222" }} /></div>
              <div className="face-addr" style={{ opacity: 0 }}>
                <p className="addr-name">{self ? "Future me" : letter.to}</p>
                <p className="caps small">{letter.email}</p>
                <p className="caps small addr-date">Not to be opened before {opensAt(letter)}</p>
              </div>
            </div>
          </div>
          {hit && (
            <div className="hearts" aria-hidden>
              {Array.from({ length: 9 }, (_, i) => (
                <motion.span key={i} initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 0], x: Math.cos((i / 9) * Math.PI * 2) * (70 + (i % 3) * 30), y: Math.sin((i / 9) * Math.PI * 2) * 60 - 50, scale: [0.4, 1, 0.8], rotate: (i - 4) * 9 }}
                  transition={{ duration: 1.3, ease: out, delay: i * 0.03 }}>
                  <Heart size={14 + (i % 3) * 6} color={i % 2 ? "#d4a24c" : "#c2323f"} />
                </motion.span>
              ))}
            </div>
          )}
        </div>
        <div className="cupid" style={{ transform: "translate(-70vw, -30vh)" }}>
          <svg viewBox="0 0 220 170" aria-label="Cupid">
            <CupidFigure flapping drawn={drawn} />
          </svg>
          <div className="arrow" style={{ opacity: 0 }}>
            <svg viewBox="0 0 120 12" aria-hidden><rect x="0" y="4.5" width="104" height="3" rx="1.5" fill="#f1dcae" /><path d="M120 6l-16-7c3 4 3 10 0 14z" fill="#f1dcae" /><path d="M0 6c4-5 10-6 14-6l-5 6 5 6c-4 0-10-1-14-6z" fill="#c2323f" /></svg>
          </div>
        </div>
      </div>
      <p className="seal-caption caps small" aria-live="polite">Sealed on {today}</p>
    </motion.div>
  );
}

/** Vellum liner with pencil sprigs, like the inside of a good envelope. */
function Liner() {
  const sprigs = [[10, 54, -38, 1], [44, 60, -8, 0.9], [84, 58, -62, 1.1], [104, 22, 30, 0.9], [26, 20, 52, 0.8], [66, 30, -20, 0.75]];
  return (
    <svg viewBox="0 0 116 62" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="116" height="62" fill="#efe4cf" />
      <g fill="none" stroke="#8c7b5f" strokeWidth="0.32" strokeLinecap="round" opacity="0.75">
        {sprigs.map(([x, y, r, k], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
            <path d="M0 0 C 4 -6, 9 -11, 16 -15" />
            {[0.25, 0.45, 0.65, 0.85].map((t, j) => {
              const px = 16 * t - 1, py = -15 * t + (t < 0.5 ? 1 : 0);
              return (
                <g key={j}>
                  <ellipse cx={px - 2.6} cy={py - 1.2} rx="1.3" ry="3.4" transform={`rotate(-55 ${px - 2.6} ${py - 1.2})`} />
                  <ellipse cx={px + 1.6} cy={py + 1.8} rx="1.3" ry="3.4" transform={`rotate(35 ${px + 1.6} ${py + 1.8})`} />
                </g>
              );
            })}
            <ellipse cx="16.8" cy="-16.4" rx="1.2" ry="3" transform="rotate(48 16.8 -16.4)" />
          </g>
        ))}
      </g>
    </svg>
  );
}
