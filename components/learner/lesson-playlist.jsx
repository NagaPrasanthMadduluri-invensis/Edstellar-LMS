"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  PlayCircle,
  Lock,
  Circle,
  ListVideo,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";

const TYPE_LABEL = {
  scorm: "SCORM",
  session: "Session",
  document: "Doc",
  pdf: "Doc",
  ppt: "Doc",
  doc: "Doc",
  word: "Doc",
  xls: "Doc",
  image: "Doc",
  quiz: "Quiz",
};
const typeLabel = (t) => TYPE_LABEL[t] || "Video";

/**
 * The lesson playlist — every lesson in the course, grouped by module, with a
 * tick for done, a marker for the current one and a padlock for locked. A
 * locked row is not a link (the API refuses it anyway); every other row jumps
 * straight there. Collapsible, remembered per browser, so a learner who wants
 * the video full-width can fold it away.
 *
 * `status` ('completed' | 'current' | 'locked' | 'available') is decided by the
 * server (LearnerService.lesson) so the sidebar and the lock the page enforces
 * can never disagree.
 */
export function LessonPlaylist({ playlist = [], courseId }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      const v = localStorage.getItem("lesson-playlist-open");
      if (v !== null) setOpen(v === "1");
    } catch {}
  }, []);
  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      try {
        localStorage.setItem("lesson-playlist-open", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  if (!playlist.length) return null;

  const doneCount = playlist.filter((l) => l.status === "completed").length;

  // Group by module, preserving the server's order.
  const groups = [];
  for (const l of playlist) {
    const key = l.module_title || "Lessons";
    let g = groups[groups.length - 1];
    if (!g || g.title !== key) {
      g = { title: key, items: [] };
      groups.push(g);
    }
    g.items.push(l);
  }

  return (
    <Card className="overflow-hidden p-0" size="sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
      >
        <Box className="flex items-center gap-2 min-w-0">
          <ListVideo className="h-4 w-4 shrink-0 text-navy" />
          <Box className="min-w-0">
            <Text as="p" className="text-sm font-semibold leading-none">Course content</Text>
            <Text as="p" className="mt-1 text-[11px] text-text-3">
              {doneCount} of {playlist.length} complete
            </Text>
          </Box>
        </Box>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-text-3" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-3" />
        )}
      </button>

      {open && (
        <Box className="max-h-[70dvh] overflow-y-auto py-1">
          {groups.map((g, gi) => (
            <Box key={gi} className="py-1">
              <Text
                as="p"
                className="px-4 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3"
              >
                {g.title}
              </Text>
              {g.items.map((l, i) => (
                <LessonRow key={`${gi}-${i}`} lesson={l} courseId={courseId} />
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}

function LessonRow({ lesson, courseId }) {
  const { status } = lesson;
  const locked = status === "locked";
  const current = status === "current";
  const done = status === "completed";

  const icon = done ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
  ) : current ? (
    <PlayCircle className="h-4 w-4 shrink-0 text-accent-blue" />
  ) : locked ? (
    <Lock className="h-3.5 w-3.5 shrink-0 text-text-3" />
  ) : (
    <Circle className="h-3.5 w-3.5 shrink-0 text-text-3" />
  );

  const inner = (
    <Box
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 text-sm",
        current && "bg-accent-tint/70 border-l-2 border-accent-blue",
        !current && !locked && "border-l-2 border-transparent hover:bg-surface-2/60",
        locked && "border-l-2 border-transparent opacity-55",
      )}
    >
      {icon}
      <Box className="min-w-0 flex-1">
        <Text
          as="p"
          className={cn(
            "truncate text-[13px] leading-tight",
            current ? "font-semibold text-ink" : "text-ink/90",
          )}
        >
          {lesson.title}
        </Text>
        <Text as="p" className="mt-0.5 text-[10.5px] text-text-3">
          {typeLabel(lesson.content_type)}
          {lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ""}
        </Text>
      </Box>
    </Box>
  );

  // A locked lesson is not a link — the API refuses it, so offering it would be
  // a control that 403s. The current lesson is already here, so it is inert too.
  if (locked || current) {
    return (
      <Box
        aria-current={current ? "true" : undefined}
        title={locked ? "Finish the previous lesson to unlock this." : undefined}
      >
        {inner}
      </Box>
    );
  }
  return (
    <Link href={`/my-courses/${courseId}/lessons/${lesson.id}`} className="block">
      {inner}
    </Link>
  );
}
