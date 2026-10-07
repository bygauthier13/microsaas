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

/**
 * Counts visits that arrive from an outreach email, whose link ends in ?from=email1 (email2, …):
 * one anonymous event when the visitor lands, without a cookie, so the analytics show which
 * email gets clicks.
 */
export function CampaignBeacon() {
  useEffect(() => {
    try {
      const campaign = new URLSearchParams(window.location.search).get("from")?.toLowerCase();
      if (!campaign || !/^[a-z0-9-]{1,40}$/.test(campaign)) return;
      navigator.sendBeacon?.("/api/track", JSON.stringify({ event: "landing_visited", props: { campaign, path: window.location.pathname } }));
    } catch {
      // best-effort
    }
  }, []);
  return null;
}
