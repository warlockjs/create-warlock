#!/usr/bin/env node

/**
 * Fresh starter generate -> install -> start -> hydrate acceptance gate.
 *
 * Usage:
 *   node create-warlock/tests/acceptance/starter-browser-gate.mjs \
 *     --registry=http://127.0.0.1:4873 --version=5.2.4 --port=43117 \
 *     --chrome="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
 *
 * The app, npm configuration/cache, and Chrome profile live in one OS-temp
 * directory. The scaffold comes from this checkout, while every installed
 * @warlock.js package must resolve as the requested registry candidate.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const checkout = path.resolve(path.dirname(file), "../..");
const requireFromCheckout = createRequire(path.join(checkout, "package.json"));
const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(`Fresh Warlock starter browser gate

Required:
  --registry=URL     Credential-free loopback npm registry origin.
  --version=X.Y.Z    Exact @warlock.js family candidate version.
  --port=PORT        Explicit, currently-free starter HTTP port.
  --chrome=PATH      Explicit Chrome/Chromium executable path.

Optional:
  --keep-temp        Preserve the gate's OS-temp directory.
  --help             Print this help and exit.

The gate scaffolds from this checkout, performs a clean exact candidate
install, starts only its generated app, and verifies SSR hydration plus the
starter contact submission over raw Chrome DevTools Protocol.`);
  process.exit(0);
}

const candidate = validateOptions(options);
const state = {
  tempRoot: undefined,
  appRoot: undefined,
  server: undefined,
  chrome: undefined,
};
const output = { server: [], chrome: [] };
const report = {
  candidate: {
    registry: candidate.registry,
    version: candidate.version,
    port: candidate.port,
  },
  profile: {
    features: ["react", "web", "tailwind", "shadcn"],
    jwt: false,
    database: "none",
    packageManager: "npm",
  },
  checkout,
  tempRoot: null,
  packages: [],
  browser: null,
  checks: {},
  failures: [],
};

let passed = false;
try {
  Object.assign(report, await runGate(candidate));
  passed = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.failures.push(formatError(error));
} finally {
  for (const key of ["chrome", "server"]) {
    try {
      await stopOwned(key);
    } catch (error) {
      report.failures.push(`${key} cleanup: ${formatError(error)}`);
    }
  }
  passed = passed && report.failures.length === 0;
}

console.log(`EVIDENCE ${JSON.stringify(report, null, 2)}`);
if (!passed && output.server.length) printTail("SERVER", output.server);
if (!passed && output.chrome.length) printTail("CHROME", output.chrome);

if (options.keepTemp && state.tempRoot) {
  console.log(`TEMP kept=${state.tempRoot}`);
} else if (state.tempRoot) {
  try {
    await rm(state.tempRoot, { recursive: true, force: true });
    console.log(`TEMP removed=${state.tempRoot}`);
  } catch (error) {
    passed = false;
    console.log(
      `TEMP cleanup-failed=${state.tempRoot} error=${formatError(error)}`,
    );
  }
}

console.log(`EXIT ${passed ? "PASS" : "FAIL"} code=${passed ? 0 : 1}`);
process.exitCode = passed ? 0 : 1;

async function runGate({ registry, version, port, chrome }) {
  await assertPortFree(port, "starter");
  if (typeof globalThis.WebSocket !== "function") {
    throw new Error(
      "CDP_WEBSOCKET_UNAVAILABLE: this gate requires a Node release with built-in WebSocket",
    );
  }

  state.tempRoot = await mkdtemp(
    path.join(os.tmpdir(), `warlock-starter-gate-${version}-`),
  );
  state.appRoot = path.join(state.tempRoot, "app");
  report.tempRoot = state.tempRoot;
  assertOutsideCheckout(state.tempRoot);

  const npmCache = path.join(state.tempRoot, "npm-cache");
  const npmrc = path.join(state.tempRoot, "npmrc");
  await mkdir(npmCache, { recursive: true });
  await writeFile(
    npmrc,
    `registry=${registry}\n@warlock.js:registry=${registry}\ncache=${npmCache}\n`,
    "utf8",
  );
  const env = isolatedEnv(registry, npmrc, npmCache);

  console.log(`CANDIDATE registry=${registry} version=${version} port=${port}`);
  console.log(
    "PROFILE features=react,web,tailwind,shadcn jwt=false database=none pm=npm",
  );
  console.log(`APP external=${state.appRoot} checkout=${checkout}`);

  const tsxCli = requireFromCheckout.resolve("tsx/cli");
  const scaffoldEntry = path.join(checkout, "index.dev.ts");
  await runCommand(
    process.execPath,
    [
      tsxCli,
      scaffoldEntry,
      state.appRoot,
      "--yes",
      "--pm=npm",
      "--no-db",
      "--features=react,web,tailwind,shadcn",
      "--no-git",
      "--no-jwt",
    ],
    {
      cwd: state.tempRoot,
      env,
      timeoutMs: 10 * 60_000,
      label: "checkout scaffolder",
    },
  );
  report.checks.scaffoldedFromCheckout = existsSync(
    path.join(state.appRoot, "src", "web", "home", "index.page.tsx"),
  );

  const manifestFile = path.join(state.appRoot, "package.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const family = [];
  for (const section of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (!name.startsWith("@warlock.js/")) continue;
      manifest[section][name] = version;
      family.push(name);
    }
  }
  const packageNames = [...new Set(family)].sort();
  if (
    !packageNames.includes("@warlock.js/core") ||
    !packageNames.includes("@warlock.js/web")
  ) {
    throw new Error(`SCAFFOLD_FAMILY_INCOMPLETE: ${packageNames.join(", ")}`);
  }
  await writeFile(
    manifestFile,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  // Both targets were created by this gate beneath its unique temp root.
  await rm(path.join(state.appRoot, "node_modules"), {
    recursive: true,
    force: true,
  });
  await rm(path.join(state.appRoot, "package-lock.json"), { force: true });
  await runNpm(
    [
      "install",
      "--save-exact",
      "--prefer-online",
      "--no-audit",
      "--no-fund",
      "--legacy-peer-deps",
    ],
    {
      cwd: state.appRoot,
      env,
      timeoutMs: 10 * 60_000,
      label: "exact candidate npm install",
    },
  );

  const installed = await verifyCandidateInstall(
    packageNames,
    version,
    registry,
  );
  report.packages = installed;
  report.checks.exactFamilyManifest = packageNames.every(name =>
    [manifest.dependencies?.[name], manifest.devDependencies?.[name]].includes(
      version,
    ),
  );
  report.checks.exactFamilyInstalled = installed.every(
    item => item.version === version,
  );
  report.checks.registryProvenance = installed.every(
    item => item.registryOrigin === new URL(registry).origin,
  );
  report.checks.noWorkspaceLinks = installed.every(
    item => item.symlink === false && item.insideApp === true,
  );
  for (const item of installed) {
    console.log(
      `INSTALLED ${item.package}@${item.version} resolved=${item.resolved} symlink=${item.symlink}`,
    );
  }

  const warlockBin = await installedWarlockBin();

  state.server = spawnOwned(process.execPath, [warlockBin, "dev"], {
    cwd: state.appRoot,
    env: {
      ...env,
      NODE_ENV: "development",
      HTTP_PORT: String(port),
      HOST: "127.0.0.1",
    },
    sink: output.server,
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const ssr = await waitForStarter(baseUrl, 90_000);
  report.checks.ssrContactForm = ssr.includes('id="contact-demo"');

  const browser = await driveChrome({
    chrome,
    baseUrl,
    profile: path.join(state.tempRoot, "chrome-profile"),
  });
  report.browser = browser;
  report.checks.hydrationPayloadPresent = browser.hydrationPayloadPresent;
  report.checks.contactSubmittedByHydratedReact =
    browser.successText ===
      "Thanks, Candidate Gate. Your message has been received." &&
    browser.contactStatus === 200 &&
    browser.documentRequestsDuringSubmit === 0 &&
    browser.urlAfterSubmit === `${baseUrl}/`;
  report.checks.browserErrorsEmpty =
    browser.consoleErrors.length === 0 && browser.exceptions.length === 0;
  return report;
}

async function installedWarlockBin() {
  const coreRoot = path.join(
    state.appRoot,
    "node_modules",
    "@warlock.js",
    "core",
  );
  const coreManifest = JSON.parse(
    await readFile(path.join(coreRoot, "package.json"), "utf8"),
  );
  const binTarget =
    typeof coreManifest.bin === "string"
      ? coreManifest.bin
      : coreManifest.bin?.warlock;
  if (typeof binTarget !== "string")
    throw new Error("WARLOCK_BIN_MISSING: @warlock.js/core has no warlock bin");
  const warlockBin = path.resolve(coreRoot, binTarget);
  assertInside(coreRoot, warlockBin, "warlock bin");
  if (!existsSync(warlockBin))
    throw new Error(`WARLOCK_BIN_MISSING: ${warlockBin}`);
  return warlockBin;
}

async function verifyCandidateInstall(packageNames, expectedVersion, registry) {
  const lock = JSON.parse(
    await readFile(path.join(state.appRoot, "package-lock.json"), "utf8"),
  );
  const results = [];
  for (const name of packageNames) {
    const installPath = path.join(
      state.appRoot,
      "node_modules",
      ...name.split("/"),
    );
    const stat = await lstat(installPath);
    const manifest = JSON.parse(
      await readFile(path.join(installPath, "package.json"), "utf8"),
    );
    const resolved = lock.packages?.[`node_modules/${name}`]?.resolved;
    if (manifest.name !== name || manifest.version !== expectedVersion) {
      throw new Error(
        `CANDIDATE_IDENTITY_MISMATCH: expected ${name}@${expectedVersion}, got ${manifest.name}@${manifest.version}`,
      );
    }
    let registryOrigin;
    try {
      registryOrigin = new URL(resolved).origin;
    } catch {
      throw new Error(
        `REGISTRY_PROVENANCE_MISSING: ${name} resolved=${JSON.stringify(resolved)}`,
      );
    }
    results.push({
      package: name,
      version: manifest.version,
      resolved,
      registryOrigin,
      symlink: stat.isSymbolicLink(),
      insideApp: isInside(state.appRoot, await realpath(installPath)),
    });
  }
  if (results.some(item => item.registryOrigin !== new URL(registry).origin)) {
    throw new Error(
      "REGISTRY_PROVENANCE_MISMATCH: one or more @warlock.js packages came from another origin",
    );
  }
  return results;
}

async function driveChrome({ chrome, baseUrl, profile }) {
  const cdpPort = await reservePort();
  await mkdir(profile, { recursive: true });
  state.chrome = spawnOwned(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { cwd: state.tempRoot, env: process.env, sink: output.chrome },
  );
  const versionInfo = await waitForJson(
    `http://127.0.0.1:${cdpPort}/json/version`,
    state.chrome,
    30_000,
  );
  const cdp = await Cdp.connect(versionInfo.webSocketDebuggerUrl);
  const consoleErrors = [];
  const exceptions = [];
  const documentRequests = [];
  let contactStatus = null;
  try {
    const { targetId } = await cdp.send("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    cdp.on(
      "Runtime.consoleAPICalled",
      event => {
        if (event.type === "error")
          consoleErrors.push(
            event.args.map(arg => arg.value ?? arg.description).join(" "),
          );
      },
      sessionId,
    );
    cdp.on(
      "Runtime.exceptionThrown",
      event =>
        exceptions.push(event.exceptionDetails?.text ?? "browser exception"),
      sessionId,
    );
    cdp.on(
      "Network.requestWillBeSent",
      event => {
        if (event.type === "Document") documentRequests.push(event.request.url);
      },
      sessionId,
    );
    cdp.on(
      "Network.responseReceived",
      event => {
        if (event.response.url === `${baseUrl}/api/contact`)
          contactStatus = event.response.status;
      },
      sessionId,
    );
    await Promise.all([
      cdp.send("Runtime.enable", {}, sessionId),
      cdp.send("Network.enable", {}, sessionId),
      cdp.send("Page.enable", {}, sessionId),
    ]);
    await cdp.send("Page.navigate", { url: `${baseUrl}/` }, sessionId);
    await waitForExpression(
      cdp,
      sessionId,
      `document.readyState === "complete" && document.querySelector("#contact-demo")`,
      30_000,
    );
    const payload = await evaluate(
      cdp,
      sessionId,
      `Boolean(document.querySelector("#__WARLOCK_DATA__"))`,
    );
    const documentsBeforeSubmit = documentRequests.length;
    await evaluate(
      cdp,
      sessionId,
      `(() => {
        const set = (name, value) => {
          const element = document.querySelector('[name="' + name + '"]');
          if (!element) throw new Error('missing contact field ' + name);
          const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        };
        set('name', 'Candidate Gate');
        set('email', 'candidate@example.test');
        set('message', 'Hydrated starter contact submission.');
        document.querySelector('#contact-demo').requestSubmit();
        return true;
      })()`,
    );
    await waitForExpression(
      cdp,
      sessionId,
      `document.querySelector('.warlock-form-status.is-success')?.textContent?.includes('Thanks, Candidate Gate.')`,
      20_000,
    );
    const measured = await evaluate(
      cdp,
      sessionId,
      `({
        successText: document.querySelector('.warlock-form-status.is-success')?.textContent?.trim() || null,
        url: location.href,
        fieldsReset: [...document.querySelectorAll('#contact-demo input, #contact-demo textarea')].every(el => el.value === '')
      })`,
    );
    return {
      product: versionInfo.Product,
      hydrationPayloadPresent: payload,
      successText: measured.successText,
      fieldsReset: measured.fieldsReset,
      contactStatus,
      urlAfterSubmit: measured.url,
      documentRequestsDuringSubmit:
        documentRequests.length - documentsBeforeSubmit,
      consoleErrors,
      exceptions,
    };
  } finally {
    cdp.close();
  }
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    socket.addEventListener("message", event => this.receive(event.data));
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener(
        "error",
        () => reject(new Error("CHROME_CDP_CONNECT_FAILED")),
        { once: true },
      );
    });
    return new Cdp(socket);
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  }
  on(method, listener, sessionId) {
    this.listeners.push({ method, listener, sessionId });
  }
  receive(raw) {
    const message = JSON.parse(String(raw));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error
        ? pending.reject(new Error(`CDP ${message.error.message}`))
        : pending.resolve(message.result);
      return;
    }
    for (const item of this.listeners) {
      if (
        item.method === message.method &&
        (!item.sessionId || item.sessionId === message.sessionId)
      )
        item.listener(message.params);
    }
  }
  close() {
    this.socket.close();
    for (const pending of this.pending.values())
      pending.reject(new Error("CDP connection closed"));
    this.pending.clear();
  }
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails)
    throw new Error(
      `BROWSER_EVALUATION_FAILED: ${result.exceptionDetails.text}`,
    );
  return result.result.value;
}

async function waitForExpression(cdp, sessionId, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(cdp, sessionId, `Boolean(${expression})`)) return;
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(
    `BROWSER_WAIT_TIMEOUT: ${expression}; ${formatError(lastError ?? "condition stayed false")}`,
  );
}

function parseArgs(argv) {
  const parsed = { help: false, keepTemp: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const equal = arg.indexOf("=");
    const key = (equal < 0 ? arg : arg.slice(0, equal)).replace(/^--/, "");
    let value = equal < 0 ? undefined : arg.slice(equal + 1);
    if (
      ["registry", "version", "port", "chrome"].includes(key) &&
      value === undefined
    )
      value = argv[++index];
    if (key === "help" || key === "h") parsed.help = true;
    else if (key === "keep-temp") parsed.keepTemp = true;
    else if (["registry", "version", "port", "chrome"].includes(key))
      parsed[key] = value;
    else throw new Error(`UNKNOWN_ARGUMENT: ${arg}`);
  }
  return parsed;
}

function validateOptions(parsed) {
  const missing = ["registry", "version", "port", "chrome"].filter(
    key => !parsed[key],
  );
  if (missing.length)
    throw new Error(
      `MISSING_ARGUMENTS: ${missing.map(key => `--${key}`).join(", ")}`,
    );
  let url;
  try {
    url = new URL(parsed.registry);
  } catch {
    throw new Error(
      "INVALID_REGISTRY: --registry must be an http(s) loopback origin",
    );
  }
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  if (
    !loopback ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "INVALID_REGISTRY: --registry must be a credential-free http(s) loopback origin without path/query/hash",
    );
  }
  if (
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
      parsed.version,
    )
  ) {
    throw new Error("INVALID_VERSION: --version must be explicit semver");
  }
  if (
    !/^\d+$/.test(parsed.port) ||
    Number(parsed.port) < 1 ||
    Number(parsed.port) > 65535
  ) {
    throw new Error(
      "INVALID_PORT: --port must be an integer from 1 through 65535",
    );
  }
  const chrome = path.resolve(parsed.chrome);
  if (!existsSync(chrome)) throw new Error(`CHROME_NOT_FOUND: ${chrome}`);
  return {
    registry: url.origin + "/",
    version: parsed.version,
    port: Number(parsed.port),
    chrome,
  };
}

function isolatedEnv(registry, npmrc, cache) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key)),
  );
  return {
    ...env,
    npm_config_registry: registry,
    NPM_CONFIG_REGISTRY: registry,
    npm_config_userconfig: npmrc,
    NPM_CONFIG_USERCONFIG: npmrc,
    npm_config_cache: cache,
    NPM_CONFIG_CACHE: cache,
  };
}

function spawnOwned(command, args, { cwd, env, sink }) {
  const child = spawn(command, args, {
    cwd,
    env,
    shell: false,
    detached: process.platform !== "win32",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  capture(child.stdout, sink);
  capture(child.stderr, sink);
  return child;
}

function runCommand(command, args, { cwd, env, timeoutMs, label }) {
  return new Promise((resolve, reject) => {
    const child = spawnOwned(command, args, { cwd, env, sink: [] });
    const lines = [];
    capture(child.stdout, lines);
    capture(child.stderr, lines);
    let timedOut = false;
    const timer = setTimeout(async () => {
      timedOut = true;
      await terminateTree(child).catch(() => undefined);
    }, timeoutMs);
    child.once("error", error => {
      clearTimeout(timer);
      reject(new Error(`${label} spawn failed: ${formatError(error)}`));
    });
    child.once("close", code => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) resolve(lines.join("\n"));
      else
        reject(
          new Error(
            `${label} ${timedOut ? "timed out" : `exited ${code}`}\n${lines.slice(-60).join("\n")}`,
          ),
        );
    });
  });
}

function runNpm(args, settings) {
  return process.platform === "win32"
    ? runCommand(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", "npm.cmd", ...args],
        settings,
      )
    : runCommand("npm", args, settings);
}

async function stopOwned(key) {
  const child = state[key];
  state[key] = undefined;
  if (!child || child.exitCode !== null) return;
  await terminateTree(child);
  const deadline = Date.now() + 10_000;
  while (processAlive(child.pid) && Date.now() < deadline) await delay(100);
  if (processAlive(child.pid))
    throw new Error(`OWNED_PROCESS_SURVIVED: ${key} pid=${child.pid}`);
}

async function terminateTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise(resolve => {
      const killer = spawn(
        "taskkill.exe",
        ["/pid", String(child.pid), "/t", "/f"],
        {
          stdio: "ignore",
          windowsHide: true,
        },
      );
      killer.once("error", resolve);
      killer.once("close", resolve);
    });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    await delay(1_000);
    if (processAlive(child.pid)) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }
  }
}

async function waitForStarter(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (state.server.exitCode !== null)
      throw new Error(`STARTER_EXITED_EARLY: code=${state.server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/`);
      const text = await response.text();
      if (response.ok && text.includes('id="contact-demo"')) return text;
      lastError = new Error(
        `HTTP ${response.status}; contact=${text.includes('id="contact-demo"')}`,
      );
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(
    `STARTER_READY_TIMEOUT: ${formatError(lastError)}\n${output.server.slice(-60).join("\n")}`,
  );
}

async function waitForJson(url, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`CHROME_EXITED_EARLY: code=${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`CHROME_CDP_TIMEOUT: ${formatError(lastError)}`);
}

async function assertPortFree(port, label) {
  try {
    await bindAndClose(port);
  } catch (error) {
    throw new Error(
      `${label.toUpperCase()}_PORT_UNAVAILABLE: ${port}; ${formatError(error)}`,
    );
  }
}

async function reservePort() {
  return bindAndClose(0);
}

function bindAndClose(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      const address = probe.address();
      const selected =
        typeof address === "object" && address ? address.port : port;
      probe.close(error => (error ? reject(error) : resolve(selected)));
    });
  });
}

function capture(stream, sink) {
  if (!stream) return;
  let remainder = "";
  stream.setEncoding("utf8");
  stream.on("data", chunk => {
    remainder += chunk;
    const lines = remainder.split(/\r?\n/);
    remainder = lines.pop() ?? "";
    sink.push(...lines);
    if (sink.length > 500) sink.splice(0, sink.length - 500);
  });
}

function assertOutsideCheckout(candidate) {
  if (path.resolve(candidate) === checkout || isInside(checkout, candidate)) {
    throw new Error(`TEMP_INSIDE_CHECKOUT: ${candidate}`);
  }
}

function assertInside(parent, candidate, label) {
  if (!isInside(parent, candidate))
    throw new Error(
      `UNSAFE_${label.toUpperCase().replace(/\W+/g, "_")}: ${candidate}`,
    );
}

function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function printTail(label, lines) {
  console.log(`${label}_TAIL_BEGIN`);
  console.log(lines.slice(-80).join("\n"));
  console.log(`${label}_TAIL_END`);
}

function formatError(error) {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
