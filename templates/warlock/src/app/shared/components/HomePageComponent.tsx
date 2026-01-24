import { Application, publicUrl } from "@warlock.js/core";

export function HomePageComponent() {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Warlock.js - Modern Backend TypeScript Framework</title>
        <meta
          name="description"
          content="A powerful, elegant TypeScript framework for building modern web applications with ease."
        />
        <link rel="stylesheet" href={publicUrl("home.css")} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="warlock-home">
          <div className="warlock-container">
            {/* Header */}
            <header className="warlock-header">
              <a href="/" className="warlock-logo">
                <span className="warlock-logo-icon">⚡</span>
                <span>Warlock.js</span>
              </a>
              <nav className="warlock-nav">
                <a
                  href="https://warlock.js.org"
                  target="_blank"
                  rel="noopener noreferrer">
                  Docs
                </a>
                <a
                  href="https://github.com/warlockjs"
                  target="_blank"
                  rel="noopener noreferrer">
                  GitHub
                </a>
                <a
                  href="https://discord.gg/x3W9SN2jvx"
                  target="_blank"
                  rel="noopener noreferrer">
                  Discord
                </a>
              </nav>
            </header>
            {/* Hero Section */}
            <section className="warlock-hero">
              <h1>
                Build Modern Web Apps
                <br />
                with Confidence
              </h1>
              <p>
                A powerful, elegant TypeScript framework designed for developers
                who demand excellence. Ship faster, scale better, and enjoy the
                journey.
              </p>
              <div className="warlock-cta">
                <a
                  href="https://warlock.js.org"
                  className="warlock-btn warlock-btn-primary">
                  <span>Get Started</span>
                  <span>→</span>
                </a>
                <a
                  href="https://github.com/warlockjs"
                  className="warlock-btn warlock-btn-secondary">
                  <span>View on GitHub</span>
                </a>
              </div>
            </section>

            {/* Features Section */}
            <section className="warlock-features">
              <h2 className="warlock-section-title">Why Warlock.js?</h2>
              <p className="warlock-section-subtitle">
                Everything you need to build production-ready applications
              </p>

              <div className="warlock-features-grid">
                <div className="warlock-feature-card">
                  <span className="warlock-feature-icon">🚀</span>
                  <h3>Lightning Fast</h3>
                  <p>
                    Blazing fast development server with instant hot reload.
                    Build and deploy optimized production bundles in seconds.
                  </p>
                </div>

                <div className="warlock-feature-card">
                  <span className="warlock-feature-icon">🎯</span>
                  <h3>Type-Safe</h3>
                  <p>
                    Built with TypeScript from the ground up. Enjoy full type
                    safety across your entire application with intelligent
                    auto-completion.
                  </p>
                </div>

                <div className="warlock-feature-card">
                  <span className="warlock-feature-icon">🏗️</span>
                  <h3>Battle-Tested Architecture</h3>
                  <p>
                    Proven patterns and best practices baked in. From routing to
                    database management, we've got you covered.
                  </p>
                </div>

                <div className="warlock-feature-card">
                  <span className="warlock-feature-icon">🔌</span>
                  <h3>Powerful CLI</h3>
                  <p>
                    Scaffold components, run migrations, manage seeds, and more
                    with an intuitive command-line interface that boosts
                    productivity.
                  </p>
                </div>

                <div className="warlock-feature-card">
                  <span className="warlock-feature-icon">🎨</span>
                  <h3>Flexible & Extensible</h3>
                  <p>
                    Plugin architecture allows you to extend core functionality.
                    Build your own tools or use community packages.
                  </p>
                </div>

                <div className="warlock-feature-card">
                  <span className="warlock-feature-icon">🌍</span>
                  <h3>Multi-Tenant Ready</h3>
                  <p>
                    Built-in support for multi-tenancy. Scale from single to
                    multi-tenant applications without architectural changes.
                  </p>
                </div>
              </div>
            </section>

            {/* Quick Start Section */}
            <section className="warlock-quickstart">
              <h2 className="warlock-section-title">Extend with Features</h2>
              <p className="warlock-section-subtitle">
                Add powerful features to your project instantly
              </p>

              <div className="warlock-code-block">
                <div className="warlock-code-header">
                  <span className="warlock-code-dot"></span>
                  <span className="warlock-code-dot"></span>
                  <span className="warlock-code-dot"></span>
                </div>
                <div className="warlock-code-content">
                  <code className="warlock-code-line">
                    <span className="warlock-code-comment">
                      # Add React for rendering & email templates
                    </span>
                  </code>
                  <code className="warlock-code-line">
                    <span className="warlock-code-command">npx</span> warlock
                    add <span className="warlock-code-flag">react</span>
                  </code>
                  <code className="warlock-code-line">&nbsp;</code>
                  <code className="warlock-code-line">
                    <span className="warlock-code-comment">
                      # Add MongoDB, Redis & testing support
                    </span>
                  </code>
                  <code className="warlock-code-line">
                    <span className="warlock-code-command">npx</span> warlock
                    add{" "}
                    <span className="warlock-code-flag">
                      mongodb redis test
                    </span>
                  </code>
                  <code className="warlock-code-line">&nbsp;</code>
                  <code className="warlock-code-line">
                    <span className="warlock-code-comment">
                      # List all available features
                    </span>
                  </code>
                  <code className="warlock-code-line">
                    <span className="warlock-code-command">npx</span> warlock
                    add <span className="warlock-code-flag">--list</span>
                  </code>
                  <code className="warlock-code-line">&nbsp;</code>
                  <code className="warlock-code-line">
                    <span className="warlock-code-comment">
                      # ✨ Features: react, mongodb, postgres, mysql, redis, s3,
                      mail, image, test, swagger, scheduler & more
                    </span>
                  </code>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="warlock-footer">
              <div className="warlock-social-links">
                <a
                  href="https://discord.gg/x3W9SN2jvx"
                  className="warlock-social-link"
                  target="_blank"
                  rel="noopener noreferrer">
                  <span className="warlock-social-icon">💬</span>
                  <span>Join Discord</span>
                </a>
                <a
                  href="https://github.com/warlockjs"
                  className="warlock-social-link"
                  target="_blank"
                  rel="noopener noreferrer">
                  <span className="warlock-social-icon">⭐</span>
                  <span>Star on GitHub</span>
                </a>
                <a
                  href="https://warlock.js.org"
                  className="warlock-social-link"
                  target="_blank"
                  rel="noopener noreferrer">
                  <span className="warlock-social-icon">📚</span>
                  <span>Read Docs</span>
                </a>
              </div>
              <p className="warlock-footer-text">
                Built with ⚡ by the{" "}
                <a
                  href="https://github.com/warlockjs"
                  target="_blank"
                  rel="noopener noreferrer">
                  Warlock.js Team
                </a>
                {" · "}
                <span>v{Application.version}</span>
              </p>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
