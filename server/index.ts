import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { insertLetter, getLetter, recentFromIp, db } from "./db.ts";
import { transport } from "./mail.ts";
import { startScheduler, tick } from "./scheduler.ts";
import { translate, rephrase, TranslateError, LANGUAGES } from "./translate.ts";

const PORT = Number(process.env.PORT ?? 8787);
const DEV_DELIVER = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_DELIVER === "1";
const MAX_BODY = 3_000_000;
const PER_HOUR = Number(process.env.LETTERS_PER_HOUR ?? 10);
const DIST = "dist";
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

async function readBody(req: IncomingMessage) {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Letter too large"), { status: 413 });
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const ip = (req: IncomingMessage) => (process.env.TRUST_PROXY ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "") || req.socket.remoteAddress || "?";
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Checks a sealed letter and turns it into a row, or says what is wrong with it. */
function validate(b: Record<string, unknown>) {
  const kind = b.kind === "self" ? "self" : b.kind === "loved" ? "loved" : null;
  const email = str(b.email, 254);
  const to = str(b.to, 40);
  const from = str(b.from, 40);
  const text = typeof b.text === "string" ? b.text.slice(0, 4000) : "";
  const deliverOn = str(b.deliver, 10);
  const deliverAt = Date.parse(str(b.deliverAt, 40));
  const image = typeof b.image === "string" && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(b.image) && b.image.length < 2_800_000 ? b.image : null;
  if (!kind) return "Choose who the letter is for.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That email address doesn't look right.";
  if (kind === "loved" && !to) return "Add the name of the person it's for.";
  if (!from) return "Sign the letter with your name.";
  if (text.trim().length < 2) return "The letter is empty.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliverOn) || Number.isNaN(deliverAt)) return "Pick a delivery date.";
  if (deliverAt < Date.now() + 2 * 60_000) return "The delivery time has to be in the future.";
  if (deliverAt > Date.now() + 100 * 365 * 86_400_000) return "That's further than we can promise to keep it.";
  return { kind, email, to_name: kind === "self" ? "Future me" : to, from_name: from, text, image, deliver_on: deliverOn, deliver_at: new Date(deliverAt).toISOString(), deliver_label: str(b.deliverLabel, 60) || null } as const;
}

function serveStatic(req: IncomingMessage, res: ServerResponse) {
  if (!existsSync(DIST)) return false;
  const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0])).replace(/^([/\\])+/, "");
  let file = join(DIST, path);
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  try {
    if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, transport });

    if (req.method === "POST" && url.pathname === "/api/letters") {
      const who = ip(req);
      if (recentFromIp(who, new Date(Date.now() - 3_600_000).toISOString()) >= PER_HOUR) return json(res, 429, { error: "That's a lot of letters for one hour. Try again a little later." });
      const v = validate(await readBody(req));
      if (typeof v === "string") return json(res, 400, { error: v });
      const id = randomUUID();
      insertLetter({ id, ...v, sealed_at: new Date().toISOString(), created_ip: who });
      return json(res, 201, { id, status: "scheduled", deliverAt: v.deliver_at });
    }

    if (req.method === "GET" && url.pathname === "/api/languages") return json(res, 200, LANGUAGES);
    if (req.method === "POST" && url.pathname === "/api/translate") {
      const b = await readBody(req);
      try {
        return json(res, 200, { text: await translate(typeof b.text === "string" ? b.text.slice(0, 4000) : "", String(b.lang ?? "")) });
      } catch (err) {
        if (err instanceof TranslateError) return json(res, err.status, { error: err.message });
        throw err;
      }
    }

    if (req.method === "POST" && url.pathname === "/api/rephrase") {
      const b = await readBody(req);
      try {
        return json(res, 200, { text: await rephrase(typeof b.text === "string" ? b.text.slice(0, 4000) : "", String(b.tone ?? "")) });
      } catch (err) {
        if (err instanceof TranslateError) return json(res, err.status, { error: err.message });
        throw err;
      }
    }

    const one = url.pathname.match(/^\/api\/letters\/([0-9a-f-]{36})$/);
    if (req.method === "GET" && one) {
      const l = getLetter(one[1]);
      return l ? json(res, 200, { id: l.id, status: l.status, deliverOn: l.deliver_on, sentAt: l.sent_at }) : json(res, 404, { error: "No such letter." });
    }

    // local testing only: make a letter due now and run the post round
    const now = url.pathname.match(/^\/api\/dev\/deliver\/([0-9a-f-]{36})$/);
    if (req.method === "POST" && now && DEV_DELIVER) {
      db.prepare("UPDATE letters SET deliver_at = ?, next_try_at = NULL WHERE id = ? AND status = 'scheduled'").run(new Date().toISOString(), now[1]);
      const sent = await tick();
      return json(res, 200, { sent, letter: getLetter(now[1])?.status });
    }

    if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "Not found." });
    if (req.method === "GET" && serveStatic(req, res)) return;
    json(res, 404, { error: "Not found." });
  } catch (err) {
    const status = (err as { status?: number }).status ?? (err instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error(err);
    json(res, status, { error: status === 500 ? "The post office hit a snag." : (err as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`[post] listening on http://localhost:${PORT} · mail via ${transport}${transport === "files" ? " (data/mail/*.eml)" : ""}`);
  startScheduler();
});
