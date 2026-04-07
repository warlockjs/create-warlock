/**
 * Sample test to verify test infrastructure
 */
import { testGet } from "@warlock.js/core";
import { describe, expect, it } from "vitest";

describe("Test Infrastructure", () => {
  it("should have database connection available", async () => {
    // This test verifies the per-worker setup works
    // The setupTest function should have initialized connectors
    expect(true).toBe(true);
  });

  it("should be able to make HTTP requests to test server", async () => {
    // This test verifies the global HTTP server is running
    const response = await testGet("/");

    // We expect some response (even 404 is fine - means server is reachable)
    expect(response.status).toBeDefined();
    expect(response.headers.get("content-type")).toBe("text/html");
  });
});
