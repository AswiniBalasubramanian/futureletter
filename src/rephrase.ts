// Rephrasing a letter in another tone. First choice is Chrome's built-in AI (Gemini Nano, on device,
// no key): the Prompt API for any tone, or the Rewriter API where only that is enabled. If the browser
// has neither, the server rewrites it with Claude when it has an Anthropic key.

export type Tone = { id: string; label: string; ask: string };

export const TONES: Tone[] = [
  { id: "poetic", label: "Poetic", ask: "lyrical and poetic, with gentle imagery, rhythm and metaphor, but no forced rhyme" },
  { id: "romantic", label: "Romantic", ask: "tender and romantic, warm and intimate" },
  { id: "heartfelt", label: "Heartfelt", ask: "sincere and heartfelt, with simple, honest feeling" },
  { id: "playful", label: "Playful", ask: "light, playful and affectionate, with a little wit" },
  { id: "formal", label: "Formal", ask: "graceful and formal, like a letter from another century" },
  { id: "simple", label: "Simpler", ask: "simpler and clearer, in short, plain sentences" },
];

export class RephraseError extends Error {}

type Session = { prompt(input: string): Promise<string>; destroy?(): void };
type LanguageModelAPI = {
  availability(): Promise<string>;
  create(o: { initialPrompts?: { role: "system" | "user" | "assistant"; content: string }[]; monitor?(m: { addEventListener(t: "downloadprogress", f: (e: { loaded: number }) => void): void }): void }): Promise<Session>;
};
type RewriterAPI = {
  availability(): Promise<string>;
  create(o: { tone?: string; format?: string; length?: string; sharedContext?: string }): Promise<{ rewrite(text: string, o?: { context?: string }): Promise<string>; destroy?(): void }>;
};
const lm = () => (globalThis as unknown as { LanguageModel?: LanguageModelAPI }).LanguageModel;
const rw = () => (globalThis as unknown as { Rewriter?: RewriterAPI }).Rewriter;

const within = <T,>(p: Promise<T>, ms: number, message: string) =>
  Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new RephraseError(message)), ms))]);

const SYSTEM = `You rewrite passages from personal letters, written by someone to a person they love, to be opened years from now.
Keep the meaning, the names and the language the passage is written in. Keep every line break where it is.
Reply with the rewritten passage only: no title, no notes, no quotation marks.`;

/** Strips the wrapping some models add around an answer. */
const clean = (s: string) => s.trim().replace(/^```\w*\n?|```$/g, "").replace(/^["“](.*)["”]$/s, "$1").trim();

async function viaPromptAPI(api: LanguageModelAPI, text: string, tone: Tone, onProgress?: (p: number) => void) {
  const state = await within(api.availability(), 8000, "Chrome's built-in AI isn't responding in this browser.");
  if (state === "unavailable") throw new RephraseError("Chrome's built-in AI isn't available on this device.");
  const session = await within(api.create({
    initialPrompts: [{ role: "system", content: SYSTEM }],
    monitor: (m) => m.addEventListener("downloadprogress", (e) => onProgress?.(e.loaded)),
  }), 300000, "Chrome's AI model is still downloading. Try again in a few minutes.");
  try {
    return clean(await within(session.prompt(`Rewrite this to be ${tone.ask}:\n\n${text}`), 90000, "Rephrasing took too long. Try a shorter passage."));
  } finally {
    session.destroy?.();
  }
}

async function viaRewriter(api: RewriterAPI, text: string, tone: Tone) {
  const state = await within(api.availability(), 8000, "Chrome's built-in AI isn't responding in this browser.");
  if (state === "unavailable") throw new RephraseError("Chrome's built-in AI isn't available on this device.");
  const writer = await within(api.create({
    tone: tone.id === "formal" ? "more-formal" : tone.id === "playful" || tone.id === "simple" ? "more-casual" : "as-is",
    format: "plain-text", length: "as-is",
    sharedContext: "A personal letter to someone the writer loves, to be opened years from now.",
  }), 300000, "Chrome's AI model is still downloading. Try again in a few minutes.");
  try {
    return clean(await within(writer.rewrite(text, { context: `Make it ${tone.ask}. Keep the line breaks.` }), 90000, "Rephrasing took too long. Try a shorter passage."));
  } finally {
    writer.destroy?.();
  }
}

/** Rewrites `text` in `tone`, on the device when Chrome allows it, otherwise through the server. */
export async function rephrase(text: string, tone: Tone, onProgress?: (p: number) => void): Promise<string> {
  let why = "This browser has no built-in AI for rephrasing.";
  for (const attempt of [() => lm() && viaPromptAPI(lm()!, text, tone, onProgress), () => rw() && viaRewriter(rw()!, text, tone)]) {
    try {
      const out = await attempt();
      if (out) return out;
    } catch (err) {
      why = err instanceof RephraseError ? err.message : "Chrome's built-in AI couldn't rephrase this.";
    }
  }
  const res = await fetch("/api/rephrase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, tone: tone.id }) });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.text) return body.text as string;
  throw new RephraseError(res.status === 503
    ? `${why} Turn on Chrome's built-in AI (chrome://flags, "Prompt API for Gemini Nano") or add an Anthropic key to the server.`
    : body.error ?? "The rephraser didn't answer. Try again.");
}
