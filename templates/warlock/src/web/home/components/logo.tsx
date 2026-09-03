type HomeLogoProps = {
  showVersion?: boolean;
};

export function HomeLogo({ showVersion = false }: HomeLogoProps) {
  return (
    <>
      <span className="warlock-logo-shell">
        <img
          className="warlock-logo"
          src="https://warlock.js.org/_astro/logo.CdUW31XC.png"
          alt=""
        />
      </span>
      <span className="warlock-wordmark">Warlock.js</span>
      {showVersion ? <span className="warlock-version">v5</span> : null}
    </>
  );
}
