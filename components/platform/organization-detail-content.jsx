"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import {
  AddRoleDialog,
  EMPTY_ROLE,
  RoleMatrix,
  dirtyRoles as computeDirtyRoles,
  draftFromRoles,
  portalLabel,
  scopeLabel,
} from "@/components/shared/role-editor";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * One organization, as the super-admin sees it — `specs/rbac.md` §3.9.
 *
 * This page used to be read-only about roles (a count of permissions per role)
 * and could seed exactly one thing: an admin. It now does delegated
 * administration: define this organization's roles, tick what each may do, and
 * create a user on any of them — a second admin, a trainer, a learner, or
 * anything the org has defined.
 *
 * Two differences from `/admin/roles` are deliberate and are the whole reason
 * this is a separate screen rather than a reused one:
 *
 *   1. **The sign-out lands on THEM, not on you.** A role write bumps the
 *      edited organization's `perm_version`, so its users are signed out and
 *      the super-admin's own session is untouched. Saying "including you"
 *      here — the copy the org-admin screen correctly uses — would be wrong in
 *      the direction that makes someone hesitate over a change that costs
 *      them nothing.
 *   2. **Creating a user asks which role.** That is the request this screen
 *      exists to serve, and `users.role` follows the role's portal, so
 *      picking "Trainer" is what puts the new account in the trainer portal.
 *
 * The matrix and the add-role dialog come from `components/shared/role-editor`,
 * so the two screens cannot drift apart on what a role is.
 */

const EMPTY_USER_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  roleId: "",
  department: "",
  jobRole: "",
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function DetailSkeleton() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-20 rounded-xl" />
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </Box>
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );
}

