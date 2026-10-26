import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { play } from "cuelume";
import { MAX_LINES, layout } from "./page";

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

type Props = {
  text: string;
  locked: boolean;
  onEdit: (next: string) => void; // direct edits from the panel
  onType: (chunk: string) => void; // text the machine should type out key by key
  onReplace: (next: string) => void; // a whole new letter (translation, undo)
  onClose: () => void;
};

export default function Editor({ text, locked, onEdit, onType, onReplace, onClose }: Props) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [voice, setVoice] = useState("en-IN");
  const [target, setTarget] = useState("ta");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  useEffect(() => () => rec.current?.stop(), []);

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

  const translate = async () => {
    setBusy(true); setNote(null);
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang: target }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "The translator didn't answer. Try again.");
      if (layout(body.text).length > MAX_LINES) throw new Error("The translation runs longer than one page. Shorten the letter a little and try again.");
      setOriginal((o) => o ?? text);
      onReplace(body.text);
      setNote({ kind: "ok", text: `Translated into ${TARGETS.find(([k]) => k === target)?.[1]}.` });
      play("success", { emphasis: "subtle" });
    } catch (err) {
      setNote({ kind: "error", text: (err as Error).message });
      play("error", { emphasis: "subtle" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.aside className="editor" aria-label="Letter editor"
      initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <header className="ed-head">
        <div>
          <p className="caps small">The page</p>
          <p className="ed-count">{words} {words === 1 ? "word" : "words"} · {layout(text).length} of {MAX_LINES} lines</p>
        </div>
        <button className="ed-close" aria-label="Close editor" data-cuelume-close onClick={onClose}>×</button>
      </header>

      <div className={`ed-paper ${busy ? "busy" : ""}`}>
        <textarea
          value={text}
          readOnly={locked || busy}
          onChange={(e) => {
            const next = e.target.value.replace(/\t/g, " ").replace(/\r/g, "").slice(0, 4000);
            if (layout(next).length > MAX_LINES) { play("error", { emphasis: "subtle" }); return; }
            onEdit(next);
          }}
          spellCheck
          aria-label="Edit your letter"
          data-cuelume-type
          data-cuelume-theme="mech"
        />
        {heard && <p className="ed-heard" aria-live="polite">{heard}…</p>}
        {busy && <div className="ed-skeleton" aria-hidden>{[86, 72, 90, 64, 80].map((w, i) => <span key={i} style={{ width: `${w}%` }} />)}</div>}
      </div>

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

      <section className="ed-tool" aria-label="Translate">
        <p className="caps small">Translate the letter</p>
        <div className="ed-row ed-translate">
          <label className="ed-select grow">
            <span className="caps small">Into</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} data-cuelume-select>
              {TARGETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <button className="ed-btn" onClick={translate} disabled={busy || locked || text.trim().length < 3} data-cuelume-tap>
            {busy ? "Translating…" : "Translate"}
          </button>
        </div>
        {original !== null && !busy && (
          <button className="ed-link" data-cuelume-tap onClick={() => { onReplace(original); setOriginal(null); setNote({ kind: "ok", text: "Back to your original words." }); }}>
            Undo translation
          </button>
        )}
      </section>

      {note && <p className={`ed-note ${note.kind}`} role={note.kind === "error" ? "alert" : "status"}>{note.text}</p>}
    </motion.aside>
  );
}
