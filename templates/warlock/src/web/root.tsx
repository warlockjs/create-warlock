import type { AppProps } from "@warlock.js/web";
import { Head, Scripts, useLocale, useTextDirection } from "@warlock.js/web";
import "./app.css";

/**
 * The application root.
 *
 * Synchronous server document. Only its children inside #vessel are hydrated;
 * put interactive state in a page or layout beneath that boundary.
 */
export default function App({ children }: AppProps) {
  const locale = useLocale();
  const direction = useTextDirection();

  return (
    <html lang={locale} dir={direction}>
      <head>
        {/*
          Placement only. The framework injects the page's `metadata`, the
          stylesheet and preload tags for this route, and the canonical links
          into <head> by default — <Head /> just says WHERE they land.

          Do not add a <title> here: the page's `metadata` owns it, and a root
          that emits one too produces two.
        */}
        <Head />
        <link rel="icon" href="data:," />
      </head>
      <body>
        {/*
          REQUIRED — this is the hydration mount point, not a styling wrapper.

          The browser runtime looks up `#vessel` and hydrates that element only.
          Remove this div, or rename the id, and the page still renders from the
          server but never becomes interactive: the runtime throws in the console
          and nothing on screen changes.

          Wrap it in your own markup freely, and put anything that must live
          outside the hydrated tree (a static footer, a portal target) outside
          it — just keep an element with `id="vessel"` around {children}.
        */}
        <div id="vessel">{children}</div>
        {/*
          The hydration payload and module tags. Written explicitly because
          placement occasionally matters — a CSP nonce, or ordering against
          your own scripts.
        */}
        <Scripts />
      </body>
    </html>
  );
}
