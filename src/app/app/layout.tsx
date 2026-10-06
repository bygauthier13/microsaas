import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/app/nav";
import { MobileNav } from "@/components/app/mobile-nav";
import { ToastProvider } from "@/components/toast";
import { GuideVideoButton } from "@/components/video";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { orgAccess } from "@/lib/billing/plans";

export const metadata: Metadata = { title: { default: "RepairClock", template: "%s · RepairClock" }, robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireUser();
  const access = org ? orgAccess(org) : null;
  const hideLandlords = org?.kind === "social_landlord";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden lg:flex lg:flex-col lg:gap-6 border-r border-line bg-paper px-4 py-5 sticky top-0 h-screen">
        <Logo href="/app" className="px-2" />
        {org ? (
          <>
            <div className="px-2">
              <p className="text-xs uppercase tracking-wider text-faint">Workspace</p>
              <p className="mt-0.5 text-sm font-medium truncate" title={org.name}>{org.name}</p>
            </div>
            <NavLinks hideLandlords={hideLandlords} />
          </>
        ) : null}
        <div className="mt-auto space-y-3 px-2">
          {access && access.state === "trial" ? (
            <Link href="/app/billing" className="block rounded-lg border border-line bg-surface px-3 py-2.5 text-xs leading-relaxed hover:border-line-strong">
              <span className="font-semibold text-ink">Free trial · {access.trialDaysLeft} day{access.trialDaysLeft === 1 ? "" : "s"} left</span>
              <span className="block text-muted">Choose a plan any time →</span>
            </Link>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name || "Demo user"}</p>
              <p className="text-xs text-muted truncate">{user.isDemo ? "Demo workspace" : user.email}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink" title="Sign out" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="relative lg:hidden flex items-center justify-between border-b border-line bg-paper px-4 py-3 sticky top-0 z-30">
          <Logo href="/app" />
          <div className="flex items-center gap-2">
            <form action={logoutAction}>
              <button type="submit" className="inline-flex h-10 items-center rounded-lg px-3 text-sm text-muted" aria-label="Sign out">
                Sign out
              </button>
            </form>
            {org ? <MobileNav hideLandlords={hideLandlords} /> : null}
          </div>
        </header>

        {org?.isDemo ? (
          <div className="border-b border-info/20 bg-info-soft px-4 py-2.5 text-sm text-info sm:px-8">
            <span className="font-semibold">Demo workspace.</span> Sample agency, homes and cases — nothing here is real, emails go to the in-app outbox, and it resets after 24 hours.{" "}
            <Link href="/signup?from=demo" className="font-semibold underline underline-offset-2">Create your own workspace</Link>
            {" · "}
            <GuideVideoButton className="font-semibold underline underline-offset-2">▶ Watch the 2-minute setup guide</GuideVideoButton>
          </div>
        ) : null}
        {access?.state === "trial_expired" ? (
          <div className="border-b border-warn/20 bg-warn-soft px-4 py-2.5 text-sm text-warn sm:px-8">
            <span className="font-semibold">Your free trial has ended.</span> Existing cases stay fully usable and exportable. <Link href="/app/billing" className="font-semibold underline">Choose a plan</Link> to log new reports.
          </div>
        ) : null}
        {access?.state === "past_due" ? (
          <div className="border-b border-bad/20 bg-bad-soft px-4 py-2.5 text-sm text-bad sm:px-8">
            <span className="font-semibold">Payment failed.</span> Please <Link href="/app/billing" className="font-semibold underline">update your card</Link> to keep your plan active.
          </div>
        ) : null}

        <main className="px-4 py-6 sm:px-8 sm:py-8 max-w-[1240px]">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
