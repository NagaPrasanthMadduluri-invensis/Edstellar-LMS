"use client";

/**
 * Learning community engagement, shared by BOTH portals: the quick-reaction
 * controls, the "who reacted" dialog and the threaded replies. A learner and
 * an Admin take part in exactly the same way, so there is one component and
 * each portal passes its own API calls (`api`). The admin view additionally
 * passes `detailed`, which shows the full participant record (email,
 * department, when) in the reactions dialog.
 *
 * One reaction per person per post: picking another kind replaces it. The
 * main button is a one-click Like, and removes whatever reaction you hold.
 */

import { useEffect, useRef, useState } from "react";
import {
  CornerDownRight,
  GraduationCap,
  HandHeart,
  HandHelping,
  Heart,
  Lightbulb,
  Loader2,
  Send,
  ShieldCheck,
  SmilePlus,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/notifications";
import { COMMUNITY_BODY_MAX } from "@/lib/content-limits";
import {
  applyReaction,
  COMMUNITY_REACTIONS,
  reactionMeta,
  threadReplies,
  topReactions,
} from "@/lib/community-reactions";
import { EmojiPicker, insertEmoji } from "@/components/shared/emoji-picker";
import { Linkify } from "@/components/shared/linkify";
import { UserAvatar } from "@/components/shared/user-avatar";

const ICONS = { Heart, HandHelping, Lightbulb, HandHeart, GraduationCap, ThumbsUp };

function ReactionIcon({ kind, className }) {
  const meta = reactionMeta(kind);
  const Icon = (meta && ICONS[meta.icon]) || Heart;
  return <Icon className={className} aria-hidden="true" />;
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function Avatar({ src, name, size = "md", staff = false }) {
  const box = size === "sm" ? "size-8 text-[11px]" : "size-9 text-xs";
  if (src) return <UserAvatar src={src} name={name} className={cn(box, "shrink-0")} />;
  return (
    <Box
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        box,
        staff ? "bg-accent-blue" : "bg-navy/80",
      )}
    >
      {initials(name)}
    </Box>
  );
}

/** "L&D" marks an Admin taking part, so learners know who is answering. */
export function StaffChip() {
  return (
    <Text
      as="span"
      title="From your L&D team"
      className="inline-flex items-center gap-0.5 rounded-full bg-accent-tint px-1.5 py-0.5 text-[10px] font-bold text-accent-blue"
    >
      <ShieldCheck className="h-3 w-3" />L&amp;D
    </Text>
  );
}

// ── Reactions ────────────────────────────────────────────────────────────────

/**
 * The reaction row for one post. `initial` is the post as the API sent it
 * ({ myReaction, likeCount, reactions }). `api` = { react(postId, kind),
 * unreact(postId), fetchReactors(postId) }, the last returning
 * { people: [{ id, name, avatar, kind, isMe, isStaff, email?, department?,
 * reactedAt? }], counts }.
 */
export function ReactionControls({ postId, initial, api, detailed = false, disabled = false }) {
  const [state, setState] = useState({
    myReaction: initial.myReaction ?? (initial.likedByMe ? "like" : null),
    likeCount: initial.likeCount ?? 0,
    reactions: initial.reactions ?? {},
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  async function choose(kind) {
    if (busy || disabled) return;
    setPickerOpen(false);
    const before = state;
    const target = state.myReaction === kind ? null : kind;
    setState(applyReaction(state, target));
    setBusy(true);
    try {
      const r = target ? await api.react(postId, target) : await api.unreact(postId);
      setState({ myReaction: r.myReaction ?? null, likeCount: r.likeCount ?? 0, reactions: r.reactions ?? {} });
    } catch {
      setState(before);
    } finally {
      setBusy(false);
    }
  }

  const mine = reactionMeta(state.myReaction);
  const top = topReactions(state.reactions);
  const total = state.likeCount;

  return (
    <Box className="inline-flex flex-wrap items-center gap-1.5">
      {/* One click likes; when you hold any reaction it removes it. */}
      <button
        type="button"
        onClick={() => choose(state.myReaction ? state.myReaction : "like")}
        disabled={disabled}
        aria-pressed={!!mine}
        aria-label={mine ? `Remove your reaction (${mine.label})` : "Like this post"}
        title={mine ? `You reacted: ${mine.label}. Click to remove.` : "Like"}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold transition-colors",
          mine ? cn("bg-surface-3", mine.tone) : "text-ink/55 hover:bg-surface-3 hover:text-error",
        )}
      >
        <ReactionIcon kind={mine?.kind ?? "like"} className={cn("h-4 w-4", mine?.kind === "like" && "fill-current")} />
        {mine ? mine.label : "Like"}
      </button>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        {/* Base UI trigger: it IS the button (no asChild), so no nesting. */}
        <PopoverTrigger
          disabled={disabled}
          aria-label="Choose a reaction"
          title="React"
          className="inline-flex cursor-pointer items-center rounded-full p-1.5 text-ink/55 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <SmilePlus className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1.5">
          <Box role="group" aria-label="Reactions" className="flex flex-wrap gap-1">
            {COMMUNITY_REACTIONS.map((r) => {
              const active = state.myReaction === r.kind;
              return (
                <button
                  key={r.kind}
                  type="button"
                  onClick={() => choose(r.kind)}
                  aria-pressed={active}
                  title={active ? `Remove ${r.label}` : r.label}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors",
                    active ? "bg-accent-tint text-ink ring-1 ring-accent-blue/40" : "text-ink/70 hover:bg-surface-2",
                  )}
                >
                  <ReactionIcon kind={r.kind} className={cn("h-5 w-5", r.tone)} />
                  {r.label}
                </button>
              );
            })}
          </Box>
        </PopoverContent>
      </Popover>

      {/* Summary: the most-used kinds and the total; opens who reacted. */}
      <button
        type="button"
        onClick={() => setListOpen(true)}
        disabled={total === 0}
        aria-label={total > 0 ? `See who reacted (${total})` : "No reactions yet"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-sm transition-colors",
          total > 0 ? "cursor-pointer text-ink/70 hover:text-ink hover:underline" : "cursor-default text-ink/45",
        )}
      >
        {top.length > 0 && (
          <Box as="span" className="inline-flex -space-x-1">
            {top.map((r) => (
              <Box
                as="span"
                key={r.kind}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-surface-2"
              >
                <ReactionIcon kind={r.kind} className={cn("h-3 w-3", r.tone)} />
              </Box>
            ))}
          </Box>
        )}
        {total > 0 ? `${total} reaction${total === 1 ? "" : "s"}` : "No reactions"}
      </button>

      <ReactorsDialog
        open={listOpen}
        onOpenChange={setListOpen}
        postId={postId}
        api={api}
        detailed={detailed}
        counts={state.reactions}
        total={total}
      />
    </Box>
  );
}

