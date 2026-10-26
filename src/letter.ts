export type Letter = {
  id?: string;
  kind: "self" | "loved";
  to: string;
  email: string;
  from: string;
  deliver: string; // yyyy-mm-dd
  deliverTime: string; // HH:MM, the writer's local time
  text: string;
  sealedAt?: string;
};

export const blankLetter = (): Letter => ({ kind: "loved", to: "", email: "", from: "", deliver: yearsFromNow(1), deliverTime: "09:00", text: "" });

export function yearsFromNow(n: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return iso(d);
}
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function longDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** The instant the letter opens, in the writer's time zone. */
export function deliverAt(l: Letter) {
  const [y, m, d] = l.deliver.split("-").map(Number);
  const [h, min] = (l.deliverTime || "09:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}
export const clock = (t: string) => {
  const [h, m] = (t || "09:00").split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
/** "26 October 2027 at 9:00 am" */
export const opensAt = (l: Letter) => `${longDate(l.deliver)} at ${clock(l.deliverTime)}`;

export const salutation = (l: Letter) => (l.kind === "self" ? "Dear future me," : `Dear ${l.to.trim()},`);

/** Keeps sealed letters in this browser until a mail service delivers them. */
export function saveToOutbox(l: Letter) {
  try {
    const box = JSON.parse(localStorage.getItem("fll-outbox") ?? "[]");
    box.push(l);
    localStorage.setItem("fll-outbox", JSON.stringify(box));
  } catch { /* storage blocked: the letter still finishes its journey on screen */ }
}

export type Post = { state: "sending" } | { state: "scheduled"; id: string } | { state: "error"; message: string };

/** Hands the sealed letter to the post office, due at the chosen moment in the writer's time zone. */
export async function postLetter(l: Letter, image: string): Promise<Post> {
  try {
    const res = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: l.kind, to: l.to, email: l.email, from: l.from, text: l.text, deliver: l.deliver, deliverAt: deliverAt(l).toISOString(), deliverLabel: opensAt(l), image }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { state: "error", message: body.error ?? "The post office didn't answer." };
    return { state: "scheduled", id: body.id };
  } catch {
    return { state: "error", message: "Couldn't reach the post office. Check your connection." };
  }
}

/** The earliest delivery moment `minutes` from now, rounded up to the next five minutes. */
export function soonest(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  return { deliver: iso(d), deliverTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
}

/** "Tuesday, 26 October 2027" */
export function fullDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
