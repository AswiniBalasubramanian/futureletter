import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { iso, clock } from "./letter";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** A chip that opens a small paper popover; closes on outside click or Escape. */
function Popover({ label, on, children, ariaLabel }: { label: ReactNode; on: boolean; children: (close: () => void) => ReactNode; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // the postcard clips its perforated edge, so the panel lives on <body> beside the chip
  const toggle = () => {
    const r = box.current!.getBoundingClientRect();
    const below = innerHeight - r.bottom;
    setAt(below > 400 || below > r.top ? { left: Math.min(r.left, innerWidth - 320), top: r.bottom + 8 } : { left: Math.min(r.left, innerWidth - 320), bottom: innerHeight - r.top + 8 });
    setOpen(!open);
  };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("pointerdown", away);
    addEventListener("keydown", esc);
    return () => { removeEventListener("pointerdown", away); removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="pop" ref={box}>
      <button type="button" className={`span ${on ? "on" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel} data-cuelume-open onClick={toggle}>{label}</button>
      {createPortal(<AnimatePresence>
        {open && (
          <motion.div ref={panel} className="pop-panel" role="dialog" aria-label={ariaLabel} style={{ position: "fixed", left: Math.max(8, at.left), top: at.top, bottom: at.bottom }}
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}

/** Ledger-style month grid. Days before `min` are struck out; the chosen day is stamped. */
export function DatePicker({ value, min, onChange, label, on }: { value: string; min: string; onChange: (v: string) => void; label: ReactNode; on: boolean }) {
  const [y0, m0] = value.split("-").map(Number);
  const [view, setView] = useState({ y: y0, m: m0 - 1 });
  useEffect(() => { setView({ y: y0, m: m0 - 1 }); }, [y0, m0]);
  const shift = (months: number) => setView(({ y, m }) => { const t = y * 12 + m + months; return { y: Math.floor(t / 12), m: t % 12 }; });
  const first = new Date(view.y, view.m, 1).getDay();
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const today = iso(new Date());
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const minMonth = Number(min.slice(0, 4)) * 12 + Number(min.slice(5, 7)) - 1;
  const atMin = view.y * 12 + view.m <= minMonth;

  return (
    <Popover label={label} on={on} ariaLabel="Pick a delivery date">
      {(close) => (
        <div className="cal">
          <div className="cal-head">
            <button type="button" className="cal-nav" onClick={() => shift(-12)} disabled={view.y * 12 + view.m - 12 < minMonth} aria-label="Previous year">«</button>
            <button type="button" className="cal-nav" onClick={() => shift(-1)} disabled={atMin} aria-label="Previous month">‹</button>
            <p className="cal-title"><span>{MONTHS[view.m]}</span> {view.y}</p>
            <button type="button" className="cal-nav" onClick={() => shift(1)} aria-label="Next month">›</button>
            <button type="button" className="cal-nav" onClick={() => shift(12)} aria-label="Next year">»</button>
          </div>
          <div className="cal-grid" role="grid">
            {DAYS.map((d) => <span key={d} className="cal-dow" role="columnheader">{d}</span>)}
            {cells.map((d, i) => {
              if (d === null) return <span key={"e" + i} />;
              const day = iso(new Date(view.y, view.m, d));
              const off = day < min;
              return (
                <button key={day} type="button" role="gridcell" className={`cal-day ${day === value ? "sel" : ""} ${day === today ? "today" : ""}`}
                  disabled={off} aria-selected={day === value} aria-label={new Date(view.y, view.m, d).toDateString()} data-cuelume-select
                  onClick={() => { onChange(day); close(); }}>
                  {d}
                </button>
              );
            })}
          </div>
          <div className="cal-foot">
            {[["In a month", 1], ["In 25 years", 300], ["In 50 years", 600]].map(([l, n]) => (
              <button key={l} type="button" className="cal-quick" data-cuelume-tap onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + (n as number)); onChange(iso(d)); close(); }}>{l}</button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}

/** Hour and minute chips with an am/pm switch, in the writer's own time. */
export function TimePicker({ value, min, onChange, label }: { value: string; min?: string; onChange: (v: string) => void; label: ReactNode }) {
  const [h, m] = value.split(":").map(Number);
  const pm = h >= 12;
  // `min` (HH:MM) is set when the letter opens today: earlier slots are struck out
  const floor = min ? Number(min.slice(0, 2)) * 60 + Number(min.slice(3)) : -1;
  const ok = (hh: number, mm: number) => hh * 60 + mm >= floor;
  const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
  const set = (hh: number, mm: number) => {
    // keep the minute if it still fits this hour, otherwise take the first free one
    const fit = ok(hh, mm) ? mm : MINUTES.find((x) => ok(hh, x)) ?? mm;
    onChange(`${String(hh).padStart(2, "0")}:${String(fit).padStart(2, "0")}`);
  };
  const h12 = h % 12 || 12;
  const to24 = (n: number, isPm: boolean) => (n % 12) + (isPm ? 12 : 0);
  return (
    <Popover label={label} on ariaLabel="Pick a delivery time">
      {() => (
        <div className="clock">
          <div className="clock-ampm" role="radiogroup" aria-label="Morning or evening">
            {(["am", "pm"] as const).map((p) => {
              const isPm = p === "pm";
              return (
                <button key={p} type="button" role="radio" aria-checked={isPm === pm} className={`clock-chip ${isPm === pm ? "sel" : ""}`} data-cuelume-toggle
                  disabled={!isPm && floor > 11 * 60 + 55}
                  onClick={() => { const first = Array.from({ length: 12 }, (_, i) => i).find((x) => ok(x + (isPm ? 12 : 0), 55)) ?? 0; set(ok(to24(h12, isPm), 55) ? to24(h12, isPm) : first + (isPm ? 12 : 0), m); }}>
                  {p}
                </button>
              );
            })}
          </div>
          <p className="clock-label">Hour</p>
          <div className="clock-hours">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
              const hh = to24(n, pm);
              return <button key={n} type="button" className={`clock-chip ${n === h12 ? "sel" : ""}`} disabled={!ok(hh, 55)} data-cuelume-select onClick={() => set(hh, m)}>{n}</button>;
            })}
          </div>
          <p className="clock-label">Minute</p>
          <div className="clock-hours">
            {MINUTES.map((n) => (
              <button key={n} type="button" className={`clock-chip ${n === m ? "sel" : ""}`} disabled={!ok(h, n)} data-cuelume-select onClick={() => set(h, n)}>:{String(n).padStart(2, "0")}</button>
            ))}
          </div>
          {min && <p className="clock-note">Opens today, so times before {clock(min)} are not available.</p>}
        </div>
      )}
    </Popover>
  );
}
