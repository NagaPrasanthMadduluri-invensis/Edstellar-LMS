"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, ShieldCheck, BookOpen, CalendarCheck, CheckCircle2, Clock, UserPlus,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const EMPTY_ADMIN_FORM = { firstName: "", lastName: "", email: "", password: "" };

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function DetailSkeleton() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-20 rounded-xl" />
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );
}

export function OrganizationDetailContent({ organizationId }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);

  const [confirmToggle, setConfirmToggle] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM);
  const [adminError, setAdminError] = useState(null);
  const [adminSuccess, setAdminSuccess] = useState(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient(`/api/platform/organizations/${organizationId}`)
      .then((d) => { setOrganization(d.organization); setStats(d.stats); setRoles(d.roles || []); })
      .catch((e) => setError(e.message));
  }, [user, organizationId]);

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const { organization: updated } = await apiClient(`/api/platform/organizations/${organizationId}`, {
        method: "PATCH",
        body: { isActive: !organization.isActive },
      });
      setOrganization(updated);
      setConfirmToggle(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setToggling(false);
    }
  };

  const handleCreateAdmin = async () => {
    const { firstName, lastName, email, password } = adminForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setAdminError("All fields are required");
      return;
    }

    setCreatingAdmin(true);
    setAdminError(null);
    setAdminSuccess(null);
    try {
      const { user: created } = await apiClient(`/api/platform/organizations/${organizationId}/admins`, {
        method: "POST",
        body: adminForm,
      });
      setAdminSuccess(`${created.firstName || firstName} ${created.lastName || lastName} can now sign in as an admin.`);
      setAdminForm(EMPTY_ADMIN_FORM);
      setStats((prev) => (prev ? { ...prev, admins: prev.admins + 1 } : prev));
    } catch (e) {
      setAdminError(e.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-error text-sm">{error}</Text>
      </Card>
    );
  }

  if (!organization || !stats) return <DetailSkeleton />;

  const hours = Math.round(((stats.trackedMinutes || 0) / 60) * 10) / 10;
  const statCards = [
    { label: "Learners",     value: stats.learners,   icon: Users },
    { label: "Admins",       value: stats.admins,     icon: ShieldCheck },
    { label: "Courses",      value: stats.courses,    icon: BookOpen },
    { label: "Sessions",     value: stats.sessions,   icon: CalendarCheck },
    { label: "Completions",  value: stats.completions,icon: CheckCircle2 },
    { label: "Hours tracked",value: hours,             icon: Clock },
  ];

  return (
    <Box className="space-y-5">

      {/* ── Header card ── */}
      <Card className="p-5">
        <Box className="flex items-start justify-between gap-4 flex-wrap">
          <Box>
            <Box className="flex items-center gap-2.5">
              <Text as="h2" className="text-lg font-bold">{organization.name}</Text>
              <Badge
                variant="secondary"
                className={`text-[10px] ${organization.isActive ? "bg-paper-cream text-navy" : "bg-paper-warm text-ink/60"}`}
              >
                {organization.isActive ? "Active" : "Inactive"}
              </Badge>
              {organization.isPlatform && (
                <Badge variant="secondary" className="text-[10px] bg-paper-cream text-ink/60">
                  Platform
                </Badge>
              )}
            </Box>
            <Text as="p" className="text-xs text-muted-foreground mt-1">
              /{organization.slug} · created {formatDate(organization.createdAt)}
            </Text>
          </Box>

          {!organization.isPlatform && (
            <Button
              variant={organization.isActive ? "destructive" : "outline"}
              onClick={() => setConfirmToggle(true)}
            >
              {organization.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </Box>
      </Card>

      {/* ── Stat cards ── */}
      <Box className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <Box className="flex items-start gap-3">
              <Box className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-paper-cream text-navy">
                <s.icon className="h-4 w-4" />
              </Box>
              <Box>
                <Text as="p" className="text-xl font-bold leading-none">{s.value}</Text>
                <Text as="p" className="text-xs text-muted-foreground mt-1">{s.label}</Text>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── Roles this organization has defined ── */}
      <Card className="overflow-hidden">
        <Box className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <Box className="min-w-0">
            <Text as="h3" className="text-base font-bold">Roles</Text>
            <Text as="p" className="text-xs text-muted-foreground">
              What this organization has defined, who holds each one, and how many
              permissions it carries
            </Text>
          </Box>
          <Text as="span" className="shrink-0 text-xs text-muted-foreground">
            {roles.length} role{roles.length === 1 ? "" : "s"}
          </Text>
        </Box>

        {roles.length === 0 ? (
          <Box className="px-6 py-8 text-center">
            <Text as="p" className="text-sm text-muted-foreground">
              No roles yet — run the RBAC migration to seed this organization&rsquo;s.
            </Text>
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <Box className="grid min-w-[34rem] grid-cols-[1fr_110px_110px_90px_110px] border-b bg-muted/30 px-6 py-2.5">
              {["ROLE", "PORTAL", "SCOPE", "HOLDERS", "PERMISSIONS"].map((h) => (
                <Text
                  key={h}
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
                className={`grid min-w-[34rem] grid-cols-[1fr_110px_110px_90px_110px] items-center px-6 py-3 ${
                  idx !== roles.length - 1 ? "border-b" : ""
                }`}
              >
                <Box className="min-w-0">
                  <Text as="span" className="text-sm font-semibold">{r.label}</Text>
                  <Text as="span" className="ml-2 text-[11px] text-muted-foreground">{r.key}</Text>
                </Box>
                <Text as="span" className="text-xs text-muted-foreground">{r.portal}</Text>
                <Text as="span" className="text-xs text-muted-foreground">{r.scope}</Text>
                <Text as="span" className="text-sm font-semibold">{r.users}</Text>
                <Box className="flex items-center gap-2">
                  <Text as="span" className="text-sm font-semibold">{r.permissions}</Text>
                  {!r.isSystem && (
                    <Badge
                      variant="secondary"
                      className="border-navy/20 bg-paper-cream px-1.5 text-[10px] text-navy"
                    >
                      custom
                    </Badge>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      {/* ── Seed first admin ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Box className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <UserPlus className="h-4 w-4 text-navy" />
            <Box>
              <Text as="h3" className="text-base font-bold">Add an admin</Text>
              <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                Seeds a new admin account for this organisation.
              </Text>
            </Box>
          </Box>

          <Box className="p-5 space-y-4">
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Box className="space-y-1.5">
                <Label htmlFor="admin-first-name">First name</Label>
                <Input
                  id="admin-first-name"
                  value={adminForm.firstName}
                  onChange={(e) => setAdminForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="admin-last-name">Last name</Label>
                <Input
                  id="admin-last-name"
                  value={adminForm.lastName}
                  onChange={(e) => setAdminForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))}
                />
              </Box>
              <Box className="space-y-1.5">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))}
                />
              </Box>
            </Box>

            {adminError && <Text as="p" className="text-xs text-error">{adminError}</Text>}
            {adminSuccess && <Text as="p" className="text-xs text-navy">{adminSuccess}</Text>}

            <Button
              className="bg-navy hover:bg-navy-soft text-paper gap-2"
              onClick={handleCreateAdmin}
              disabled={creatingAdmin}
            >
              <UserPlus className="h-4 w-4" />
              {creatingAdmin ? "Creating…" : "Create admin"}
            </Button>
          </Box>
        </CardContent>
      </Card>

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
