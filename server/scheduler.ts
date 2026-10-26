import { dueLetters, markSent, markFailed } from "./db.ts";
import { send } from "./mail.ts";
import { letterMail } from "./template.ts";

const MAX_ATTEMPTS = 8;
let running = false;

/** Sends every letter whose day has come. Safe to call any time; overlapping runs are skipped. */
export async function tick() {
  if (running) return 0;
  running = true;
  let sent = 0;
  try {
    for (const l of dueLetters(new Date().toISOString())) {
      try {
        await send(letterMail(l));
        markSent(l.id);
        sent++;
        console.log(`[post] delivered ${l.id} to ${l.email}`);
      } catch (err) {
        const attempts = l.attempts + 1;
        markFailed(l.id, String(err), attempts, attempts >= MAX_ATTEMPTS);
        console.error(`[post] attempt ${attempts} for ${l.id} failed:`, err);
      }
    }
  } finally {
    running = false;
  }
  return sent;
}

export function startScheduler(everyMs = Number(process.env.TICK_MS ?? 60_000)) {
  tick();
  return setInterval(tick, everyMs);
}
