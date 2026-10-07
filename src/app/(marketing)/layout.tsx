import { Analytics } from "@vercel/analytics/next";
import { CampaignBeacon } from "@/components/marketing/beacon";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CampaignBeacon />
      {/* Cookie-free visit counts in the Vercel dashboard. Off elsewhere: in development it loads from vercel-scripts.com. */}
      {process.env.VERCEL ? <Analytics /> : null}
    </div>
  );
}
