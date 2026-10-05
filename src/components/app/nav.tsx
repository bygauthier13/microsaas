"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, FolderClock, LayoutDashboard, Mail, Settings, Users } from "lucide-react";

const items = [
  { href: "/app", label: "Today", icon: LayoutDashboard, exact: true },
  { href: "/app/cases", label: "Cases", icon: FolderClock },
  { href: "/app/properties", label: "Homes", icon: Building2 },
  { href: "/app/landlords", label: "Landlords", icon: Users },
  { href: "/app/outbox", label: "Sent emails", icon: Mail },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/billing", label: "Plan & billing", icon: CreditCard },
];

export function NavLinks({ onNavigate, hideLandlords }: { onNavigate?: () => void; hideLandlords?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5" aria-label="Main">
      {items
        .filter((i) => !(hideLandlords && i.href === "/app/landlords"))
        .map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.92rem] transition-colors",
                active ? "bg-surface text-ink font-medium shadow-[var(--shadow-card)] border border-line" : "text-ink-2 hover:bg-paper-2 border border-transparent",
              )}
            >
              <Icon className="h-4 w-4 opacity-80" aria-hidden />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
