import type { HttpConfigurations } from "@warlock.js/core";
import { env } from "@warlock.js/core";

const httpConfigurations: HttpConfigurations = {
  port: env("HTTP_PORT", 3000),
  host: env("HTTP_HOST", "localhost"),
  log: true,
  fileUploadLimit: 12 * 1024 * 1024 * 1024,
  rateLimit: {
    max: 260,
    duration: 60 * 1000, // 1 minute
  },
  cors: {
    // allowed origins
    //   origin: ["127.0.0.1:5173", "localhost:5173"],
    // origin: ["http://127.0.0.1:5173"],
    origin: "*",
    // allowed methods
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  },
  // Safe for local dev: `false` trusts nothing in front of this process, so
  // request.ip/protocol/hostname read the raw socket. Behind a proxy/LB/CDN
  // in production, set this to `true`, a trusted IP/CIDR string, or a list
  // of trusted proxy IPs/CIDRs — otherwise rate limiting, ip-filter
  // allowlists, and absolute URLs (e.g. the sitemap) trust the wrong client.
  trustProxy: false,
  // Opt-in, nonce-based Content-Security-Policy — off by default, zero
  // behaviour change. Flip `enabled: true` to turn it on; the framework
  // appends the request's own `'nonce-<value>'` to `script-src` for you.
  // csp: {
  //   enabled: false,
  //   directives: {
  //     "script-src": ["'self'"],
  //     "object-src": ["'none'"],
  //     "base-uri": ["'self'"],
  //   },
  // },
};

export default httpConfigurations;
