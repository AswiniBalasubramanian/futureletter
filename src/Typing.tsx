import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Editor from "./Editor";
import "./editor.css";
import { play } from "cuelume";
import { machine, stroke, codeFor } from "./machine";
import { PAGE, MAX_LINES, cursor, layout } from "./page";
import { type Letter, salutation, opensAt } from "./letter";

const BLOCKED = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", "Tab", "Delete"]);
const BELL_AT = PAGE.cols - 6;

export default function Typing({ letter, text, setText, onSeal }: { letter: Letter; text: string; setText: (t: string) => void; onSeal: () => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [auto, setAuto] = useState(true);
  const [panel, setPanel] = useState(() => innerWidth >= 1100);
  const queue = useRef<string[]>([]);
  const typing = useRef(0);
  const textRef = useRef(text);
  textRef.current = text;

  // keep the machine's carriage in step with the page
  const commit = (next: string) => {
    const before = cursor(textRef.current);
    const after = cursor(next);
    machine.col = after.col;
    machine.line = after.line;
    if (after.line === before.line && before.col < BELL_AT && after.col >= BELL_AT) play("attention", { emphasis: "subtle", volume: 0.6 });
    if (after.line > before.line) play("navigate", { direction: "back", emphasis: "subtle" });
    textRef.current = next;
    setText(next);
  };

  // the machine types the salutation itself, then hands over
  useEffect(() => {
    const greeting = salutation(letter) + "\n\n";
    if (text.startsWith(greeting.trim())) { setAuto(false); area.current?.focus(); return; }
    let i = 0, timer = 0;
    const next = () => {
      if (i >= greeting.length) { setAuto(false); area.current?.focus(); return; }
      const ch = greeting[i++];
      stroke(codeFor(ch));
      if (ch !== "\n") play("type", { theme: "mech", key: ch === " " ? "space" : "printable" });
      commit(greeting.slice(0, i));
      timer = window.setTimeout(next, ch === "\n" ? 420 : 70 + Math.random() * 90);
    };
    timer = window.setTimeout(next, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dictated text is struck onto the page one key at a time
  const typeOut = (chunk: string) => {
    queue.current.push(...chunk);
    if (typing.current) return;
    const tick = () => {
      const ch = queue.current.shift();
      if (ch === undefined) { typing.current = 0; return; }
      const next = textRef.current + ch;
      if (layout(next).length > MAX_LINES) { queue.current = []; typing.current = 0; play("error", { emphasis: "subtle" }); return; }
      stroke(codeFor(ch));
      if (ch !== " ") play("type", { theme: "mech", key: "printable", volume: 0.7 });
      commit(next);
      typing.current = window.setTimeout(tick, 38 + Math.random() * 40);
    };
    typing.current = window.setTimeout(tick, 0);
  };
  useEffect(() => () => clearTimeout(typing.current), []);

  // the side editor pushes the machine left so nothing hides behind it
  useEffect(() => {
    document.documentElement.toggleAttribute("data-editor", panel);
    return () => document.documentElement.removeAttribute("data-editor");
  }, [panel]);

  useEffect(() => {
    // keep the hidden field focused for typing, unless the writer is working in the editor
    const keep = (e?: Event) => {
      if (auto) return;
      const t = (e?.target ?? null) as Element | null;
      if (t?.closest?.(".editor, .hud-bar")) return;
      if (document.activeElement?.closest?.(".editor")) return;
      area.current?.focus({ preventScroll: true });
    };
    keep();
    window.addEventListener("pointerup", keep);
    return () => window.removeEventListener("pointerup", keep);
  }, [auto]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (auto || BLOCKED.has(e.key) || e.metaKey || e.ctrlKey && e.key !== "v") { if (BLOCKED.has(e.key) || auto) e.preventDefault(); return; }
    if (e.repeat && e.key !== "Backspace") return;
    const code = e.key === "Enter" ? "Enter" : e.code || codeFor(e.key);
    if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") stroke(code, true);
    else if (e.key === "Shift") machine.held.add(e.code);
  };
  const onKeyUp = (e: React.KeyboardEvent) => { machine.held.delete(e.code); machine.held.delete("Enter"); };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let next = e.target.value.replace(/\t/g, " ").replace(/\r/g, "");
    if (layout(next).length > MAX_LINES) { play("error", { emphasis: "subtle" }); e.target.value = text; return; }
    // phones and pasted text: give each new character its keystroke
    if (next.length > text.length && next.startsWith(text)) {
      const added = next.slice(text.length);
      if (added.length > 1) [...added].slice(0, 12).forEach((ch, i) => setTimeout(() => stroke(codeFor(ch)), i * 40));
    }
    if (next.length > 4000) next = next.slice(0, 4000);
    commit(next);
  };

  const body = text.slice(salutation(letter).length).trim();
  const lines = layout(text).length;

  return (
    <motion.div className="typing" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.8 } }} exit={{ opacity: 0 }}>
      <textarea
        ref={area}
        className="ghost-input"
        data-cuelume-type
        data-cuelume-theme="mech"
        value={text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onSelect={(e) => { const t = e.currentTarget; t.selectionStart = t.selectionEnd = t.value.length; }}
        readOnly={auto}
        autoCapitalize="sentences"
        spellCheck={false}
        aria-label="Your letter"
      />
      <div className="hud-top">
        <p className="caps small">To <b>{letter.kind === "self" ? "future me" : letter.to}</b> · opens <b>{opensAt(letter)}</b></p>
      </div>
      <div className="hud-bar" role="toolbar" aria-label="Letter controls">
        <div className="hud-progress">
          <p className="caps small" aria-live="polite">
            {auto ? "Setting your salutation…" : body ? <>Line <b>{lines}</b> of {MAX_LINES}</> : "Type on your keyboard"}
          </p>
          <span className="hud-rule" aria-hidden><span style={{ transform: `scaleX(${Math.min(lines / MAX_LINES, 1)})` }} /></span>
        </div>
        <button className="seal-btn" data-cuelume-tap onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); area.current?.focus(); } }} data-cuelume-emphasis="strong" disabled={auto || body.length < 2} onClick={onSeal}>
          <span className="seal-dot" aria-hidden />Seal the letter
        </button>
        <button className={`hud-toggle ${panel ? "on" : ""}`} aria-pressed={panel} onClick={() => setPanel(!panel)} data-cuelume-toggle>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          Editor
        </button>
      </div>
      <AnimatePresence>
        {panel && (
          <Editor
            text={text}
            locked={auto}
            onEdit={(next) => commit(next)}
            onType={typeOut}
            onReplace={(next) => { queue.current = []; commit(next); }}
            onClose={() => { setPanel(false); area.current?.focus(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
