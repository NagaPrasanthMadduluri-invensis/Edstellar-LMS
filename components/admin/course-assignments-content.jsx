"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Trash2, CheckCircle2 } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { fetchAssignments, fetchUsers, assignUser, removeAssignment } from "@/services/api/admin/admin-api";

export function CourseAssignmentsContent({ courseId }) {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [removeId, setRemoveId] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [a, u] = await Promise.all([
        fetchAssignments({ token, courseId }),
        fetchUsers({ token }),
      ]);
      setAssignments(a.assignments || []);
      setAllUsers(u.users || []);
    } catch (e) {
      setError(e.message);
    }
  }, [token, courseId]);

  useEffect(() => { load(); }, [load]);

  const assignedUserIds = new Set((assignments || []).map((a) => a.user_id));
  const unassigned = allUsers.filter((u) => !assignedUserIds.has(u.id));

  const handleAssign = async () => {
    if (!selectedUserId) { setAssignError("Please select a user"); return; }
    setAssigning(true); setAssignError(null);
    try {
      await assignUser({ token, courseId, userId: Number(selectedUserId) });
      setDialogOpen(false);
      setSelectedUserId("");
      load();
    } catch (e) {
      setAssignError(e.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    await removeAssignment({ token, assignmentId: removeId }).catch(() => {});
    setRemoveId(null);
    load();
  };

  if (error) return <Card className="p-6 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!assignments) return <Box className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</Box>;

  return (
    <Box className="space-y-4">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-sm text-muted-foreground">
          {assignments.length} learner{assignments.length !== 1 ? "s" : ""} enrolled
        </Text>
        <Button
          size="sm"
          onClick={() => { setAssignError(null); setSelectedUserId(""); setDialogOpen(true); }}
          disabled={unassigned.length === 0}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Assign User
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No users assigned yet.</Text>
          <Button size="sm" className="mt-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            onClick={() => setDialogOpen(true)} disabled={unassigned.length === 0}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Assign First User
          </Button>
        </Card>
      ) : (
        <Box className="space-y-2">
          {assignments.map((a) => {
            const initials = `${(a.first_name || "")[0]}${(a.last_name || "")[0]}`.toUpperCase();
            const pct = a.total_lessons > 0 ? Math.round((a.completed_lessons / a.total_lessons) * 100) : 0;
            const done = pct === 100 && a.total_lessons > 0;
            return (
              <Card key={a.id} className="px-4 py-3">
                <Box className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <Box className="flex-1 min-w-0">
                    <Box className="flex items-center gap-2 flex-wrap">
                      <Text as="p" className="text-sm font-semibold">{a.first_name} {a.last_name}</Text>
                      {done && <Badge className="text-[10px] bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-0.5" />Completed</Badge>}
                    </Box>
                    <Text as="span" className="text-[11px] text-muted-foreground">{a.email}</Text>
                    {a.total_lessons > 0 && (
                      <Box className="flex items-center gap-2 mt-1.5">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <Text as="span" className="text-[11px] text-muted-foreground shrink-0">
                          {a.completed_lessons}/{a.total_lessons} lessons
                        </Text>
                      </Box>
                    )}
                  </Box>
                  <Box className="text-right shrink-0">
                    <Text as="span" className="text-xs text-muted-foreground block">
                      {new Date(a.assigned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </Text>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 mt-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setRemoveId(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Assign Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign User to Course</DialogTitle>
          </DialogHeader>
          <Box className="py-3 space-y-3">
            {unassigned.length === 0 ? (
              <Text as="p" className="text-sm text-muted-foreground text-center">All users are already assigned to this course.</Text>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a learner..." />
                </SelectTrigger>
                <SelectContent>
                  {unassigned.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.first_name} {u.last_name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {assignError && <Text as="p" className="text-sm text-red-500">{assignError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {unassigned.length > 0 && (
              <Button onClick={handleAssign} disabled={assigning || !selectedUserId}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                {assigning ? "Assigning..." : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirm ── */}
      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>The learner will lose access to this course.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
