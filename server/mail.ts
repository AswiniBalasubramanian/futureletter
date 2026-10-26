import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  inline?: { cid: string; filename: string; content: Buffer; type: string };
};

const FROM = process.env.MAIL_FROM ?? "Future Love Letter <letters@example.com>";

/** Which way mail leaves: Resend's API, any SMTP server, or files on disk for local testing. */
export const transport: "resend" | "smtp" | "files" =
  process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_URL ? "smtp" : "files";

const smtp = transport === "smtp" ? nodemailer.createTransport(process.env.SMTP_URL) : null;

export async function send(mail: Mail): Promise<void> {
  if (transport === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        reply_to: mail.replyTo,
        attachments: mail.inline && [{ filename: mail.inline.filename, content: mail.inline.content.toString("base64"), content_id: mail.inline.cid, content_type: mail.inline.type }],
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }
  if (smtp) {
    await smtp.sendMail({
      from: FROM, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: mail.replyTo,
      attachments: mail.inline && [{ cid: mail.inline.cid, filename: mail.inline.filename, content: mail.inline.content, contentType: mail.inline.type }],
    });
    return;
  }
  // no provider configured: write a real .eml you can open in any mail app
  const dir = process.env.MAIL_DIR ?? "data/mail";
  mkdirSync(dir, { recursive: true });
  const raw = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const info = await raw.sendMail({
    from: FROM, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: mail.replyTo,
    attachments: mail.inline && [{ cid: mail.inline.cid, filename: mail.inline.filename, content: mail.inline.content, contentType: mail.inline.type }],
  });
  const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${mail.to.replace(/[^a-z0-9@.]/gi, "_")}.eml`);
  writeFileSync(file, info.message as Buffer);
  console.log(`[mail] no provider configured, wrote ${file}`);
}
