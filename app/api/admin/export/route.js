import { getDb } from "@/lib/db/index.js";
import { requireAdmin, err } from "@/lib/auth.js";
import * as XLSX from "xlsx";

function empId(id) {
  return `EDS-${String(id).padStart(3, "0")}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function grade(score) {
  if (score == null) return "—";
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "F";
}

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = getDb();

  /* ──────────────────────────────────────────────
     Fetch all learners and build per-course rows
  ────────────────────────────────────────────── */
  const learners = db.prepare(`
    SELECT id, first_name, last_name, email, department, created_at
    FROM users WHERE role = 'learner'
    ORDER BY first_name, last_name
  `).all();

  const progressRows  = [];   // Sheet 1
  const assignRows    = [];   // Sheet 4

  let seq = 1;

  for (const u of learners) {
    const eid      = empId(u.id);
    const fullName = `${u.first_name} ${u.last_name}`;
    const dept     = u.department || "—";

    const assignments = db.prepare(`
      SELECT uca.course_id, uca.assigned_at, c.name AS course_name
      FROM user_course_assignments uca
      JOIN courses c ON c.id = uca.course_id AND c.is_active = 1
      WHERE uca.user_id = ?
      ORDER BY uca.assigned_at
    `).all(u.id);

    if (assignments.length === 0) {
      progressRows.push([seq++, eid, fullName, dept, "—", u.email, "—", "—", "—", "Not Started", 0, "—", "N/A", "—"]);
      assignRows.push([eid, fullName, dept, "—", "—", "—", "—", "Not Started", "—"]);
      continue;
    }

    for (const a of assignments) {
      const counts = db.prepare(`
        SELECT COUNT(l.id) AS total,
          SUM(CASE WHEN ulc.id IS NOT NULL THEN 1 ELSE 0 END) AS completed
        FROM lessons l
        JOIN course_modules cm ON cm.id = l.module_id
        LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = ?
        WHERE cm.course_id = ? AND l.is_active = 1 AND cm.is_active = 1
      `).get(u.id, a.course_id);

      const total     = counts?.total     ?? 0;
      const completed = counts?.completed ?? 0;
      const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;

      const best = db.prepare(`
        SELECT MAX(uaa.percentage) AS best_score,
               MAX(uaa.is_passed)  AS has_passed,
               COUNT(*)            AS attempt_count
        FROM user_assessment_attempts uaa
        JOIN assessments ass ON ass.id = uaa.assessment_id
        WHERE uaa.user_id = ? AND ass.course_id = ?
      `).get(u.id, a.course_id);

      const bestScore    = best?.best_score    ?? null;
      const hasPassed    = best?.has_passed    === 1;
      const attemptCount = best?.attempt_count ?? 0;

      let status;
      if (hasPassed)          status = "Completed";
      else if (attemptCount > 0) status = "Failed";
      else if (completed > 0) status = "In Progress";
      else                    status = "Not Started";

      const scoreDisp    = bestScore !== null ? bestScore    : "—";
      const passFailDisp = attemptCount === 0 ? "N/A" : hasPassed ? "Pass ✓" : "Fail ✗";
      const assignedDate = fmtDate(a.assigned_at);

      progressRows.push([
        seq++,
        eid,
        fullName,
        dept,
        "—",               // Manager
        u.email,
        a.course_name,
        assignedDate,
        "—",               // Due Date
        status,
        progress,
        scoreDisp,
        passFailDisp,
        "—",               // Time Spent
      ]);

      assignRows.push([
        eid,
        fullName,
        dept,
        "—",               // Manager
        a.course_name,
        assignedDate,
        "—",               // Due Date
        status,
        "—",               // Days Overdue / Remaining
      ]);
    }
  }

  /* ──────────────────────────────────────────────
     Sheet 2: Department Analytics
  ────────────────────────────────────────────── */
  const depts = db.prepare(`
    SELECT DISTINCT department FROM users
    WHERE role = 'learner' AND department IS NOT NULL
    ORDER BY department
  `).all().map((r) => r.department);

  const deptRows = [];
  let orgTotal = 0, orgCompleted = 0, orgInProgress = 0, orgOther = 0;
  let orgScoreSum = 0, orgScoreCount = 0;

  for (const dept of depts) {
    const deptUsers = db.prepare(
      `SELECT id FROM users WHERE department = ? AND role = 'learner'`
    ).all(dept);

    let dCompleted = 0, dInProgress = 0, dOther = 0;
    let dScoreSum = 0, dScoreCount = 0;

    for (const du of deptUsers) {
      const b = db.prepare(`
        SELECT MAX(percentage) AS score, MAX(is_passed) AS passed, COUNT(*) AS attempts
        FROM user_assessment_attempts WHERE user_id = ?
      `).get(du.id);

      const cl = db.prepare(`
        SELECT COUNT(ulc.id) AS cnt FROM user_lesson_completions ulc WHERE ulc.user_id = ?
      `).get(du.id)?.cnt ?? 0;

      if (b?.passed === 1)        { dCompleted++;  if (b.score != null) { dScoreSum += b.score; dScoreCount++; } }
      else if ((b?.attempts ?? 0) > 0) dOther++;
      else if (cl > 0)            dInProgress++;
      else                        dOther++;
    }

    const total    = deptUsers.length;
    const compRate = total > 0 ? +(((dCompleted / total) * 100).toFixed(1)) : 0;
    const avgScore = dScoreCount > 0 ? +(( dScoreSum / dScoreCount).toFixed(1)) : "—";

    deptRows.push([dept, "—", total, dCompleted, dInProgress, dOther, compRate, avgScore]);

    orgTotal      += total;
    orgCompleted  += dCompleted;
    orgInProgress += dInProgress;
    orgOther      += dOther;
    orgScoreSum   += dScoreSum;
    orgScoreCount += dScoreCount;
  }

  const orgRate  = orgTotal > 0 ? +(((orgCompleted / orgTotal) * 100).toFixed(1)) : 0;
  const orgAvg   = orgScoreCount > 0 ? +(( orgScoreSum / orgScoreCount).toFixed(1)) : "—";
  deptRows.push(["ORGANISATION TOTAL", null, orgTotal, orgCompleted, orgInProgress, orgOther, orgRate, orgAvg]);

  /* ──────────────────────────────────────────────
     Sheet 3: Leaderboard & Top Scorers
  ────────────────────────────────────────────── */
  const topScorers = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.department,
           MAX(uaa.percentage) AS best_score
    FROM users u
    JOIN user_assessment_attempts uaa ON uaa.user_id = u.id
    WHERE u.role = 'learner'
    GROUP BY u.id
    ORDER BY best_score DESC
    LIMIT 20
  `).all();

  const rankEmoji = ["🥇", "🥈", "🥉"];
  const leaderRows = topScorers.map((s, i) => [
    i < 3 ? rankEmoji[i] : String(i + 1),
    empId(s.id),
    `${s.first_name} ${s.last_name}`,
    s.department || "—",
    s.best_score,
    grade(s.best_score),
  ]);

  /* ──────────────────────────────────────────────
     Build workbook
  ────────────────────────────────────────────── */
  const wb = XLSX.utils.book_new();

  // ── Sheet 1 ──
  const ws1 = XLSX.utils.aoa_to_sheet([
    ["EDSTELLAR LMS — LEARNER PROGRESS REPORT"],
    ["#", "Employee ID", "Full Name", "Department", "Manager", "Email",
     "Course Name", "Assigned On", "Due Date", "Status", "Progress %",
     "Assessment Score", "Pass / Fail", "Time Spent"],
    ...progressRows,
  ]);
  ws1["!cols"] = [
    { wch: 4 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 18 },
    { wch: 28 }, { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Learner Progress Report");

  // ── Sheet 2 ──
  const ws2 = XLSX.utils.aoa_to_sheet([
    ["DEPARTMENT-WISE TRAINING ANALYTICS"],
    ["Department", "Manager", "Total Learners", "Completed", "In Progress",
     "Not Started / Failed", "Completion Rate %", "Avg Score %"],
    ...deptRows,
  ]);
  ws2["!cols"] = [
    { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 },
    { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Department Analytics");

  // ── Sheet 3 ──
  const ws3 = XLSX.utils.aoa_to_sheet([
    ["ASSESSMENT LEADERBOARD"],
    ["Rank", "Employee ID", "Name", "Department", "Score %", "Grade"],
    ...leaderRows,
  ]);
  ws3["!cols"] = [
    { wch: 6 }, { wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "Leaderboard & Top Scorers");

  // ── Sheet 4 ──
  const ws4 = XLSX.utils.aoa_to_sheet([
    ["COURSE ASSIGNMENT & COMPLIANCE TRACKER"],
    ["Employee ID", "Full Name", "Department", "Manager", "Course Assigned",
     "Assigned On", "Due Date", "Status", "Days Overdue / Remaining"],
    ...assignRows,
  ]);
  ws4["!cols"] = [
    { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 18 },
    { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws4, "Assignment Tracker");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Edstellar_LMS_Report_${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
