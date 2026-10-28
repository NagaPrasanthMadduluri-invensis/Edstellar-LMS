"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Award,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  MessagesSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  createAdminCommunityDiscussion,
  createAdminCommunityGroup,
  deleteAdminCommunityPost,
  deleteAdminCommunityReply,
  fetchAdminCommunity,
  fetchAdminCommunityGroups,
  fetchAdminCommunityPost,
  updateAdminCommunityGroup,
} from "@/services/api/admin/community-api";
import { COMMUNITY_TITLE_MAX, COMMUNITY_GROUP_NAME_MAX, DESCRIPTION_MAX_LENGTH } from "@/lib/content-limits";

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
  kudos: { label: "Kudos", icon: Award, tone: "bg-success/10 text-success" },
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
  const [groups, setGroups] = useState([]);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);

  const loadGroups = useCallback(() => {
    return fetchAdminCommunityGroups()
      .then((d) => setGroups(d.groups || []))
      .catch(() => setGroups([]));
  }, []);
  useEffect(() => {
    if (user) loadGroups();
  }, [user, loadGroups]);

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
        <Box className="flex flex-wrap items-center gap-2">
          {canModerate && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setGroupsOpen(true)}>
                <UsersRound className="h-4 w-4" />Manage groups
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setDiscussionOpen(true)}>
                <Plus className="h-4 w-4" />New discussion
              </Button>
            </>
          )}
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

      <GroupsManagerDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        groups={groups}
        onChanged={loadGroups}
      />
      <DiscussionDialog
        open={discussionOpen}
        onOpenChange={setDiscussionOpen}
        groups={groups.filter((g) => !g.archived)}
        onCreated={() => {
          setDiscussionOpen(false);
          // Show it at once if the current filter would include it.
          setPage(1);
          fetchAdminCommunity({ type: tab, search, page: 1 }).then(setData).catch(() => {});
        }}
      />
    </Box>
  );
}

/* Admin: create a discussion thread (the admin-curated type), optionally in a
   group. Hashtags are comma-separated; the server normalises and requires one. */
