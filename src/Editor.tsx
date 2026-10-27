import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { play } from "cuelume";
import { MAX_LINES, layout } from "./page";
import { hasOnDevice, translateOnDevice, OnDeviceError } from "./translate";
import { TONES, rephrase, type Tone } from "./rephrase";

// speech recognition is prefixed in Chromium and Safari and missing from the DOM typings
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
const SpeechAPI = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

const VOICES: [string, string][] = [["en-IN", "English"], ["ta-IN", "Tamil"], ["hi-IN", "Hindi"], ["fr-FR", "French"], ["es-ES", "Spanish"], ["de-DE", "German"], ["te-IN", "Telugu"], ["ml-IN", "Malayalam"], ["ja-JP", "Japanese"]];
const TARGETS: [string, string][] = [["ta", "Tamil"], ["hi", "Hindi"], ["fr", "French"], ["es", "Spanish"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"], ["te", "Telugu"], ["ml", "Malayalam"], ["kn", "Kannada"], ["bn", "Bengali"], ["mr", "Marathi"], ["ur", "Urdu"], ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"], ["ar", "Arabic"], ["en", "English"]];
const langName = (k: string) => TARGETS.find(([c]) => c === k)?.[1] ?? k;

type Props = {
  text: string;
  locked: boolean;
  onEdit: (next: string) => void; // direct edits from the panel
  onType: (chunk: string) => void; // text the machine should type out key by key
  onReplace: (next: string) => void; // a whole new letter (translation, rephrasing, undo)
  onClose: () => void;
};

type Range = { start: number; end: number };

