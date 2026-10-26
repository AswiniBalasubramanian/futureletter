import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NouveauCorner, Fleur, Rule } from "./ornaments";
import { Medallion, PressedBadge } from "./pressed";
import { RoseArch } from "./roseArch";
import { ogee } from "../pattern";

const LATTICE = ogee("#7a4f22", 0.1);
import { WaxSeal, Stamp, CupidStampArt, Postmark } from "../Postal";
import { go } from "../router";
import "./landing.css";

const Showcase = lazy(() => import("./Showcase"));
const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, className, delay = 0, as = "section", id }: { children: ReactNode; className?: string; delay?: number; as?: "section" | "div"; id?: string }) {
  const M = as === "section" ? motion.section : motion.div;
  return (
    <M id={id} className={className} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -12% 0px" }} transition={{ duration: 0.7, ease: EASE, delay }}>
      {children}
    </M>
  );
}

function Cta({ small = false }: { small?: boolean }) {
  return (
    <a href="/write" className={`lp-cta ${small ? "small" : ""}`} data-cuelume-tap data-cuelume-emphasis={small ? undefined : "strong"} onClick={(e) => { e.preventDefault(); go("/write"); }}>
      Write your first letter
    </a>
  );
}

const LINKS = [["#how", "How it works"], ["#letters", "Letters"], ["#faq", "Questions"]] as const;

