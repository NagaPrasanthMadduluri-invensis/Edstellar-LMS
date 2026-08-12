"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Trash2, CheckCircle2, BookOpen, FileArchive, Trophy } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { fetchAssignments, fetchUsers, assignUser, removeAssignment } from "@/services/api/admin/admin-api";

const AVATAR_COLORS = [
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
];

export function CourseAssignmentsContent({ courseId }) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [removeId, setRemoveId] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [a, u] = await Promise.all([
        fetchAssignments({ courseId }),
        fetchUsers(),
      ]);
      setAssignments(a.assignments || []);
      setAllUsers(u.users || []);
    } catch (e) { setError(e.message); }
  }, [user, courseId]);

  useEffect(() => { load(); }, [load]);

  const assignedUserIds = new Set((assignments || []).map((a) => a.user_id));
  const unassigned = allUsers.filter((u) => !assignedUserIds.has(u.id));

  const handleAssign = async () => {
    if (!selectedUserId) { setAssignError("Please select a user"); return; }
    setAssigning(true); setAssignError(null);
    try {
      await assignUser({ courseId, userId: Number(selectedUserId) });
      setDialogOpen(false);
      setSelectedUserId("");
      load();
    } catch (e) { setAssignError(e.message); } finally { setAssigning(false); }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    await removeAssignment({ assignmentId: removeId }).catch(() => {});
    setRemoveId(null);
    load();
  };

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
    </Card>
  );

  if (!assignments) return (
    <Box className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </Box>
  );

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
          className="bg-navy hover:bg-navy-soft text-paper h-9"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Assign User
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No learners enrolled yet.</Text>
          <Button
            size="sm"
            className="mt-3 bg-navy hover:bg-navy-soft text-paper"
            onClick={() => setDialogOpen(true)}
            disabled={unassigned.length === 0}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Assign First Learner
          </Button>
        </Card>
      ) : (
        <Box className="space-y-2">
          {assignments.map((a, idx) => {
            const initials = `${(a.first_name || "")[0] || ""}${(a.last_name || "")[0] || ""}`.toUpperCase() || "?";
            const pct = a.total_lessons > 0 ? Math.round((a.completed_lessons / a.total_lessons) * 100) : 0;
            const done = pct === 100 && a.total_lessons > 0;
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            return (
              <Card key={a.id} className="px-4 py-3.5">
                <Box className="flex items-center gap-3.5">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className={`text-sm font-bold ${avatarColor}`}>{initials}</AvatarFallback>
                  </Avatar>
                  <Box className="flex-1 min-w-0">
                    <Box className="flex items-center gap-2 flex-wrap">
                      <Text as="p" className="text-sm font-semibold">{a.first_name} {a.last_name}</Text>
                      {done && (
                        <Badge className="text-[10px] border-0 bg-paper-cream text-navy">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Completed
                        </Badge>
                      )}
                    </Box>
                    <Text as="span" className="text-xs text-muted-foreground">{a.email}</Text>
                    {a.total_lessons > 0 && (
                      <Box className="flex items-center gap-2.5 mt-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <Box className="flex items-center gap-1 shrink-0">
                          <BookOpen className="h-3 w-3 text-muted-foreground/60" />
                          <Text as="span" className="text-xs text-muted-foreground">
                            {a.completed_lessons}/{a.total_lessons} lessons
                          </Text>
                        </Box>
                        <Text as="span" className="text-xs font-semibold text-muted-foreground shrink-0">{pct}%</Text>
                      </Box>
                    )}
                    {a.scorm_results && a.scorm_results.length > 0 && (
                      <Box className="mt-2 space-y-1.5 border-t pt-2">
                        {a.scorm_results.map((r, i) => {
                          const sRaw = r.score_raw != null ? Number(r.score_raw) : null;
                          const sMax = r.score_max != null ? Number(r.score_max) : null;
                          const sPct = sRaw !== null && sMax ? Math.round((sRaw / sMax) * 100) : null;
                          const isPassed = r.success_status === "passed" || r.lesson_status === "passed";
                          const isFailed = r.success_status === "failed" || r.lesson_status === "failed";
                          const isCompleted = r.completion_status === "completed" || r.lesson_status === "completed";
                          return (
                            <Box key={i} className="flex items-center gap-2 flex-wrap">
                              <FileArchive className="h-3 w-3 text-navy shrink-0" />
                              <Text as="span" className="text-xs text-muted-foreground truncate max-w-[120px]">{r.package_title}</Text>
                              {isPassed && (
                                <Badge className="text-[10px] bg-paper-cream text-navy border-0 py-0">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" />Passed
                                </Badge>
                              )}
                              {isFailed && (
                                <Badge className="text-[10px] bg-error/10 text-error border-0 py-0">Failed</Badge>
                              )}
                              {!isPassed && !isFailed && isCompleted && (
                                <Badge className="text-[10px] bg-paper-cream text-navy border-0 py-0">Completed</Badge>
                              )}
                              {sRaw !== null && (
                                <Box className="flex items-center gap-0.5">
                                  <Trophy className="h-3 w-3 text-ink/70" />
                                  <Text as="span" className="text-xs font-semibold">
                                    {Math.round(sRaw)}{sMax ? `/${Math.round(sMax)}` : ""}
                                    {sPct !== null ? ` (${sPct}%)` : ""}
                                  </Text>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                  <Box className="text-right shrink-0 flex flex-col items-end gap-1">
                    <Text as="span" className="text-xs text-muted-foreground">
                      {new Date(a.assigned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-error hover:text-error hover:bg-error/10"
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
            <DialogTitle>Assign Learner to Course</DialogTitle>
          </DialogHeader>
          <Box className="py-4 space-y-4">
            {unassigned.length === 0 ? (
              <Box className="text-center py-2">
                <Text as="p" className="text-sm text-muted-foreground">All learners are already enrolled in this course.</Text>
              </Box>
            ) : (
              <Box className="space-y-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-10">
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
                {assignError && (
                  <Box className="bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                    <Text as="p" className="text-sm text-error">{assignError}</Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {unassigned.length > 0 && (
              <Button
                onClick={handleAssign}
                disabled={assigning || !selectedUserId}
                className="bg-navy hover:bg-navy-soft text-paper"
              >
                {assigning ? "Assigning…" : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirm ── */}
      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Learner?</AlertDialogTitle>
            <AlertDialogDescription>The learner will lose access to this course and their progress will be retained but no longer tracked.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-error hover:bg-error text-white">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
