"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Heart,
  HelpCircle,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { COMMUNITY_BODY_MAX, COMMUNITY_TITLE_MAX } from "@/lib/content-limits";
import { useAuth } from "@/hooks/use-auth";
import {
  createCommunityPost,
  createCommunityReply,
  deleteCommunityPost,
  deleteCommunityReply,
  fetchCommunityFeed,
  fetchCommunityLikers,
  fetchCommunityPost,
  fetchMyCertificates,
  likeCommunityPost,
  unlikeCommunityPost,
} from "@/services/api/learner/community-api";
import { UserAvatar } from "@/components/shared/user-avatar";

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  async function load(reset) {
    try {
      const data = await fetchCommunityFeed({
        type: tab,
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
  }, [user, tab]);

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

  return (
    <Box className="space-y-5">
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
        <Button size="sm" className="gap-1.5" onClick={() => setComposeOpen(true)}>
          <Plus className="h-4 w-4" />
          Share something
        </Button>
      </Box>

      {posts === null ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center">
          <Text as="p" className="font-semibold text-ink">Nothing here yet</Text>
          <Text as="p" className="mt-1 text-sm text-ink/60">
            Ask a question, share an achievement, or start a discussion.
          </Text>
        </Card>
      ) : (
        <Box className="space-y-4">
          {posts.map((p) => (
            <CommunityPostCard key={p.id} post={p} onDeleted={onDeleted} />
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

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} onCreated={onCreated} />
    </Box>
  );
}

export function CommunityPostCard({ post, onDeleted }) {
  const meta = TYPE_META[post.type] ?? TYPE_META.discussion;
  const TypeIcon = meta.icon;

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState(null);
  const [replyBody, setReplyBody] = useState("");
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
          <Box className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
            {initials(post.author?.name)}
          </Box>
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

            {post.title && (
              <Text as="h3" className="mt-1.5 text-lg font-bold text-ink">
                {post.title}
              </Text>
            )}
            {post.body && (
              <Text as="p" className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                {post.body}
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
                  <Box className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/80 text-[11px] font-bold text-white">
                    {initials(r.author?.name)}
                  </Box>
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
                      {r.body}
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

const COMPOSE_TYPES = [
  { key: "question", label: "Ask a question", icon: HelpCircle, hint: "Get help from your peers" },
  { key: "achievement", label: "Share an achievement", icon: Award, hint: "Show a certificate you earned" },
  { key: "discussion", label: "Start a discussion", icon: MessagesSquare, hint: "Open a topic for the team" },
];

function ComposeDialog({ open, onOpenChange, onCreated }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [certId, setCertId] = useState("");
  const [certs, setCerts] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) {
      // reset on close
      setStep(1); setType(null); setTitle(""); setBody(""); setCertId(""); setErr(null);
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
              <Label htmlFor="body" className="text-sm font-medium text-ink/80">
                {type === "achievement" ? "Caption (optional)" : type === "question" ? "Details" : "Message"}
              </Label>
              <Textarea
                id="body"
                rows={4}
                value={body}
                maxLength={COMMUNITY_BODY_MAX}
                placeholder={type === "achievement" ? "Say a few words…" : "Add some detail…"}
                onChange={(e) => setBody(e.target.value)}
                className="resize-none bg-paper-warm"
              />
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
