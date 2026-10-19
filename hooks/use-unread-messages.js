"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchUnreadMessages } from "@/services/api/learner/messages-api";

/**
 * The learner's unread direct-message count, for the sidebar badge.
 *
 * Only learners have a Messages inbox, so it polls nothing for any other
 * portal (returns 0). Polls every 60s and on window focus — the same cadence
 * as the notification bell, because a DM is not a chat app and a tighter poll
 * from every open tab is not worth it. A failed poll is silent; the badge just
 * does not move.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const isLearner = user?.role === "learner";
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isLearner) {
      setCount(0);
      return undefined;
    }
    let alive = true;
    const load = () =>
      fetchUnreadMessages()
        .then((d) => { if (alive) setCount(d.count ?? 0); })
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [isLearner]);

  return isLearner ? count : 0;
}
