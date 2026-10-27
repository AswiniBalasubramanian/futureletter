import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { setEnabled, unlock, play } from "cuelume";
import Scene, { type Stage } from "./Scene";
import Compose from "./Compose";
import Typing from "./Typing";
import Seal from "./Seal";
import Sent from "./Sent";
import { renderPage, newPage } from "./page";
import { machine } from "./machine";
import { ogee } from "./pattern";
import { type Letter, type Post, blankLetter, iso, saveToOutbox, postLetter } from "./letter";

export default function App() {
  // dev only: ?demo=seal jumps straight to the sealing sequence with a sample letter
  const demo = import.meta.env.DEV && new URLSearchParams(location.search).get("demo") === "seal";
  const [stage, setStage] = useState<Stage>(demo ? "sealing" : "intro");
  const [letter, setLetter] = useState<Letter>(() => demo
    ? { kind: "loved", to: "Mira", email: "mira@example.com", from: "Aswini", deliver: "2027-10-26", sealedAt: iso(new Date()), deliverTime: "09:00", text: "Dear Mira,\n\nSave me a dance for when this arrives." }
    : blankLetter());
  const [image, setImage] = useState("");
  const [sound, setSound] = useState(true);
  const [post, setPost] = useState<Post>({ state: "sending" });
  const page = useMemo(() => newPage(), []);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("app-mode");
    document.documentElement.style.setProperty("--damask", ogee("#e3c385", 0.085));
    document.title = "Write a letter · Future Love Letter";
  }, []);
  useEffect(() => {
    // the page is drawn in Special Elite, so wait for it before the first strike
    document.fonts.load(`31px "Special Elite"`).finally(() => {
      renderPage(page, demo ? letter.text : "");
      machine.pageVersion++;
      if (demo) setImage(page.toDataURL("image/jpeg", 0.85));
      setFontsReady(true);
    });
  }, [page]);
  useEffect(() => { if (fontsReady) { renderPage(page, letter.text); machine.pageVersion++; } }, [letter.text, fontsReady, page]);

  const begin = () => {
    void unlock();
    setLetter((l) => ({ ...l, text: "" }));
    machine.col = 0; machine.line = 0; machine.ejectAt = -1;
    setStage("typing");
  };
  const seal = () => {
    machine.ejectAt = machine.now;
    play("open", { emphasis: "subtle" });
    const sealed = { ...letter, text: letter.text.trimEnd(), sealedAt: iso(new Date()) };
    renderPage(page, sealed.text);
    machine.pageVersion++;
    const shot = page.toDataURL("image/jpeg", 0.85);
    setImage(shot);
    setLetter(sealed);
    setStage("sealing");
    send(sealed, shot);
  };
  // the post goes out while the seal animation plays
  const send = async (l: Letter, shot: string) => {
    setPost({ state: "sending" });
    const p = await postLetter(l, shot);
    setPost(p);
    saveToOutbox({ ...l, ...(p.state === "scheduled" ? { id: p.id } : {}) });
  };
  const again = () => {
    setLetter((l) => ({ ...blankLetter(), from: l.from }));
    machine.col = 0; machine.line = 0; machine.ejectAt = -1;
    setStage("intro");
  };
  const toggleSound = () => { const on = !sound; setSound(on); setEnabled(on); if (on) void unlock(); };

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app stage-${stage}`}>
        <div className="scene"><Scene stage={stage} page={page} /></div>
        <div className="veil" aria-hidden />
        <AnimatePresence mode="wait">
          {stage === "intro" && <Compose key="intro" letter={letter} onChange={setLetter} onBegin={begin} />}
          {stage === "typing" && <Typing key="typing" letter={letter} text={letter.text} setText={(text) => setLetter((l) => ({ ...l, text }))} onSeal={seal} />}
          {stage === "sealing" && (!demo || image) && <Seal key="sealing" letter={letter} image={image} onDone={() => setStage("sent")} />}
          {stage === "sent" && <Sent key="sent" letter={letter} post={post} onRetry={() => send(letter, image)} onAgain={again} />}
        </AnimatePresence>
        <button className="sound" data-cuelume-toggle aria-pressed={sound} onClick={toggleSound}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            {sound ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /> : <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
          </svg>
          {sound ? "Sound on" : "Sound off"}
        </button>
        <div className="grain" aria-hidden />
      </div>
    </MotionConfig>
  );
}
