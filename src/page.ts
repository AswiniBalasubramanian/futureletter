// The letter as a typewritten page: fixed-pitch grid, word wrap, and ink that varies per strike.

export const PAGE = { w: 1240, h: 1754, left: 150, top: 240, lh: 46, cols: 50, size: 31 };
export const CW = (PAGE.w - PAGE.left * 2) / PAGE.cols;
export const MAX_LINES = Math.floor((PAGE.h - PAGE.top - 190) / PAGE.lh);

// Latin type sits on the fixed pitch; Tamil, Devanagari and other scripts are drawn whole and run wider
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const LATIN = /^[\u0000-ɏ -⁯]$/;
export const isLatin = (s: string) => [...s].every((c) => LATIN.test(c));
/** Width of a run in typewriter columns. */
export function span(s: string) {
  let w = 0;
  for (const { segment } of segmenter.segment(s)) w += LATIN.test(segment[0]) ? 1 : /[　-鿿가-힯]/.test(segment) ? 1.8 : 1.5;
  return w;
}
/** Index where `s` stops fitting in `cols` columns, on a grapheme boundary. */
function cut(s: string, cols: number) {
  let w = 0, end = 0;
  for (const { segment, index } of segmenter.segment(s)) {
    w += span(segment);
    if (w > cols) return end || segment.length;
    end = index + segment.length;
  }
  return end;
}

/** Wraps text to the page's columns. Hard returns stay, long words break. */
export function layout(text: string): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(?<= )/)) {
      if (span((line + word).trimEnd()) <= PAGE.cols) { line += word; continue; }
      if (line) out.push(line.trimEnd());
      let w = word;
      while (span(w.trimEnd()) > PAGE.cols) { const n = cut(w, PAGE.cols); out.push(w.slice(0, n)); w = w.slice(n); }
      line = w;
    }
    out.push(line);
  }
  return out;
}

/** Where the type guide sits after this text: the next column and line. */
export function cursor(text: string) {
  const lines = layout(text);
  const last = lines[lines.length - 1];
  return { line: lines.length - 1, col: Math.min(Math.round(span(last)), PAGE.cols) };
}

// small deterministic noise so a character keeps its ink on every redraw
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

let base: HTMLCanvasElement | null = null;
/** Cream laid paper: warm wash, chain lines, fibres and foxing. Drawn once. */
export function paperBase() {
  if (base) return base;
  const c = document.createElement("canvas");
  c.width = PAGE.w; c.height = PAGE.h;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(PAGE.w * 0.45, PAGE.h * 0.4, 100, PAGE.w / 2, PAGE.h / 2, PAGE.h * 0.8);
  grad.addColorStop(0, "#f6eedc");
  grad.addColorStop(0.7, "#efe3c9");
  grad.addColorStop(1, "#e2d0ad");
  g.fillStyle = grad;
  g.fillRect(0, 0, PAGE.w, PAGE.h);
  // laid lines and chain lines
  g.globalAlpha = 0.035;
  g.fillStyle = "#6b5233";
  for (let y = 0; y < PAGE.h; y += 6) g.fillRect(0, y, PAGE.w, 1);
  g.globalAlpha = 0.05;
  for (let x = 60; x < PAGE.w; x += 150) g.fillRect(x, 0, 2, PAGE.h);
  // fibres
  for (let i = 0; i < 2600; i++) {
    const x = hash(i) * PAGE.w, y = hash(i + 9000) * PAGE.h, a = hash(i + 4000) * Math.PI;
    const len = 2 + hash(i + 7000) * 9;
    g.globalAlpha = 0.04 + hash(i + 2000) * 0.07;
    g.strokeStyle = hash(i + 3000) > 0.5 ? "#8a6a42" : "#fffaf0";
    g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  // a few foxing spots and a darker deckle edge
  for (let i = 0; i < 26; i++) {
    const x = hash(i + 50) * PAGE.w, y = hash(i + 80) * PAGE.h, r = 3 + hash(i + 90) * 16;
    const s = g.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, "rgba(150,100,50,0.09)"); s.addColorStop(1, "rgba(150,100,50,0)");
    g.globalAlpha = 1; g.fillStyle = s; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const edge = g.createLinearGradient(0, 0, 0, PAGE.h);
  edge.addColorStop(0, "rgba(120,80,40,0.10)"); edge.addColorStop(0.04, "rgba(120,80,40,0)");
  edge.addColorStop(0.96, "rgba(120,80,40,0)"); edge.addColorStop(1, "rgba(120,80,40,0.12)");
  g.fillStyle = edge; g.fillRect(0, 0, PAGE.w, PAGE.h);
  base = c;
  return c;
}

/** Draws the base sheet plus every typed character onto `c`. */
export function renderPage(c: HTMLCanvasElement, text: string) {
  c.width = PAGE.w; c.height = PAGE.h;
  const g = c.getContext("2d")!;
  g.drawImage(paperBase(), 0, 0);
  g.font = `${PAGE.size}px "Special Elite", "Nirmala UI", "Noto Sans Tamil", "Noto Sans Devanagari", "Courier New", monospace`;
  g.textBaseline = "alphabetic";
  let n = 0;
  layout(text).forEach((line, li) => {
    if (!isLatin(line)) {
      // shaped scripts: one inked run so conjuncts and vowel signs join properly
      g.save();
      g.fillStyle = `rgba(36, 24, 18, ${0.82 + hash(li) * 0.12})`;
      g.textAlign = "left";
      g.fillText(line, PAGE.left, PAGE.top + li * PAGE.lh);
      g.globalAlpha = 0.16;
      g.fillText(line, PAGE.left + 0.7, PAGE.top + li * PAGE.lh + 0.4);
      g.restore();
      n += line.length + 1;
      return;
    }
    for (let ci = 0; ci < line.length; ci++, n++) {
      const ch = line[ci];
      if (ch === " ") continue;
      const x = PAGE.left + ci * CW + (hash(n) - 0.5) * 1.6;
      const y = PAGE.top + li * PAGE.lh + (hash(n + 1) - 0.5) * 2.2;
      // ribbon ink: mostly solid, sometimes a lighter strike
      const ink = 0.68 + hash(n + 2) * 0.3;
      g.save();
      g.translate(x + CW / 2, y);
      g.rotate((hash(n + 3) - 0.5) * 0.045);
      g.fillStyle = `rgba(36, 24, 18, ${ink})`;
      g.textAlign = "center";
      g.fillText(ch, 0, 0);
      // a faint second impression where the slug hit unevenly
      g.globalAlpha = 0.18;
      g.fillText(ch, 0.7, 0.4);
      g.restore();
    }
    n++;
  });
  return c;
}
