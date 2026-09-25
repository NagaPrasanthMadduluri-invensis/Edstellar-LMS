"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award, Bell, BookOpen, CalendarCheck, CalendarClock, CalendarX,
  CheckCircle2, Map as MapIcon, Sparkles, Trophy, UserCheck, UserPlus, Users,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchNotifications, markAllNotificationsRead,
} from "@/services/api/notifications-api";
import { NOTIFICATION_GROUPS, relativeTime } from "@/lib/notifications";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * Icon NAME → component. The catalogue stores the name so it stays plain data
 * (§10.3.1.6); this is the one file that knows the components, and `Map` is
 * aliased because the bare name shadows the global `Map` constructor — a bug
 * this codebase has already shipped once.
 */
const ICONS = {
  Award, BookOpen, CalendarCheck, CalendarClock, CalendarX, CheckCircle2,
  Map: MapIcon, Sparkles, Trophy, UserCheck, UserPlus, Users,
};

/** How often the bell re-checks. Slow on purpose — see the docblock. */
const POLL_MS = 60_000;

/**
 * The notification bell.
 *
 * It replaces a hardcoded `3` that sat in the top bar of all four portals and
 * meant nothing — a badge that never moved, on a control that did nothing.
 *
 * Three decisions worth knowing:
 *
 * **Opening it marks everything read.** That is what "seen" means here, and it
 * is what makes the badge disappear. The count clears optimistically the
 * moment the panel opens rather than after the round trip, because the badge
 * is about the person's attention, not the server's state — and a number that
 * lingers for 200ms after you have looked reads as broken.
 *
 * **Polling is 60s, not 5s.** There is no websocket in this product and a bell
 * is not a chat: nothing here is worth a request every few seconds from every
 * open tab in every portal. It also refetches when the tab regains focus,
 * which is what actually catches up after someone has been away.
 *
 * **It renders nothing until there is a session.** Mounted inside the shell,
 * it would otherwise fire an unauthenticated request on the login page.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  // Cleared optimistically on open; the server is told in the background.
  const [badgeCleared, setBadgeCleared] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    try {
      setData(await fetchNotifications({ limit: 20 }));
      setError(null);
    } catch (e) {
      // A failed poll must not put an error banner in the top bar of every
      // page. The bell simply does not update; the message is shown only
      // inside the panel, where somebody has asked to look.
      setError(e.message);
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    load();
    const timer = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, load]);

  if (!user) return null;

  const unread = badgeCleared ? 0 : (data?.unread_count ?? 0);
  const badge = data?.badge && !badgeCleared ? data.badge : null;
  const rows = data?.notifications ?? [];

  async function onOpenChange(next) {
    setOpen(next);
    if (!next) return;
    // Refetch first so the panel shows what is actually there, then clear.
    load();
    if (unread > 0) {
      setBadgeCleared(true);
      try {
        await markAllNotificationsRead();
      } catch {
        // The badge stays cleared for this session even if the write failed —
        // they HAVE seen them. The next poll restores the truth.
      }
    }
  }

  function go(n) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative cursor-pointer"
            aria-label={
              unread > 0
                ? `Notifications, ${unread} unread`
                : "Notifications"
            }
            title={unread > 0 ? `${unread} unread` : "Notifications"}
          >
            <Bell className="h-5 w-5 text-white" />
            {/* Once seen, the badge is GONE — not a zero, not a grey dot.
                The bell alone is the read state. */}
            {badge && unread > 0 && (
              <Text
                as="span"
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
              >
                {badge}
              </Text>
            )}
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <Box className="flex items-center justify-between border-b border-line px-3 py-2">
          <Text as="p" className="text-[12.5px] font-bold text-ink">
            Notifications
          </Text>
          {rows.length > 0 && (
            <Text as="p" className="text-[11px] text-text-3">
              {data.total} total
            </Text>
          )}
        </Box>

        {!data ? (
          <Box className="space-y-2 p-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </Box>
        ) : error ? (
          <Text as="p" className="px-3 py-6 text-center text-[12px] text-danger">
            {error}
          </Text>
        ) : rows.length === 0 ? (
          <Box className="px-3 py-8 text-center">
            <Bell className="mx-auto mb-2 size-6 text-text-3" />
            <Text as="p" className="text-[12.5px] font-semibold text-ink">
              Nothing yet
            </Text>
            <Text as="p" className="mt-0.5 text-[11.5px] text-text-3">
              Course assignments, results and replies from Edstellar land here.
            </Text>
          </Box>
        ) : (
          <Box className="max-h-[22rem] overflow-y-auto">
            {rows.map((n) => {
              const Icon = ICONS[n.icon] ?? Bell;
              const tone = NOTIFICATION_GROUPS[n.group]?.tone ?? "text-text-3";
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => go(n)}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-2.5 border-b border-line px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-2",
                    // Unread keeps a tint until the NEXT open, so the panel
                    // still shows which ones were new when it was opened.
                    !n.is_read && "bg-accent-tint",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone)} />
                  <Box className="min-w-0 flex-1">
                    <Text as="p" className="text-[12px] font-semibold leading-snug text-ink">
                      {n.title}
                    </Text>
                    {n.body && (
                      <Text as="p" className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-text-2">
                        {n.body}
                      </Text>
                    )}
                    <Text as="p" className="mt-1 text-[10.5px] text-text-3">
                      {relativeTime(n.created_at)}
                      {n.actor_name ? ` · ${n.actor_name}` : ""}
                    </Text>
                  </Box>
                </button>
              );
            })}
          </Box>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
