type RuntimePreviewProps = { statusMessage: string };

export function RuntimePreview({ statusMessage }: RuntimePreviewProps) {
  return (
    <div className="warlock-hero-stage" aria-label="Warlock application preview">
      <div className="warlock-glow" aria-hidden="true" />
      <div className="warlock-terminal">
        <div className="warlock-terminal-bar">
          <div className="warlock-terminal-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span>src/web/index.page.tsx</span>
          <span className="warlock-terminal-live">Live</span>
        </div>
        <div className="warlock-code" aria-label="Example Warlock page code">
          <div>
            <span className="code-purple">import type</span> {"{"} PageProps {"}"}{" "}
            <span className="code-purple">from</span>{" "}
            <span className="code-green">&quot;@warlock.js/web&quot;</span>;
          </div>
          <div className="warlock-code-spacer" aria-hidden="true" />
          <div>
            <span className="code-purple">export async function</span>{" "}
            <span className="code-blue">loader</span>() {"{"}
          </div>
          <div className="warlock-code-indent">
            <span className="code-purple">return</span> {"{"} statusMessage:{" "}
            <span className="code-green">&quot;Application ready&quot;</span> {"}"};
          </div>
          <div>{"}"}</div>
          <div className="warlock-code-spacer" aria-hidden="true" />
          <div>
            <span className="code-purple">type</span>{" "}
            <span className="code-blue">HomePageProps</span> ={" "}
            <span className="code-blue">PageProps</span>&lt;
            <span className="code-purple">typeof</span> loader&gt;;
          </div>
          <div className="warlock-code-spacer" aria-hidden="true" />
          <div>
            <span className="code-purple">export default function</span>{" "}
            <span className="code-blue">HomePage</span>({"{"} data {"}"}:{" "}
            <span className="code-blue">HomePageProps</span>) {"{"}
          </div>
          <div className="warlock-code-indent">
            <span className="code-purple">return</span> &lt;small&gt;{"{"}data.statusMessage{"}"}
            &lt;/small&gt;;
          </div>
          <div>{"}"}</div>
        </div>
        <div className="warlock-runtime">
          <div>
            <span className="warlock-runtime-pulse" />
            <div>
              <strong>Application ready</strong>
              <small>{statusMessage}</small>
            </div>
          </div>
          <div className="warlock-runtime-marks" aria-label="Runtime capabilities">
            <span>SSR</span>
            <span>React</span>
            <span>HMR</span>
          </div>
        </div>
      </div>
      <div className="warlock-stage-note warlock-stage-note-top">
        <span>SSR</span>First response, fully rendered
      </div>
      <div className="warlock-stage-note warlock-stage-note-bottom">
        <span>HMR</span>State survives the edit
      </div>
    </div>
  );
}
