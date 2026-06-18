"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, UserPlus, Users, UserX, UserCheck, Trash2, Pencil,
  Upload, Download, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchUsers, createUser, updateUser, bulkCreateUsers, exportReport,
  downloadUserTemplate, toggleUserStatus, deleteUser,
} from "@/services/api/admin/admin-api";

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-violet-100 text-violet-600",
  "bg-pink-100 text-pink-600",
  "bg-cyan-100 text-cyan-600",
];

const EMPTY_FORM = { first_name: "", last_name: "", email: "", password: "", department: "", location: "", job_role: "" };

const HEADER_MAP = {
  "employee id": "employee_id", "employeeid": "employee_id", "employee_id": "employee_id",
  "first name":  "first_name",  "firstname":  "first_name",  "first_name":  "first_name",
  "last name":   "last_name",   "lastname":   "last_name",   "last_name":   "last_name",
  "email": "email", "email address": "email",
  "department": "department", "dept": "department",
  "location": "location", "city": "location",
  "job role": "job_role", "job_role": "job_role", "jobrole": "job_role", "title": "job_role", "position": "job_role",
  "password": "password",
};

// Dynamic import — xlsx is CJS so the module object is the default export
async function parseXlsx(file) {
  const mod  = await import("xlsx");
  const XLSX = mod.default ?? mod;          // CJS compat

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Find the header row — first row that has "first" or "email" in any cell
  let headerIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    const lower = raw[i].map((c) => String(c).toLowerCase().trim());
    if (lower.some((c) => c.includes("first") || c === "email")) { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    return { error: "Header row not found. Make sure the file has columns: Employee ID, First Name, Last Name, Email, Department, Location, Job Role, Password." };
  }

  const headers  = raw[headerIdx].map((c) => HEADER_MAP[String(c).toLowerCase().trim()] ?? String(c).toLowerCase().trim());
  const dataRows = raw.slice(headerIdx + 1).filter((r) => r.some((c) => String(c).trim() !== ""));

  return {
    rows: dataRows.map((cols, i) => {
      const row = {};
      headers.forEach((h, idx) => { row[h] = String(cols[idx] ?? "").trim(); });
      const missing  = ["first_name", "last_name", "email"].filter((f) => !row[f]);
      const pwdShort = row.password && row.password.length < 6;
      const error    = missing.length ? `Missing: ${missing.map((f) => f.replace("_", " ")).join(", ")}` : pwdShort ? "Password must be ≥6 chars" : null;
      return { _row: i + 1, _valid: !error, _error: error, ...row };
    }),
  };
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminUsersContent() {
  const { token } = useAuth();
  const [users,   setUsers]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [filterDept,   setFilterDept]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error,   setError]   = useState(null);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [form,      setForm]        = useState(EMPTY_FORM);
  const [saving,    setSaving]      = useState(false);
  const [formError, setFormError]   = useState(null);

  // Edit modal
  const [editUser,   setEditUser]   = useState(null);
  const [editForm,   setEditForm]   = useState({ first_name: "", last_name: "", email: "", location: "", job_role: "" });
  const [editError,  setEditError]  = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Confirm
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [actioning,     setActioning]     = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // Bulk upload
  const [bulkOpen,       setBulkOpen]       = useState(false);
  const [bulkRows,       setBulkRows]       = useState([]);
  const [bulkUploading,  setBulkUploading]  = useState(false);
  const [bulkResult,     setBulkResult]     = useState(null);
  const [parseError,     setParseError]     = useState(null);
  const [templateLoading,setTemplateLoading]= useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!token) return;
    try   { const d = await fetchUsers({ token }); setUsers(d.users || []); }
    catch (e) { setError(e.message); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── Create ──
  const handleCreate = async () => {
    if (!form.first_name.trim()) { setFormError("First name is required"); return; }
    if (!form.last_name.trim())  { setFormError("Last name is required");  return; }
    if (!form.email.trim())      { setFormError("Email is required");      return; }
    if (form.password.length < 6){ setFormError("Password must be at least 6 characters"); return; }
    setSaving(true); setFormError(null);
    try   { await createUser({ token, data: form }); setCreateOpen(false); setForm(EMPTY_FORM); load(); }
    catch (e) { setFormError(e.message); }
    finally   { setSaving(false); }
  };

  // ── Edit ──
  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, location: u.location || "", job_role: u.job_role || "" });
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!editForm.first_name.trim()) { setEditError("First name is required"); return; }
    if (!editForm.last_name.trim())  { setEditError("Last name is required");  return; }
    if (!editForm.email.trim())      { setEditError("Email is required");      return; }
    setEditSaving(true); setEditError(null);
    try {
      const { user: updated } = await updateUser({ token, userId: editUser.id, data: editForm });
      setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
      setEditUser(null);
    }
    catch (e) { setEditError(e.message); }
    finally   { setEditSaving(false); }
  };

  // ── Toggle / Delete ──
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
    }
    catch (e) { setError(e.message); }
    finally   { setActioning(false); }
  };

  // ── Export ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const res  = await exportReport({ token });
      const blob = await res.blob();
      triggerBlobDownload(blob, `Edstellar_LMS_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
    catch (e) { setError(e.message); }
    finally   { setExporting(false); }
  };

  // ── Bulk: template download ──
  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const res  = await downloadUserTemplate({ token });
      const blob = await res.blob();
      triggerBlobDownload(blob, "Learner_Upload_Template.xlsx");
    }
    catch (e) { setError(e.message); }
    finally   { setTemplateLoading(false); }
  };

  // ── Bulk: file parse ──
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkRows([]); setParseError(null); setBulkResult(null);
    const result = await parseXlsx(file);
    if (result.error) { setParseError(result.error); return; }
    setBulkRows(result.rows);
  };

  // ── Bulk: upload ──
  const handleBulkUpload = async () => {
    const valid = bulkRows.filter((r) => r._valid);
    if (!valid.length) return;
    setBulkUploading(true);
    try {
      const payload = valid.map(({ employee_id, first_name, last_name, email, password, department, location, job_role }) =>
        ({ employee_id, first_name, last_name, email, password, department, location, job_role }));
      const result = await bulkCreateUsers({ token, users: payload });
      setBulkResult(result);
      if (result.created > 0) load();
    }
    catch (e) { setBulkResult({ created: 0, failed: [{ row: "—", email: "—", reason: e.message }], total: valid.length }); }
    finally   { setBulkUploading(false); }
  };

  const closeBulk = () => {
    setBulkOpen(false); setBulkRows([]); setBulkResult(null); setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Render guards ──
  if (error)  return <Card className="p-6 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!users) return <Box className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</Box>;

  const depts = [...new Set(users.map((u) => u.department).filter(Boolean))].sort();

  const filtered = users.filter((u) => {
    const q = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase();
    const matchSearch = q.includes(search.toLowerCase());
    const matchDept   = filterDept   === "all" || u.department === filterDept;
    const matchStatus = filterStatus === "all"
      || (filterStatus === "active"   && u.is_active)
      || (filterStatus === "inactive" && !u.is_active);
    return matchSearch && matchDept && matchStatus;
  });

  const validCount   = bulkRows.filter((r) => r._valid).length;
  const invalidCount = bulkRows.filter((r) => !r._valid).length;
  const filtersActive = search || filterDept !== "all" || filterStatus !== "all";

  return (
    <Box className="space-y-4">

      {/* ── Toolbar ── */}
      <Box className="space-y-2.5">
        {/* Row 1: search + actions */}
        <Box className="flex items-center gap-2 flex-wrap">
          <Box className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className="pl-9 h-9 text-sm bg-gray-100 border-gray-200 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white transition-colors"
            />
          </Box>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
            onClick={() => { setBulkOpen(true); setBulkResult(null); setBulkRows([]); setParseError(null); }}>
            <Upload className="h-3.5 w-3.5" />Bulk Upload
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-blue-400 text-blue-600 hover:bg-blue-50"
            onClick={handleExport} disabled={exporting}>
            <Download className="h-3.5 w-3.5" />{exporting ? "Exporting..." : "Export"}
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setFormError(null); setCreateOpen(true); }}
            className="h-9 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />Add User
          </Button>
        </Box>

        {/* Row 2: filters */}
        <Box className="flex flex-wrap items-center gap-2">
          <Text as="span" className="text-xs font-medium text-gray-400 mr-1">Filter by:</Text>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className={`h-8 text-xs w-[150px] bg-gray-100 border-gray-200 hover:bg-gray-200 transition-colors ${filterDept === "all" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
              <SelectValue>{filterDept === "all" ? "All Departments" : filterDept}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={`h-8 text-xs w-[130px] bg-gray-100 border-gray-200 hover:bg-gray-200 transition-colors ${filterStatus === "all" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
              <SelectValue>
                {filterStatus === "all" ? "All Statuses" : filterStatus === "active" ? "Active" : "Inactive"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              onClick={() => { setSearch(""); setFilterDept("all"); setFilterStatus("all"); }}
            >
              × Clear filters
            </Button>
          )}
        </Box>
      </Box>

      <Text as="p" className="text-sm text-muted-foreground">{filtered.length} of {users.length} learner{users.length !== 1 ? "s" : ""}</Text>

      {/* ── User list ── */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">{filtersActive ? "No users match your filters." : "No learners yet. Add the first user."}</Text>
        </Card>
      ) : (
        <Box className="space-y-2">
          {filtered.map((u, i) => {
            const initials   = `${(u.first_name || "")[0]}${(u.last_name || "")[0]}`.toUpperCase();
            const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <Card key={u.id} className="relative px-4 py-3 hover:shadow-sm transition-shadow">
                <button onClick={() => openEdit(u)}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <Box className="flex items-center justify-between gap-3 pr-8">
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
                      {(u.department || u.job_role || u.location) && (
                        <Box className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {u.department && <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0">{u.department}</Badge>}
                          {u.job_role && <Text as="span" className="text-[11px] text-muted-foreground">{u.job_role}</Text>}
                          {u.location && <Text as="span" className="text-[11px] text-muted-foreground">· {u.location}</Text>}
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <Box className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm"
                      className={`h-8 text-xs ${u.is_active ? "border-amber-400 text-amber-600 hover:bg-amber-50" : "border-emerald-400 text-emerald-600 hover:bg-emerald-50"}`}
                      onClick={() => setConfirmDialog({ type: "toggle", user: u })}>
                      {u.is_active ? <><UserX className="h-3.5 w-3.5 mr-1" />Deactivate</> : <><UserCheck className="h-3.5 w-3.5 mr-1" />Activate</>}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs border-red-400 text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmDialog({ type: "delete", user: u })}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                    </Button>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ════════════════════════════════
          EDIT USER MODAL
      ════════════════════════════════ */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Learner</DialogTitle>
          </DialogHeader>

          {editUser && (() => {
            const idx        = users.findIndex((u) => u.id === editUser.id);
            const colorClass = AVATAR_COLORS[Math.max(idx, 0) % AVATAR_COLORS.length];
            const initials   = `${(editUser.first_name || "")[0]}${(editUser.last_name || "")[0]}`.toUpperCase();
            return (
              <Box className="space-y-4">
                {/* Identity strip */}
                <Box className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className={`text-sm font-bold ${colorClass}`}>{initials}</AvatarFallback>
                  </Avatar>
                  <Box>
                    <Text as="p" className="text-sm font-semibold">{editUser.first_name} {editUser.last_name}</Text>
                    <Text as="p" className="text-xs text-muted-foreground">{editUser.email}</Text>
                  </Box>
                  <Badge className={`ml-auto text-[10px] shrink-0 ${editUser.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} border-0`}>
                    {editUser.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Box>

                {/* Fields */}
                <Box className="grid grid-cols-2 gap-3">
                  <Box className="space-y-1.5">
                    <Label>First Name <Text as="span" className="text-red-500">*</Text></Label>
                    <Input value={editForm.first_name} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} />
                  </Box>
                  <Box className="space-y-1.5">
                    <Label>Last Name <Text as="span" className="text-red-500">*</Text></Label>
                    <Input value={editForm.last_name} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} />
                  </Box>
                </Box>
                <Box className="space-y-1.5">
                  <Label>Email <Text as="span" className="text-red-500">*</Text></Label>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                </Box>
                <Box className="grid grid-cols-2 gap-3">
                  <Box className="space-y-1.5">
                    <Label>Location</Label>
                    <Input placeholder="e.g. Bangalore" value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} />
                  </Box>
                  <Box className="space-y-1.5">
                    <Label>Job Role</Label>
                    <Input placeholder="e.g. Software Engineer" value={editForm.job_role} onChange={(e) => setEditForm((p) => ({ ...p, job_role: e.target.value }))} />
                  </Box>
                </Box>

                {editError && <Text as="p" className="text-sm text-red-500">{editError}</Text>}
              </Box>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════
          BULK UPLOAD MODAL
      ════════════════════════════════ */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!o) closeBulk(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Bulk Upload Learners</DialogTitle>
            <Text as="p" className="text-sm text-muted-foreground mt-0.5">
              Download the Excel template → fill in learner details → upload the completed file.
            </Text>
          </DialogHeader>

          {!bulkResult ? (
            <Box className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 py-5 gap-5">

              {/* Step 1 */}
              <Box className="rounded-xl border bg-blue-50/60 p-4 flex items-center gap-4">
                <Box className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Download className="h-5 w-5 text-blue-600" />
                </Box>
                <Box className="flex-1 min-w-0">
                  <Text as="p" className="text-sm font-semibold">Step 1 — Download the Excel template</Text>
                  <Text as="p" className="text-xs text-muted-foreground">
                    Columns: Employee ID · First Name · Last Name · Email · Department · Location · Job Role · Password
                    <Text as="span" className="ml-1 text-blue-600">(leave blank → default <span className="font-mono font-semibold">Edstellar@123</span>)</Text>
                  </Text>
                </Box>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5 border-blue-400 text-blue-600 hover:bg-blue-100"
                  onClick={handleDownloadTemplate} disabled={templateLoading}>
                  <Download className="h-3.5 w-3.5" />{templateLoading ? "Downloading…" : "Download Template"}
                </Button>
              </Box>

              {/* Step 2 */}
              <Box className="space-y-3">
                <Text as="p" className="text-sm font-semibold">Step 2 — Upload the completed file</Text>

                {/* Hidden file input — always mounted so ref is stable */}
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />

                {bulkRows.length === 0 && !parseError && (
                  <Box className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 text-center space-y-3
                                  cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                    onClick={() => fileRef.current?.click()}>
                    <Box className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
                      <Upload className="h-5 w-5 text-indigo-500" />
                    </Box>
                    <Box>
                      <Text as="p" className="text-sm font-semibold">Click to choose your Excel file</Text>
                      <Text as="p" className="text-xs text-muted-foreground mt-0.5">Accepts .xlsx and .xls</Text>
                    </Box>
                  </Box>
                )}

                {parseError && (
                  <Box className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <Box>
                      <Text as="p" className="text-sm font-semibold text-red-700">Could not read file</Text>
                      <Text as="p" className="text-xs text-red-600 mt-0.5">{parseError}</Text>
                      <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs px-2 text-red-600"
                        onClick={() => { setParseError(null); if (fileRef.current) fileRef.current.value = ""; }}>
                        Clear and try again
                      </Button>
                    </Box>
                  </Box>
                )}

                {bulkRows.length > 0 && (
                  <Box className="space-y-2">
                    <Box className="flex items-center gap-4 rounded-lg bg-muted/40 px-4 py-2.5">
                      <Box className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <Text as="span" className="text-sm font-semibold text-emerald-700">{validCount} ready</Text>
                      </Box>
                      {invalidCount > 0 && (
                        <Box className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-red-400" />
                          <Text as="span" className="text-sm font-semibold text-red-600">{invalidCount} with errors</Text>
                        </Box>
                      )}
                      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-muted-foreground"
                        onClick={() => { setBulkRows([]); if (fileRef.current) fileRef.current.value = ""; }}>
                        Change file
                      </Button>
                    </Box>

                    <Box className="rounded-lg border overflow-auto max-h-60">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/80">
                          <tr>
                            {["Row", "Employee ID", "Name", "Email", "Dept", "Location", "Job Role", "Status"].map((h) => (
                              <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulkRows.map((r) => (
                            <tr key={r._row} className={cn("border-t", !r._valid && "bg-red-50/60")}>
                              <td className="px-3 py-2 text-muted-foreground">{r._row}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.employee_id || "—"}</td>
                              <td className="px-3 py-2 font-medium whitespace-nowrap">{r.first_name} {r.last_name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.email || "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.department || "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.location || "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.job_role || "—"}</td>
                              <td className="px-3 py-2">
                                {r._valid
                                  ? <Text as="span" className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Ready</Text>
                                  : <Text as="span" className="inline-flex items-center gap-1 text-red-500"><XCircle className="h-3.5 w-3.5" />{r._error}</Text>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            /* Results */
            <Box className="flex flex-col px-6 py-6 gap-5 overflow-y-auto flex-1">
              <Box className="flex items-center gap-4">
                <Box className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0", bulkResult.created > 0 ? "bg-emerald-50" : "bg-red-50")}>
                  {bulkResult.created > 0 ? <CheckCircle2 className="h-7 w-7 text-emerald-500" /> : <XCircle className="h-7 w-7 text-red-500" />}
                </Box>
                <Box>
                  <Text as="p" className="text-lg font-bold">{bulkResult.created} of {bulkResult.total} learner{bulkResult.total !== 1 ? "s" : ""} created</Text>
                  {bulkResult.failed.length > 0 && <Text as="p" className="text-sm text-muted-foreground">{bulkResult.failed.length} row{bulkResult.failed.length !== 1 ? "s" : ""} could not be created</Text>}
                  {bulkResult.created > 0 && <Text as="p" className="text-xs text-emerald-600 mt-0.5">Default password: <span className="font-mono font-semibold">Edstellar@123</span> (unless set in the sheet)</Text>}
                </Box>
              </Box>

              {bulkResult.failed.length > 0 && (
                <Box className="rounded-lg border overflow-auto max-h-52">
                  <Box className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <Text as="span" className="text-xs font-semibold text-red-700">Failed rows</Text>
                  </Box>
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        {["Row", "Email", "Reason"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResult.failed.map((f, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{f.row}</td>
                          <td className="px-3 py-2">{f.email}</td>
                          <td className="px-3 py-2 text-red-600">{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>
          )}

          {/* Footer */}
          <Box className="px-6 py-4 border-t shrink-0 flex justify-end gap-2">
            {!bulkResult ? (
              <>
                <Button variant="outline" onClick={closeBulk}>Cancel</Button>
                <Button onClick={handleBulkUpload} disabled={bulkUploading || validCount === 0}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  {bulkUploading ? "Uploading…" : validCount > 0 ? `Upload ${validCount} Learner${validCount !== 1 ? "s" : ""}` : "Upload"}
                </Button>
              </>
            ) : (
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white" onClick={closeBulk}>Done</Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════
          CONFIRM (toggle / delete)
      ════════════════════════════════ */}
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
            <AlertDialogAction onClick={handleConfirmAction} disabled={actioning}
              className={confirmDialog?.type === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : ""}>
              {actioning ? "Please wait…" : confirmDialog?.type === "delete" ? "Delete" : confirmDialog?.user?.is_active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════════════════════════════
          CREATE USER
      ════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Learner</DialogTitle></DialogHeader>
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
              <Input type="email" placeholder="alice@company.com" autoComplete="off" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Department</Label>
              <Input placeholder="e.g. Engineering" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
            </Box>
            <Box className="grid grid-cols-2 gap-3">
              <Box className="space-y-1.5">
                <Label>Location</Label>
                <Input placeholder="e.g. Bangalore" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
              </Box>
              <Box className="space-y-1.5">
                <Label>Job Role</Label>
                <Input placeholder="e.g. Software Engineer" value={form.job_role} onChange={(e) => setForm((p) => ({ ...p, job_role: e.target.value }))} />
              </Box>
            </Box>
            <Box className="space-y-1.5">
              <Label>Password <Text as="span" className="text-red-500">*</Text></Label>
              <Input type="password" placeholder="Minimum 6 characters" autoComplete="new-password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </Box>
            {formError && <Text as="p" className="text-sm text-red-500">{formError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {saving ? "Creating…" : "Add Learner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
