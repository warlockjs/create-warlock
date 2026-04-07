/**
 * Global Test Setup
 *
 * This file runs ONCE in the main process before all test workers start.
 * It starts the HTTP server which all test workers can make requests to.
 *
 * NOTE: The HTTP server has its OWN database connection, separate from
 * the per-worker connections in setupFiles.
 */
import { startHttpTestServer, stopHttpTestServer } from "@warlock.js/core";

export async function setup() {
  await startHttpTestServer();
}

export async function teardown() {
  await stopHttpTestServer();
}
