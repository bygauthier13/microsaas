import Link from "next/link";
import { LogoMark } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <LogoMark /> RepairClock
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Statutory damp, mould and hazard deadlines for UK letting agents, landlords and housing providers.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><Link href="/#how-it-works" className="hover:underline">How it works</Link></li>
            <li><Link href="/pricing" className="hover:underline">Pricing</Link></li>
            <li><Link href="/demo" className="hover:underline">Live demo</Link></li>
            <li><Link href="/signup" className="hover:underline">Start free trial</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Guides &amp; tools</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><Link href="/scotland" className="hover:underline">Scotland’s damp &amp; mould rules</Link></li>
            <li><Link href="/england" className="hover:underline">Awaab’s Law timescales</Link></li>
            <li><Link href="/tools/deadline-calculator" className="hover:underline">Working-day deadline calculator</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><a href="mailto:hello@repairclock.co.uk" className="hover:underline">hello@repairclock.co.uk</a></li>
            <li><Link href="/legal/privacy" className="hover:underline">Privacy notice</Link></li>
            <li><Link href="/legal/terms" className="hover:underline">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-muted sm:px-6">
          RepairClock helps you organise and evidence your compliance; it isn&apos;t legal advice. Timescales are based on the Investigation and Commencement of Repair (Scotland)
          Regulations 2026 (SSI 2026/173), Scottish Government guidance, and the Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025. Bank holidays from
          GOV.UK. © {new Date().getFullYear()} RepairClock.
        </p>
      </div>
    </footer>
  );
}
