"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Clock, CalendarDays, Users, BookOpen, Trash2, Tag, Map,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";

/* ── Static seed data ── */
const SEED_JOURNEYS = [
  {
    id: 1,
    title: "Communication & Professional Excellence",
    tag: "Sales · Role Path",
    description: "Covers workplace communication, digital tools, and modern business communication skills to help learners excel in professional environments.",
    dueDate: "2025-06-30",
    duration: "95 min",
    assignTo: "All Departments",
    criteria: "All courses required",
    status: "Active",
    skills: ["Workplace Communication", "Active Listening", "Digital Tools"],
    courses: ["Effective Communication in the Workplace", "Sales Foundations", "Digital Communication Tools"],
    enrolled: 8,
    completedPct: 25,
  },
];

const AVAILABLE_COURSES = [
  "Effective Communication in the Workplace",
  "Sales Foundations",
  "Digital Communication Tools",
  "Leadership Essentials",
  "Data Privacy & Compliance",
  "Advanced Excel for Operations",
  "Customer-Centric Selling",
  "Inclusive Leadership",
  "Project Management Fundamentals",
  "Time Management & Productivity",
];

const EMPTY_FORM = {
  title: "", tag: "", description: "", dueDate: "", duration: "",
  assignTo: "All Departments", criteria: "All courses required",
  status: "Active", skills: "", courses: [],
};

