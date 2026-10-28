"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Hash,
  Heart,
  HelpCircle,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EmojiPicker, insertEmoji } from "@/components/shared/emoji-picker";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  COMMUNITY_BODY_MAX,
  COMMUNITY_TITLE_MAX,
  COMMUNITY_HASHTAGS_PER_POST_MAX,
  KUDOS_MESSAGE_MAX,
} from "@/lib/content-limits";
import { normalizeHashtag } from "@/lib/community-hashtags";
import { useAuth } from "@/hooks/use-auth";
import {
  createCommunityPost,
  createCommunityReply,
  deleteCommunityPost,
  deleteCommunityReply,
  fetchCommunityFeed,
  fetchCommunityGroups,
  fetchCommunityLikers,
  fetchCommunityPost,
  fetchKudosLeaderboard,
  fetchMyCertificates,
  fetchTrendingHashtags,
  giveKudos,
  joinCommunityGroup,
  leaveCommunityGroup,
  likeCommunityPost,
  searchPeople,
  suggestHashtags,
  unlikeCommunityPost,
} from "@/services/api/learner/community-api";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Linkify } from "@/components/shared/linkify";

const TYPE_TABS = [
  { key: "all", label: "All" },
  { key: "question", label: "Questions" },
  { key: "achievement", label: "Achievements" },
  { key: "discussion", label: "Discussions" },
];

const TYPE_META = {
  question: { label: "Question", icon: HelpCircle, tone: "bg-accent-tint text-accent-blue", reply: "Contribute", replies: "Contributions" },
  achievement: { label: "Achievement", icon: Award, tone: "bg-[#FBF3E6] text-[#8A6200]", reply: "Comment", replies: "Comments" },
  discussion: { label: "Discussion", icon: MessagesSquare, tone: "bg-[#F3EEFC] text-[#6D28D9]", reply: "Comment", replies: "Comments" },
  kudos: { label: "Kudos", icon: Sparkles, tone: "bg-success/10 text-success", reply: "Comment", replies: "Comments" },
};

