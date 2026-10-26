import { useEffect, useMemo, useRef, useState } from "react";
import Scene from "../Scene";
import { renderPage, cursor } from "../page";
import { machine, stroke, codeFor } from "../machine";

const SAMPLE = `Dear Mira,

By the time this reaches you, the jacaranda
outside our window will have bloomed again.
Save me a dance in the kitchen.

Always,
Aswini`;

/** The live typewriter in the hero window, typing a sample letter whenever it is on screen. */
export default function Showcase() {
  const page = useMemo(() => document.createElement("canvas"), []);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timer = 0, alive = true, visible = true, i = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = (text: string) => {
      renderPage(page, text);
      machine.pageVersion++;
      const c = cursor(text);
      machine.col = c.col; machine.line = c.line;
    };
    const step = () => {
      if (!alive) return;
      if (!visible) { timer = window.setTimeout(step, 400); return; }
      if (i > SAMPLE.length) {
        // rest on the finished letter, then start a fresh sheet
        timer = window.setTimeout(() => { i = 0; show(""); timer = window.setTimeout(step, 900); }, 4200);
        return;
      }
      const ch = SAMPLE[i - 1];
      if (ch) stroke(codeFor(ch));
      show(SAMPLE.slice(0, i++));
      timer = window.setTimeout(step, ch === "\n" ? 520 : 55 + Math.random() * 85);
    };
    document.fonts.load(`31px "Special Elite"`).finally(() => {
      machine.ejectAt = -1;
      if (reduced) show(SAMPLE); else { show(""); timer = window.setTimeout(step, 1200); }
      setReady(true);
    });
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 });
    if (box.current) io.observe(box.current);
    return () => { alive = false; clearTimeout(timer); io.disconnect(); };
  }, [page]);

  return (
    <div ref={box} className="showcase" aria-label="A vintage typewriter typing a sample letter" role="img">
      {ready ? <Scene stage="showcase" page={page} /> : <div className="showcase-skeleton" />}
    </div>
  );
}