function DiscussionDialog({ open, onOpenChange, groups, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [groupId, setGroupId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) { setTitle(""); setBody(""); setTags(""); setGroupId(""); setErr(null); }
  }, [open]);

  async function submit() {
    const hashtags = tags.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    if (!title.trim()) { setErr("A title is required."); return; }
    if (hashtags.length === 0) { setErr("Add at least one hashtag."); return; }
    setErr(null);
    setSubmitting(true);
    try {
      await createAdminCommunityDiscussion({
        title: title.trim(),
        body: body.trim() || undefined,
        hashtags,
        groupId: groupId ? Number(groupId) : undefined,
      });
      onCreated();
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
          <DialogTitle>New discussion</DialogTitle>
          <DialogDescription>
            Discussions are admin-curated. Learners can reply, but only admins start them.
          </DialogDescription>
        </DialogHeader>
        <Box className="space-y-4">
          <Box className="space-y-1.5">
            <Label htmlFor="disc-title" className="text-sm font-medium text-ink/80">Title</Label>
            <Input id="disc-title" value={title} maxLength={COMMUNITY_TITLE_MAX} placeholder="What is this about?" onChange={(e) => setTitle(e.target.value)} />
          </Box>
          <Box className="space-y-1.5">
            <Label htmlFor="disc-body" className="text-sm font-medium text-ink/80">Details</Label>
            <Textarea id="disc-body" rows={4} value={body} placeholder="Open the topic…" onChange={(e) => setBody(e.target.value)} className="resize-none bg-paper-warm" />
          </Box>
          <Box className="space-y-1.5">
            <Label htmlFor="disc-tags" className="text-sm font-medium text-ink/80">Hashtags <Text as="span" className="text-ink/45">(comma separated, at least one)</Text></Label>
            <Input id="disc-tags" value={tags} placeholder="Renewables, AdvancedAI" onChange={(e) => setTags(e.target.value)} />
          </Box>
          <Box className="space-y-1.5">
            <Label htmlFor="disc-group" className="text-sm font-medium text-ink/80">Post in</Label>
            <select
              id="disc-group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-paper-warm px-3 text-sm"
            >
              <option value="">Main community</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Box>
          {err && <Text as="p" className="text-sm text-error">{err}</Text>}
        </Box>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting || !title.trim()}>
            {submitting ? "Posting…" : "Post discussion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Admin: create, rename, describe and archive/restore groups. */
function GroupsManagerDialog({ open, onOpenChange, groups, onChanged }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // group id being edited
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (!open) { setName(""); setDescription(""); setErr(null); setEditing(null); }
  }, [open]);

  async function create() {
    if (!name.trim()) { setErr("A group needs a name."); return; }
    setErr(null); setBusy(true);
    try {
      await createAdminCommunityGroup({ name: name.trim(), description: description.trim() || undefined });
      setName(""); setDescription("");
      await onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function patch(groupId, data) {
    setBusy(true); setErr(null);
    try {
      await updateAdminCommunityGroup({ groupId, ...data });
      setEditing(null);
      await onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Community groups</DialogTitle>
          <DialogDescription>
            Groups are sub-communities learners join, each with its own feed.
          </DialogDescription>
        </DialogHeader>

        <Box className="space-y-3">
          <Box className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
            <Input value={name} maxLength={COMMUNITY_GROUP_NAME_MAX} placeholder="New group name" onChange={(e) => setName(e.target.value)} />
            <Textarea rows={2} value={description} maxLength={DESCRIPTION_MAX_LENGTH} placeholder="Description (optional)" onChange={(e) => setDescription(e.target.value)} className="resize-none bg-white" />
            <Button size="sm" className="gap-1.5" disabled={busy || !name.trim()} onClick={create}>
              <Plus className="h-4 w-4" />Create group
            </Button>
          </Box>

          {err && <Text as="p" className="text-sm text-error">{err}</Text>}

          <Box className="max-h-72 space-y-2 overflow-y-auto">
            {groups.length === 0 ? (
              <Text as="p" className="p-3 text-center text-sm text-ink/50">No groups yet.</Text>
            ) : (
              groups.map((g) => (
                <Box key={g.id} className={cn("rounded-lg border border-border p-3", g.archived && "opacity-60")}>
                  {editing === g.id ? (
                    <Box className="space-y-2">
                      <Input value={editName} maxLength={COMMUNITY_GROUP_NAME_MAX} onChange={(e) => setEditName(e.target.value)} />
                      <Textarea rows={2} value={editDesc} maxLength={DESCRIPTION_MAX_LENGTH} onChange={(e) => setEditDesc(e.target.value)} className="resize-none bg-white" />
                      <Box className="flex gap-2">
                        <Button size="sm" disabled={busy || !editName.trim()} onClick={() => patch(g.id, { name: editName.trim(), description: editDesc.trim() })}>Save</Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box className="flex items-start justify-between gap-3">
                      <Box className="min-w-0">
                        <Text as="p" className="text-sm font-semibold text-ink">
                          {g.name}{g.archived && <Text as="span" className="ml-2 text-[11px] font-bold uppercase text-ink/40">Archived</Text>}
                        </Text>
                        {g.description && <Text as="p" className="mt-0.5 text-xs text-ink/60">{g.description}</Text>}
                        <Text as="p" className="mt-1 text-[11px] text-ink/45">{g.memberCount} member{g.memberCount === 1 ? "" : "s"} · {g.postCount} post{g.postCount === 1 ? "" : "s"}</Text>
                      </Box>
                      <Box className="flex shrink-0 gap-1">
                        <Button size="icon-sm" variant="ghost" title="Edit" aria-label="Edit group" disabled={busy}
                          onClick={() => { setEditing(g.id); setEditName(g.name); setEditDesc(g.description || ""); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" title={g.archived ? "Restore" : "Archive"} aria-label={g.archived ? "Restore group" : "Archive group"} disabled={busy}
                          onClick={() => patch(g.id, { archived: !g.archived })}>
                          {g.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
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
