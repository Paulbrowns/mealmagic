import Stripe from "stripe";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      let subscription: Stripe.Subscription | null = null;
      let customerId: string | null = null;
      let userId: string | null = null;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        customerId = typeof session.customer === "string" ? session.customer : null;
        userId = (session.metadata?.userId as string) || null;

        if (typeof session.subscription === "string") {
          subscription = await stripe.subscriptions.retrieve(session.subscription);
        }
      } else {
        subscription = event.data.object as Stripe.Subscription;
        customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      }

      if (!userId && customerId) {
        const { data: profile } = await supabaseAdmin
          .from("billing_profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        userId = profile?.user_id ?? null;
      }

      if (subscription && userId) {
        const item = subscription.items.data[0];

        const currentPeriodEnd =
          item && typeof item.current_period_end === "number"
            ? new Date(item.current_period_end * 1000).toISOString()
            : null;

        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: typeof item?.price?.id === "string" ? item.price.id : null,
          status: subscription.status,
          interval: item?.price?.recurring?.interval ?? null,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    return new Response(err?.message || "Webhook handler failed", { status: 500 });
  }
}