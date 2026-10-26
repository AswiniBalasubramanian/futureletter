import type { LetterRow } from "./db.ts";
import type { Mail } from "./mail.ts";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function longDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function yearsAgo(iso: string) {
  const days = (Date.now() - Date.parse(iso)) / 86_400_000;
  if (days < 45) return "a little while ago";
  if (days < 330) return `${Math.round(days / 30)} months ago`;
  const y = Math.round(days / 365);
  return y === 1 ? "a year ago" : `${y} years ago`;
}

/** The delivered letter: an envelope-red band, the typed page, and the text as a fallback. */
export function letterMail(l: LetterRow): Mail {
  const self = l.kind === "self";
  const sealed = longDate(l.sealed_at);
  const subject = self ? `A letter from your past self, sealed ${yearsAgo(l.sealed_at)}` : `A letter from ${l.from_name}, sealed ${yearsAgo(l.sealed_at)}`;
  const image = l.image?.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  const inline = image ? { cid: "letter-page", filename: "letter.jpg", content: Buffer.from(image[2], "base64"), type: image[1] } : undefined;
  const typewriter = `'Special Elite','Courier New',Courier,monospace`;
  const serif = `'Cormorant Garamond',Georgia,'Times New Roman',serif`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Pinyon+Script&display=swap" rel="stylesheet">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#1c0f09;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c0f09;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="background:#7a1624;padding:34px 36px 30px;border-radius:4px 4px 0 0;">
      <p style="margin:0;font-family:${typewriter};font-size:12px;letter-spacing:3px;color:#f1dcae;opacity:.75;text-transform:uppercase;">Not to be opened before ${esc(l.deliver_label ?? longDate(l.deliver_on))}</p>
      <p style="margin:14px 0 0;font-family:'Pinyon Script',${serif};font-size:44px;line-height:1.1;color:#f4dfb0;">${esc(self ? "Future me" : l.to_name)}</p>
      <p style="margin:12px 0 0;font-family:${serif};font-size:19px;font-style:italic;color:#f1dcae;">The day has come. ${self ? "You wrote this to yourself" : `${esc(l.from_name)} wrote this to you`} on ${esc(sealed)}, sealed it with wax, and asked us to keep it until today.</p>
    </td></tr>
    <tr><td style="background:#efe5d0;padding:28px;">
      ${inline ? `<img src="cid:${inline.cid}" width="544" alt="The typewritten letter" style="display:block;width:100%;height:auto;border:0;box-shadow:0 6px 18px rgba(60,30,10,.25);">` : ""}
      <div style="font-family:${typewriter};font-size:16px;line-height:1.7;color:#24170f;white-space:pre-wrap;padding:${inline ? "26px 6px 4px" : "4px 6px"};${inline ? "border-top:1px dashed #b59b74;margin-top:26px;" : ""}">${esc(l.text)}</div>
    </td></tr>
    <tr><td style="background:#e3d4b4;padding:18px 28px;border-radius:0 0 4px 4px;">
      <p style="margin:0;font-family:${typewriter};font-size:11px;letter-spacing:2px;color:#5b4633;text-transform:uppercase;">Sealed ${esc(sealed)} &nbsp;·&nbsp; Carried by Cupid &nbsp;·&nbsp; Future Love Letter</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = `${self ? "Dear future me" : `To ${l.to_name}`}\n\n${self ? "You wrote this to yourself" : `${l.from_name} wrote this to you`} on ${sealed} and asked us to keep it until today.\n\n----\n\n${l.text}\n\n----\nSealed ${sealed} · Future Love Letter`;
  return { to: l.email, subject, html, text, inline };
}
