import { RuntimePreview } from "./runtime-preview";
type HeroSectionProps = { statusMessage: string };
export function HeroSection({ statusMessage }: HeroSectionProps) {
  return (
    <>
      <section className="warlock-hero">
        <div className="warlock-orbit warlock-orbit-one" aria-hidden="true" />
        <div className="warlock-orbit warlock-orbit-two" aria-hidden="true" />
        <div className="warlock-hero-copy">
          <p className="warlock-kicker">
            <span className="warlock-kicker-dot" />
            AI-native TypeScript framework
          </p>
          <h1>
            Build with<span> uncommon power.</span>
          </h1>
          <p className="warlock-hero-lede">
            Production backends, server-rendered React, and intelligent agents—built on the same
            typed primitives, running in one deliberate architecture.
          </p>
          <div className="warlock-hero-actions">
            <a
              className="warlock-button warlock-button-primary"
              href="https://warlock.js.org/v/latest/core/getting-started/02-installation/"
              target="_blank"
              rel="noreferrer"
            >
              Start building <span aria-hidden="true">→</span>
            </a>
            <a
              className="warlock-button warlock-button-ghost"
              href="https://github.com/warlockjs"
              target="_blank"
              rel="noreferrer"
            >
              Explore the source
            </a>
          </div>
          <dl className="warlock-hero-stats">
            <div>
              <dt>28</dt>
              <dd>focused packages</dd>
            </div>
            <div>
              <dt>120+</dt>
              <dd>AI-readable skills</dd>
            </div>
            <div>
              <dt>MIT</dt>
              <dd>open source</dd>
            </div>
          </dl>
        </div>
        <RuntimePreview statusMessage={statusMessage} />
      </section>
      <section className="warlock-trust" aria-label="Framework qualities">
        <p>Built for teams who expect more from the foundation</p>
        <div>
          <span>Type-safe</span>
          <span>Full-stack</span>
          <span>AI-native</span>
          <span>Composable</span>
          <span>Production-ready</span>
        </div>
      </section>
    </>
  );
}
