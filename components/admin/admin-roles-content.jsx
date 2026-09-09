"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

/**
 * Roles & Permissions — `specs/rbac.md` §5.1.
 *
 * This screen was a mock: `PERMISSIONS`, `ROLES` and the user counts were
 * module constants, and the whole save path was `() => setSaved(true)`. An
 * admin could tick boxes, see "Saved!", and reasonably believe access control
 * had changed. It now reads the organization's real roles and the permission
 * catalogue the server actually enforces, and every write goes to the API.
 *
 * The catalogue comes from `GET /api/admin/permissions` rather than being
 * listed here, because a permission means something only if a guard checks it
 * — so the list of what CAN be granted is owned by the server (§3.2).
 *
 * Saving signs the whole organization out (decision 5), which is why the
 * confirmation below spells that out before writing rather than letting the
 * admin discover it as a surprise redirect to /login.
 */

const PORTALS = [
  { value: "admin", label: "Admin portal" },
  { value: "learner", label: "Learner portal" },
  { value: "trainer", label: "Trainer portal" },
];

const SCOPES = [
  { value: "org", label: "Whole organization" },
  { value: "department", label: "Own department" },
  { value: "self", label: "Only themselves" },
];

const EMPTY_ROLE = {
  key: "",
  label: "",
  portal: "learner",
  scope: "self",
  permissions: [],
};

function LoadingState() {
  return (
    <Box className="space-y-6">
      <Box className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </Box>
      <Skeleton className="h-96 rounded-xl" />
    </Box>
  );
}

