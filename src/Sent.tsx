import { motion } from "motion/react";
import { Stamp, CupidStampArt, HourglassStampArt, Postmark, WaxSeal, CupidFigure } from "./Postal";
import { type Letter, type Post, longDate, opensAt } from "./letter";

export default function Sent({ letter, post, onRetry, onAgain }: { letter: Letter; post: Post; onRetry: () => void; onAgain: () => void }) {
  const self = letter.kind === "self";
  const rows: [string, string][] = [
    ["Status", post.state === "scheduled" ? "Scheduled" : post.state === "error" ? "Not posted" : "Posting…"],
    ["To", self ? "Future me" : letter.to],
    ["Address", letter.email],
    ["Opens on", opensAt(letter)],
    ["Sealed on", longDate(letter.sealedAt!)],
    ["Carried by", "Cupid, by hand"],
  ];
  return (
    <motion.div className="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="postcard sent-card" initial={{ y: 80, rotate: 4, opacity: 0 }} animate={{ y: 0, rotate: 1.2, opacity: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
        <div className="sent-seal"><WaxSeal size={84} flowers={false} tone="red" /></div>
        <div className="postcard-inner">
          <div className="pc-left">
            <p className="caps small">Postcard from</p>
            <p className="pc-title">The Present</p>
            {rows.map(([k, v]) => (
              <p key={k} className="rule rule-read"><span className="caps">{k}</span><span className="typed">{v}</span></p>
            ))}
          </div>
          <div className="pc-divider" aria-hidden />
          <div className="pc-right">
            <div className="sent-stamp">
              <Stamp tone={self ? "#e8eedf" : "#f6e6da"}>{self ? <HourglassStampArt /> : <CupidStampArt />}</Stamp>
              <Postmark id="sent" date={longDate(letter.sealedAt!)} style={{ color: "#2e3a7a" }} />
            </div>
            <p className="sent-msg script">
              Your letter is on its way. Cupid will keep it safe until {longDate(letter.deliver)}.
            </p>
            <svg className="sent-cupid" viewBox="0 0 220 170" aria-hidden><CupidFigure fill="#7c1d24" detail="#f3e7cf" flapping /></svg>
          </div>
        </div>
      </motion.div>
      <motion.div className="sent-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <h2>{post.state === "error" ? "Sealed, but not yet posted." : "Sealed, stamped & sent."}</h2>
        <p className={`post-status caps small ${post.state}`} role="status">
          {post.state === "sending" && "Handing it to the post office…"}
          {post.state === "scheduled" && <>Scheduled · arrives at {letter.email} on {opensAt(letter)}, your time</>}
          {post.state === "error" && <>{post.message} <button className="retry" data-cuelume-tap onClick={onRetry}>Try again</button></>}
        </p>
        <button className="cta" data-cuelume-tap onClick={onAgain}>Write another letter</button>
      </motion.div>
    </motion.div>
  );
}
