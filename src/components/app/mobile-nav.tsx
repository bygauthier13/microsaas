"use client";

import { Menu, PlayCircle, X } from "lucide-react";
import { useState } from "react";
import { GuideVideoButton } from "@/components/video";
import { NavLinks } from "./nav";

export function MobileNav({ hideLandlords, showGuide }: { hideLandlords?: boolean; showGuide?: boolean }) {
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
          {showGuide ? (
            <GuideVideoButton className="mt-1 flex w-full items-center gap-2.5 rounded-lg border-t border-line px-3 pb-2 pt-3 text-left text-[0.92rem] font-medium text-signal-strong">
              <PlayCircle className="h-4 w-4" aria-hidden /> Watch the 2-minute setup guide
            </GuideVideoButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
