"use client";

import { useEffect } from "react";

/** Sends one anonymous analytics event to /api/track; best-effort. */
export function sendEvent(event: string, props?: Record<string, string>) {
  try {
    navigator.sendBeacon?.("/api/track", JSON.stringify(props ? { event, props } : { event }));
  } catch {
    // best-effort
  }
}

/** Fires one anonymous analytics event when a marketing page is viewed. */
export function Beacon({ event }: { event: "pricing_viewed" | "calculator_used" }) {
  useEffect(() => sendEvent(event), [event]);
  return null;
}

/**
 * Counts visits that arrive from an outreach email, whose link ends in ?from=email1 (email2, …):
 * one anonymous event when the visitor lands, without a cookie, so the analytics show which
 * email gets clicks.
 */
export function CampaignBeacon() {
  useEffect(() => {
    const campaign = new URLSearchParams(window.location.search).get("from")?.toLowerCase();
    if (campaign && /^[a-z0-9-]{1,40}$/.test(campaign)) sendEvent("landing_visited", { campaign, path: window.location.pathname });
  }, []);
  return null;
}
