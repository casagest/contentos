import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe constructor before importing
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation((key: string) => ({
    _key: key,
    customers: {},
  })),
}));

describe("stripe", () => {
  beforeEach(() => {
    // Reset module cache so getStripe() singleton resets
    vi.resetModules();
  });

  describe("getStripe", () => {
    it("throws when STRIPE_SECRET_KEY is not set", async () => {
      const original = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      try {
        const { getStripe } = await import("./stripe");
        expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY is not set");
      } finally {
        if (original) process.env.STRIPE_SECRET_KEY = original;
      }
    });

    it("returns Stripe instance when key is set", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_123";
      try {
        const { getStripe } = await import("./stripe");
        const stripe = getStripe();
        expect(stripe).toBeDefined();
        expect((stripe as any)._key).toBe("sk_test_123");
      } finally {
        delete process.env.STRIPE_SECRET_KEY;
      }
    });

    it("returns same instance on second call (singleton)", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_456";
      try {
        const { getStripe } = await import("./stripe");
        const first = getStripe();
        const second = getStripe();
        expect(first).toBe(second);
      } finally {
        delete process.env.STRIPE_SECRET_KEY;
      }
    });
  });

  describe("PRICE_IDS", () => {
    it("has correct keys", async () => {
      const { PRICE_IDS } = await import("./stripe");
      expect(PRICE_IDS).toHaveProperty("starter");
      expect(PRICE_IDS).toHaveProperty("pro");
      expect(PRICE_IDS).toHaveProperty("agency");
      expect(PRICE_IDS).toHaveProperty("dental");
    });
  });
});
