import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: "Organizatie lipsa." }, { status: 400 });
    }

    const body = await request.json();
    const planId = body.planId as string;

    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      return NextResponse.json(
        { error: `Plan invalid: ${planId}` },
        { status: 400 }
      );
    }

    // Check if org already has a Stripe customer
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", userData.organization_id)
      .single();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          organizationId: userData.organization_id,
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID immediately
      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", userData.organization_id);
    }

    const { getAppUrl } = await import("@/lib/app-url");
    const appUrl = getAppUrl();

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancelled`,
      metadata: {
        organizationId: userData.organization_id,
        planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Eroare la crearea sesiunii de plata." },
      { status: 500 }
    );
  }
}
