"use client";

import Link from "next/link";
import { LibraryBig, Calendar, MessageCircle, ClipboardList, Award } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";

/**
 * Home quick actions — a row of shortcuts to the places a learner reaches for
 * most, so the common next step is one tap from the dashboard. Pure navigation;
 * every destination is a real page.
 */
const ACTIONS = [
  { title: "Browse catalogue", href: "/catalogue", icon: LibraryBig },
  { title: "My sessions", href: "/my-sessions", icon: Calendar },
  { title: "Messages", href: "/messages", icon: MessageCircle },
  { title: "Give feedback", href: "/surveys", icon: ClipboardList },
  { title: "Certificates", href: "/certifications", icon: Award },
];

export function DashboardQuickActions() {
  return (
    <Box className="flex flex-wrap gap-2.5">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent-blue/40 hover:bg-accent-tint"
        >
          <a.icon className="h-3.5 w-3.5 shrink-0 text-accent-blue" />
          <Text as="span" className="text-inherit">{a.title}</Text>
        </Link>
      ))}
    </Box>
  );
}
