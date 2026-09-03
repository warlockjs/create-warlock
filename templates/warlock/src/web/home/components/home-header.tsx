import { HomeLogo } from "./logo";

export function HomeHeader() {
  return (
    <header className="warlock-nav">
      <a className="warlock-brand" href="/" aria-label="Warlock.js home">
        <HomeLogo showVersion />
      </a>
      <nav className="warlock-nav-links" aria-label="Primary navigation">
        <a href="#features">Features</a>
        <a href="#packages">Packages</a>
        <a href="https://warlock.js.org/v/latest/core/" target="_blank" rel="noreferrer">
          Docs
        </a>
      </nav>
      <a
        className="warlock-nav-cta"
        href="https://github.com/warlockjs"
        target="_blank"
        rel="noreferrer"
      >
        View on GitHub <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}
