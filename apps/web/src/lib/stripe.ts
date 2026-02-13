import Stripe from "stripe";

// Lazy initialization — Stripe SDK must not throw during build when env vars are missing
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/**
 * Maps plan IDs to Stripe Price IDs (set via env vars from Stripe Dashboard).
 * Each plan corresponds to a monthly subscription price in Stripe.
 */
export const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  agency: process.env.STRIPE_PRICE_AGENCY,
  dental: process.env.STRIPE_PRICE_DENTAL,
};
