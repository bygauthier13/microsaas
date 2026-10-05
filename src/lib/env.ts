/**
 * Central place for environment configuration. Every external service is optional so the
 * product runs end-to-end locally (demo mode) with zero credentials; real keys switch the
 * corresponding integration on.
 */

function str(name: string): string | undefined {
  const v = process.env[name];
  if (!v || v === "replace_me" || v.startsWith("replace_me")) return undefined;
  return v;
}

export const env = {
  get appUrl(): string {
    return (str("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  // Billing
  get stripeSecretKey() {
    return str("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return str("STRIPE_WEBHOOK_SECRET");
  },
  /** "stripe" when a Stripe key is configured, otherwise "simulated" (dev/demo only). */
  get billingMode(): "stripe" | "simulated" {
    const forced = str("BILLING_MODE");
    if (forced === "stripe" || forced === "simulated") return forced;
    return this.stripeSecretKey ? "stripe" : "simulated";
  },
  /** Simulated billing is refused in production unless explicitly allowed (e.g. a staging demo). */
  get allowSimulatedBilling(): boolean {
    return !this.isProduction || process.env.ALLOW_SIMULATED_BILLING === "true";
  },
  get stripePortalConfiguration() {
    return str("STRIPE_PORTAL_CONFIGURATION_ID");
  },
  stripePrice(plan: string, interval: "month" | "year"): string | undefined {
    return str(`STRIPE_PRICE_${plan.toUpperCase()}_${interval === "month" ? "MONTHLY" : "ANNUAL"}`);
  },
  // Email
  get resendApiKey() {
    return str("RESEND_API_KEY");
  },
  get emailFrom(): string {
    return str("EMAIL_FROM") ?? "RepairClock <notifications@repairclock.local>";
  },
  // AI
  get anthropicApiKey() {
    return str("ANTHROPIC_API_KEY");
  },
  get anthropicModel(): string {
    return str("ANTHROPIC_MODEL") ?? "claude-opus-5-5";
  },
  // Analytics
  get posthogKey() {
    return str("POSTHOG_KEY");
  },
  get posthogHost(): string {
    return str("POSTHOG_HOST") ?? "https://eu.i.posthog.com";
  },
  // Legal entity shown on the privacy notice and terms (set before launch).
  get company() {
    return {
      name: str("COMPANY_NAME") ?? "[Company name to be added]",
      number: str("COMPANY_NUMBER") ?? "[company number]",
      address: str("COMPANY_ADDRESS") ?? "[registered office address]",
      email: str("SUPPORT_EMAIL") ?? "hello@repairclock.co.uk",
    };
  },
  // Ops
  get cronSecret() {
    return str("CRON_SECRET");
  },
  get demoEnabled(): boolean {
    return process.env.DEMO_ENABLED !== "false";
  },
};