export default function Editor({ text, locked, onEdit, onType, onReplace, onClose }: Props) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [voice, setVoice] = useState("en-IN");
  const [target, setTarget] = useState("ta");
  const [busy, setBusy] = useState<string | null>(null); // what is running, for the button labels
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<string[]>([]); // earlier versions, newest last
  const [sel, setSel] = useState<Range | null>(null);
  const rec = useRef<Recognition | null>(null);
  const paper = useRef<HTMLTextAreaElement>(null);
  // the English a whole-letter translation came from, so switching Tamil to Hindi starts from the original
  const lastWhole = useRef<{ source: string; result: string } | null>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const selected = sel ? text.slice(sel.start, sel.end) : "";
  const hasSel = selected.trim().length > 1;

  useEffect(() => () => rec.current?.stop(), []);
  // follow the selection however it changes: mouse drag, Shift+arrows, double-click, select-all
  useEffect(() => {
    const onChange = () => { if (document.activeElement === paper.current) trackSelection(); };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);
  // a selection made before the text changed no longer points at the same words
  useEffect(() => { if (sel && sel.end > text.length) setSel(null); }, [text, sel]);

  const trackSelection = () => {
    const t = paper.current;
    if (!t) return;
    setSel(t.selectionEnd - t.selectionStart > 1 ? { start: t.selectionStart, end: t.selectionEnd } : null);
  };

  /** Puts `result` in place of the range (or the whole letter), keeping the old letter for Undo. */
  const apply = (result: string, range: Range | null, message: string) => {
    const next = range ? text.slice(0, range.start) + result + text.slice(range.end) : result;
    if (layout(next).length > MAX_LINES) throw new Error("That would run longer than one page. Shorten the letter a little and try again.");
    setHistory((h) => [...h.slice(-19), text]);
    onReplace(next);
    setSel(null);
    setNote({ kind: "ok", text: message });
    play("success", { emphasis: "subtle" });
  };

  const run = async (label: string, job: () => Promise<void>) => {
    setBusy(label); setNote(null);
    try { await job(); } catch (err) {
      setNote({ kind: "error", text: (err as Error).message });
      play("error", { emphasis: "subtle" });
    } finally { setBusy(null); }
  };

  const listen = () => {
    if (listening) { rec.current?.stop(); return; }
    if (!SpeechAPI) return;
    const r = new SpeechAPI();
    r.lang = voice; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onType(res[0].transcript.trim() + " ");
        else interim += res[0].transcript;
      }
      setHeard(interim);
    };
    r.onerror = (e) => {
      setNote({ kind: "error", text: e.error === "not-allowed" ? "Microphone access was blocked. Allow it in the address bar and try again." : "Voice typing stopped. Tap the microphone to carry on." });
    };
    r.onend = () => { setListening(false); setHeard(""); };
    rec.current = r;
    setNote(null);
    r.start();
    setListening(true);
    play("open", { emphasis: "subtle" });
  };

  /** Translates the selection, or the whole letter when nothing is selected. */
  const translate = (range: Range | null) => run("translate", async () => {
    const whole = !range;
    const source = whole ? (lastWhole.current?.result === text ? lastWhole.current.source : text) : text.slice(range.start, range.end);
    const viaServer = async (why: string) => {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: source, lang: target }) });
      const body = await res.json().catch(() => ({}));
      // 503: the server has no Anthropic key, so the on-device reason is the one worth showing
      if (!res.ok) throw new Error(res.status === 503 ? (hasOnDevice() ? why : `${why} Open this page in desktop Chrome 138 or newer to translate on your device.`) : body.error ?? "The translator didn't answer. Try again.");
      return body.text as string;
    };
    let result: string;
    if (hasOnDevice()) {
      try {
        result = await translateOnDevice(source, "en", target, (p) => setNote({ kind: "ok", text: `Downloading the ${langName(target)} language pack… ${Math.round(p * 100)}%` }));
      } catch (err) {
        if (!(err instanceof OnDeviceError)) throw err;
        result = await viaServer(err.message);
      }
    } else {
      result = await viaServer("This browser has no built-in translator.");
    }
    // keep the spaces around a selection so it sits back in its sentence
    if (!whole) result = (source.match(/^\s*/)?.[0] ?? "") + result.trim() + (source.match(/\s*$/)?.[0] ?? "");
    apply(result, range, whole ? `Translated the letter into ${langName(target)}.` : `Translated the selection into ${langName(target)}.`);
    if (whole) lastWhole.current = { source, result };
  });

  /** Rewrites the selection, or the whole letter, in a tone. */
  const retone = (tone: Tone, range: Range | null) => run(tone.id, async () => {
    const source = range ? text.slice(range.start, range.end) : text;
    let result = await rephrase(source, tone, (p) => setNote({ kind: "ok", text: `Downloading Chrome's writing model… ${Math.round(p * 100)}%` }));
    if (range) result = (source.match(/^\s*/)?.[0] ?? "") + result.trim() + (source.match(/\s*$/)?.[0] ?? "");
    apply(result, range, range ? `Made the selection ${tone.label.toLowerCase()}.` : `Made the letter ${tone.label.toLowerCase()}.`);
  });

  const undo = () => {
    const prev = history[history.length - 1];
    if (prev === undefined) return;
    setHistory((h) => h.slice(0, -1));
    onReplace(prev);
    setSel(null);
    lastWhole.current = null;
    setNote({ kind: "ok", text: "Undone." });
  };

  const disabled = !!busy || locked;

  return (
    <motion.aside className="editor" aria-label="Letter editor"
      initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <header className="ed-head">
        <div>
          <p className="caps small">The page</p>
          <p className="ed-count">{words} {words === 1 ? "word" : "words"} · {layout(text).length} of {MAX_LINES} lines</p>
        </div>
        <div className="ed-head-actions">
          <button className="ed-undo" onClick={undo} disabled={!history.length || !!busy} data-cuelume-navigate aria-label="Undo the last change">Undo</button>
          <button className="ed-close" aria-label="Close editor" data-cuelume-close onClick={onClose}>×</button>
        </div>
      </header>

      <div className={`ed-paper ${busy ? "busy" : ""}`}>
        <textarea
          ref={paper}
          value={text}
          readOnly={locked || !!busy}
          onChange={(e) => {
            const next = e.target.value.replace(/\t/g, " ").replace(/\r/g, "").slice(0, 4000);
            if (layout(next).length > MAX_LINES) { play("error", { emphasis: "subtle" }); return; }
            onEdit(next);
          }}
          onSelect={trackSelection}
          onMouseUp={trackSelection}
          onKeyUp={trackSelection}
          spellCheck
          aria-label="Edit your letter"
          data-cuelume-type
          data-cuelume-theme="mech"
        />
        {heard && <p className="ed-heard" aria-live="polite">{heard}…</p>}
        {busy && <div className="ed-skeleton" aria-hidden>{[86, 72, 90, 64, 80].map((w, i) => <span key={i} style={{ width: `${w}%` }} />)}</div>}

        {/* the selection menu: appears when words are selected, acts on just those words */}
        <AnimatePresence>
          {hasSel && !busy && !locked && sel && (
            <motion.div className="sel-menu" role="toolbar" aria-label="Selected text"
              onMouseDown={(e) => e.preventDefault()}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              <p className="sel-count">{selected.trim().split(/\s+/).length} words selected</p>
              <button className="sel-act" onClick={() => translate(sel)} data-cuelume-tap>Translate to {langName(target)}</button>
              <span className="sel-rule" aria-hidden />
              {TONES.map((t) => <button key={t.id} className="sel-tone" onClick={() => retone(t, sel)} data-cuelume-tap>{t.label}</button>)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="ed-tool" aria-label="Rephrase">
        <p className="caps small">Change the tone</p>
        <p className="ed-hint">{hasSel ? "Applies to the words you selected." : "Applies to the whole letter. Select words on the page to change just those."}</p>
        <div className="tone-chips" role="group" aria-label="Tones">
          {TONES.map((t) => (
            <button key={t.id} className="tone-chip" onClick={() => retone(t, hasSel ? sel : null)} disabled={disabled || text.trim().length < 3} data-cuelume-tap>
              {busy === t.id ? "Rewriting…" : t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="ed-tool" aria-label="Translate">
        <p className="caps small">Translate</p>
        <div className="ed-row ed-translate">
          <label className="ed-select grow">
            <span className="caps small">Into</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} data-cuelume-select>
              {TARGETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <button className="ed-btn" onClick={() => translate(hasSel ? sel : null)} disabled={disabled || text.trim().length < 3} data-cuelume-tap>
            {busy === "translate" ? "Translating…" : hasSel ? "Translate selection" : "Translate letter"}
          </button>
        </div>
      </section>

      <section className="ed-tool" aria-label="Voice typing">
        <p className="caps small">Speak it</p>
        <div className="ed-row">
          <button className={`mic ${listening ? "on" : ""}`} onClick={listen} disabled={!SpeechAPI || locked} aria-pressed={listening} aria-label={listening ? "Stop voice typing" : "Start voice typing"} data-cuelume-toggle>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a6 6 0 0 1-12 0M12 17.5V21m-3.5 0h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
          <div className="ed-mic-copy">
            <p>{!SpeechAPI ? "Voice typing needs Chrome, Edge or Safari." : listening ? "Listening. The machine types as you speak." : "Tap and speak. Each sentence is typed onto the page."}</p>
            <label className="ed-select">
              <span className="caps small">Speaking</span>
              <select value={voice} onChange={(e) => setVoice(e.target.value)} disabled={listening} data-cuelume-select>
                {VOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>

      {note && <p className={`ed-note ${note.kind}`} role={note.kind === "error" ? "alert" : "status"}>{note.text}</p>}
    </motion.aside>
  );
}
