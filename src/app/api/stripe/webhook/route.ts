import { eq } from "drizzle-orm";
import { track } from "@/lib/analytics";
import { stripe, syncSubscription } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { organizations, stripeEvents } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. Configure in the Stripe dashboard (or `stripe listen
 * --forward-to localhost:3000/api/stripe/webhook`) with these events:
 * checkout.session.completed, customer.subscription.created, customer.subscription.updated,
 * customer.subscription.deleted, invoice.paid, invoice.payment_failed.
 */
export async function POST(req: Request) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return Response.json({ error: "Stripe webhooks are not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });
  const body = await req.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
  } catch (err) {
    console.warn("[stripe] webhook signature verification failed", (err as Error).message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = await getDb();
  const [seen] = await db.select({ id: stripeEvents.id }).from(stripeEvents).where(eq(stripeEvents.id, event.id)).limit(1);
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe().subscriptions.retrieve(subId);
          await syncSubscription(sub, { orgIdHint: session.client_reference_id });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subRef = invoice.parent?.subscription_details?.subscription;
        if (subRef) {
          const sub = await stripe().subscriptions.retrieve(typeof subRef === "string" ? subRef : subRef.id);
          const orgId = await syncSubscription(sub);
          if (event.type === "invoice.payment_failed" && orgId) {
            await db.update(organizations).set({ subscriptionStatus: "past_due" }).where(eq(organizations.id, orgId));
            await track("payment_failed", { orgId, props: { invoice: invoice.id } });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe] failed to process ${event.type} ${event.id}`, err);
    // Non-2xx makes Stripe retry later.
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }

  await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  return Response.json({ received: true });
}
