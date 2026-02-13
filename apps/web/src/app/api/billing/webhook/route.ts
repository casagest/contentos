import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type Stripe from "stripe";

/**
 * Stripe Webhook Handler
 *
 * IMPORTANT: Must use request.text() for raw body — Stripe signature
 * verification requires the raw request body, not parsed JSON.
 *
 * Events handled:
 * - checkout.session.completed → Activate subscription + update org plan
 * - customer.subscription.updated → Sync plan changes
 * - customer.subscription.deleted → Downgrade to free
 * - invoice.payment_failed → Mark payment warning
 */

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const planId = session.metadata?.planId;

        if (!orgId || !planId) {
          console.error("Webhook: missing metadata in checkout session", session.id);
          break;
        }

        await supabase
          .from("organizations")
          .update({
            plan: planId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq("id", orgId);

        console.log(`Webhook: org ${orgId} upgraded to ${planId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find org by stripe_customer_id
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!org) {
          console.error("Webhook: no org found for customer", customerId);
          break;
        }

        // If subscription cancelled at period end, we'll handle it on deletion
        if (subscription.cancel_at_period_end) {
          console.log(`Webhook: subscription for org ${org.id} set to cancel at period end`);
          break;
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!org) break;

        await supabase
          .from("organizations")
          .update({
            plan: "free",
            stripe_subscription_id: null,
          })
          .eq("id", org.id);

        console.log(`Webhook: org ${org.id} downgraded to free`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: org } = await supabase
          .from("organizations")
          .select("id, settings")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!org) break;

        // Store payment warning in settings
        const settings = (org.settings as Record<string, unknown>) || {};
        settings.paymentWarning = {
          type: "payment_failed",
          at: new Date().toISOString(),
          invoiceId: invoice.id,
        };

        await supabase
          .from("organizations")
          .update({ settings })
          .eq("id", org.id);

        console.log(`Webhook: payment failed for org ${org.id}`);
        break;
      }

      default:
        // Unhandled event type — log but don't error
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
