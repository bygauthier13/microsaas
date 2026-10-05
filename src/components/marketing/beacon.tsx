"use client";

import { useEffect } from "react";

/** Fires one anonymous analytics event when a marketing page is viewed. */
export function Beacon({ event }: { event: "pricing_viewed" | "calculator_used" }) {
  useEffect(() => {
    try {
      navigator.sendBeacon?.("/api/track", JSON.stringify({ event }));
    } catch {
      // best-effort
    }
  }, [event]);
  return null;
}
