/**
 * One-off Stripe setup for a fresh (test-mode) account:
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
 *
 * Creates (or reuses, by lookup key) one product per plan with monthly and annual GBP prices,
 * plus a Customer Portal configuration, then prints the env vars to paste into .env.local.
 * Safe to run repeatedly.
 */
import Stripe from "stripe";
import { PLANS, PLAN_ORDER } from "../src/lib/billing/plans";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_")) {
    console.error("Set STRIPE_SECRET_KEY (use a test key: sk_test_...) and run again.");
    process.exit(1);
  }
  if (/^(sk|rk)_live_/.test(key) && process.env.CONFIRM_LIVE !== "yes") {
    console.error("Refusing to run against a live key. Set CONFIRM_LIVE=yes if you really mean it.");
    process.exit(1);
  }
  const stripe = new Stripe(key);
  const lines: string[] = [];

  for (const id of PLAN_ORDER) {
    const plan = PLANS[id];
    const productId = `repairclock_${id}`;
    let product: Stripe.Product;
    try {
      product = await stripe.products.retrieve(productId);
    } catch {
      product = await stripe.products.create({
        id: productId,
        name: `RepairClock ${plan.name}`,
        description: plan.audience,
        metadata: { plan: id },
      });
      console.log(`Created product ${product.id}`);
    }
    for (const interval of ["month", "year"] as const) {
      const lookupKey = `repairclock_${id}_${interval}`;
      const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      const amount = Math.round((interval === "month" ? plan.monthly : plan.annual) * 100);
      let price = existing.data[0];
      if (!price || price.unit_amount !== amount) {
        price = await stripe.prices.create({
          product: product.id,
          currency: "gbp",
          unit_amount: amount,
          recurring: { interval },
          lookup_key: lookupKey,
          transfer_lookup_key: true,
          tax_behavior: "exclusive",
          metadata: { plan: id, interval },
        });
        console.log(`Created price ${price.id} (${lookupKey}, £${(amount / 100).toFixed(2)})`);
      }
      lines.push(`STRIPE_PRICE_${id.toUpperCase()}_${interval === "month" ? "MONTHLY" : "ANNUAL"}=${price.id}`);
    }
  }

  const portal = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Manage your RepairClock subscription" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name", "tax_id"] },
      subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] } },
    },
  });
  lines.push(`STRIPE_PORTAL_CONFIGURATION_ID=${portal.id}`);

  console.log("\nAdd these to .env.local (or your host's environment):\n");
  console.log(lines.join("\n"));
  console.log("\nThen create a webhook endpoint pointing at /api/stripe/webhook (or run `stripe listen --forward-to localhost:3000/api/stripe/webhook`) and set STRIPE_WEBHOOK_SECRET.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