function Nav() {
  const [open, setOpen] = useState(false);
  const [here, setHere] = useState("");
  useEffect(() => {
    // mark the section currently in view
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setHere("#" + e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    LINKS.forEach(([h]) => { const el = document.querySelector(h); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  return (
    <>
      <nav className="lp-nav" aria-label="Main">
        <a href="/" className="lp-brand" onClick={(e) => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }} aria-current="page">
          <span className="lp-brand-seal"><WaxSeal size={22} flowers={false} /></span>
          Future Love Letter
        </a>
        <ul className="lp-links">
          {LINKS.map(([h, l]) => <li key={h}><a href={h} aria-current={here === h ? "location" : undefined}>{l}</a></li>)}
        </ul>
        <Cta small />
        <button className={`lp-burger ${open ? "open" : ""}`} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} data-cuelume-toggle>
          <span /><span />
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div className="lp-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <ul>
              {[...LINKS, ["/write", "Write your first letter"] as const].map(([h, l], i) => (
                <motion.li key={h} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.4) }}>
                  <a href={h} onClick={(e) => { setOpen(false); if (h === "/write") { e.preventDefault(); go("/write"); } }}>{l}</a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Large type that lights up one word at a time as it scrolls past the reading line. */
function TaglineReveal({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const words = ref.current?.querySelectorAll<HTMLElement>(".w") ?? [];
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("lit"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -42% 0px" });
    words.forEach((w) => io.observe(w));
    return () => io.disconnect();
  }, []);
  return (
    <section className="lp-tagline" aria-label="What a letter is for">
      <p ref={ref}>
        {lines.map((line, li) => (
          <span key={li} className="line">{line.split(" ").map((w, wi) => <span key={wi} className="w">{w} </span>)}</span>
        ))}
      </p>
    </section>
  );
}

const BENEFITS = [
  { title: "Typed on a machine you can feel", body: "Every key you press strikes a typebar on a working 3D typewriter. The ink lands a little differently each time, the bell rings at the margin, and the carriage swings home on Return." },
  { title: "Sealed, never just saved", body: "Your page folds in thirds into a lined envelope and is pressed with a gold wax seal before the envelope is stamped and postmarked." },
  { title: "Arrives to the minute", body: "Pick a date up to a hundred years away and a time in your own time zone. Nothing is sent a minute sooner." },
  { title: "For you, or for someone you love", body: "Write to the person you are becoming, or to someone whose inbox you know by heart. Choose the hourglass stamp or the cupid." },
];

const STEPS = [
  { n: "I", title: "Address the postcard", body: "Choose who it is for, add their email, and pick the date and minute it should open." },
  { n: "II", title: "Type on the machine", body: "Use your real keyboard. The machine sets your salutation, then hands you the keys." },
  { n: "III", title: "Seal it and let go", body: "We fold it, seal it in wax, stamp it, and Cupid carries it to their inbox on the day." },
];

// sample testimonials for the prototype; replace with real ones before launch
const LETTERS = [
  { quote: "I opened a letter from myself on the morning I moved to Lisbon. I had forgotten how scared I was, and how sure.", name: "Inês Albergaria", place: "Lisbon", opened: "Opened 14 March 2026" },
  { quote: "My father wrote to me before his surgery and set it for my thirtieth birthday. It came at seven in the morning, like he used to call.", name: "Kofi Mensah", place: "Accra", opened: "Opened 2 August 2025" },
  { quote: "We wrote to each other on our first anniversary and set both letters for our tenth. I keep checking the date like a child.", name: "Priya Raghavan", place: "Chennai", opened: "Sealed 19 January 2026" },
];

const FAQ = [
  ["When will my letter arrive?", "At the exact date and time you choose, in your own time zone. If you pick 9:00 am on 26 October 2027, it lands at 9:00 am your time that morning."],
  ["How far ahead can I send it?", "Anywhere from a few minutes to a hundred years. Most writers choose one, five or ten years, or a date that already means something."],
  ["Can I write to myself?", "Yes. Choose the hourglass stamp and use your own email address. The letter arrives addressed to future you."],
  ["What does the recipient receive?", "An email with an image of your typed page, the full text beneath it, and the date you sealed it."],
  ["Can I speak instead of typing?", "Yes. Tap the microphone on the typing screen and the machine types what you say, key by key."],
  ["Can I write in another language?", "Yes. Write in English and translate the letter into Tamil, Hindi, French and other languages before you seal it."],
  ["Who can read my letter before it opens?", "Nobody reads it. It waits on our server until the moment you chose, and the page image is removed once it has been delivered."],
  ["What if the email address stops working?", "We try again eight times over the following days. If it still cannot be delivered, the letter is marked undelivered rather than lost silently."],
];

export default function Landing() {
  useEffect(() => {
    document.title = "Future Love Letter · Write it today, let it arrive when it matters";
    document.documentElement.classList.remove("app-mode");
  }, []);

  return (
    <div className="lp" style={{ ["--lattice" as string]: LATTICE }}>
      <a href="#main" className="lp-skip">Skip to content</a>
      <Nav />

      <main id="main">
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">Letters for later</p>
            <h1>Write it today.<br />Let it arrive<br />when it matters most.</h1>
            <p className="lp-sub">Type a letter on a vintage typewriter, seal it in gold wax, and choose the exact day and minute it reaches an inbox. Next spring, or fifty years from now.</p>
            <div className="lp-hero-actions">
              <Cta />
              <span className="lp-note">Free to write · no account needed</span>
            </div>
            <p className="lp-proof"><b>3,182 letters</b> sealed since spring, opened on birthdays, anniversaries and first mornings in new homes.</p>
          </div>
          <div className="lp-window">
            <div className="lp-window-glass">
              <Suspense fallback={<div className="showcase-skeleton" />}><Showcase /></Suspense>
            </div>
            <RoseArch />
          </div>
        </section>

        <Reveal className="lp-press" as="div">
          <span>As kept by readers of</span>
          <ul>{["The Paper Almanac", "Postmark Weekly", "Hearth & Ink", "The Slow Letter Review", "Atelier Journal"].map((n) => <li key={n}>{n}</li>)}</ul>
        </Reveal>

        <Reveal className="lp-problem">
          <div className="lp-problem-copy">
            <h2>A message is read in a second and lost in a scroll. A letter waits.</h2>
            <p>The things worth saying often need time before they can be heard: a promise to a newborn, a note to the version of you who finally made it, a thank you that only makes sense years later. Future Love Letter keeps those words sealed until the moment they belong to.</p>
          </div>
          <div className="lp-problem-art" aria-hidden>
            <div className="lp-mini-env">
              <div className="lp-mini-stamp"><Stamp><CupidStampArt /></Stamp></div>
              <Postmark id="lp" date="14 February 2031" style={{ color: "#1b1222" }} />
              <p className="script">for Mira</p>
              <p className="caps">Not to be opened before 14 February 2031</p>
              <div className="lp-mini-seal"><WaxSeal size={70} flowers={false} /></div>
            </div>
          </div>
        </Reveal>

        <section className="lp-benefits" aria-labelledby="benefits-h">
          <Reveal as="div" className="lp-head">
            <h2 id="benefits-h">Everything a handwritten letter gave us, delivered on time</h2>
          </Reveal>
          <div className="lp-cards">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} as="div" className="lp-card" delay={i * 0.08}>
                <span className="c tl"><NouveauCorner /></span><span className="c tr"><NouveauCorner /></span>
                <span className="c bl"><NouveauCorner /></span><span className="c br"><NouveauCorner /></span>
                <Fleur size={22} color="#6b7444" />
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <TaglineReveal lines={["Some words need a few years", "before they can be read."]} />

        <section id="how" className="lp-how" aria-labelledby="how-h">
          <Reveal as="div" className="lp-head">
            <p className="lp-eyebrow">How it works</p>
            <h2 id="how-h">Three steps, about four minutes</h2>
          </Reveal>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} as="div" className="lp-step" delay={i * 0.1}>
                <div className="lp-step-arch"><span>{s.n}</span><PressedBadge size={40} /></div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section id="letters" className="lp-letters" aria-labelledby="letters-h">
          <Reveal as="div" className="lp-head">
            <h2 id="letters-h">Opened on the mornings that mattered</h2>
          </Reveal>
          <div className="lp-quotes">
            {LETTERS.map((l, i) => (
              <Reveal key={l.name} as="div" className="lp-quote" delay={i * 0.08}>
                <figure>
                  <blockquote>{l.quote}</blockquote>
                  <figcaption><b>{l.name}</b><span>{l.place} · {l.opened}</span></figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="faq" className="lp-faq" aria-labelledby="faq-h">
          <Reveal as="div" className="lp-head">
            <h2 id="faq-h">Before you seal it</h2>
          </Reveal>
          <Reveal as="div" className="lp-faq-list">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary data-cuelume-toggle>{q}<span className="lp-plus" aria-hidden /></summary>
                <p>{a}</p>
              </details>
            ))}
          </Reveal>
        </section>

        <Reveal className="lp-final">
          <div className="lp-final-card">
            <span className="c tl"><NouveauCorner /></span><span className="c tr"><NouveauCorner /></span>
            <span className="c bl"><NouveauCorner /></span><span className="c br"><NouveauCorner /></span>
            <Medallion size={56} />
            <h2>Someone will open this on a morning you choose</h2>
            <p>Your first letter is free. No account, no card, just a name and an inbox.</p>
            <Cta />
            <Rule />
          </div>
        </Reveal>
      </main>

      <footer className="lp-footer">
        <span className="lp-brand"><span className="lp-brand-seal"><WaxSeal size={18} flowers={false} /></span>Future Love Letter</span>
        <nav aria-label="Legal">
          <a href="/privacy" onClick={(e) => { e.preventDefault(); go("/privacy"); }}>Privacy</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); go("/terms"); }}>Terms</a>
        </nav>
        <span>© 2026 Amor & Co.</span>
      </footer>
    </div>
  );
}
