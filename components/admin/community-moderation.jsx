"use client";

import { useEffect, useState } from "react";
import {
  Award,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessagesSquare,
  Search,
  Trash2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/notifications";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteAdminCommunityPost,
  deleteAdminCommunityReply,
  fetchAdminCommunity,
  fetchAdminCommunityPost,
} from "@/services/api/admin/community-api";

const TABS = [
  { key: "all", label: "All" },
  { key: "question", label: "Questions" },
  { key: "achievement", label: "Achievements" },
  { key: "discussion", label: "Discussions" },
];
const TYPE_META = {
  question: { label: "Question", icon: HelpCircle, tone: "bg-accent-tint text-accent-blue" },
  achievement: { label: "Achievement", icon: Award, tone: "bg-[#FBF3E6] text-[#8A6200]" },
  discussion: { label: "Discussion", icon: MessagesSquare, tone: "bg-[#F3EEFC] text-[#6D28D9]" },
};

export function CommunityModeration() {
  const { user } = useAuth();
  const canModerate = (user?.permissions ?? []).includes("moderate_community");

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind:'post'|'reply', id, label }
  const [working, setWorking] = useState(false);

  useEffect(() => { setPage(1); }, [tab, search]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      setData(null);
      fetchAdminCommunity({ type: tab, search, page })
        .then(setData)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [user, tab, search, page]);

  async function runDelete() {
    if (!confirm) return;
    setWorking(true);
    try {
      if (confirm.kind === "post") {
        await deleteAdminCommunityPost({ postId: confirm.id });
        setData((d) => d && { ...d, posts: d.posts.filter((p) => p.id !== confirm.id), total: Math.max(0, d.total - 1) });
      } else {
        await deleteAdminCommunityReply({ replyId: confirm.id });
      }
      setConfirm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <Box className="space-y-5">
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                tab === t.key
                  ? "border-navy/20 bg-navy text-white shadow-sm"
                  : "border-border bg-white text-ink/70 hover:border-navy/20 hover:text-navy",
              )}
            >
              {t.label}
            </button>
          ))}
        </Box>
        <Box className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <Input
            value={search}
            placeholder="Search posts…"
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </Box>
      </Box>

      {error && (
        <Card className="p-4">
          <Text as="p" className="text-sm text-error">{error}</Text>
        </Card>
      )}

      {data === null ? (
        <Box className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </Box>
      ) : data.posts.length === 0 ? (
        <Card className="p-10 text-center">
          <Text as="p" className="font-semibold text-ink">No posts</Text>
          <Text as="p" className="mt-1 text-sm text-ink/60">
            Nothing matches this filter.
          </Text>
        </Card>
      ) : (
        <Box className="space-y-3">
          {data.posts.map((p) => (
            <ModRow key={p.id} post={p} canModerate={canModerate} onDelete={setConfirm} />
          ))}
        </Box>
      )}

      {data && data.total > data.limit && (
        <Box className="flex items-center justify-between pt-1">
          <Text as="span" className="text-xs text-ink/50">
            Page {data.page} of {totalPages} · {data.total} posts
          </Text>
          <Box className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}>
              Next
            </Button>
          </Box>
        </Box>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!working && !o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove this {confirm?.kind === "reply" ? "reply" : "post"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes {confirm?.label ? <strong>{confirm.label}</strong> : "it"}{" "}
              for everyone in your organization
              {confirm?.kind === "post" ? ", along with its replies" : ""}. The
              author is notified. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete} disabled={working} className="bg-error hover:bg-error text-white">
              {working ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

function ModRow({ post, canModerate, onDelete }) {
  const meta = TYPE_META[post.type] ?? TYPE_META.discussion;
  const TypeIcon = meta.icon;
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState(null);

  async function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && replies === null) {
      try {
        const d = await fetchAdminCommunityPost({ postId: post.id });
        setReplies(d.replies);
      } catch {
        setReplies([]);
      }
    }
  }

  return (
    <Card className="p-0 overflow-hidden">
      <Box className="flex items-start gap-3 p-4">
        <Box className="min-w-0 flex-1">
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className="text-sm font-semibold text-ink">
              {post.author?.name || "Someone"}
            </Text>
            {post.author?.email && (
              <Text as="span" className="text-xs text-ink/45">{post.author.email}</Text>
            )}
            <Text as="span" className="text-xs text-ink/40">{relativeTime(post.createdAt)}</Text>
            <Text as="span" className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", meta.tone)}>
              <TypeIcon className="h-3 w-3" />
              {meta.label}
            </Text>
          </Box>
          {post.title && <Text as="p" className="mt-1 font-semibold text-ink">{post.title}</Text>}
          {post.body && <Text as="p" className="mt-0.5 line-clamp-2 text-sm text-ink/70">{post.body}</Text>}
          <Box className="mt-2 flex items-center gap-4 text-xs text-ink/50">
            <Text as="span">{post.likeCount} likes</Text>
            <button type="button" onClick={toggle} className="inline-flex items-center gap-1 font-semibold text-accent-blue hover:underline">
              {post.replyCount} replies {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </Box>
        </Box>
        {canModerate && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 border-error/30 text-error hover:bg-error/10 hover:text-error"
            onClick={() => onDelete({ kind: "post", id: post.id, label: post.title || "this post" })}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </Box>

      {open && (
        <Box className="border-t border-border bg-surface-2 p-4">
          {replies === null ? (
            <Skeleton className="h-10 w-full" />
          ) : replies.length === 0 ? (
            <Text as="p" className="text-sm text-ink/50">No replies.</Text>
          ) : (
            <Box className="space-y-2">
              {replies.map((r) => (
                <Box key={r.id} className="flex items-start gap-2 rounded-lg bg-white p-3">
                  <Box className="min-w-0 flex-1">
                    <Box className="flex items-center gap-2">
                      <Text as="span" className="text-xs font-semibold text-ink">{r.author?.name || "Someone"}</Text>
                      <Text as="span" className="text-[11px] text-ink/40">{relativeTime(r.createdAt)}</Text>
                    </Box>
                    <Text as="p" className="mt-0.5 text-sm text-ink/80">{r.body}</Text>
                  </Box>
                  {canModerate && (
                    <button
                      type="button"
                      onClick={() => onDelete({ kind: "reply", id: r.id, label: "this reply" })}
                      className="shrink-0 text-ink/35 hover:text-error"
                      aria-label="Remove reply"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Card>
  );
}
