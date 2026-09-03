import type { HomePageData } from "app/home/services/home.service";

type ContentSectionsProps = {
  capabilities: HomePageData["capabilities"];
  packages: HomePageData["packages"];
};

export function ContentSections({ capabilities, packages }: ContentSectionsProps) {
  return (
    <>
      <section className="warlock-section warlock-features" id="features">
        <div className="warlock-section-heading">
          <p className="warlock-overline">Why Warlock</p>
          <h2>A sharper way to build the whole product.</h2>
          <p>
            Fewer seams, fewer competing conventions, and more of your system expressed in code the
            compiler can understand.
          </p>
        </div>
        <div className="warlock-feature-grid">
          {capabilities.map((capability) => (
            <article className="warlock-feature-card" key={capability.index}>
              <div className="warlock-feature-meta">
                <span>{capability.index}</span>
                <small>{capability.eyebrow}</small>
              </div>
              <h3>{capability.title}</h3>
              <p>{capability.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="warlock-section warlock-package-section" id="packages">
        <div className="warlock-package-copy">
          <p className="warlock-overline">The spellbook</p>
          <h2>Take the framework. Keep the choice.</h2>
          <p>
            Every package owns one concern and composes with the rest. Build a focused HTTP service
            today, then add persistence, jobs, access control, or agents without replacing the
            foundation.
          </p>
          <a href="https://warlock.js.org/#packages" target="_blank" rel="noreferrer">
            Browse every package <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="warlock-package-grid" aria-label="Warlock.js packages">
          {packages.map((frameworkPackage) => (
            <article className="warlock-package" key={frameworkPackage.name}>
              <small>{frameworkPackage.area}</small>
              <h3>
                <span>@warlock.js/</span>
                {frameworkPackage.name}
              </h3>
              <p>{frameworkPackage.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
