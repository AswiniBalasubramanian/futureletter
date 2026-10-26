// Shared, mutable state the 3D scene reads every frame. React never re-renders for it.

export const ROWS: [string, string][][] = [
  [["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"], ["Digit4", "4"], ["Digit5", "5"], ["Digit6", "6"], ["Digit7", "7"], ["Digit8", "8"], ["Digit9", "9"], ["Digit0", "0"], ["Backspace", "BACK"]],
  [["KeyQ", "Q"], ["KeyW", "W"], ["KeyE", "E"], ["KeyR", "R"], ["KeyT", "T"], ["KeyY", "Y"], ["KeyU", "U"], ["KeyI", "I"], ["KeyO", "O"], ["KeyP", "P"], ["Minus", "-"]],
  [["KeyA", "A"], ["KeyS", "S"], ["KeyD", "D"], ["KeyF", "F"], ["KeyG", "G"], ["KeyH", "H"], ["KeyJ", "J"], ["KeyK", "K"], ["KeyL", "L"], ["Semicolon", ";"], ["Quote", "'"]],
  [["ShiftLeft", "SHIFT"], ["KeyZ", "Z"], ["KeyX", "X"], ["KeyC", "C"], ["KeyV", "V"], ["KeyB", "B"], ["KeyN", "N"], ["KeyM", "M"], ["Comma", ","], ["Period", "."], ["Slash", "?"], ["ShiftRight", "SHIFT"]],
];

// every key that prints owns one typebar in the basket
export const PRINTING = ROWS.flat().filter(([code]) => !["Backspace", "ShiftLeft", "ShiftRight"].includes(code)).map(([code]) => code);

const SHIFTED: Record<string, string> = { "!": "Digit1", "@": "Digit2", "#": "Digit3", $: "Digit4", "%": "Digit5", "&": "Digit7", "*": "Digit8", "(": "Digit9", ")": "Digit0", _: "Minus", ":": "Semicolon", '"': "Quote", "/": "Slash", "<": "Comma", ">": "Period" };

/** The key code that would type `ch`, for autotyping and pasted text. */
export function codeFor(ch: string): string {
  if (ch === " ") return "Space";
  if (ch === "\n") return "Enter";
  if (/[a-z]/i.test(ch)) return "Key" + ch.toUpperCase();
  if (/[0-9]/.test(ch)) return "Digit" + ch;
  const plain = ROWS.flat().find(([, l]) => l === ch);
  return plain?.[0] ?? SHIFTED[ch] ?? PRINTING[ch.charCodeAt(0) % PRINTING.length];
}

export const machine = {
  held: new Set<string>(),
  taps: new Map<string, number>(), // code -> time, for presses that release on their own
  strikes: new Map<number, number>(), // typebar -> time it left the basket
  col: 0,
  line: 0,
  returnAt: -10,
  ejectAt: -1,
  now: 0,
  pageVersion: 0,
};

/** One full keystroke: key goes down, and a printing key fires its typebar. */
export function stroke(code: string, held = false) {
  if (held) machine.held.add(code);
  else machine.taps.set(code, machine.now);
  const bar = PRINTING.indexOf(code);
  if (bar >= 0) machine.strikes.set(bar, machine.now);
  if (code === "Enter") machine.returnAt = machine.now;
}
