import { useEffect, type ReactNode } from "react";
import { go } from "./router";
import { WaxSeal } from "./Postal";
import "./landing/landing.css";

function Paper({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => { document.title = `${title} · Future Love Letter`; document.documentElement.classList.remove("app-mode"); }, [title]);
  return (
    <main className="lp lp-page">
      <article className="lp-paper">
        <a href="/" className="lp-back" onClick={(e) => { e.preventDefault(); go("/"); }}>← Back to Future Love Letter</a>
        <h1>{title}</h1>
        {children}
      </article>
    </main>
  );
}

export function Privacy() {
  return (
    <Paper title="Privacy">
      <p>We keep what a letter needs to arrive and nothing more: the recipient's name and email, your name, the letter's text, an image of the typed page, and the date and time it should open.</p>
      <p>Letters are stored on our server until delivery. Once a letter is delivered, its page image is deleted. We do not read letters, sell data, or use letters to train anything.</p>
      <p>If you translate a letter, its text is sent to our translation provider for that request only.</p>
      <p>To ask us to delete a scheduled letter, write to <a href="mailto:privacy@futureloveletter.app">privacy@futureloveletter.app</a> with the recipient's address and the delivery date.</p>
    </Paper>
  );
}

export function Terms() {
  return (
    <Paper title="Terms">
      <p>Write only to people who would want to hear from you. Letters that harass, threaten or advertise are removed and not delivered.</p>
      <p>We deliver at the date and time you choose, in your time zone. Email can be delayed or filtered by the receiving service, and we cannot control what happens after a letter leaves us.</p>
      <p>You keep the rights to everything you write. You give us permission to store and send it on your behalf, and nothing else.</p>
    </Paper>
  );
}

export function NotFound() {
  return (
    <Paper title="This page was never posted">
      <div className="lp-404-seal"><WaxSeal size={90} flowers={false} tone="red" /></div>
      <p>The address you followed does not lead anywhere. It may have been mistyped, or the page has moved.</p>
      <p><a href="/" onClick={(e) => { e.preventDefault(); go("/"); }}>Return to the front page</a></p>
    </Paper>
  );
}
