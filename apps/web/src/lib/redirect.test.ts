import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRedirectPath } from "./redirect";

describe("sanitizeRedirectPath", () => {
  it("returns fallback for null/undefined/empty", () => {
    assert.equal(sanitizeRedirectPath(null, "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath(undefined, "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("", "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("   ", "/dashboard"), "/dashboard");
  });

  it("allows safe internal relative paths", () => {
    assert.equal(sanitizeRedirectPath("/dashboard", "/x"), "/dashboard");
    assert.equal(sanitizeRedirectPath("/settings", "/x"), "/settings");
    assert.equal(sanitizeRedirectPath("/login", "/x"), "/login");
    assert.equal(sanitizeRedirectPath("/update-password", "/x"), "/update-password");
  });

  it("rejects protocol-relative URLs", () => {
    assert.equal(sanitizeRedirectPath("//evil.com/path", "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("//example.com", "/dashboard"), "/dashboard");
  });

  it("rejects absolute URLs", () => {
    assert.equal(sanitizeRedirectPath("https://evil.com", "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("http://evil.com/phish", "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("https://evil.com/callback", "/dashboard"), "/dashboard");
  });

  it("rejects javascript and other schemes", () => {
    assert.equal(sanitizeRedirectPath("javascript:alert(1)", "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("data:text/html,<script>", "/dashboard"), "/dashboard");
  });

  it("rejects paths that do not start with /", () => {
    assert.equal(sanitizeRedirectPath("dashboard", "/x"), "/x");
    assert.equal(sanitizeRedirectPath("evil.com/path", "/x"), "/x");
  });
});
