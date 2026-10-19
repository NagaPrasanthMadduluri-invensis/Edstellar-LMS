"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Heart, MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { relativeTime } from "@/lib/notifications";

/**
 * Home: the latest few Learning Community posts, a prompt to join the
 * conversation. It renders NOTHING when the module is off, the fetch fails, or
 * there are no posts yet — a dashboard widget is a prompt, not furniture
 * (the DashboardRecommended / DashboardPendingSurveys pattern).
 */
const TYPE_LABEL = { question: "Question", achievement: "Achievement", discussion: "Discussion" };

function authorName(author) {
  if (!author) return "Someone";
  return typeof author === "string" ? author : author.name ?? "Someone";
}

export function DashboardCommunity() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/community?limit=3")
      .then((d) => setPosts(Array.isArray(d.posts) ? d.posts : []))
      .catch(() => setPosts([]));
  }, [user]);

  if (!posts || posts.length === 0) return null;

  return (
    <Card className="gap-0 p-5">
      <Box className="mb-3 flex items-center justify-between gap-2">
        <Box className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold text-ink">Learning community</Text>
        </Box>
        <Link href="/community" className="shrink-0 text-xs font-bold text-accent-blue hover:underline">
          View all →
        </Link>
      </Box>

      <Box className="flex flex-col divide-y divide-line">
        {posts.map((p) => (
          <Link key={p.id} href="/community" className="group flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
            <Box className="flex items-center gap-2">
              <Text as="span" className="chip-idle shrink-0 text-[9px] font-bold uppercase tracking-wide">
                {TYPE_LABEL[p.type] ?? "Post"}
              </Text>
              <Text as="p" className="truncate text-[13px] font-semibold text-ink group-hover:text-accent-blue">
                {p.title || p.body || "Untitled"}
              </Text>
            </Box>
            <Box className="flex items-center gap-3 text-[11px] text-text-3">
              <Text as="span">{authorName(p.author)}</Text>
              <Text as="span">{relativeTime(p.createdAt)}</Text>
              <Box className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.replyCount ?? 0}</Box>
              <Box className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likeCount ?? 0}</Box>
            </Box>
          </Link>
        ))}
      </Box>
    </Card>
  );
}