function ReactorsDialog({ open, onOpenChange, postId, api, detailed, counts, total }) {
  const [people, setPeople] = useState(null);
  const [filter, setFilter] = useState("all");

  // Fetched on open, every time: the list changes as people react.
  useEffect(() => {
    if (!open) return;
    let live = true;
    setPeople(null);
    setFilter("all");
    api
      .fetchReactors(postId)
      .then((r) => { if (live) setPeople(r.people ?? []); })
      .catch(() => { if (live) setPeople([]); });
    return () => { live = false; };
  }, [open, postId, api]);

  const used = topReactions(counts, COMMUNITY_REACTIONS.length);
  const shown = (people ?? []).filter((p) => filter === "all" || p.kind === filter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={detailed ? "sm:max-w-lg" : "sm:max-w-sm"}>
        <DialogHeader>
          <DialogTitle>Reactions</DialogTitle>
          <DialogDescription>
            {total} {total === 1 ? "person" : "people"} reacted to this post.
          </DialogDescription>
        </DialogHeader>

        <Box role="tablist" aria-label="Filter by reaction" className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All {total}</FilterChip>
          {used.map((r) => (
            <FilterChip key={r.kind} active={filter === r.kind} onClick={() => setFilter(r.kind)}>
              <ReactionIcon kind={r.kind} className={cn("h-3.5 w-3.5", r.tone)} />
              {r.label} {r.count}
            </FilterChip>
          ))}
        </Box>

        {people === null ? (
          <Box className="space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Box key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </Box>
            ))}
          </Box>
        ) : shown.length === 0 ? (
          <Text as="p" className="py-6 text-center text-sm text-text-3">No reactions yet.</Text>
        ) : (
          <Box as="ul" className="max-h-80 divide-y divide-border overflow-y-auto">
            {shown.map((p) => {
              const meta = reactionMeta(p.kind);
              return (
                <Box as="li" key={p.id} className="flex items-center gap-3 py-2">
                  <Avatar src={p.avatar} name={p.name} staff={p.isStaff} />
                  <Box className="min-w-0 flex-1">
                    <Box className="flex flex-wrap items-center gap-1.5">
                      <Text as="span" className="text-sm font-medium text-ink">
                        {p.name}{p.isMe ? " (you)" : ""}
                      </Text>
                      {p.isStaff && <StaffChip />}
                    </Box>
                    {detailed && (
                      <Text as="span" className="block truncate text-xs text-text-3">
                        {[p.email, p.department].filter(Boolean).join(" · ")}
                        {p.reactedAt ? ` · ${relativeTime(p.reactedAt)}` : ""}
                      </Text>
                    )}
                  </Box>
                  {meta && (
                    <Text as="span" className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold", meta.tone)}>
                      <ReactionIcon kind={meta.kind} className="h-3.5 w-3.5" />
                      {meta.label}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
        active ? "border-navy/20 bg-navy text-white" : "border-border bg-white text-ink/70 hover:border-navy/20",
      )}
    >
      {children}
    </button>
  );
}

// ── Replies ─────────────────────────────────────────────────────────────────

/**
 * Replies under a post, with responses nested one level under the reply they
 * answer. `api` = { createReply(postId, body, parentReplyId) }. Deleting is the
 * portal's decision: `canDelete(reply)` says whether to show the bin and
 * `onDelete(reply)` does it (the learner deletes their own at once; a
 * moderator confirms first), resolving true when the reply is gone.
 */
export function ReplyThread({
  post,
  replies,
  onRepliesChange,
  api,
  canDelete,
  onDelete,
  disabled = false,
}) {
  const isQuestion = post.type === "question";
  const [respondTo, setRespondTo] = useState(null); // top-level reply being answered

  const threads = threadReplies(replies);

  async function remove(reply) {
    const gone = await onDelete(reply);
    if (gone) onRepliesChange((prev) => prev.filter((r) => r.id !== reply.id && r.parentReplyId !== reply.id));
  }

  function added(reply) {
    onRepliesChange((prev) => [...prev, reply]);
  }

  return (
    <Box className="space-y-3">
      {threads.map((t) => (
        <Box key={t.id} className="space-y-2">
          <ReplyItem
            reply={t}
            isQuestion={isQuestion}
            canDelete={canDelete(t)}
            onDelete={() => remove(t)}
            onRespond={disabled ? null : () => setRespondTo(t.id)}
          />
          {(t.responses.length > 0 || respondTo === t.id) && (
            <Box className="ml-6 space-y-2 border-l-2 border-border pl-3 sm:ml-10">
              {t.responses.map((c) => (
                <ReplyItem
                  key={c.id}
                  reply={c}
                  small
                  isQuestion={isQuestion}
                  canDelete={canDelete(c)}
                  onDelete={() => remove(c)}
                  onRespond={disabled ? null : () => setRespondTo(t.id)}
                />
              ))}
              {respondTo === t.id && (
                <Composer
                  autoFocus
                  postId={post.id}
                  parentReplyId={t.id}
                  api={api}
                  placeholder={`Respond to ${t.author?.name || "this reply"}…`}
                  label="Send response"
                  onCancel={() => setRespondTo(null)}
                  onSent={(r) => { added(r); setRespondTo(null); }}
                />
              )}
            </Box>
          )}
        </Box>
      ))}

      {threads.length === 0 && (
        <Text as="p" className="text-sm text-ink/50">
          {isQuestion ? "No contributions yet. Be the first to help." : "No comments yet."}
        </Text>
      )}

      {!disabled && (
        <Composer
          postId={post.id}
          api={api}
          placeholder={isQuestion ? "Share what you know…" : "Write a comment…"}
          label={isQuestion ? "Contribute" : "Comment"}
          onSent={added}
        />
      )}
    </Box>
  );
}

function ReplyItem({ reply, small = false, isQuestion, canDelete, onDelete, onRespond }) {
  return (
    <Box className="flex items-start gap-2.5">
      <Avatar src={reply.author?.avatar} name={reply.author?.name} size="sm" staff={reply.author?.isStaff} />
      <Box className={cn("min-w-0 flex-1 rounded-lg bg-white p-3", small && "py-2")}>
        <Box className="flex flex-wrap items-center gap-2">
          <Text as="span" className="text-xs font-semibold text-ink">{reply.author?.name || "Someone"}</Text>
          {reply.author?.isStaff && <StaffChip />}
          {reply.isPostAuthor && (
            <Text as="span" className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-text-2">
              {isQuestion ? "Asker" : "Author"}
            </Text>
          )}
          <Text as="span" className="text-[11px] text-ink/40">{relativeTime(reply.createdAt)}</Text>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto cursor-pointer text-ink/35 hover:text-error"
              aria-label="Delete reply"
              title="Delete reply"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </Box>
        <Text as="p" className="mt-0.5 whitespace-pre-wrap text-sm text-ink/80">
          <Linkify className="text-accent-blue">{reply.body}</Linkify>
        </Text>
        {onRespond && (
          <button
            type="button"
            onClick={onRespond}
            className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent-blue hover:underline"
          >
            <CornerDownRight className="h-3 w-3" />Respond
          </button>
        )}
      </Box>
    </Box>
  );
}

function Composer({ postId, parentReplyId, api, placeholder, label, onSent, onCancel, autoFocus = false }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const { reply } = await api.createReply(postId, text, parentReplyId);
      setBody("");
      onSent(reply);
    } catch (e) {
      setError(e?.message || "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Box className="space-y-1">
      <Box className="flex items-end gap-2 pt-1">
        <Textarea
          ref={ref}
          rows={2}
          autoFocus={autoFocus}
          value={body}
          maxLength={COMMUNITY_BODY_MAX}
          placeholder={placeholder}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-0 resize-none bg-white"
        />
        <EmojiPicker onSelect={(e) => insertEmoji(ref, setBody, e)} />
        {onCancel && (
          <Button size="icon" variant="ghost" onClick={onCancel} aria-label="Cancel response" title="Cancel">
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" disabled={sending || !body.trim()} onClick={send} aria-label={label} title={label}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </Box>
      {error && <Text as="p" className="text-xs text-error">{error}</Text>}
    </Box>
  );
}
