/**
 * Per-Worker Test Setup
 *
 * This file runs in EACH Vitest worker thread before tests execute.
 * It sets up per-worker database and cache connections for direct
 * service/repository testing (unit tests).
 *
 * NOTE: These connections are SEPARATE from the HTTP server's connections.
 * Use direct calls for unit tests, HTTP requests for integration tests.
 */
import { setupTest } from "@warlock.js/core";

await setupTest({ connectors: true });
