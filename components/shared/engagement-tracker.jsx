"use client";

import { useEngagementTracker } from "@/hooks/use-engagement-tracker";

/**
 * Mount-once engagement tracker. Rendered inside the authenticated layouts so it
 * runs on every page a signed-in person visits and nowhere else. Renders nothing.
 */
export function EngagementTracker() {
  useEngagementTracker(true);
  return null;
}