export function AdminJourneysContent() {
  const [journeys, setJourneys] = useState(SEED_JOURNEYS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [courseToAdd, setCourseToAdd] = useState("");
  const [formError, setFormError] = useState(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCourseToAdd("");
    setFormError(null);
    setDialogOpen(true);
  };

  const addCourse = () => {
    if (!courseToAdd || form.courses.includes(courseToAdd)) return;
    setForm((p) => ({ ...p, courses: [...p.courses, courseToAdd] }));
    setCourseToAdd("");
  };

  const removeCourse = (c) =>
    setForm((p) => ({ ...p, courses: p.courses.filter((x) => x !== c) }));

  const handleCreate = () => {
    if (!form.title.trim()) { setFormError("Journey title is required"); return; }
    if (form.courses.length === 0) { setFormError("Add at least one course"); return; }
    const newJourney = {
      id: Date.now(),
      title: form.title,
      tag: form.tag,
      description: form.description,
      dueDate: form.dueDate,
      duration: form.duration,
      assignTo: form.assignTo,
      criteria: form.criteria,
      status: form.status,
      skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      courses: form.courses,
      enrolled: 0,
      completedPct: 0,
    };
    setJourneys((prev) => [newJourney, ...prev]);
    setDialogOpen(false);
  };

  const deleteJourney = (id) => setJourneys((prev) => prev.filter((j) => j.id !== id));

  return (
    <Box className="space-y-5">

      {/* ── Toolbar ── */}
      <Box className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Text as="p" className="text-sm text-muted-foreground">
          {journeys.length} learning path{journeys.length !== 1 ? "s" : ""} created
        </Text>
        <Button className="h-10 bg-navy hover:bg-navy-soft text-paper gap-2 px-5" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Journey
        </Button>
      </Box>

      {/* ── Journey Cards ── */}
      {journeys.length === 0 ? (
        <Card className="p-16 text-center">
          <Map className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No learning journeys yet. Create the first one.</Text>
        </Card>
      ) : (
        <Box className="space-y-4">
          {journeys.map((j) => (
            <Card key={j.id} className="overflow-hidden border-l-4 border-l-blue-500">
              <CardContent className="p-6 space-y-4">

                {/* Top row */}
                <Box className="flex items-start justify-between gap-3">
                  <Box className="flex-1 min-w-0">
                    <Box className="flex items-center gap-2 flex-wrap mb-1">
                      {j.tag && (
                        <Badge className="text-[11px] bg-paper-cream text-navy border border-navy/20 font-medium">
                          <Tag className="h-3 w-3 mr-1" />{j.tag}
                        </Badge>
                      )}
                      <Badge className={`text-[11px] border font-medium ${j.status === "Active" ? "bg-paper-cream text-navy border-navy/20" : "bg-paper-warm text-ink/60 border-border"}`}>
                        {j.status}
                      </Badge>
                    </Box>
                    <Text as="h3" className="text-lg font-extrabold leading-snug">{j.title}</Text>
                  </Box>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error hover:bg-error/10 shrink-0"
                    onClick={() => deleteJourney(j.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Box>

                {/* Meta row */}
                <Box className="flex items-center gap-5 flex-wrap text-sm text-muted-foreground">
                  <Box className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <Text as="span">{j.courses.length} course{j.courses.length !== 1 ? "s" : ""}</Text>
                  </Box>
                  {j.duration && (
                    <Box className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <Text as="span">{j.duration}</Text>
                    </Box>
                  )}
                  {j.dueDate && (
                    <Box className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <Text as="span">Due: {new Date(j.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
                    </Box>
                  )}
                  <Box className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <Text as="span">{j.assignTo}</Text>
                  </Box>
                </Box>

                {/* Description */}
                {j.description && (
                  <Text as="p" className="text-sm text-muted-foreground line-clamp-2">{j.description}</Text>
                )}

                {/* Skills */}
                {j.skills.length > 0 && (
                  <Box className="flex flex-wrap gap-2">
                    {j.skills.map((s) => (
                      <Badge key={s} className="text-[11px] bg-paper-cream text-ink/70 border-0 font-normal">{s}</Badge>
                    ))}
                  </Box>
                )}

                {/* Enrolled + completion */}
                <Box className="h-px bg-border" />
                <Box className="flex items-center gap-6 flex-wrap">
                  <Box>
                    <Text as="p" className="text-xl font-extrabold text-navy leading-none">{j.enrolled}</Text>
                    <Text as="p" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Enrolled</Text>
                  </Box>
                  <Box>
                    <Text as="p" className="text-xl font-extrabold text-ink/70 leading-none">{j.completedPct}%</Text>
                    <Text as="p" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Completed</Text>
                  </Box>
                  <Box className="flex-1 min-w-[120px]">
                    <Progress value={j.completedPct} className="h-2" />
                  </Box>
                </Box>

                {/* Course sequence */}
                <Box className="flex items-center gap-3 flex-wrap">
                  {j.courses.map((c, idx) => (
                    <Box key={c} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Box className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </Box>
                      <Text as="span" className="truncate max-w-[180px]">{c}</Text>
                      {idx < j.courses.length - 1 && (
                        <Text as="span" className="text-muted-foreground/40 mx-1">→</Text>
                      )}
                    </Box>
                  ))}
                </Box>

              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Create Journey Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create Learning Journey</DialogTitle>
          </DialogHeader>

          <Box className="space-y-5 py-2">

            {/* Journey Title */}
            <Box className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Journey Title <Text as="span" className="text-error">*</Text>
              </Label>
              <Input
                placeholder="e.g. Sales Leadership Path"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="h-10"
              />
            </Box>

            {/* Tag / Role Label */}
            <Box className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tag / Role Label</Label>
              <Input
                placeholder="e.g. Sales · Role Path"
                value={form.tag}
                onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value }))}
                className="h-10"
              />
            </Box>

            {/* Description */}
            <Box className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Box>

            {/* Due Date + Duration + Assign To */}
            <Box className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Box className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="h-10 text-sm"
                />
              </Box>
              <Box className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total Duration</Label>
                <Input
                  placeholder="e.g. 95 min"
                  value={form.duration}
                  onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                  className="h-10"
                />
              </Box>
              <Box className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Assign To</Label>
                <Select value={form.assignTo} onValueChange={(v) => setForm((p) => ({ ...p, assignTo: v }))}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Departments">All Departments</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </Box>
            </Box>

            {/* Completion Criteria + Status */}
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Box className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Completion Criteria</Label>
                <Select value={form.criteria} onValueChange={(v) => setForm((p) => ({ ...p, criteria: v }))}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All courses required">All courses required</SelectItem>
                    <SelectItem value="Any one course">Any one course</SelectItem>
                    <SelectItem value="80% courses required">80% courses required</SelectItem>
                  </SelectContent>
                </Select>
              </Box>
              <Box className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </Box>
            </Box>

            {/* Skill Outcomes */}
            <Box className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Skill Outcomes (Comma Separated)</Label>
              <Input
                placeholder="e.g. Workplace Communication, Active Listening"
                value={form.skills}
                onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
                className="h-10"
              />
            </Box>

            {/* Courses in Sequence */}
            <Box className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Courses in Sequence <Text as="span" className="text-error">*</Text>
              </Label>
              <Box className="flex gap-2">
                <Select value={courseToAdd} onValueChange={setCourseToAdd}>
                  <SelectTrigger className="h-10 text-sm flex-1">
                    <SelectValue placeholder="— Add a course —" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_COURSES.filter((c) => !form.courses.includes(c)).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="h-10 px-4 shrink-0" onClick={addCourse}>
                  + Add
                </Button>
              </Box>
              {form.courses.length > 0 && (
                <Box className="space-y-1.5 mt-2">
                  {form.courses.map((c, idx) => (
                    <Box key={c} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/30 border">
                      <Box className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </Box>
                      <Text as="span" className="text-sm flex-1">{c}</Text>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-error"
                        onClick={() => removeCourse(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {formError && (
              <Box className="bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                <Text as="p" className="text-sm text-error">{formError}</Text>
              </Box>
            )}
          </Box>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-navy hover:bg-navy-soft text-paper px-6">
              Create Journey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
