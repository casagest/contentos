import { describe, it, expect } from "vitest";
import { sanitizeRedirectPath } from "./redirect";

describe("sanitizeRedirectPath", () => {
  it("returns fallback for null/undefined/empty", () => {
    expect(sanitizeRedirectPath(null, "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath(undefined, "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("   ", "/dashboard")).toBe("/dashboard");
  });

  it("allows safe internal relative paths", () => {
    expect(sanitizeRedirectPath("/dashboard", "/x")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/settings", "/x")).toBe("/settings");
    expect(sanitizeRedirectPath("/login", "/x")).toBe("/login");
    expect(sanitizeRedirectPath("/update-password", "/x")).toBe("/update-password");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeRedirectPath("//evil.com/path", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("//example.com", "/dashboard")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeRedirectPath("https://evil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("http://evil.com/phish", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("https://evil.com/callback", "/dashboard")).toBe("/dashboard");
  });

  it("rejects javascript and other schemes", () => {
    expect(sanitizeRedirectPath("javascript:alert(1)", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("data:text/html,<script>", "/dashboard")).toBe("/dashboard");
  });

  it("rejects paths that do not start with /", () => {
    expect(sanitizeRedirectPath("dashboard", "/x")).toBe("/x");
    expect(sanitizeRedirectPath("evil.com/path", "/x")).toBe("/x");
  });
});
