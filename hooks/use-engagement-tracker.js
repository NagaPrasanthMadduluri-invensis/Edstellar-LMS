"use client";

import { useEffect, useRef } from "react";

import { pingEngagement } from "@/services/api/engagement-api";

/**
 * Tracks ENGAGEMENT: active time on the platform, credited only while the
 * cursor/keyboard is moving and paused after 5 minutes of no movement (idle is
 * not engagement) or while the tab is hidden. It accrues active seconds in short
 * ticks and flushes them to the server about once a minute, and on the way out.
 *
 * It is best-effort telemetry (errors are swallowed) and never blocks the UI.
 * Learning hours are a different, server-side measure (§10.4) and are untouched.
 */
const IDLE_MS = 5 * 60 * 1000; // 5 minutes of no movement = not engaged
const TICK_MS = 15 * 1000; // accrue in 15-second ticks
const FLUSH_MS = 60 * 1000; // send at most once a minute
const MAX_FLUSH_SECONDS = 300; // cap per ping; the server also caps the daily total

export function useEngagementTracker(enabled = true) {
  const lastActivity = useRef(Date.now());
  const bufferSeconds = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const onActivity = () => {
      lastActivity.current = Date.now();
    };
    const events = [
      "mousemove", "pointermove", "keydown", "scroll", "click", "touchstart",
    ];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );

    const tick = () => {
      const active =
        document.visibilityState === "visible" &&
        Date.now() - lastActivity.current < IDLE_MS;
      if (active) bufferSeconds.current += TICK_MS / 1000;
    };

    const flush = () => {
      const seconds = Math.round(bufferSeconds.current);
      if (seconds <= 0) return;
      bufferSeconds.current = 0;
      pingEngagement(Math.min(seconds, MAX_FLUSH_SECONDS)).catch(() => {});
    };

    const tickTimer = setInterval(tick, TICK_MS);
    const flushTimer = setInterval(flush, FLUSH_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tickTimer);
      clearInterval(flushTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled]);
}
