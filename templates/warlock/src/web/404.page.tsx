import "./404.css";

export const metadata = {
  title: "Page not found",
  robots: "noindex",
};

export default function NotFoundPage() {
  return (
    <main className="not-found">
      <div className="not-found__content">
        <h1>404</h1>
        <p className="not-found__title">Page not found.</p>
        <p className="not-found__description">
          The link may be outdated, or the page may have moved.
        </p>
        <a className="not-found__action" href="/">
          Return home
        </a>
      </div>
    </main>
  );
}
