// Translation in the browser with Chrome's built-in, on-device Translator API: no server, no key.
// Language packs download once per pair (with the writer's click), then work offline.

type Availability = "unavailable" | "downloadable" | "downloading" | "available";
type Monitor = { addEventListener(type: "downloadprogress", fn: (e: { loaded: number }) => void): void };
type Translator = { translate(text: string): Promise<string>; destroy?(): void };
type TranslatorAPI = {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(o: { sourceLanguage: string; targetLanguage: string; monitor?(m: Monitor): void; signal?: AbortSignal }): Promise<Translator>;
};

const api = () => (globalThis as unknown as { Translator?: TranslatorAPI }).Translator;

/** True when this browser ships the on-device translator at all (desktop Chrome 138 and later). */
export const hasOnDevice = () => !!api();

/** Any reason translation could not happen on this device, worded for the writer. */
export class OnDeviceError extends Error {}

const NAMES: Record<string, string> = { ta: "Tamil", hi: "Hindi", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese", te: "Telugu", ml: "Malayalam", kn: "Kannada", bn: "Bengali", mr: "Marathi", ur: "Urdu", ja: "Japanese", ko: "Korean", zh: "Chinese", ar: "Arabic", en: "English" };

/** Rejects with `message` unless `p` settles within `ms`. */
function within<T>(p: Promise<T>, ms: number, message: string) {
  return Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new OnDeviceError(message)), ms))]);
}

/**
 * Translates `text` from `from` into `to` on this device. Paragraphs are translated one by one so
 * blank lines, the salutation and the sign-off keep their places. `onProgress` gets 0..1 while a
 * language pack downloads.
 */
export async function translateOnDevice(text: string, from: string, to: string, onProgress?: (p: number) => void) {
  const T = api();
  const lang = NAMES[to] ?? to;
  if (!T) throw new OnDeviceError("This browser has no built-in translator.");
  const pair = { sourceLanguage: from, targetLanguage: to };

  let state: Availability;
  try {
    // some Chromium builds expose the API without the on-device models, and the call never settles
    state = await within(T.availability(pair), 8000, "Chrome's built-in translator isn't responding in this browser.");
  } catch (err) {
    throw err instanceof OnDeviceError ? err : new OnDeviceError("Chrome's built-in translator isn't available in this browser.");
  }
  if (state === "unavailable") throw new OnDeviceError(`Chrome can't translate into ${lang} on this device.`);

  // a language pack download must keep moving; if it stalls, give up rather than spin forever
  const abort = new AbortController();
  let lastProgress = Date.now();
  const watchdog = setInterval(() => { if (Date.now() - lastProgress > 20000) abort.abort(); }, 1000);
  let translator: Translator;
  try {
    translator = await T.create({
      ...pair,
      signal: abort.signal,
      monitor: (m) => m.addEventListener("downloadprogress", (e) => { lastProgress = Date.now(); onProgress?.(e.loaded); }),
    });
  } catch {
    throw new OnDeviceError(abort.signal.aborted
      ? `The ${lang} language pack stopped downloading. Check your connection and try again.`
      : `Chrome couldn't set up ${lang} translation on this device.`);
  } finally {
    clearInterval(watchdog);
  }

  // sentence by sentence: on-device models can return only the first sentence of a longer run,
  // or nothing at all; an empty answer keeps the writer's own words rather than losing them
  const sentences = new Intl.Segmenter(from, { granularity: "sentence" });
  let kept = 0;
  const one = async (s: string) => {
    const r = (await within(translator.translate(s.trim()), 20000, "Translation took too long. Try again.")).trim();
    if (!r) { kept++; return s.trim(); }
    return r;
  };
  try {
    const out: string[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) { out.push(line); continue; }
      const parts: string[] = [];
      for (const { segment } of sentences.segment(line)) if (segment.trim()) parts.push(await one(segment));
      out.push(parts.join(" "));
    }
    if (kept) console.warn(`[translate] kept ${kept} sentence(s) untranslated: the translator returned nothing for them`);
    return out.join("\n");
  } catch (err) {
    throw err instanceof OnDeviceError ? err : new OnDeviceError(`Chrome couldn't translate this letter into ${lang}.`);
  } finally {
    translator.destroy?.();
  }
}
