"use client";

import { useEffect, useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  createSkill,
  fetchCourseSkills,
  fetchSkills,
  setCourseSkills,
} from "@/services/api/admin/skills-api";

/**
 * Tag a course with the SKILLS it imparts (BACKEND_STRUCTURE §10.53). When a
 * learner completes the course these are recorded against them as competencies,
 * which the AI Insights features and the learner skill-radar read. The admin
 * picks from the org's skill catalogue (own + shared platform skills) or creates
 * a new one, sets a level per skill, and saves the whole set.
 */
const LEVELS = ["beginner", "intermediate", "advanced"];

export function CourseSkillsTab({ courseId, locked }) {
  const [allSkills, setAllSkills] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [pickSkill, setPickSkill] = useState("");
  const [pickLevel, setPickLevel] = useState("intermediate");
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [sk, cs] = await Promise.all([fetchSkills(), fetchCourseSkills(courseId)]);
      setAllSkills(sk.skills ?? []);
      setRows(
        (cs.skills ?? []).map((s) => ({
          skillId: s.skill_id ?? s.skillId,
          name: s.name,
          level: s.level || "intermediate",
        })),
      );
    } catch {
      setError("Could not load skills.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, [courseId]);

  const chosen = new Set(rows.map((r) => Number(r.skillId)));
  const available = allSkills.filter((s) => !chosen.has(Number(s.id)) && s.is_active !== 0);

  function addRow() {
    const id = Number(pickSkill);
    if (!id) return;
    const skill = allSkills.find((s) => Number(s.id) === id);
    if (!skill) return;
    setRows((r) => [...r, { skillId: id, name: skill.name, level: pickLevel }]);
    setPickSkill("");
    setSaved(false);
  }

  function removeRow(id) {
    setRows((r) => r.filter((x) => Number(x.skillId) !== Number(id)));
    setSaved(false);
  }

  function setLevel(id, level) {
    setRows((r) => r.map((x) => (Number(x.skillId) === Number(id) ? { ...x, level } : x)));
    setSaved(false);
  }

  async function createNew() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const { skill } = await createSkill({ name, domain: newDomain.trim() || null });
      setAllSkills((s) => [...s, skill]);
      setRows((r) => [...r, { skillId: skill.id, name: skill.name, level: "intermediate" }]);
      setNewName("");
      setNewDomain("");
      setSaved(false);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "A skill with that name already exists — pick it from the list instead."
          : "Could not create the skill.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await setCourseSkills(courseId, rows.map((r) => ({ skillId: r.skillId, level: r.level })));
      setSaved(true);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Box className="h-40 animate-pulse rounded-lg bg-surface-2" />;

  if (locked) {
    return (
      <Box className="border border-line bg-surface-2 p-6 text-center">
        <Text as="p" className="text-sm text-text-2">
          This is a session's companion course. Skills are not tagged here.
        </Text>
      </Box>
    );
  }

  const selectCls =
    "rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink";

  return (
    <Box className="space-y-5">
      <Box className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-blue" />
        <Text as="p" className="text-xs text-text-2">
          Skills a learner gains by completing this course. They become the learner's
          competencies and feed the AI recommendations and skill radar.
        </Text>
      </Box>

      {error && (
        <Text as="p" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</Text>
      )}

      {/* Current skills */}
      {rows.length === 0 ? (
        <Text as="p" className="text-sm text-muted-foreground">No skills tagged yet.</Text>
      ) : (
        <Box className="space-y-2">
          {rows.map((r) => (
            <Box
              key={r.skillId}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2"
            >
              <Text as="p" className="text-[13px] font-semibold text-ink">{r.name}</Text>
              <Box className="flex items-center gap-2">
                <select
                  className={selectCls}
                  value={r.level}
                  onChange={(e) => setLevel(r.skillId, e.target.value)}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(r.skillId)}
                  aria-label={`Remove ${r.name}`}
                  title={`Remove ${r.name}`}
                  className="cursor-pointer rounded-md p-1.5 text-text-3 hover:bg-danger hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Add existing */}
      <Box className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <Box>
          <Text as="label" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
            Add a skill
          </Text>
          <select className={`${selectCls} min-w-[12rem]`} value={pickSkill} onChange={(e) => setPickSkill(e.target.value)}>
            <option value="">Select a skill…</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.is_shared ? " (shared)" : ""}
              </option>
            ))}
          </select>
        </Box>
        <select className={selectCls} value={pickLevel} onChange={(e) => setPickLevel(e.target.value)}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={addRow} disabled={!pickSkill}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </Box>

      {/* Create new */}
      <Box className="flex flex-wrap items-end gap-2">
        <Box>
          <Text as="label" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
            Or create a new skill
          </Text>
          <input
            className={selectCls}
            placeholder="Skill name"
            value={newName}
            maxLength={80}
            onChange={(e) => setNewName(e.target.value)}
          />
        </Box>
        <input
          className={selectCls}
          placeholder="Domain (optional)"
          value={newDomain}
          maxLength={40}
          onChange={(e) => setNewDomain(e.target.value)}
        />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={createNew} disabled={creating || !newName.trim()}>
          <Plus className="h-3.5 w-3.5" /> {creating ? "Creating" : "Create & add"}
        </Button>
      </Box>

      <Box className="flex items-center gap-3 border-t border-line pt-4">
        <Button size="sm" className="bg-accent-blue text-white hover:brightness-110" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save skills"}
        </Button>
        {saved && <Text as="span" className="text-xs font-semibold text-success">Saved.</Text>}
      </Box>
    </Box>
  );
}
