"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { relativeTime } from "@/lib/notifications";
import { MESSAGE_MAX_LENGTH } from "@/lib/content-limits";
import {
  fetchConversations,
  fetchThread,
  sendMessage,
} from "@/services/api/learner/messages-api";

/** Postgres timestamps are not ISO — repair the offset before Date sees it. */
function when(value) {
  return relativeTime(String(value || "").trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
}

/* ── Conversation list ── */
function ConversationList({ items, activeId, onSelect }) {
  if (items.length === 0) {
    return (
      <Box className="p-6 text-center">
        <Text as="p" className="text-xs text-text-3">No conversations yet.</Text>
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
          <UserAvatar src={c.avatar_url} name={c.name} className="size-10 shrink-0" />
          <Box className="min-w-0 flex-1">
            <Box className="flex items-center justify-between gap-2">
              <Text as="p" className="truncate text-sm font-semibold text-ink">{c.name}</Text>
              <Text as="span" className="shrink-0 text-[10px] text-text-3">{when(c.last_message.at)}</Text>
            </Box>
            <Box className="flex items-center justify-between gap-2">
              <Text as="p" className="truncate text-xs text-text-2">
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
function Thread({ thread, loading, onSend, sending, onBack }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread?.messages?.length, thread?.peer?.user_id]);

  const submit = () => {
    const body = input.trim();
    if (!body || sending) return;
    onSend(body);
    setInput("");
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

  return (
    <Box className="flex h-full flex-col">
      {/* Header */}
      <Box className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" onClick={onBack} className="md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5 text-text-2" />
        </button>
        <UserAvatar src={thread.peer.avatar_url} name={thread.peer.name} className="size-9 shrink-0" />
        <Text as="p" className="truncate text-sm font-semibold text-ink">{thread.peer.name}</Text>
      </Box>

      {/* Messages */}
      <Box ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-surface-2/40 px-4 py-4">
        {thread.messages.length === 0 ? (
          <Box className="flex h-full items-center justify-center">
            <Text as="p" className="text-center text-xs text-text-3">
              No messages yet. Say hi to {thread.peer.name.split(" ")[0]} below.
            </Text>
          </Box>
        ) : (
          thread.messages.map((m) => (
            <Box key={m.id} className={cn("flex", m.from_me ? "justify-end" : "justify-start")}>
              <Box className="max-w-[78%]">
                <Box
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-[13px] leading-snug",
                    m.from_me
                      ? "rounded-br-sm bg-accent-blue text-white"
                      : "rounded-bl-sm bg-surface text-ink border border-line",
                  )}
                >
                  <Text as="span" className="whitespace-pre-wrap break-words text-inherit">{m.body}</Text>
                </Box>
                <Text as="p" className={cn("mt-0.5 text-[10px] text-text-3", m.from_me ? "text-right" : "text-left")}>
                  {when(m.at)}
                </Text>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Composer */}
      <Box className="flex items-end gap-2 border-t border-line p-3">
        <textarea
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
          placeholder={`Message ${thread.peer.name.split(" ")[0]}…`}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent-blue"
        />
        <Button
          onClick={submit}
          disabled={sending || input.trim().length === 0}
          className="h-10 shrink-0 gap-1.5 bg-navy text-paper hover:bg-navy-soft"
        >
          <Send className="h-4 w-4" />
          <Text as="span" className="hidden text-inherit sm:inline">Send</Text>
        </Button>
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
  const [sending, setSending] = useState(false);
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
  const loadThread = useCallback(
    (id) => {
      if (!id) return;
      setLoadingThread(true);
      fetchThread(id)
        .then((d) => setThread(d))
        .catch((e) => setError(e.message))
        .finally(() => setLoadingThread(false));
    },
    [],
  );

  useEffect(() => {
    if (!activeId) { setThread(null); return; }
    loadThread(activeId);
  }, [activeId, loadThread]);

  // Light polling: the open thread and the list, so a reply lands without a
  // refresh. No websocket here — a message is not a chat-app, and 15s is plenty.
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
    // Keep the URL in sync so Back works and the thread is shareable in-app.
    router.replace(`/messages?with=${id}`, { scroll: false });
  };

  const back = () => {
    setActiveId(null);
    setThread(null);
    router.replace("/messages", { scroll: false });
  };

  const onSend = (body) => {
    if (!activeId) return;
    setSending(true);
    sendMessage(activeId, body)
      .then((d) => {
        setThread((prev) =>
          prev ? { ...prev, messages: [...prev.messages, d.message] } : prev,
        );
        loadConversations();
      })
      .catch((e) => setError(e.message))
      .finally(() => setSending(false));
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

      <Card className="gap-0 overflow-hidden p-0">
        <Box className="grid min-h-[520px] md:grid-cols-[300px_1fr]">
          {/* List — hidden on mobile when a thread is open. */}
          <Box className={cn("border-line md:border-r", activeId && "hidden md:block")}>
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
              <ConversationList items={conversations} activeId={activeId} onSelect={select} />
            )}
          </Box>

          {/* Thread — hidden on mobile when no thread is open. */}
          <Box className={cn("min-h-[520px]", !activeId && "hidden md:block")}>
            <Thread
              thread={thread}
              loading={loadingThread}
              onSend={onSend}
              sending={sending}
              onBack={back}
            />
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
