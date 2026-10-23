"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowDown, Send, MessageCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmojiPicker, insertEmoji } from "@/components/shared/emoji-picker";
import { Linkify } from "@/components/shared/linkify";
import { PageHeader } from "@/components/shared/page-header";
import { relativeTime } from "@/lib/notifications";
import { MESSAGE_MAX_LENGTH } from "@/lib/content-limits";
import {
  fetchConversations,
  fetchThread,
  sendMessage,
} from "@/services/api/learner/messages-api";

/* Postgres timestamps are not ISO — repair the offset before Date sees it. */
function toDate(value) {
  const d = new Date(String(value || "").trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isNaN(d.getTime()) ? null : d;
}
function when(value) {
  const d = toDate(value);
  return d ? relativeTime(d) : "";
}
/* A local (not UTC) day key, so a separator falls on the reader's midnight. */
function dayKey(value) {
  const d = toDate(value);
  return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "";
}
function dayLabel(value) {
  const d = toDate(value);
  if (!d) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Presence (0055): green "Available" when online, else "Active … ago" ── */
function PresenceLine({ online, lastSeen }) {
  if (online) {
    return (
      <Box className="flex items-center gap-1.5">
        <Box as="span" className="h-2 w-2 shrink-0 rounded-full bg-success" />
        <Text as="span" className="text-[11px] font-medium text-success">Available</Text>
      </Box>
    );
  }
  return (
    <Text as="span" className="text-[11px] text-text-3">
      {lastSeen ? `Active ${when(lastSeen)}` : "Offline"}
    </Text>
  );
}

/* A small green dot over an avatar, shown only when the person is online. */
function AvatarWithPresence({ src, name, online, className }) {
  return (
    <Box className="relative shrink-0">
      <UserAvatar src={src} name={name} className={className} />
      {online && (
        <Box
          as="span"
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success"
          aria-label="Available"
        />
      )}
    </Box>
  );
}

/* ── Conversation list ── */
function ConversationList({ items, activeId, onSelect, searching }) {
  if (items.length === 0) {
    return (
      <Box className="p-6 text-center">
        <Text as="p" className="text-xs text-text-3">
          {searching ? "No conversations match your search." : "No conversations yet."}
        </Text>
      </Box>
    );
  }
  return (
    <Box className="divide-y divide-line">
      {items.map((c) => (
        <button
          key={c.user_id}
          type="button"
          onClick={() => onSelect(c.user_id)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2",
            c.user_id === activeId && "bg-surface-2",
          )}
        >
          <AvatarWithPresence src={c.avatar_url} name={c.name} online={c.online} className="size-10" />
          <Box className="min-w-0 flex-1">
            <Box className="flex items-center justify-between gap-2">
              <Text as="p" className="truncate text-sm font-semibold text-ink">{c.name}</Text>
              <Text as="span" className="shrink-0 text-[10px] text-text-3">{when(c.last_message.at)}</Text>
            </Box>
            <Box className="flex items-center justify-between gap-2">
              <Text as="p" className={cn("truncate text-xs", c.unread > 0 ? "font-semibold text-ink" : "text-text-2")}>
                {c.last_message.from_me ? "You: " : ""}{c.last_message.body}
              </Text>
              {c.unread > 0 && (
                <Text as="span" className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent-blue px-1 text-[10px] font-bold text-white">
                  {c.unread}
                </Text>
              )}
            </Box>
          </Box>
        </button>
      ))}
    </Box>
  );
}

/* ── Thread + composer ── */
function Thread({ thread, loading, onSend, pending, onRetry, onBack }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const peerId = thread?.peer?.user_id;
  const msgCount = thread?.messages?.length ?? 0;
  const pendCount = pending?.length ?? 0;

  // Jump to the newest message, and remember that we are pinned to the bottom.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setShowJump(false);
  }, []);

  // Opening a conversation always lands on the newest message.
  useEffect(() => {
    if (peerId) scrollToBottom();
  }, [peerId, scrollToBottom]);

  // A new/changed message only pulls the view down if the reader is already at
  // the bottom — otherwise it would yank them away from history they are reading.
  useEffect(() => {
    if (atBottomRef.current) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else if (msgCount) {
      setShowJump(true);
    }
  }, [msgCount, pendCount]);

  // Grow the composer with its contents, up to the max height, then clamp back.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    if (near) setShowJump(false);
  };

  const submit = () => {
    const body = input.trim();
    if (!body) return;
    atBottomRef.current = true;
    onSend(body);
    setInput("");
    // Keep the cursor in the box so a quick back-and-forth needs no re-click.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (loading && !thread) {
    return (
      <Box className="flex h-full flex-col gap-3 p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-4 h-16 w-2/3 rounded-2xl" />
        <Skeleton className="h-12 w-1/2 self-end rounded-2xl" />
      </Box>
    );
  }

  if (!thread) {
    return (
      <Box className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <MessageCircle className="h-10 w-10 text-text-3" />
        <Text as="p" className="text-sm font-semibold text-ink">Your messages</Text>
        <Text as="p" className="max-w-xs text-xs text-text-2">
          Pick a conversation, or say hi to someone you are learning alongside from your dashboard.
        </Text>
      </Box>
    );
  }

  const firstName = thread.peer.name.split(" ")[0];
  let lastDay = null;

  return (
    <Box className="flex h-full min-h-0 flex-col">
      {/* Header — avatar + name + presence line */}
      <Box className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <button type="button" onClick={onBack} className="md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5 text-text-2" />
        </button>
        <AvatarWithPresence src={thread.peer.avatar_url} name={thread.peer.name} online={thread.peer.online} className="size-9" />
        <Box className="min-w-0">
          <Text as="p" className="truncate text-sm font-semibold leading-tight text-ink">{thread.peer.name}</Text>
          <PresenceLine online={thread.peer.online} lastSeen={thread.peer.last_seen} />
        </Box>
      </Box>

      {/* Messages — the ONLY thing that scrolls (min-h-0 lets it, not the page) */}
      <Box ref={scrollRef} onScroll={onScroll} className="relative flex-1 min-h-0 space-y-2.5 overflow-y-auto bg-surface-2/40 px-4 py-4">
        {thread.messages.length === 0 ? (
          <Box className="flex h-full items-center justify-center">
            <Text as="p" className="text-center text-xs text-text-3">
              No messages yet. Say hi to {firstName} below.
            </Text>
          </Box>
        ) : (
          thread.messages.map((m) => {
            const key = dayKey(m.at);
            const showDay = key !== lastDay;
            lastDay = key;
            return (
              <Box key={m.id}>
                {showDay && (
                  <Box className="my-3 flex items-center justify-center">
                    <Text as="span" className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[10px] font-medium text-text-3">
                      {dayLabel(m.at)}
                    </Text>
                  </Box>
                )}
                <Box className={cn("flex items-end gap-2", m.from_me ? "justify-end" : "justify-start")}>
                  {!m.from_me && (
                    <UserAvatar src={thread.peer.avatar_url} name={thread.peer.name} className="size-6 shrink-0" />
                  )}
                  <Box className="max-w-[78%]">
                    <Box
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-[13px] leading-snug",
                        m.from_me
                          ? "rounded-br-sm bg-accent-blue text-white"
                          : "rounded-bl-sm border border-line bg-surface text-ink",
                      )}
                    >
                      <Text as="span" className="whitespace-pre-wrap break-words text-inherit">
                        <Linkify>{m.body}</Linkify>
                      </Text>
                    </Box>
                    <Text as="p" className={cn("mt-0.5 text-[10px] text-text-3", m.from_me ? "text-right" : "text-left")}>
                      {when(m.at)}
                    </Text>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}

        {/* Optimistic bubbles — your message shows instantly, before the server
            confirms it; a failed send offers Retry rather than vanishing. */}
        {pending.map((p) => (
          <Box key={p.tempId} className="flex items-end justify-end gap-2">
            <Box className="max-w-[78%]">
              <Box
                className={cn(
                  "rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px] leading-snug",
                  p.failed ? "border border-danger/40 bg-danger/10 text-ink" : "bg-accent-blue/70 text-white",
                )}
              >
                <Text as="span" className="whitespace-pre-wrap break-words text-inherit">
                  <Linkify>{p.body}</Linkify>
                </Text>
              </Box>
              {p.failed ? (
                <Text as="p" className="mt-0.5 text-right text-[10px] text-danger">
                  Not delivered ·{" "}
                  <button type="button" onClick={() => onRetry(p.tempId)} className="font-semibold underline">
                    Retry
                  </button>
                </Text>
              ) : (
                <Text as="p" className="mt-0.5 text-right text-[10px] text-text-3">Sending…</Text>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* A nudge back to the newest message when the reader has scrolled up. */}
      {showJump && (
        <Box className="relative">
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute -top-12 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-accent-blue shadow-sm hover:bg-surface-2"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Latest messages
          </button>
        </Box>
      )}

      {/* Composer */}
      <Box className="border-t border-line p-3">
        <Box className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder={`Message ${firstName}…`}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent-blue"
          />
          <EmojiPicker onSelect={(e) => insertEmoji(inputRef, setInput, e)} />
          <Button
            onClick={submit}
            disabled={input.trim().length === 0}
            className="h-10 shrink-0 gap-1.5 bg-navy text-paper hover:bg-navy-soft"
          >
            <Send className="h-4 w-4" />
            <Text as="span" className="hidden text-inherit sm:inline">Send</Text>
          </Button>
        </Box>
        <Text as="p" className="mt-1 px-1 text-[10px] text-text-3">
          Enter to send · Shift + Enter for a new line
        </Text>
      </Box>
    </Box>
  );
}

/* ── Page ── */
export function MessagesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const withParam = params.get("with");

  const [conversations, setConversations] = useState(null);
  const [activeId, setActiveId] = useState(withParam ? Number(withParam) : null);
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [pending, setPending] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);

  const loadConversations = useCallback(() => {
    return fetchConversations()
      .then((d) => setConversations(d.conversations || []))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, loadConversations]);

  // The deep link (?with=) selects a conversation.
  useEffect(() => {
    if (withParam) setActiveId(Number(withParam));
  }, [withParam]);

  // Load (and mark read) the open thread; refresh the list so its unread clears.
  const loadThread = useCallback((id) => {
    if (!id) return;
    setLoadingThread(true);
    fetchThread(id)
      .then((d) => setThread(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingThread(false));
  }, []);

  useEffect(() => {
    if (!activeId) { setThread(null); return; }
    loadThread(activeId);
  }, [activeId, loadThread]);

  // Light polling: the open thread and the list, so a reply (and presence)
  // lands without a refresh. No websocket — a message is not a chat-app.
  useEffect(() => {
    if (!user) return undefined;
    const t = setInterval(() => {
      loadConversations();
      if (activeId) {
        fetchThread(activeId).then(setThread).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(t);
  }, [user, activeId, loadConversations]);

  const select = (id) => {
    setActiveId(id);
    setPending([]); // in-flight bubbles belong to the thread they were sent in
    // Keep the URL in sync so Back works and the thread is shareable in-app.
    router.replace(`/messages?with=${id}`, { scroll: false });
  };

  const back = () => {
    setActiveId(null);
    setThread(null);
    setPending([]);
    router.replace("/messages", { scroll: false });
  };

  // Optimistic: show the bubble at once, reconcile when the server replies, and
  // mark it failed (with a Retry) rather than letting it disappear on error.
  const deliver = useCallback((toId, body, tempId) => {
    sendMessage(toId, body)
      .then((d) => {
        setThread((prev) =>
          prev && prev.peer.user_id === toId
            ? { ...prev, messages: [...prev.messages, d.message] }
            : prev,
        );
        setPending((p) => p.filter((m) => m.tempId !== tempId));
        loadConversations();
      })
      .catch(() =>
        setPending((p) => p.map((m) => (m.tempId === tempId ? { ...m, failed: true } : m))),
      );
  }, [loadConversations]);

  const onSend = (body) => {
    if (!activeId) return;
    const tempId = `tmp-${Date.now()}`;
    setPending((p) => [...p, { tempId, body, failed: false }]);
    deliver(activeId, body, tempId);
  };

  const onRetry = (tempId) => {
    setPending((p) => {
      const item = p.find((m) => m.tempId === tempId);
      if (item) deliver(activeId, item.body, tempId);
      return p.map((m) => (m.tempId === tempId ? { ...m, failed: false } : m));
    });
  };

  return (
    <Box className="space-y-5">
      <PageHeader
        eyebrow="Connect"
        title="Messages"
        summary="Message the people you are learning alongside."
      />

      {error && (
        <Card className="p-4">
          <Text as="p" className="text-sm text-danger">{error}</Text>
        </Card>
      )}

      {/* The card is capped to the viewport so only the thread body scrolls —
          the header, composer, sidebar and page stay put. min-h keeps it usable
          on short screens. */}
      <Card className="h-[calc(100dvh-12rem)] min-h-[460px] gap-0 overflow-hidden p-0">
        <Box className="grid h-full md:grid-cols-[300px_1fr]">
          {/* List — its own scroll; hidden on mobile when a thread is open. */}
          <Box className={cn("h-full min-h-0 overflow-y-auto border-line md:border-r", activeId && "hidden md:block")}>
            {conversations === null ? (
              <Box className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Box className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-36" />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <>
                {conversations.length > 0 && (
                  <Box className="sticky top-0 z-10 border-b border-line bg-surface p-2.5">
                    <Box className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search conversations"
                        className="w-full rounded-lg border border-line bg-surface-2 py-1.5 pl-8 pr-2.5 text-xs text-ink outline-none focus:border-accent-blue"
                      />
                    </Box>
                  </Box>
                )}
                <ConversationList
                  items={conversations.filter((c) =>
                    c.name.toLowerCase().includes(query.trim().toLowerCase()),
                  )}
                  activeId={activeId}
                  onSelect={select}
                  searching={query.trim().length > 0}
                />
              </>
            )}
          </Box>

          {/* Thread — hidden on mobile when no thread is open. */}
          <Box className={cn("h-full min-h-0", !activeId && "hidden md:block")}>
            <Thread
              thread={thread}
              loading={loadingThread}
              onSend={onSend}
              pending={pending}
              onRetry={onRetry}
              onBack={back}
            />
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
