import * as THREE from "three";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Long-grain wood: banded rings with flecks, tinted by `tone`. */
export function woodTexture(tone: [string, string, string], seed = 7, repeat = 1) {
  const [c, g] = canvas(1024, 1024);
  const r = rand(seed);
  g.fillStyle = tone[1];
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 160; i++) {
    const y = r() * 1024, amp = 4 + r() * 18, freq = 0.002 + r() * 0.006, ph = r() * 9;
    g.strokeStyle = r() > 0.5 ? tone[0] : tone[2];
    g.globalAlpha = 0.08 + r() * 0.22;
    g.lineWidth = 1 + r() * 5;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1) * amp * 0.25);
    g.stroke();
  }
  for (let i = 0; i < 1400; i++) {
    g.globalAlpha = 0.05 + r() * 0.1;
    g.fillStyle = tone[2];
    g.fillRect(r() * 1024, r() * 1024, 2 + r() * 10, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

/** Ivory key face with a dished shadow, a fine ring and the legend. */
export function keyFace(label: string) {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(56, 52, 4, 64, 64, 64);
  grad.addColorStop(0, "#fbf3df");
  grad.addColorStop(0.75, "#eadbb8");
  grad.addColorStop(1, "#c9b48a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(60,40,20,0.35)";
  g.lineWidth = 2;
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#24170f";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = label.length > 2 ? `600 22px Georgia, serif` : `60px "Special Elite", Georgia, serif`;
  g.fillText(label, 64, label.length > 2 ? 66 : 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // a cylinder's top cap maps u/v sideways; turn the legend upright for someone seated at the machine
  t.center.set(0.5, 0.5);
  t.rotation = Math.PI / 2;
  return t;
}

/** Engraved brass maker's plate. */
export function plateTexture() {
  const [c, g] = canvas(512, 160);
  const grad = g.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, "#e2bd73"); grad.addColorStop(0.5, "#b8883e"); grad.addColorStop(1, "#8c6127");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = "rgba(60,35,10,0.7)";
  g.lineWidth = 3;
  g.strokeRect(10, 10, 492, 140);
  g.lineWidth = 1;
  g.strokeRect(18, 18, 476, 124);
  g.textAlign = "center";
  g.fillStyle = "rgba(255,236,190,0.55)";
  g.font = `italic 600 58px "Cormorant Garamond Variable", Georgia, serif`;
  g.fillText("Aswini & Co.", 257, 84);
  g.fillStyle = "rgba(60,35,10,0.85)";
  g.fillText("Aswini & Co.", 256, 82);
  g.font = `600 18px Georgia, serif`;
  g.fillText("LETTERS  FOR  LATER  ·  No. 7", 256, 122);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