function initials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function CommunityContent() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [tab, setTab] = useState("all");
  const [hashtag, setHashtag] = useState(null); // active hashtag filter (normalised tag)
  const [loadingMore, setLoadingMore] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [kudosOpen, setKudosOpen] = useState(false);
  const [trending, setTrending] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null); // the group being viewed, or null (main feed)
  const [groupBusy, setGroupBusy] = useState(false);

  async function load(reset) {
    try {
      const data = await fetchCommunityFeed({
        type: tab,
        hashtag: hashtag || undefined,
        group: activeGroup?.id || undefined,
        cursor: reset ? undefined : nextCursor,
      });
      setPosts((prev) => (reset || !prev ? data.posts : [...prev, ...data.posts]));
      setNextCursor(data.nextCursor);
      setDisabled(false);
      setError(null);
    } catch (e) {
      if (e.status === 403) setDisabled(true);
      else setError(e.message);
    }
  }

  useEffect(() => {
    if (!user) return;
    setPosts(null);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab, hashtag, activeGroup]);

  // Trending hashtags — fetched once; a quiet failure just hides the row.
  useEffect(() => {
    if (!user) return;
    fetchTrendingHashtags()
      .then((d) => setTrending(d.hashtags || []))
      .catch(() => setTrending([]));
  }, [user]);

  const loadGroups = useCallback(() => {
    return fetchCommunityGroups()
      .then((d) => setGroups(d.groups || []))
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadGroups();
  }, [user, loadGroups]);

  function openGroup(g) {
    setActiveGroup(g);
    setHashtag(null);
    setTab("all");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function backToCommunity() {
    setActiveGroup(null);
  }

  async function toggleJoin() {
    if (!activeGroup || groupBusy) return;
    setGroupBusy(true);
    const joining = !activeGroup.joined;
    try {
      if (joining) await joinCommunityGroup({ groupId: activeGroup.id });
      else await leaveCommunityGroup({ groupId: activeGroup.id });
      setActiveGroup((g) => ({
        ...g,
        joined: joining,
        memberCount: Math.max(0, (g.memberCount ?? 0) + (joining ? 1 : -1)),
      }));
      loadGroups();
    } catch {
      /* leave the button state; a refetch of groups keeps truth */
    } finally {
      setGroupBusy(false);
    }
  }

  function pickHashtag(tag) {
    setHashtag(tag);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadMore() {
    setLoadingMore(true);
    await load(false);
    setLoadingMore(false);
  }

  function onCreated(post) {
    setPosts((prev) => [post, ...(prev ?? [])]);
    setComposeOpen(false);
  }
  function onDeleted(id) {
    setPosts((prev) => (prev ?? []).filter((p) => p.id !== id));
  }

  if (disabled) {
    return (
      <Card className="p-10 text-center">
        <MessagesSquare className="mx-auto h-8 w-8 text-ink/30" />
        <Text as="p" className="mt-3 font-semibold text-ink">
          The learning community is turned off
        </Text>
        <Text as="p" className="mt-1 text-sm text-ink/60">
          Your organization has not enabled the community yet. Ask your admin to
          switch it on in Organization settings.
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-error text-sm">{error}</Text>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => load(true)}>
          Retry
        </Button>
      </Card>
    );
  }

  const canPost = !activeGroup || activeGroup.joined;

  return (
    <Box className="space-y-5">
      {/* Spaces: the main community plus the admin-created groups you can join. */}
      {(groups.length > 0 || activeGroup) && (
        <Box className="flex flex-wrap items-center gap-2">
          <Text as="span" className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50">
            <UsersRound className="h-3.5 w-3.5" />Spaces
          </Text>
          <button
            type="button"
            onClick={backToCommunity}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              !activeGroup ? "border-navy/20 bg-navy text-white" : "border-border bg-white text-ink/70 hover:border-navy/20",
            )}
          >
            Community
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => openGroup(g)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                activeGroup?.id === g.id ? "border-navy/20 bg-navy text-white" : "border-border bg-white text-ink/70 hover:border-navy/20",
              )}
            >
              {g.name}
              {g.joined && <Text as="span" className="ml-1 text-[10px] opacity-70">· joined</Text>}
            </button>
          ))}
        </Box>
      )}

      {/* Group header, when a group is open. */}
      {activeGroup && (
        <Card className="p-4">
          <Box className="flex items-start justify-between gap-3">
            <Box className="min-w-0">
              <button
                type="button"
                onClick={backToCommunity}
                className="mb-1 inline-flex items-center gap-1 text-xs text-ink/50 transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-3 w-3" />Back to community
              </button>
              <Text as="h2" className="text-lg font-bold text-ink">{activeGroup.name}</Text>
              {activeGroup.description && (
                <Text as="p" className="mt-0.5 text-sm text-ink/70">{activeGroup.description}</Text>
              )}
              <Text as="p" className="mt-1 inline-flex items-center gap-1 text-xs text-ink/50">
                <Users className="h-3 w-3" />
                {activeGroup.memberCount} member{activeGroup.memberCount === 1 ? "" : "s"}
              </Text>
            </Box>
            <Button
              size="sm"
              variant={activeGroup.joined ? "outline" : "default"}
              disabled={groupBusy}
              onClick={toggleJoin}
            >
              {activeGroup.joined ? "Leave" : "Join"}
            </Button>
          </Box>
        </Card>
      )}

      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box className="flex flex-wrap gap-2">
          {TYPE_TABS.map((t) => (
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
        <Box className="flex gap-2">
          {!activeGroup && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setKudosOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Give kudos
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!canPost}
            title={canPost ? undefined : "Join the group to post in it"}
            onClick={() => setComposeOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Share something
          </Button>
        </Box>
      </Box>

      {/* Trending hashtags — a quick way into popular discussions. */}
      {trending.length > 0 && !hashtag && (
        <Box className="flex flex-wrap items-center gap-2">
          <Text as="span" className="text-xs font-semibold text-ink/50">Trending</Text>
          {trending.map((h) => (
            <button
              key={h.tag}
              type="button"
              onClick={() => pickHashtag(h.tag)}
              className="inline-flex items-center gap-0.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-accent-blue transition-colors hover:border-accent-blue/40 hover:bg-accent-tint"
            >
              <Hash className="h-3 w-3" />{h.label}
            </button>
          ))}
        </Box>
      )}

      {/* Active hashtag filter banner. */}
      {hashtag && (
        <Box className="flex items-center justify-between gap-3 rounded-lg border border-accent-blue/25 bg-accent-tint px-3 py-2">
          <Text as="span" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-blue">
            <Hash className="h-4 w-4" />Posts tagged {hashtag}
          </Text>
          <button
            type="button"
            onClick={() => setHashtag(null)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink/60 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />Clear
          </button>
        </Box>
      )}

      {posts === null ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center">
          <Text as="p" className="font-semibold text-ink">Nothing here yet</Text>
          <Text as="p" className="mt-1 text-sm text-ink/60">
            Ask a question or share an achievement. Your admins post discussions.
          </Text>
        </Card>
      ) : (
        <Box className="space-y-4">
          {posts.map((p) => (
            <CommunityPostCard key={p.id} post={p} onDeleted={onDeleted} onHashtag={pickHashtag} />
          ))}
          {nextCursor && (
            <Box className="flex justify-center pt-1">
              <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onCreated={onCreated}
        groupId={activeGroup?.id ?? null}
        groupName={activeGroup?.name ?? null}
      />
      <KudosDialog open={kudosOpen} onOpenChange={setKudosOpen} onCreated={onCreated} />
    </Box>
  );
}

export function CommunityPostCard({ post, onDeleted, onHashtag }) {
  const meta = TYPE_META[post.type] ?? TYPE_META.discussion;
  const TypeIcon = meta.icon;

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const replyRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [likers, setLikers] = useState(null);

  async function openLikers() {
    setLikersOpen(true);
    setLikers(null);
    try {
      const r = await fetchCommunityLikers({ postId: post.id });
      setLikers(r.likers || []);
    } catch {
      setLikers([]);
    }
  }

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const r = next
        ? await likeCommunityPost({ postId: post.id })
        : await unlikeCommunityPost({ postId: post.id });
      setLikeCount(r.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function toggleReplies() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && replies === null) {
      try {
        const data = await fetchCommunityPost({ postId: post.id });
        setReplies(data.replies);
      } catch {
        setReplies([]);
      }
    }
  }

  async function submitReply() {
    const body = replyBody.trim();
    if (!body) return;
    setSending(true);
    try {
      const { reply } = await createCommunityReply({ postId: post.id, body });
      setReplies((prev) => [...(prev ?? []), reply]);
      setReplyCount((c) => c + 1);
      setReplyBody("");
    } catch {
      /* surfaced by the button staying enabled */
    } finally {
      setSending(false);
    }
  }

  async function removeReply(id) {
    try {
      await deleteCommunityReply({ replyId: id });
      setReplies((prev) => (prev ?? []).filter((r) => r.id !== id));
      setReplyCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }

  async function removePost() {
    setDeleting(true);
    try {
      await deleteCommunityPost({ postId: post.id });
      onDeleted?.(post.id);
    } catch {
      setDeleting(false);
      setConfirmDel(false);
    }
  }

  return (
    <Card className="p-0 overflow-hidden">
      <Box className="p-5">
        <Box className="flex items-start gap-3">
          {post.author?.avatar ? (
            <UserAvatar src={post.author.avatar} name={post.author?.name} className="size-10 shrink-0" />
          ) : (
            <Box className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
              {initials(post.author?.name)}
            </Box>
          )}
          <Box className="min-w-0 flex-1">
            <Box className="flex flex-wrap items-center gap-2">
              <Text as="span" className="text-sm font-semibold text-ink">
                {post.author?.name || "Someone"}
              </Text>
              <Text as="span" className="text-xs text-ink/45">
                {relativeTime(post.createdAt)}
              </Text>
              <Text
                as="span"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                  meta.tone,
                )}
              >
                <TypeIcon className="h-3 w-3" />
                {meta.label}
              </Text>
            </Box>

            {post.type === "kudos" && post.recipient && (
              <Box className="mt-1.5 inline-flex flex-wrap items-center gap-2">
                <Text as="span" className="text-sm text-ink/60">gave kudos to</Text>
                {post.recipient.avatar ? (
                  <UserAvatar src={post.recipient.avatar} name={post.recipient.name} className="size-6 shrink-0" />
                ) : (
                  <Box className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-[10px] font-bold text-success">
                    {initials(post.recipient.name)}
                  </Box>
                )}
                <Text as="span" className="text-sm font-semibold text-ink">{post.recipient.name}</Text>
              </Box>
            )}

            {post.title && (
              <Text as="h3" className="mt-1.5 text-lg font-bold text-ink">
                {post.title}
              </Text>
            )}
            {post.body && (
              <Text as="p" className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                <Linkify className="text-accent-blue">{post.body}</Linkify>
              </Text>
            )}

            {post.certificate && (
              <Box className="mt-3 flex items-center gap-3 rounded-lg border border-success/25 bg-success/5 p-3">
                <Award className="h-5 w-5 shrink-0 text-success" />
                <Box className="min-w-0 flex-1">
                  <Text as="p" className="text-sm font-semibold text-ink">
                    Certificate earned
                    {post.certificate.revoked && (
                      <Text as="span" className="ml-2 text-xs font-bold text-error">
                        (revoked)
                      </Text>
                    )}
                  </Text>
                  <Text as="p" className="font-mono text-xs text-ink/50">
                    {post.certificate.code}
                  </Text>
                </Box>
                <Link
                  href="/certifications"
                  className="shrink-0 text-xs font-semibold text-accent-blue hover:underline"
                >
                  View
                </Link>
              </Box>
            )}

            {post.hashtags?.length > 0 && (
              <Box className="mt-3 flex flex-wrap gap-1.5">
                {post.hashtags.map((h) => (
                  <button
                    key={h.tag}
                    type="button"
                    onClick={() => onHashtag?.(h.tag)}
                    className="inline-flex items-center gap-0.5 rounded-full bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent-blue transition-colors hover:underline"
                  >
                    <Hash className="h-3 w-3" />{h.label}
                  </button>
                ))}
              </Box>
            )}
          </Box>

          {post.isMine && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-ink/40 hover:text-error"
              aria-label="Delete post"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </Box>

        <Box className="mt-4 flex items-center gap-4 border-t border-border pt-3">
          {/* Heart toggles the like; the count text opens the list of likers. */}
          <Box className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <button
              type="button"
              onClick={toggleLike}
              aria-label={liked ? "Remove your like" : "Like this post"}
              aria-pressed={liked}
              className={cn(
                "inline-flex items-center transition-colors",
                liked ? "text-error" : "text-ink/55 hover:text-error",
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={openLikers}
              disabled={likeCount === 0}
              className={cn(
                "transition-colors",
                likeCount > 0 ? "text-ink/70 hover:text-ink hover:underline" : "cursor-default text-ink/55",
              )}
            >
              {likeCount > 0 ? `${likeCount} ` : ""}Like{likeCount === 1 ? "" : "s"}
            </button>
          </Box>
          <button
            type="button"
            onClick={toggleReplies}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition-colors hover:text-ink"
          >
            <MessageSquare className="h-4 w-4" />
            {replyCount > 0 ? `${replyCount} ` : ""}
            {post.type === "question" ? meta.replies : "Comments"}
          </button>
        </Box>
      </Box>

      {open && (
        <Box className="border-t border-border bg-surface-2 p-5">
          {replies === null ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Box className="space-y-3">
              {replies.map((r) => (
                <Box key={r.id} className="flex items-start gap-2.5">
                  {r.author?.avatar ? (
                    <UserAvatar src={r.author.avatar} name={r.author?.name} className="size-8 shrink-0" />
                  ) : (
                    <Box className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/80 text-[11px] font-bold text-white">
                      {initials(r.author?.name)}
                    </Box>
                  )}
                  <Box className="min-w-0 flex-1 rounded-lg bg-white p-3">
                    <Box className="flex items-center gap-2">
                      <Text as="span" className="text-xs font-semibold text-ink">
                        {r.author?.name || "Someone"}
                      </Text>
                      <Text as="span" className="text-[11px] text-ink/40">
                        {relativeTime(r.createdAt)}
                      </Text>
                      {r.isMine && (
                        <button
                          type="button"
                          onClick={() => removeReply(r.id)}
                          className="ml-auto text-ink/35 hover:text-error"
                          aria-label="Delete reply"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </Box>
                    <Text as="p" className="mt-0.5 whitespace-pre-wrap text-sm text-ink/80">
                      <Linkify className="text-accent-blue">{r.body}</Linkify>
                    </Text>
                  </Box>
                </Box>
              ))}
              {replies.length === 0 && (
                <Text as="p" className="text-sm text-ink/50">
                  {post.type === "question"
                    ? "No contributions yet — be the first to help."
                    : "No comments yet."}
                </Text>
              )}

              <Box className="flex items-end gap-2 pt-1">
                <Textarea
                  ref={replyRef}
                  rows={2}
                  value={replyBody}
                  maxLength={COMMUNITY_BODY_MAX}
                  placeholder={
                    post.type === "question"
                      ? "Share what you know…"
                      : "Write a comment…"
                  }
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="min-h-0 resize-none bg-white"
                />
                <EmojiPicker onSelect={(e) => insertEmoji(replyRef, setReplyBody, e)} />
                <Button
                  size="icon"
                  disabled={sending || !replyBody.trim()}
                  onClick={submitReply}
                  aria-label={meta.reply}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}

      <AlertDialog open={confirmDel} onOpenChange={(o) => { if (!deleting) setConfirmDel(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your post and all of its replies for everyone. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removePost} disabled={deleting} className="bg-error hover:bg-error text-white">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Who liked this post */}
      <Dialog open={likersOpen} onOpenChange={setLikersOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Liked by</DialogTitle>
          </DialogHeader>
          {likers === null ? (
            <Box className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-3 w-32" />
                </Box>
              ))}
            </Box>
          ) : likers.length === 0 ? (
            <Text as="p" className="py-6 text-center text-sm text-text-3">No likes yet.</Text>
          ) : (
            <Box className="max-h-80 overflow-y-auto">
              {likers.map((p) => (
                <Box key={p.user_id} className="flex items-center gap-3 py-2">
                  <UserAvatar src={p.avatar} name={p.name} className="size-9 shrink-0" />
                  <Text as="p" className="text-sm font-medium text-ink">
                    {p.name}{p.is_me ? " (you)" : ""}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Discussions are admin-curated (§10.41), so the learner composer offers only
// questions and achievements. Admins start discussion threads.
const COMPOSE_TYPES = [
  { key: "question", label: "Ask a question", icon: HelpCircle, hint: "Get help from your peers" },
  { key: "achievement", label: "Share an achievement", icon: Award, hint: "Show a certificate you earned" },
];

function ComposeDialog({ open, onOpenChange, onCreated, groupId = null, groupName = null }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef(null);
  const [certId, setCertId] = useState("");
  const [certs, setCerts] = useState(null);
  const [tags, setTags] = useState([]); // [{tag,label}]
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) {
      // reset on close
      setStep(1); setType(null); setTitle(""); setBody(""); setCertId(""); setTags([]); setErr(null);
    }
  }, [open]);

  async function pick(t) {
    setType(t);
    setStep(2);
    if (t === "achievement" && certs === null) {
      try {
        const data = await fetchMyCertificates();
        setCerts((data.certificates || []).filter((c) => !c.isRevoked));
      } catch {
        setCerts([]);
      }
    }
  }

  async function submit() {
    setErr(null);
    setSubmitting(true);
    try {
      const payload = { type };
      if (type === "achievement") {
        if (!certId) { setErr("Choose a certificate to share."); setSubmitting(false); return; }
        payload.certificateId = Number(certId);
        payload.body = body.trim() || undefined;
      } else {
        if (!title.trim()) { setErr("A title is required."); setSubmitting(false); return; }
        payload.title = title.trim();
        payload.body = body.trim() || undefined;
      }
      if (tags.length === 0) {
        setErr("Add at least one hashtag.");
        setSubmitting(false);
        return;
      }
      payload.hashtags = tags.map((t) => t.label);
      if (groupId) payload.groupId = groupId;
      const { post } = await createCommunityPost(payload);
      onCreated(post);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "What would you like to share?" : COMPOSE_TYPES.find((c) => c.key === type)?.label}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Pick a type — it changes how people can respond."
              : groupName
                ? `Posting in ${groupName}.`
                : "Posts are visible to everyone in your organization."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <Box className="grid gap-3">
            {COMPOSE_TYPES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => pick(c.key)}
                className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-navy/30 hover:bg-surface-2"
              >
                <Box className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-tint text-accent-blue">
                  <c.icon className="h-5 w-5" />
                </Box>
                <Box>
                  <Text as="p" className="font-semibold text-ink">{c.label}</Text>
                  <Text as="p" className="text-xs text-ink/55">{c.hint}</Text>
                </Box>
              </button>
            ))}
          </Box>
        ) : (
          <Box className="space-y-4">
            {type === "achievement" ? (
              <Box className="space-y-1.5">
                <Label htmlFor="cert" className="text-sm font-medium text-ink/80">Certificate</Label>
                {certs === null ? (
                  <Skeleton className="h-10 w-full" />
                ) : certs.length === 0 ? (
                  <Text as="p" className="text-sm text-ink/60">
                    You have no certificates to share yet.
                  </Text>
                ) : (
                  <select
                    id="cert"
                    value={certId}
                    onChange={(e) => setCertId(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-paper-warm px-3 text-sm"
                  >
                    <option value="">Choose a certificate…</option>
                    {certs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.courseName || c.journeyName}
                      </option>
                    ))}
                  </select>
                )}
              </Box>
            ) : (
              <Box className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium text-ink/80">Title</Label>
                <Input
                  id="title"
                  value={title}
                  maxLength={COMMUNITY_TITLE_MAX}
                  placeholder={type === "question" ? "What do you want to ask?" : "What is this about?"}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Box>
            )}

            <Box className="space-y-1.5">
              <Box className="flex items-center justify-between">
                <Label htmlFor="body" className="text-sm font-medium text-ink/80">
                  {type === "achievement" ? "Caption (optional)" : type === "question" ? "Details" : "Message"}
                </Label>
                <EmojiPicker onSelect={(e) => insertEmoji(bodyRef, setBody, e)} />
              </Box>
              <Textarea
                ref={bodyRef}
                id="body"
                rows={4}
                value={body}
                maxLength={COMMUNITY_BODY_MAX}
                placeholder={type === "achievement" ? "Say a few words…" : "Add some detail…"}
                onChange={(e) => setBody(e.target.value)}
                className="resize-none bg-paper-warm"
              />
            </Box>

            <Box className="space-y-1.5">
              <Label className="text-sm font-medium text-ink/80">
                Hashtags <Text as="span" className="text-ink/45">(at least one)</Text>
              </Label>
              <HashtagInput value={tags} onChange={setTags} />
            </Box>

            {err && <Text as="p" className="text-sm text-error">{err}</Text>}
          </Box>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
              Back
            </Button>
          )}
          {step === 2 && (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Posting…" : "Post"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* A chip-style hashtag input with reuse-the-existing autocomplete. */
function HashtagInput({ value, onChange }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const atMax = value.length >= COMMUNITY_HASHTAGS_PER_POST_MAX;

  useEffect(() => {
    const q = input.trim();
    if (!q) { setSuggestions([]); return undefined; }
    let live = true;
    const id = setTimeout(() => {
      suggestHashtags({ q })
        .then((d) => {
          if (!live) return;
          const have = new Set(value.map((t) => t.tag));
          setSuggestions((d.hashtags || []).filter((h) => !have.has(h.tag)));
        })
        .catch(() => live && setSuggestions([]));
    }, 180);
    return () => { live = false; clearTimeout(id); };
  }, [input, value]);

  function addTag(raw) {
    const n = normalizeHashtag(raw);
    setInput("");
    setSuggestions([]);
    if (!n || atMax) return;
    if (!value.some((t) => t.tag === n.tag)) onChange([...value, n]);
  }
  function removeTag(tag) { onChange(value.filter((t) => t.tag !== tag)); }

  return (
    <Box className="space-y-1.5">
      <Box className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-paper-warm p-2">
        {value.map((t) => (
          <Text as="span" key={t.tag} className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent-blue">
            <Hash className="h-3 w-3" />{t.label}
            <button type="button" onClick={() => removeTag(t.tag)} aria-label={`Remove ${t.label}`} className="text-accent-blue/60 hover:text-accent-blue">
              <X className="h-3 w-3" />
            </button>
          </Text>
        ))}
        {!atMax && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === " ") { e.preventDefault(); addTag(input); }
              else if (e.key === "Backspace" && !input && value.length) removeTag(value[value.length - 1].tag);
            }}
            placeholder={value.length ? "Add another…" : "e.g. Renewables, AdvancedAI"}
            className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
          />
        )}
      </Box>
      {suggestions.length > 0 && (
        <Box className="flex flex-wrap gap-1.5">
          {suggestions.map((h) => (
            <button
              key={h.tag}
              type="button"
              onClick={() => addTag(h.label)}
              className="inline-flex items-center gap-0.5 rounded-full border border-border bg-white px-2 py-0.5 text-xs text-ink/70 transition-colors hover:border-accent-blue/40 hover:text-accent-blue"
            >
              <Hash className="h-3 w-3" />{h.label}
              <Text as="span" className="ml-0.5 text-ink/40">{h.count}</Text>
            </button>
          ))}
        </Box>
      )}
      <Text as="p" className="text-[11px] text-ink/45">
        Press Enter or comma to add. {value.length}/{COMMUNITY_HASHTAGS_PER_POST_MAX}
      </Text>
    </Box>
  );
}

/* Give kudos: pick a colleague, write a message. */
function KudosDialog({ open, onOpenChange, onCreated }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [message, setMessage] = useState("");
  const msgRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); setRecipient(null); setMessage(""); setErr(null); }
  }, [open]);

  useEffect(() => {
    if (!open || recipient) return undefined;
    let live = true;
    const id = setTimeout(() => {
      searchPeople({ q: q.trim() || undefined })
        .then((d) => live && setResults(d.people || []))
        .catch(() => live && setResults([]));
    }, 180);
    return () => { live = false; clearTimeout(id); };
  }, [q, recipient, open]);

  async function submit() {
    if (!recipient) { setErr("Choose who to recognise."); return; }
    if (!message.trim()) { setErr("Add a short message."); return; }
    setErr(null);
    setSubmitting(true);
    try {
      const { post } = await giveKudos({ recipientUserId: recipient.id, message: message.trim() });
      onCreated(post);
      onOpenChange(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Give kudos</DialogTitle>
          <DialogDescription>
            Recognise a colleague — for teamwork, support, or sharing knowledge. It appears in the community feed.
          </DialogDescription>
        </DialogHeader>
        <Box className="space-y-4">
          {recipient ? (
            <Box className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
              {recipient.avatar ? (
                <UserAvatar src={recipient.avatar} name={recipient.name} className="size-9" />
              ) : (
                <Box className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{initials(recipient.name)}</Box>
              )}
              <Box className="min-w-0 flex-1">
                <Text as="p" className="text-sm font-semibold text-ink">{recipient.name}</Text>
                {recipient.department && <Text as="p" className="text-xs text-ink/55">{recipient.department}</Text>}
              </Box>
              <button type="button" onClick={() => setRecipient(null)} className="text-xs font-semibold text-accent-blue hover:underline">Change</button>
            </Box>
          ) : (
            <Box className="space-y-1.5">
              <Label className="text-sm font-medium text-ink/80">Who do you want to recognise?</Label>
              <Box className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-8" />
              </Box>
              <Box className="max-h-52 overflow-y-auto rounded-md border border-border">
                {results.length === 0 ? (
                  <Text as="p" className="p-3 text-center text-xs text-ink/50">No matching colleagues.</Text>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setRecipient(p); requestAnimationFrame(() => msgRef.current?.focus()); }}
                      className="flex w-full items-center gap-3 border-b border-border p-2.5 text-left last:border-0 hover:bg-surface-2"
                    >
                      {p.avatar ? (
                        <UserAvatar src={p.avatar} name={p.name} className="size-8" />
                      ) : (
                        <Box className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">{initials(p.name)}</Box>
                      )}
                      <Box className="min-w-0">
                        <Text as="p" className="truncate text-sm font-medium text-ink">{p.name}</Text>
                        {p.department && <Text as="p" className="truncate text-xs text-ink/50">{p.department}</Text>}
                      </Box>
                    </button>
                  ))
                )}
              </Box>
            </Box>
          )}

          <Box className="space-y-1.5">
            <Box className="flex items-center justify-between">
              <Label htmlFor="kudos-msg" className="text-sm font-medium text-ink/80">Message</Label>
              <EmojiPicker onSelect={(e) => insertEmoji(msgRef, setMessage, e)} />
            </Box>
            <Textarea
              ref={msgRef}
              id="kudos-msg"
              rows={3}
              value={message}
              maxLength={KUDOS_MESSAGE_MAX}
              placeholder="What are you recognising them for?"
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none bg-paper-warm"
            />
          </Box>

          {err && <Text as="p" className="text-sm text-error">{err}</Text>}
        </Box>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting || !recipient || !message.trim()} className="gap-1.5">
            <Sparkles className="h-4 w-4" />{submitting ? "Sending…" : "Give kudos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedSkeleton() {
  return (
    <Box className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5">
          <Box className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Box className="flex-1 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </Box>
          </Box>
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
        </Card>
      ))}
    </Box>
  );
}
