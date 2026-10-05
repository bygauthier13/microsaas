"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileMenu({ items }: { items: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-16 z-40 border-b border-line bg-paper px-4 pb-4 pt-2 shadow-[var(--shadow-lift)]">
          <nav className="flex flex-col" aria-label="Mobile">
            {items.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base text-ink hover:bg-paper-2">
                {n.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base text-ink hover:bg-paper-2">
              Sign in
            </Link>
            <Link href="/demo" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-medium text-signal-strong hover:bg-paper-2">
              Try the live demo →
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
