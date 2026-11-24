import { describe, it, expect } from "vitest";
import {
  courseBasePath,
  lessonPath,
  assessmentPath,
  backToCoursePath,
  previewEntryPath,
  previewEndpoints,
  courseStateLabel,
} from "./course-preview";

describe("course-preview paths", () => {
  it("keeps learner URLs unchanged", () => {
    expect(courseBasePath("c1")).toBe("/my-courses/c1");
    expect(lessonPath("c1", "l1")).toBe("/my-courses/c1/lessons/l1");
    expect(assessmentPath("c1", "a1")).toBe("/my-courses/c1/assessments/a1");
    expect(backToCoursePath("c1")).toBe("/my-courses/c1");
  });

  it("moves preview URLs under the admin course", () => {
    expect(courseBasePath("c1", true)).toBe("/admin/courses/c1/preview");
    expect(lessonPath("c1", "l1", true)).toBe("/admin/courses/c1/preview/lessons/l1");
    expect(assessmentPath("c1", "a1", true)).toBe("/admin/courses/c1/preview/assessments/a1");
    expect(backToCoursePath("c1", true)).toBe("/admin/courses/c1");
    expect(previewEntryPath("c1")).toBe("/admin/courses/c1/preview");
  });

  it("names the admin endpoints", () => {
    expect(previewEndpoints.course("c1")).toBe("/api/admin/courses/c1/preview");
    expect(previewEndpoints.media(7)).toBe("/api/admin/lessons/7/media");
    expect(previewEndpoints.assessmentAttempt("a")).toBe("/api/admin/assessments/a/preview-attempt");
  });
});

describe("courseStateLabel", () => {
  it("reads archived before published", () => {
    expect(courseStateLabel({ is_active: 1, archived_at: "2026-01-01" })).toBe("Archived");
    expect(courseStateLabel({ is_active: 1, archived_at: null })).toBe("Published");
    expect(courseStateLabel({ is_active: 0 })).toBe("Draft");
    expect(courseStateLabel({ is_active: false })).toBe("Draft");
    expect(courseStateLabel({ is_active: true })).toBe("Published");
  });
});
