import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { MobileMenu } from "./mobile-menu";

export const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/scotland", label: "Scotland’s new rules" },
  { href: "/tools/deadline-calculator", label: "Deadline calculator" },
  { href: "/pricing", label: "Pricing" },
];

/** Static (no session lookup) so marketing pages can be pre-rendered; signed-in visitors hitting
 * "Sign in" are sent straight to the app by the proxy. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-[0.92rem] text-ink-2 hover:bg-paper-2 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-lg px-3 py-2 text-[0.92rem] text-ink-2 hover:bg-paper-2 sm:inline-block">
            Sign in
          </Link>
          <Link href="/signup" className={buttonClass("signal", "sm", "h-9")}>
            Start free trial
          </Link>
          <MobileMenu items={NAV} />
        </div>
      </div>
    </header>
  );
}