export function AdminRolesContent() {
  const [catalogue, setCatalogue] = useState(null);
  const [roles, setRoles] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState(EMPTY_ROLE);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [signedOut, setSignedOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([
        apiClient("/api/admin/permissions"),
        apiClient("/api/admin/roles"),
      ]);
      setCatalogue(c.permissions || []);
      setRoles(r.roles || []);
      setDraft(
        Object.fromEntries(
          (r.roles || []).map((role) => [role.id, new Set(role.permissions)]),
        ),
      );
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (roleId, permissionId) => {
    setDraft((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return { ...prev, [roleId]: next };
    });
  };

  const reset = () => {
    if (!roles) return;
    setDraft(
      Object.fromEntries(roles.map((r) => [r.id, new Set(r.permissions)])),
    );
    setError(null);
  };

  const dirtyRoles = (roles ?? []).filter((role) => {
    const before = new Set(role.permissions);
    const after = draft[role.id] ?? new Set();
    if (before.size !== after.size) return true;
    for (const p of after) if (!before.has(p)) return true;
    return false;
  });

  /**
   * Saves only the roles whose ticks actually changed.
   *
   * Sequential rather than parallel on purpose: each write bumps the
   * organization's permission version, and the second request would be sent
   * with a token the first one had already invalidated.
   */
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const role of dirtyRoles) {
        await apiClient(`/api/admin/roles/${role.id}`, {
          method: "PATCH",
          body: { permissions: [...(draft[role.id] ?? [])] },
        });
      }
      // Everyone in this organization — including whoever pressed Save — is now
      // holding a stale token. Say so instead of letting the next click 401.
      setSignedOut(true);
    } catch (e) {
      setError(e.message);
      // A 401 here IS the version check firing on a later write in the loop.
      if (String(e.message).toLowerCase().includes("sign in")) setSignedOut(true);
    } finally {
      setSaving(false);
      setConfirmSave(false);
    }
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient("/api/admin/roles", { method: "POST", body: newRole });
      setCreateOpen(false);
      setNewRole(EMPTY_ROLE);
      setSignedOut(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient(`/api/admin/roles/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      setSignedOut(true);
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  if (error && !roles) {
    return (
      <Card className="gap-0 p-6">
        <Text as="p" className="text-sm text-error">
          {error}
        </Text>
      </Card>
    );
  }

  if (!roles || !catalogue) return <LoadingState />;

  return (
    <Box className="space-y-6">
      {/* ── Header ── */}
      <Box className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* The page header already says what this screen is for; this line
            adds only the consequence, which is the part that surprises people. */}
        <Text as="p" className="text-sm text-muted-foreground">
          Changes take effect immediately and sign everyone in your organization
          back in.
        </Text>
        <Box className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add role
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={reset}
            disabled={dirtyRoles.length === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 bg-navy px-4 text-paper hover:bg-navy-soft"
            disabled={dirtyRoles.length === 0 || saving}
            onClick={() => setConfirmSave(true)}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : `Save${dirtyRoles.length ? ` (${dirtyRoles.length})` : ""}`}
          </Button>
        </Box>
      </Box>

      {error && (
        <Card className="gap-0 border-error/30 bg-error/10 p-4">
          <Box className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" />
            <Text as="p" className="text-sm font-medium text-error">
              {error}
            </Text>
          </Box>
        </Card>
      )}

      {signedOut && (
        <Card className="gap-0 border-navy/20 bg-paper-cream p-4">
          <Text as="p" className="text-sm font-medium text-ink">
            Saved. Everyone in your organization — including you — needs to sign
            in again for the new permissions to load.
          </Text>
          <Button
            size="sm"
            className="mt-3 h-9 w-fit bg-navy text-paper hover:bg-navy-soft"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Sign in again
          </Button>
        </Card>
      )}

      {/* ── Role cards ── */}
      <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="gap-0 p-4">
            <Box className="flex flex-wrap items-start justify-between gap-2">
              <Box className="min-w-0">
                <Text as="h3" className="text-base font-bold">
                  {role.label}
                </Text>
                <Text as="p" className="text-[11px] text-muted-foreground">
                  {role.key} · {PORTALS.find((p) => p.value === role.portal)?.label ?? role.portal}
                </Text>
              </Box>
              <Box className="flex shrink-0 items-center gap-1.5">
                {!role.isSystem && (
                  <Badge
                    variant="secondary"
                    className="border-navy/20 bg-paper-cream px-1.5 text-[10px] text-navy"
                  >
                    custom
                  </Badge>
                )}
                {!role.isSystem && role.users === 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-error hover:bg-error/10"
                    title="Delete role"
                    onClick={() => setDeleteTarget(role)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </Box>
            </Box>
            <Box className="mt-3 flex items-baseline gap-1.5">
              <Text as="p" className="text-2xl font-extrabold leading-none text-navy">
                {role.users}
              </Text>
              <Text as="p" className="text-xs text-muted-foreground">
                {role.users === 1 ? "user" : "users"}
              </Text>
            </Box>
            <Text as="p" className="mt-1 text-[11px] text-muted-foreground">
              Sees {SCOPES.find((s) => s.value === role.scope)?.label.toLowerCase() ?? role.scope}
              {" · "}
              {(draft[role.id] ?? new Set()).size} of {catalogue.length} permissions
            </Text>
          </Card>
        ))}
      </Box>

      {/* ── Permission matrix ── */}
      <Card className="gap-0">
        <CardContent className="p-0">
          <Box className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <Text as="h3" className="text-base font-bold">
              Permission Matrix
            </Text>
            <Text as="p" className="text-xs text-muted-foreground">
              Tick what each role may do. The list is what this build enforces.
            </Text>
          </Box>

          <Box className="overflow-x-auto">
            <Box
              className="grid min-w-[40rem] border-b bg-muted/30 px-6 py-3"
              style={{ gridTemplateColumns: `1fr repeat(${roles.length}, 7rem)` }}
            >
              <Text as="span" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Permission
              </Text>
              {roles.map((role) => (
                <Text
                  key={role.id}
                  as="span"
                  className="text-center text-[11px] font-bold uppercase tracking-widest text-navy"
                >
                  {role.label}
                </Text>
              ))}
            </Box>

            {catalogue.map((permission, idx) => (
              <Box
                key={permission.id}
                className={cn(
                  "grid min-w-[40rem] items-center px-6 py-3 transition-colors hover:bg-muted/20",
                  idx !== catalogue.length - 1 && "border-b",
                )}
                style={{ gridTemplateColumns: `1fr repeat(${roles.length}, 7rem)` }}
              >
                <Text as="span" className="text-sm font-medium">
                  {permission.label}
                </Text>
                {roles.map((role) => {
                  const held = (draft[role.id] ?? new Set()).has(permission.id);
                  return (
                    <Box key={role.id} className="flex items-center justify-center">
                      <Checkbox
                        checked={held}
                        onCheckedChange={() => toggle(role.id, permission.id)}
                        className="h-5 w-5 rounded data-[state=checked]:border-navy/20 data-[state=checked]:bg-navy"
                      />
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* ── Save confirmation: the sign-out is the surprise worth warning about ── */}
      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply permission changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {dirtyRoles.length === 1
                ? `"${dirtyRoles[0].label}" will change.`
                : `${dirtyRoles.length} roles will change.`}{" "}
              Everyone in your organization will be signed out and will need to
              sign in again — including you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-navy text-paper hover:bg-navy-soft"
              onClick={save}
            >
              Save &amp; apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.label}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Everyone in your organization will be signed
              out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error text-paper hover:bg-error/90"
              onClick={remove}
            >
              Delete role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add role ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a role</DialogTitle>
          </DialogHeader>
          <Box className="space-y-4 py-2">
            <Box className="space-y-1.5">
              <Label className="text-sm font-medium">
                Name <Text as="span" className="text-error">*</Text>
              </Label>
              <Input
                placeholder="e.g. Trainer"
                value={newRole.label}
                onChange={(e) =>
                  setNewRole((r) => ({
                    ...r,
                    label: e.target.value,
                    // The key is derived from the name so an admin never has to
                    // think about it; the server normalises it again anyway.
                    key: e.target.value.trim().toLowerCase().replace(/\s+/g, "_"),
                  }))
                }
                className="h-10"
              />
              {newRole.key && (
                <Text as="p" className="text-[11px] text-muted-foreground">
                  Identifier: {newRole.key}
                </Text>
              )}
            </Box>

            <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium">Lands in</Label>
                <Select
                  value={newRole.portal}
                  onValueChange={(v) => setNewRole((r) => ({ ...r, portal: v }))}
                >
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue>
                      {PORTALS.find((p) => p.value === newRole.portal)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PORTALS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Box>
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium">Can see</Label>
                <Select
                  value={newRole.scope}
                  onValueChange={(v) => setNewRole((r) => ({ ...r, scope: v }))}
                >
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue>
                      {SCOPES.find((s) => s.value === newRole.scope)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Box>
            </Box>

            <Text as="p" className="text-[11px] text-muted-foreground">
              Add the role first, then tick its permissions in the matrix.
            </Text>
          </Box>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              className="bg-navy text-paper hover:bg-navy-soft"
              disabled={!newRole.label.trim() || saving}
              onClick={create}
            >
              {saving ? "Adding…" : "Add role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
