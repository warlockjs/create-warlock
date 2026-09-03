import { HomeLogo } from "./logo";

export function HomeFooter() {
  return (
    <>
      <section className="warlock-cta">
        <div className="warlock-cta-mark" aria-hidden="true">
          W
        </div>
        <p className="warlock-overline">Your next system starts here</p>
        <h2>Build something formidable.</h2>
        <p>Scaffold a typed Warlock application and make the first request in minutes.</p>
        <div className="warlock-command">
          <code>npm create warlock@latest</code>
          <span>Ready when you are</span>
        </div>
      </section>
      <footer className="warlock-footer">
        <div className="warlock-brand">
          <HomeLogo />
        </div>
        <p>Backend, web, and AI on the same typed primitives.</p>
        <div>
          <a href="https://warlock.js.org" target="_blank" rel="noreferrer">
            Documentation
          </a>
          <a href="https://github.com/warlockjs" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span>MIT © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </>
  );
}
