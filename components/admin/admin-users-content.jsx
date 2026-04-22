"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, UserPlus, BookOpen, Calendar, Users, UserX, UserCheck, Trash2 } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { fetchUsers, createUser, toggleUserStatus, deleteUser } from "@/services/api/admin/admin-api";

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-violet-100 text-violet-600",
  "bg-pink-100 text-pink-600",
  "bg-cyan-100 text-cyan-600",
];

const EMPTY_FORM = { first_name: "", last_name: "", email: "", password: "" };

export function AdminUsersContent() {
  const { token } = useAuth();
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'delete'|'toggle', user }
  const [actioning, setActioning] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await fetchUsers({ token });
      setUsers(d.users || []);
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.first_name.trim()) { setFormError("First name is required"); return; }
    if (!form.last_name.trim()) { setFormError("Last name is required"); return; }
    if (!form.email.trim()) { setFormError("Email is required"); return; }
    if (form.password.length < 6) { setFormError("Password must be at least 6 characters"); return; }
    setSaving(true); setFormError(null);
    try {
      await createUser({ token, data: form });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    setActioning(true);
    try {
      if (confirmDialog.type === "delete") {
        await deleteUser({ token, userId: confirmDialog.user.id });
        setUsers((prev) => prev.filter((u) => u.id !== confirmDialog.user.id));
      } else {
        await toggleUserStatus({ token, userId: confirmDialog.user.id, is_active: !confirmDialog.user.is_active });
        setUsers((prev) => prev.map((u) => u.id === confirmDialog.user.id ? { ...u, is_active: !u.is_active } : u));
      }
      setConfirmDialog(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setActioning(false);
    }
  };

  if (error) return <Card className="p-6 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!users) return <Box className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</Box>;

  const filtered = users.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box className="space-y-4">
      {/* ── Toolbar ── */}
      <Box className="flex items-center gap-3">
        <Box className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </Box>
        <Button
          size="sm"
          onClick={() => { setForm(EMPTY_FORM); setFormError(null); setDialogOpen(true); }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shrink-0"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Add User
        </Button>
      </Box>

      <Text as="p" className="text-sm text-muted-foreground">
        {filtered.length} learner{filtered.length !== 1 ? "s" : ""}
      </Text>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">
            {search ? "No users match your search." : "No learners yet. Add the first user."}
          </Text>
        </Card>
      ) : (
        <Box className="space-y-2">
          {filtered.map((u, i) => {
            const initials = `${(u.first_name || "")[0]}${(u.last_name || "")[0]}`.toUpperCase();
            const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <Card key={u.id} className="px-4 py-3 hover:shadow-sm transition-shadow">
                <Box className="flex items-center justify-between gap-3">
                  <Box className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={`text-sm font-bold ${colorClass}`}>{initials}</AvatarFallback>
                    </Avatar>
                    <Box className="min-w-0">
                      <Box className="flex items-center gap-2">
                        <Text as="p" className="text-sm font-semibold">{u.first_name} {u.last_name}</Text>
                        <Badge variant="secondary" className={`text-[10px] shrink-0 ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </Box>
                      <Text as="span" className="text-xs text-muted-foreground">{u.email}</Text>
                    </Box>
                  </Box>
                  <Box className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 text-xs ${u.is_active ? "border-amber-400 text-amber-600 hover:bg-amber-50" : "border-emerald-400 text-emerald-600 hover:bg-emerald-50"}`}
                      onClick={() => setConfirmDialog({ type: "toggle", user: u })}
                    >
                      {u.is_active
                        ? <><UserX className="h-3.5 w-3.5 mr-1" />Deactivate</>
                        : <><UserCheck className="h-3.5 w-3.5 mr-1" />Activate</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-red-400 text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmDialog({ type: "delete", user: u })}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                    </Button>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Confirm Action Dialog ── */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === "delete" ? "Delete User" : confirmDialog?.user?.is_active ? "Deactivate User" : "Activate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === "delete"
                ? `This will permanently delete ${confirmDialog?.user?.first_name} ${confirmDialog?.user?.last_name} and all their data. This cannot be undone.`
                : confirmDialog?.user?.is_active
                  ? `${confirmDialog?.user?.first_name} ${confirmDialog?.user?.last_name} will no longer be able to log in.`
                  : `${confirmDialog?.user?.first_name} ${confirmDialog?.user?.last_name} will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={actioning}
              className={confirmDialog?.type === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            >
              {actioning ? "Please wait..." : confirmDialog?.type === "delete" ? "Delete" : confirmDialog?.user?.is_active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create User Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Learner</DialogTitle>
          </DialogHeader>
          <Box className="space-y-3 py-2">
            <Box className="grid grid-cols-2 gap-3">
              <Box className="space-y-1.5">
                <Label>First Name <Text as="span" className="text-red-500">*</Text></Label>
                <Input placeholder="Alice" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </Box>
              <Box className="space-y-1.5">
                <Label>Last Name <Text as="span" className="text-red-500">*</Text></Label>
                <Input placeholder="Johnson" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </Box>
            </Box>
            <Box className="space-y-1.5">
              <Label>Email <Text as="span" className="text-red-500">*</Text></Label>
              <Input type="email" placeholder="alice@company.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Password <Text as="span" className="text-red-500">*</Text></Label>
              <Input type="password" placeholder="Minimum 6 characters" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </Box>
            {formError && <Text as="p" className="text-sm text-red-500">{formError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {saving ? "Creating..." : "Add Learner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