export function OrganizationDetailContent({ organizationId }) {
  const { user } = useAuth();

  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState(null);
  const [catalogue, setCatalogue] = useState(null);
  const [roles, setRoles] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState(null);

  const [confirmToggle, setConfirmToggle] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [savingRoles, setSavingRoles] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState(EMPTY_ROLE);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [roleNotice, setRoleNotice] = useState(null);

  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [userError, setUserError] = useState(null);
  const [userSuccess, setUserSuccess] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);

  /**
   * Two requests, in parallel: the organization with its stats, and its roles
   * with the permission catalogue. They are separate endpoints because one is
   * about the tenant and the other about what may be granted inside it — and
   * because the roles endpoint is the one that has to be re-read after every
   * write.
   */
  const loadRoles = useCallback(async () => {
    const r = await apiClient(`/api/platform/organizations/${organizationId}/roles`);
    setCatalogue(r.permissions || []);
    setRoles(r.roles || []);
    setDraft(draftFromRoles(r.roles));
  }, [organizationId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      apiClient(`/api/platform/organizations/${organizationId}`),
      loadRoles(),
    ])
      .then(([d]) => {
        if (cancelled) return;
        setOrganization(d.organization);
        setStats(d.stats);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [user, organizationId, loadRoles]);

  const dirty = computeDirtyRoles(roles, draft);

  const toggle = (roleId, permissionId) => {
    setDraft((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return { ...prev, [roleId]: next };
    });
  };

  const resetDraft = () => {
    if (!roles) return;
    setDraft(draftFromRoles(roles));
    setError(null);
  };

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const { organization: updated } = await apiClient(
        `/api/platform/organizations/${organizationId}`,
        { method: "PATCH", body: { isActive: !organization.isActive } },
      );
      setOrganization(updated);
      setConfirmToggle(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setToggling(false);
    }
  };

  /**
   * Sequential, not parallel — each write bumps the organization's permission
   * version, and a second request sent alongside the first would be racing a
   * version it had already invalidated. The same reason `/admin/roles` saves
   * in a loop.
   */
  const saveRoles = async () => {
    setSavingRoles(true);
    setError(null);
    try {
      for (const role of dirty) {
        await apiClient(
          `/api/platform/organizations/${organizationId}/roles/${role.id}`,
          { method: "PATCH", body: { permissions: [...(draft[role.id] ?? [])] } },
        );
      }
      await loadRoles();
      setRoleNotice(
        `Saved. Everyone in ${organization.name} needs to sign in again for the new permissions to load.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingRoles(false);
      setConfirmSave(false);
    }
  };

  const createRole = async () => {
    setSavingRoles(true);
    setError(null);
    try {
      await apiClient(`/api/platform/organizations/${organizationId}/roles`, {
        method: "POST",
        body: newRole,
      });
      setCreateRoleOpen(false);
      setNewRole(EMPTY_ROLE);
      await loadRoles();
      setRoleNotice(`Added. Everyone in ${organization.name} needs to sign in again.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingRoles(false);
    }
  };

  const removeRole = async () => {
    if (!deleteTarget) return;
    setSavingRoles(true);
    setError(null);
    try {
      await apiClient(
        `/api/platform/organizations/${organizationId}/roles/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      await loadRoles();
      setRoleNotice(`Deleted. Everyone in ${organization.name} needs to sign in again.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteTarget(null);
      setSavingRoles(false);
    }
  };

  const createUser = async () => {
    const { firstName, lastName, email, password, roleId } = userForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setUserError("First name, last name, email and password are all required");
      return;
    }
    if (!roleId) {
      setUserError("Pick the role this person should have");
      return;
    }
    if (password.length < 8) {
      setUserError("Password must be at least 8 characters");
      return;
    }

    setCreatingUser(true);
    setUserError(null);
    setUserSuccess(null);
    try {
      const { user: created, role } = await apiClient(
        `/api/platform/organizations/${organizationId}/users`,
        {
          method: "POST",
          body: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            password,
            roleId: Number(roleId),
            department: userForm.department.trim() || undefined,
            jobRole: userForm.jobRole.trim() || undefined,
          },
        },
      );
      setUserSuccess(
        `${created.firstName} ${created.lastName} can sign in as ${role.label} and will land in the ${portalLabel(role.portal).toLowerCase()}.`,
      );
      setUserForm(EMPTY_USER_FORM);
      // Reload rather than incrementing a counter: the holder count per role is
      // on screen, and which stat moved depends on the role's portal.
      await loadRoles();
      const d = await apiClient(`/api/platform/organizations/${organizationId}`);
      setStats(d.stats);
    } catch (e) {
      setUserError(e.message);
    } finally {
      setCreatingUser(false);
    }
  };

  if (error && !organization) {
    return (
      <Card className="gap-0 p-8 text-center">
        <Text as="p" className="text-sm text-error">
          {error}
        </Text>
      </Card>
    );
  }

  if (!organization || !stats || !roles || !catalogue) return <DetailSkeleton />;

  const hours = Math.round(((stats.trackedMinutes || 0) / 60) * 10) / 10;
  const statCards = [
    { label: "Learners", value: stats.learners, icon: Users },
    { label: "Admins", value: stats.admins, icon: ShieldCheck },
    { label: "Courses", value: stats.courses, icon: BookOpen },
    { label: "Sessions", value: stats.sessions, icon: CalendarCheck },
    { label: "Completions", value: stats.completions, icon: CheckCircle2 },
    { label: "Hours tracked", value: hours, icon: Clock },
  ];

  const selectedRole = roles.find((r) => String(r.id) === String(userForm.roleId));

  return (
    <Box className="space-y-5">
      {/* ── Header ── */}
      <Card className="gap-0 p-5">
        <Box className="flex flex-wrap items-start justify-between gap-4">
          <Box className="min-w-0">
            <Box className="flex flex-wrap items-center gap-2.5">
              <Text as="h2" className="text-lg font-bold">
                {organization.name}
              </Text>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px]",
                  organization.isActive
                    ? "bg-paper-cream text-navy"
                    : "bg-paper-warm text-ink/60",
                )}
              >
                {organization.isActive ? "Active" : "Inactive"}
              </Badge>
              {organization.isPlatform && (
                <Badge variant="secondary" className="bg-paper-cream text-[10px] text-ink/60">
                  Platform
                </Badge>
              )}
            </Box>
            <Text as="p" className="mt-1 text-xs text-muted-foreground">
              /{organization.slug} · created {formatDate(organization.createdAt)}
            </Text>
          </Box>

          {!organization.isPlatform && (
            <Button
              variant={organization.isActive ? "destructive" : "outline"}
              className="shrink-0"
              onClick={() => setConfirmToggle(true)}
            >
              {organization.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </Box>
      </Card>

      {/* ── Stats ── */}
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} className="gap-0 p-4">
            <Box className="flex items-start gap-3">
              <Box className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper-cream text-navy">
                <s.icon className="h-4 w-4" />
              </Box>
              <Box className="min-w-0">
                <Text as="p" className="text-xl font-bold leading-none">
                  {s.value}
                </Text>
                <Text as="p" className="mt-1 text-xs text-muted-foreground">
                  {s.label}
                </Text>
              </Box>
            </Box>
          </Card>
        ))}
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

      {roleNotice && (
        <Card className="gap-0 border-navy/20 bg-paper-cream p-4">
          <Text as="p" className="text-sm font-medium text-ink">
            {roleNotice}
          </Text>
          <Text as="p" className="mt-1 text-xs text-ink/60">
            Your own session is unaffected — you are signed in to the platform
            organization, not this one.
          </Text>
        </Card>
      )}

      {/* ── Roles ── */}
      <Card className="gap-0 overflow-hidden">
        <Box className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6">
          <Box className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <Box className="min-w-0">
              <Text as="h3" className="text-base font-bold">
                Roles
              </Text>
              <Text as="p" className="text-xs text-muted-foreground">
                What {organization.name} has defined, and who holds each one.
                Changes sign that organization&rsquo;s users out, not you.
              </Text>
            </Box>
            <Box className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setCreateRoleOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add role
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={resetDraft}
                disabled={dirty.length === 0}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Discard
              </Button>
              <Button
                size="sm"
                className="h-9 gap-2 bg-navy px-4 text-paper hover:bg-navy-soft"
                disabled={dirty.length === 0 || savingRoles}
                onClick={() => setConfirmSave(true)}
              >
                <Save className="h-3.5 w-3.5" />
                {savingRoles ? "Saving…" : `Save${dirty.length ? ` (${dirty.length})` : ""}`}
              </Button>
            </Box>
          </Box>
        </Box>

        {roles.length === 0 ? (
          <Box className="px-6 py-8 text-center">
            <Text as="p" className="text-sm text-muted-foreground">
              No roles yet — add one, or run the RBAC migration to seed this
              organization&rsquo;s.
            </Text>
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <Box className="grid min-w-[41rem] grid-cols-[minmax(11rem,1fr)_110px_130px_80px_110px_44px] border-b bg-muted/30 px-4 py-2.5 sm:px-6">
              {["ROLE", "PORTAL", "SEES", "HOLDERS", "PERMISSIONS", ""].map((h, i) => (
                <Text
                  key={h || `blank-${i}`}
                  as="span"
                  className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </Text>
              ))}
            </Box>
            {roles.map((r, idx) => (
              <Box
                key={r.id}
                className={cn(
                  // Same floor as the header, and for the same reason as the
                  // matrix: a bare `1fr` next to five fixed tracks gets
                  // whatever is left, which at 390px was ~134px and broke
                  // "Learner learner" mid-word.
                  "grid min-w-[41rem] grid-cols-[minmax(11rem,1fr)_110px_130px_80px_110px_44px] items-center px-4 py-3 sm:px-6",
                  idx !== roles.length - 1 && "border-b",
                )}
              >
                <Box className="min-w-0 pr-2">
                  <Text as="span" className="text-sm font-semibold">
                    {r.label}
                  </Text>
                  <Text as="span" className="ml-2 text-[11px] text-muted-foreground">
                    {r.key}
                  </Text>
                </Box>
                <Text as="span" className="text-xs text-muted-foreground">
                  {portalLabel(r.portal).replace(" portal", "")}
                </Text>
                <Text as="span" className="text-xs text-muted-foreground">
                  {scopeLabel(r.scope)}
                </Text>
                <Text as="span" className="text-sm font-semibold">
                  {r.users}
                </Text>
                <Box className="flex items-center gap-2">
                  <Text as="span" className="text-sm font-semibold">
                    {(draft[r.id] ?? new Set()).size}
                  </Text>
                  {!r.isSystem && (
                    <Badge
                      variant="secondary"
                      className="border-navy/20 bg-paper-cream px-1.5 text-[10px] text-navy"
                    >
                      custom
                    </Badge>
                  )}
                </Box>
                <Box className="flex justify-end">
                  {/* A system role, or one with holders, cannot be deleted —
                      the API refuses with 422 either way (§3.8). Hiding the
                      button is the same rule stated earlier. */}
                  {!r.isSystem && r.users === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-error hover:bg-error/10"
                      title={`Delete ${r.label}`}
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      {/* ── Permission matrix ── */}
      <RoleMatrix
        roles={roles}
        catalogue={catalogue}
        draft={draft}
        onToggle={toggle}
        title={`What each role may do`}
        hint={`Ticking here changes ${organization.name} only.`}
      />

      {/* ── Add a user ── */}
      <Card className="gap-0 overflow-hidden">
        <CardContent className="p-0">
          <Box className="flex items-start gap-2.5 border-b border-border px-5 py-4">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
            <Box className="min-w-0">
              <Text as="h3" className="text-base font-bold">
                Add a user
              </Text>
              <Text as="p" className="mt-0.5 text-xs text-muted-foreground">
                Creates an account in {organization.name} on the role you pick —
                another admin, a trainer, a learner, or any role above.
              </Text>
            </Box>
          </Box>

          <Box className="space-y-4 p-5">
            <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Box className="space-y-1.5">
                <Label htmlFor="user-first-name">First name</Label>
                <Input
                  id="user-first-name"
                  value={userForm.firstName}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                />
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="user-last-name">Last name</Label>
                <Input
                  id="user-last-name"
                  value={userForm.lastName}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                />
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                />
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="user-password">Password</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, password: e.target.value }))
                  }
                />
                <Text as="p" className="text-[11px] text-muted-foreground">
                  At least 8 characters. They can change it once signed in.
                </Text>
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="user-role">Role</Label>
                <Select
                  value={String(userForm.roleId)}
                  onValueChange={(v) => setUserForm((p) => ({ ...p, roleId: v }))}
                >
                  <SelectTrigger id="user-role" className="h-10 w-full text-sm">
                    <SelectValue placeholder="Pick a role">
                      {selectedRole?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.label} · {portalLabel(r.portal).replace(" portal", "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <Text as="p" className="text-[11px] text-muted-foreground">
                    Lands in the {portalLabel(selectedRole.portal).toLowerCase()};
                    sees {scopeLabel(selectedRole.scope).toLowerCase()};{" "}
                    {selectedRole.permissions.length} permission
                    {selectedRole.permissions.length === 1 ? "" : "s"}.
                  </Text>
                )}
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="user-department">Department</Label>
                <Input
                  id="user-department"
                  placeholder="Optional"
                  value={userForm.department}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, department: e.target.value }))
                  }
                />
                {/* Department is what a `department`-scoped role can see
                    (§3.5), so it is not decoration for a manager. */}
                <Text as="p" className="text-[11px] text-muted-foreground">
                  Decides whose learning a department-scoped role can see.
                </Text>
              </Box>
              <Box className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="user-job-role">Job title</Label>
                <Input
                  id="user-job-role"
                  placeholder="Optional"
                  value={userForm.jobRole}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, jobRole: e.target.value }))
                  }
                />
              </Box>
            </Box>

            {userError && (
              <Text as="p" className="text-xs text-error">
                {userError}
              </Text>
            )}
            {userSuccess && (
              <Text as="p" className="text-xs font-medium text-navy">
                {userSuccess}
              </Text>
            )}

            <Button
              className="gap-2 bg-navy text-paper hover:bg-navy-soft"
              onClick={createUser}
              disabled={creatingUser}
            >
              <UserPlus className="h-4 w-4" />
              {creatingUser ? "Creating…" : "Create user"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Confirm role save: the sign-out is the part worth warning about ── */}
      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply permission changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {dirty.length === 1
                ? `"${dirty[0].label}" will change.`
                : `${dirty.length} roles will change.`}{" "}
              Everyone in {organization.name} will be signed out and will need to
              sign in again. Your own session is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingRoles}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-navy text-paper hover:bg-navy-soft"
              onClick={saveRoles}
              disabled={savingRoles}
            >
              Save &amp; apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm role delete ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.label}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone, and everyone in {organization.name} will be
              signed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingRoles}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error text-paper hover:bg-error/90"
              onClick={removeRole}
              disabled={savingRoles}
            >
              Delete role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add role ── */}
      <AddRoleDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        value={newRole}
        onChange={setNewRole}
        onSubmit={createRole}
        busy={savingRoles}
      />

      {/* ── Confirm activate/deactivate ── */}
      <AlertDialog open={confirmToggle} onOpenChange={setConfirmToggle}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {organization.isActive ? "Deactivate organisation" : "Activate organisation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {organization.isActive
                ? `No user in ${organization.name} will be able to log in until it is reactivated. Their data is kept.`
                : `Every user in ${organization.name} will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={toggling}>
              {toggling ? "Please wait…" : organization.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
