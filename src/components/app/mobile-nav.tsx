"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLinks } from "./nav";

export function MobileNav({ hideLandlords }: { hideLandlords?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-line bg-paper px-4 py-3 shadow-[var(--shadow-lift)]">
          <NavLinks onNavigate={() => setOpen(false)} hideLandlords={hideLandlords} />
        </div>
      ) : null}
    </div>
  );
}
