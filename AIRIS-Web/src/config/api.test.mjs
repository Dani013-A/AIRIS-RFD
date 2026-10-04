import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdminApiBaseUrl } from "./api.ts";

test("production health checks use the established public API", () => {
  assert.equal(resolveAdminApiBaseUrl(undefined, true), "https://18-143-33-249.sslip.io");
  assert.equal(resolveAdminApiBaseUrl("https://18-143-33-249.sslip.io/", true), "https://18-143-33-249.sslip.io");
});

test("production rejects loopback and insecure overrides; development retains localhost", () => {
  assert.throws(() => resolveAdminApiBaseUrl("http://127.0.0.1:8000", true));
  assert.throws(() => resolveAdminApiBaseUrl("https://192.168.1.9:8000", true));
  assert.equal(resolveAdminApiBaseUrl(undefined, false), "http://127.0.0.1:8000");
});
