import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { play } from "cuelume";
import { DatePicker, TimePicker } from "./Pickers";
import { Stamp, CupidStampArt, HourglassStampArt, Postmark } from "./Postal";
import { type Letter, yearsFromNow, iso, longDate, deliverAt, clock, soonest, fullDate } from "./letter";

type Pick = "hour" | 1 | 5 | 10 | "date";
const SPANS: [Pick, string][] = [["hour", "In an hour"], [1, "1 year"], [5, "5 years"], [10, "10 years"]];
const MIN_LEAD = 5; // minutes; anything sooner is not really a letter for later

export default function Compose({ letter, onChange, onBegin }: { letter: Letter; onChange: (l: Letter) => void; onBegin: () => void }) {
  const [tried, setTried] = useState(false);
  const [pick, setPick] = useState<Pick>(() => ([1, 5, 10] as const).find((n) => yearsFromNow(n) === letter.deliver) ?? "date");
  const set = (p: Partial<Letter>) => onChange({ ...letter, ...p });
  const self = letter.kind === "self";
  const today = iso(new Date());
  // on today's date only times a few minutes ahead are offered
  const earliest = letter.deliver === today ? soonest(MIN_LEAD).deliverTime : undefined;

  const choose = (p: Pick) => {
    setPick(p);
    if (p === "hour") set(soonest(60));
    else if (typeof p === "number") set({ deliver: yearsFromNow(p) });
  };
  const chooseDate = (deliver: string) => {
    setPick("date");
    const next = { ...letter, deliver };
    // picking today with a time that has already gone moves the time to the next free slot
    if (deliverAt(next).getTime() < Date.now() + MIN_LEAD * 60_000) next.deliverTime = soonest(MIN_LEAD + 10).deliverTime;
    onChange(next);
  };

  const errors = {
    to: !self && !letter.to.trim() ? "Add the name of the person it's for." : "",
    email: !/^\S+@\S+\.\S+$/.test(letter.email) ? "Add an email address the letter can reach." : "",
    from: !letter.from.trim() ? "Sign it with your name." : "",
    deliver: deliverAt(letter).getTime() < Date.now() + MIN_LEAD * 60_000 ? "That time has passed. Pick a moment at least five minutes from now." : "",
  };
  const ok = !Object.values(errors).some(Boolean);

  const begin = () => {
    setTried(true);
    if (!ok) return play("error", { emphasis: "subtle" });
    onBegin();
  };

  return (
    <motion.div className="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30, transition: { duration: 0.5 } }}>
      <header className="compose-head">
        <h1>Write to the future.</h1>
        <p className="lede">Address it, type it on the machine, and we keep it sealed until the moment you choose.</p>
      </header>

      <motion.form className="compose-form" onSubmit={(e) => { e.preventDefault(); begin(); }} noValidate
        initial={{ y: 40, rotate: -3, opacity: 0 }} animate={{ y: 0, rotate: -1.2, opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}>
        <div className="postcard"><div className="postcard-inner">
          <div className="pc-left">
            <p className="pc-title">Postcard to the future</p>

            <label className="rule">
              <span className="caps">To</span>
              {self
                ? <span className="pc-fixed">Future me</span>
                : <input data-cuelume-type value={letter.to} onChange={(e) => set({ to: e.target.value })} placeholder="their name" aria-invalid={tried && !!errors.to} maxLength={28} />}
            </label>
            <label className="rule">
              <span className="caps">{self ? "My email" : "Their email"}</span>
              <input data-cuelume-type type="email" inputMode="email" autoComplete={self ? "email" : "off"} value={letter.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" aria-invalid={tried && !!errors.email} />
            </label>
            <label className="rule">
              <span className="caps">From</span>
              <input data-cuelume-type value={letter.from} onChange={(e) => set({ from: e.target.value })} placeholder="your name" aria-invalid={tried && !!errors.from} maxLength={28} />
            </label>
            <div className="rule rule-dates" role="group" aria-label="When it opens">
              <span className="caps">Opens</span>
              <div className="spans">
                {SPANS.map(([p, label]) => (
                  <button key={label} type="button" data-cuelume-select className="span" aria-pressed={pick === p} onClick={() => choose(p)}>{label}</button>
                ))}
                <DatePicker value={letter.deliver} min={today} on={pick === "date"} onChange={chooseDate} label={pick === "date" ? longDate(letter.deliver) : "On a date"} />
              </div>
            </div>
            <div className="rule rule-time" role="group" aria-label="Delivery time">
              <span className="caps">At</span>
              <span className="time-field">
                <TimePicker value={letter.deliverTime} min={earliest} onChange={(deliverTime) => set({ deliverTime })} label={clock(letter.deliverTime)} />
                <span className="caps small time-zone">your time</span>
              </span>
            </div>
            {tried && !ok && <p className="pc-error" role="alert">{Object.values(errors).find(Boolean)}</p>}
          </div>

          <div className="pc-divider" aria-hidden />

          <div className="pc-right">
            <div className="stamps" role="radiogroup" aria-label="Who is this letter for?">
              {([["loved", "Someone I love"], ["self", "My future self"]] as const).map(([kind, label]) => (
                <button key={kind} type="button" role="radio" aria-checked={letter.kind === kind} data-cuelume-select className="stamp-pick" onClick={() => set({ kind })}>
                  <Stamp tone={kind === "self" ? "#e8eedf" : "#f6e6da"}>
                    {kind === "self" ? <HourglassStampArt /> : <CupidStampArt />}
                  </Stamp>
                  <span className="caps small">{label}</span>
                </button>
              ))}
            </div>
            {/* posted today, so the postmark carries today's date */}
            <Postmark id="compose" date={longDate(today)} waves={false} style={{ color: "#2e3a7a" }} />

            {/* the address side of the card, filled in as the writer goes */}
            <div className="pc-address" aria-live="polite">
              <p className="addr-to">{self ? "Future me" : letter.to.trim() || <span className="addr-empty">their name</span>}</p>
              <p className="addr-line">{letter.email.trim() || <span className="addr-empty">their email</span>}</p>
              <AnimatePresence mode="wait">
                <motion.p key={letter.deliver + letter.deliverTime} className="addr-line addr-when"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                  Opens {fullDate(letter.deliver)}, {clock(letter.deliverTime)}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div></div>
        <button type="submit" data-cuelume-tap data-cuelume-emphasis="strong" className="cta">
          Roll in the paper <span aria-hidden>→</span>
        </button>
      </motion.form>
    </motion.div>
  );
}
