import { scryptSync, randomBytes } from "crypto";

/* ─────────────────────────────────────────────
   SCHEMA
───────────────────────────────────────────── */

export async function createSchema(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name  TEXT    NOT NULL,
      last_name   TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'learner',
      department  TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      description   TEXT,
      thumbnail_url TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_modules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS lessons (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id        INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
      title            TEXT    NOT NULL,
      description      TEXT,
      content_type     TEXT    NOT NULL DEFAULT 'video',
      content_url      TEXT,
      duration_minutes INTEGER,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      is_preview       INTEGER NOT NULL DEFAULT 0,
      is_active        INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assessments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      description   TEXT,
      passing_score INTEGER NOT NULL DEFAULT 60,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assessment_questions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id   INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      question_text   TEXT    NOT NULL,
      marks           INTEGER NOT NULL DEFAULT 1,
      sort_order      INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assessment_options (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
      option_text TEXT    NOT NULL,
      is_correct  INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_course_assignments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id),
      assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, course_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_lesson_completions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, lesson_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_assessment_attempts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assessment_id    INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      score            INTEGER NOT NULL DEFAULT 0,
      total_questions  INTEGER NOT NULL DEFAULT 0,
      percentage       INTEGER NOT NULL DEFAULT 0,
      is_passed        INTEGER NOT NULL DEFAULT 0,
      submitted_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_assessment_answers (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id         INTEGER NOT NULL REFERENCES user_assessment_attempts(id) ON DELETE CASCADE,
      question_id        INTEGER NOT NULL REFERENCES assessment_questions(id),
      selected_option_id INTEGER REFERENCES assessment_options(id),
      is_correct         INTEGER NOT NULL DEFAULT 0
    )
  `);
}

/* ─────────────────────────────────────────────
   PASSWORD HASHING (Node.js built-in crypto)
───────────────────────────────────────────── */

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

/* ─────────────────────────────────────────────
   SEED DATA
───────────────────────────────────────────── */

export async function seedIfEmpty(db) {
  const count = (await db.execute("SELECT COUNT(*) as c FROM users")).rows[0];
  if (count.c > 0) return;

  // ── Users ──
  const adminResult = await db.execute({
    sql: `INSERT INTO users (first_name, last_name, email, password, role, department) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ["Admin", "User", "admin@edstellar.com", hashPassword("Admin@123"), "admin", null],
  });
  const adminId = adminResult.lastInsertRowid;

  // ── Course 1 ──
  const c1Result = await db.execute({
    sql: `INSERT INTO courses (name, description) VALUES (?, ?)`,
    args: [
      "Project Management Fundamentals",
      "Master the core concepts of project management including planning, execution, and control. Perfect for aspiring project managers and team leads.",
    ],
  });
  const c1 = c1Result.lastInsertRowid;

  const c1m1Result = await db.execute({
    sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)",
    args: [c1, "Introduction to Project Management", "Foundations of PM concepts and lifecycle", 1],
  });
  const c1m1 = c1m1Result.lastInsertRowid;

  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c1m1, "What is Project Management?", "An overview of project management and why it matters.", "video", "https://www.youtube.com/embed/GC7xs-tjNW4", 12, 1],
  });
  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c1m1, "Key PM Concepts & Terminology", "Essential terms every project manager must know.", "video", "https://www.youtube.com/embed/DdvSCPCGpoU", 15, 2],
  });

  const c1m2Result = await db.execute({
    sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)",
    args: [c1, "Planning & Scheduling", "How to plan and schedule projects effectively", 2],
  });
  const c1m2 = c1m2Result.lastInsertRowid;

  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c1m2, "Work Breakdown Structure (WBS)", "Breaking down project scope into manageable work packages.", "video", "https://www.youtube.com/embed/J8p7H7ipToE", 18, 1],
  });
  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c1m2, "Creating a Project Schedule", "Gantt charts, dependencies, and milestone planning.", "video", "https://www.youtube.com/embed/SCtThLSX28g", 20, 2],
  });

  const c1m3Result = await db.execute({
    sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)",
    args: [c1, "Risk & Quality Management", "Identifying risks and maintaining quality standards", 3],
  });
  const c1m3 = c1m3Result.lastInsertRowid;

  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c1m3, "Risk Identification & Assessment", "How to identify, analyze, and respond to project risks.", "video", "https://www.youtube.com/embed/OU2zexbOEVs", 16, 1],
  });
  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c1m3, "Quality Management Basics", "Quality planning, assurance, and control in projects.", "video", "https://www.youtube.com/embed/D_XiGF4uSNs", 14, 2],
  });

  // Assessment for Course 1
  const a1Result = await db.execute({
    sql: "INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)",
    args: [c1, "PM Fundamentals Quiz", "Test your knowledge of project management fundamentals.", 60],
  });
  const a1 = a1Result.lastInsertRowid;

  const q1Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a1, "What is the primary purpose of a Work Breakdown Structure (WBS)?", 1, 1],
  });
  const q1 = q1Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q1, "To break down the project scope into manageable sections", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q1, "To estimate project costs", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q1, "To identify project risks", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q1, "To assign team members to tasks", 0] });

  const q2Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a1, "Which is NOT a phase of the Project Management lifecycle?", 1, 2],
  });
  const q2 = q2Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q2, "Initiating", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q2, "Planning", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q2, "Designing", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q2, "Closing", 0] });

  const q3Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a1, "What does the acronym SMART stand for in goal setting?", 1, 3],
  });
  const q3 = q3Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q3, "Systematic, Measurable, Accurate, Realistic, Time-bound", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q3, "Specific, Measurable, Achievable, Relevant, Time-bound", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q3, "Simple, Manageable, Achievable, Realistic, Trackable", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q3, "Specific, Monitored, Accurate, Resourced, Timed", 0] });

  const q4Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a1, "A Gantt chart is primarily used to:", 1, 4],
  });
  const q4 = q4Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q4, "Identify project stakeholders", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q4, "Visualize project schedule and timeline", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q4, "Track project budget", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q4, "Manage team communications", 0] });

  const q5Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a1, "Which document formally authorizes a project?", 1, 5],
  });
  const q5 = q5Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q5, "Project Plan", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q5, "Statement of Work", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q5, "Project Charter", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q5, "Risk Register", 0] });

  // ── Course 2 ──
  const c2Result = await db.execute({
    sql: `INSERT INTO courses (name, description) VALUES (?, ?)`,
    args: [
      "Agile & Scrum Essentials",
      "Learn the Agile methodology and Scrum framework from scratch. Build a strong foundation for agile project delivery and iterative development.",
    ],
  });
  const c2 = c2Result.lastInsertRowid;

  const c2m1Result = await db.execute({
    sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)",
    args: [c2, "Agile Foundations", "The Agile manifesto, values, and principles", 1],
  });
  const c2m1 = c2m1Result.lastInsertRowid;

  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c2m1, "Agile Manifesto & Principles", "Understanding the 4 values and 12 principles of the Agile Manifesto.", "video", "https://www.youtube.com/embed/Z9QbYZh1YXY", 10, 1],
  });
  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c2m1, "Agile vs Traditional Methods", "Comparing Agile and Waterfall approaches to project delivery.", "video", "https://www.youtube.com/embed/WjwEh15M5Rw", 12, 2],
  });

  const c2m2Result = await db.execute({
    sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)",
    args: [c2, "Scrum Framework", "Roles, events, and artifacts of Scrum", 2],
  });
  const c2m2 = c2m2Result.lastInsertRowid;

  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c2m2, "Scrum Roles & Responsibilities", "Product Owner, Scrum Master, and Development Team explained.", "video", "https://www.youtube.com/embed/m5u0P1WPfvs", 14, 1],
  });
  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [c2m2, "Scrum Events & Ceremonies", "Sprint Planning, Daily Scrum, Sprint Review, and Retrospective.", "video", "https://www.youtube.com/embed/evOhJeOF9mk", 16, 2],
  });

  // Assessment for Course 2
  const a2Result = await db.execute({
    sql: "INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)",
    args: [c2, "Agile & Scrum Quiz", "Validate your understanding of Agile and Scrum concepts.", 60],
  });
  const a2 = a2Result.lastInsertRowid;

  const q6Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a2, "The Agile Manifesto values 'Working software over' what?", 1, 1],
  });
  const q6 = q6Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q6, "Customer collaboration", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q6, "Responding to change", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q6, "Comprehensive documentation", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q6, "Individuals and interactions", 0] });

  const q7Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a2, "In Scrum, who is responsible for maximizing the value of the product?", 1, 2],
  });
  const q7 = q7Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q7, "Scrum Master", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q7, "Development Team", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q7, "Product Owner", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q7, "Stakeholders", 0] });

  const q8Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a2, "What is the typical duration of a Sprint?", 1, 3],
  });
  const q8 = q8Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q8, "1 day", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q8, "1 to 4 weeks", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q8, "3 months", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q8, "6 months", 0] });

  const q9Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a2, "Which Scrum event is used to inspect and adapt the process?", 1, 4],
  });
  const q9 = q9Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q9, "Sprint Planning", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q9, "Daily Scrum", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q9, "Sprint Review", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q9, "Sprint Retrospective", 1] });

  const q10Result = await db.execute({
    sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
    args: [a2, "What artifact represents the work to be done in a Sprint?", 1, 5],
  });
  const q10 = q10Result.lastInsertRowid;
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q10, "Product Backlog", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q10, "Sprint Backlog", 1] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q10, "Increment", 0] });
  await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [q10, "Sprint Goal", 0] });
}

/* ─────────────────────────────────────────────
   ENSURE AI BANKING COURSE
   Runs on every startup — idempotent (checks before inserting)
───────────────────────────────────────────── */

export async function seedBankingCourse(db) {
  // Migrate old name if present
  const oldExists = (await db.execute({ sql: "SELECT id FROM courses WHERE name = ?", args: ["AI Banking Course"] })).rows[0];
  if (oldExists) {
    await db.execute({ sql: "UPDATE courses SET name = ? WHERE name = ?", args: ["AI for Banking", "AI Banking Course"] });
    return;
  }

  const exists = (await db.execute({ sql: "SELECT id FROM courses WHERE name = ?", args: ["AI for Banking"] })).rows[0];
  if (exists) return;

  const courseResult = await db.execute({
    sql: `INSERT INTO courses (name, description) VALUES (?, ?)`,
    args: [
      "AI for Banking",
      "Understand how Artificial Intelligence is transforming modern banking — from legacy pipeline failures to AI-driven fraud detection, credit decisions, and personalised customer engagement.",
    ],
  });
  const courseId = courseResult.lastInsertRowid;

  const moduleResult = await db.execute({
    sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)",
    args: [
      courseId,
      "AI in Modern Banking Operations",
      "How AI addresses legacy pipeline failures, parallel processing, fraud detection, and personalised engagement.",
      1,
    ],
  });
  const moduleId = moduleResult.lastInsertRowid;

  await db.execute({
    sql: "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)",
    args: [
      moduleId,
      "Introduction to AI in Banking",
      "An overview of how AI is replacing legacy fragmented pipelines in modern financial institutions.",
      "video",
      "https://youtu.be/EAe48VzZ7Fc?si=JuKyzNtuTdEZqyDB",
      5,
      1,
    ],
  });

  const assessmentResult = await db.execute({
    sql: "INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)",
    args: [
      courseId,
      "AI in Modern Banking Operations — Quiz",
      "Test your understanding of how AI addresses legacy pipeline failures, fraud detection, credit decisioning, and customer engagement in modern banking.",
      60,
    ],
  });
  const assessmentId = assessmentResult.lastInsertRowid;

  const qs = [
    { q: "What operational paradox do financial institutions face in modern banking?", opts: [["Customer expectations are declining while data volumes shrink", 0], ["Data volume is expanding exponentially while required response time is shrinking to zero", 1], ["Digital infrastructure is improving but customer trust is declining", 0], ["Manual processing is faster than digital systems", 0]] },
    { q: "What is the primary structural problem identified in legacy banking pipelines?", opts: [["Lack of customer-facing mobile applications", 0], ["Over-reliance on cloud computing systems", 0], ["Rigid single-file sequences built around fragmented systems and manual checks", 1], ["Too many parallel processing streams running simultaneously", 0]] },
    { q: "What happens when human teams step in to review documents in a legacy pipeline?", opts: [["Processing speed doubles due to human accuracy", 0], ["The single-file sequence breaks down, creating immediate systemic friction", 1], ["Customer satisfaction improves due to personal attention", 0], ["Fraud detection rates increase significantly", 0]] },
    { q: "What is the internal consequence of manual processing in legacy banking systems?", opts: [["Increased regulatory compliance and audit trails", 0], ["Higher customer retention and satisfaction scores", 0], ["Manual fatigue and fragmented views of customer data leading to inconsistent decision-making", 1], ["Reduced operational costs across all departments", 0]] },
    { q: "What does the transcript state about implementing Artificial Intelligence in banking?", opts: [["It is an optional upgrade for large institutions only", 0], ["It is a future concept still being tested in pilot programs", 0], ["It is a strict operational necessity", 1], ["It is primarily useful for marketing and customer acquisition", 0]] },
    { q: "What is the primary function of the central AI decision engine described in the transcript?", opts: [["To replace human relationship managers in branch banking", 0], ["To ingest continuous, massive volumes of both structured and unstructured data", 1], ["To manage regulatory filings and compliance documentation", 0], ["To automate employee payroll and internal HR functions", 0]] },
    { q: "How does parallel processing in AI architecture improve banking operations?", opts: [["It reduces the number of servers required to run banking systems", 0], ["It increases the number of human reviewers needed per transaction", 0], ["It completely bypasses the sequential delays that choked the legacy pipeline", 1], ["It simplifies the user interface for mobile banking customers", 0]] },
    { q: "What is a key advantage of algorithmic processing over human operators in document review?", opts: [["Algorithms can only process structured data, making them more accurate", 0], ["A human operator processes documents faster when supported by AI tools", 0], ["An algorithm cross-references thousands of inputs simultaneously, identifying complex patterns invisible to the human eye", 1], ["Algorithms reduce data storage costs by compressing transaction records", 0]] },
    { q: "How does the legacy fraud detection system operate, according to the transcript?", opts: [["It uses real-time AI monitoring to flag transactions before completion", 0], ["It relies on retroactive human analysis reviewing transactions after they happen", 1], ["It uses behavioral baselines to predict fraudulent accounts in advance", 0], ["It blocks all international transactions by default for security", 0]] },
    { q: "At what point does the AI fraud detection system trigger an alert?", opts: [["After the transaction has been completed and reported by the customer", 0], ["During the monthly account reconciliation process", 0], ["When a transaction stream deviates from established behavioral baselines, in milliseconds", 1], ["When the customer manually flags a suspicious charge in the app", 0]] },
    { q: "What is the deeper value of AI-powered virtual assistants beyond 24/7 availability?", opts: [["They reduce the need for mobile banking applications", 0], ["They generate behavioral personalization by pulling discrete historical data points to create relevant recommendations", 1], ["They replace relationship managers for high-net-worth customers", 0], ["They provide multilingual support across all global markets", 0]] },
    { q: "How does AI transform the customer service function in banking?", opts: [["From a digital-first model to a branch-based experience", 0], ["From proactive engagement to reactive cost management", 0], ["From a reactive high-friction cost center to a proactive tool for personalized engagement", 1], ["From automated processing to fully manual high-touch service", 0]] },
    { q: "What is the core advantage of AI in credit and loan application processing?", opts: [["It slows down application processing to ensure greater accuracy", 0], ["It evaluates a significantly wider set of variables simultaneously than any human underwriter could process", 1], ["It reduces the number of loan products available to consumers", 0], ["It increases paperwork requirements to reduce default risk", 0]] },
    { q: "What operational balance does algorithmic lending achieve?", opts: [["It prioritises institutional profit over customer access to capital", 0], ["It eliminates risk entirely from the lending portfolio", 0], ["It expands customer access to capital while maintaining strict, calculated risk management", 1], ["It reduces loan approval rates to minimise institutional exposure", 0]] },
    { q: "What does the transcript identify as the only mathematical way for a bank to remain secure, efficient, and future-ready?", opts: [["Hiring more skilled analysts and expanding human review teams", 0], ["Investing in branch infrastructure and physical security systems", 0], ["Abandoning manual fragmentation for an integrated algorithmic architecture", 1], ["Partnering with fintech startups to outsource core processing functions", 0]] },
  ];

  for (let idx = 0; idx < qs.length; idx++) {
    const item = qs[idx];
    const qResult = await db.execute({
      sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)",
      args: [assessmentId, item.q, 1, idx + 1],
    });
    const qId = qResult.lastInsertRowid;
    for (const [text, correct] of item.opts) {
      await db.execute({
        sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)",
        args: [qId, text, correct],
      });
    }
  }
}

/* ─────────────────────────────────────────────
   SEED EXTRA LESSONS + COURSE 4
   Idempotent — checks by course name / lesson count
───────────────────────────────────────────── */

export async function seedExtraContent(db) {
  // Only run if Course 4 doesn't exist yet
  const c4Exists = (await db.execute({ sql: "SELECT id FROM courses WHERE name = ?", args: ["Leadership & Communication"] })).rows[0];
  if (c4Exists) return;

  // ── Add modules/lessons to Course 1 ──
  const c1 = (await db.execute({ sql: "SELECT id FROM courses WHERE name = ?", args: ["Project Management Fundamentals"] })).rows[0]?.id;
  if (c1) {
    const m4 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c1, "Stakeholder Management", "Identifying and managing project stakeholders", 4] })).lastInsertRowid;
    for (const [t, d, min, ord] of [
      ["Identifying Project Stakeholders", "Tools to find and analyse everyone with a stake in your project.", 18, 1],
      ["Stakeholder Communication Planning", "How to plan what, when and how to communicate.", 20, 2],
      ["Managing Stakeholder Expectations", "Techniques to align expectations and resolve conflicts.", 17, 3],
    ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [m4, t, d, "video", min, ord] });

    const m5 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c1, "Budget & Resource Management", "Estimating costs and managing project resources", 5] })).lastInsertRowid;
    for (const [t, d, min, ord] of [
      ["Project Cost Estimation Techniques", "Analogous, parametric and bottom-up estimating methods.", 22, 1],
      ["Resource Planning & Allocation", "Matching people and materials to project tasks.", 20, 2],
      ["Earned Value Management (EVM)", "Track cost and schedule performance with EVM metrics.", 18, 3],
    ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [m5, t, d, "video", min, ord] });

    const m6 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c1, "Monitoring, Change & Closure", "Keeping projects on track and closing them properly", 6] })).lastInsertRowid;
    for (const [t, d, min, ord] of [
      ["Project Performance Metrics & KPIs", "Key indicators to monitor project health.", 16, 1],
      ["Change Management in Projects", "How to handle scope changes without derailing delivery.", 18, 2],
      ["Project Closure & Lessons Learned", "Formal closure steps and capturing what worked.", 15, 3],
    ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [m6, t, d, "video", min, ord] });
  }

  // ── Add modules/lessons to Course 2 ──
  const c2 = (await db.execute({ sql: "SELECT id FROM courses WHERE name = ?", args: ["Agile & Scrum Essentials"] })).rows[0]?.id;
  if (c2) {
    const m3 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c2, "Kanban & Lean", "Visualising flow and eliminating waste", 3] })).lastInsertRowid;
    for (const [t, d, min, ord] of [
      ["Kanban Principles & Visualisation", "WIP limits, pull systems and flow metrics.", 16, 1],
      ["Lean Methodology Basics", "Value stream mapping and the seven types of waste.", 18, 2],
      ["Building & Running a Kanban Board", "Practical walkthrough of setting up and using Kanban.", 15, 3],
    ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [m3, t, d, "video", min, ord] });

    const m4 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c2, "Scaling Agile", "Frameworks for scaling Agile across large organisations", 4] })).lastInsertRowid;
    for (const [t, d, min, ord] of [
      ["SAFe Framework Introduction", "Scaled Agile Framework: trains, PI planning and ARTs.", 20, 1],
      ["Large-Scale Scrum (LeSS) Basics", "Applying Scrum principles to multi-team programmes.", 18, 2],
      ["Agile Release Trains & PI Planning", "Synchronising multiple teams around a shared programme increment.", 16, 3],
    ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [m4, t, d, "video", min, ord] });
  }

  // ── Add modules/lessons to Course 3 ──
  const c3 = (await db.execute({ sql: "SELECT id FROM courses WHERE name = ?", args: ["AI for Banking"] })).rows[0]?.id;
  if (c3) {
    const m2 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c3, "AI in Risk & Compliance", "Using AI for risk modelling, fraud detection and compliance", 2] })).lastInsertRowid;
    for (const [t, d, min, ord] of [
      ["Credit Risk Modelling with AI", "How machine learning improves credit-scoring accuracy.", 18, 1],
      ["AI-Powered Fraud Detection", "Real-time anomaly detection and adaptive fraud prevention.", 20, 2],
      ["Regulatory Compliance & Explainable AI", "Meeting GDPR, Basel III and explainability requirements.", 15, 3],
    ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [m2, t, d, "video", min, ord] });

    const m3 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c3, "Future of AI in Finance", "Emerging AI use-cases transforming financial services", 3] })).lastInsertRowid;
    for (const [t, d, min, ord] of [
      ["Conversational AI & Banking Chatbots", "Virtual assistants, NLP and omnichannel service delivery.", 16, 1],
      ["Robo-Advisory & Wealth Management AI", "Algorithm-driven portfolio management and client onboarding.", 17, 2],
      ["AI Ethics & Responsible Innovation in Finance", "Bias, fairness, accountability and governance in financial AI.", 14, 3],
    ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [m3, t, d, "video", min, ord] });
  }

  // ── Course 4: Leadership & Communication ──
  const c4Res = await db.execute({ sql: "INSERT INTO courses (name, description) VALUES (?,?)", args: ["Leadership & Communication", "Develop the leadership mindset and communication skills needed to inspire teams, manage conflict, and drive organisational performance."] });
  const c4 = c4Res.lastInsertRowid;

  const lc1 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c4, "Foundations of Leadership", "Core leadership principles and styles", 1] })).lastInsertRowid;
  for (const [t, d, min, ord] of [
    ["What Makes a Great Leader?", "Traits, mindsets and behaviours that define effective leaders.", 20, 1],
    ["Leadership Styles & When to Use Them", "Situational, transformational and servant leadership models.", 18, 2],
    ["Building Trust & Credibility", "How leaders build psychological safety and long-term trust.", 17, 3],
  ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [lc1, t, d, "video", min, ord] });

  const lc2 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c4, "Effective Communication", "Communication frameworks for leaders", 2] })).lastInsertRowid;
  for (const [t, d, min, ord] of [
    ["Communication Models & Frameworks", "Shannon-Weaver, assertive vs passive vs aggressive styles.", 16, 1],
    ["Active Listening Skills", "Techniques to listen with intent and demonstrate understanding.", 18, 2],
    ["Giving & Receiving Feedback", "SBI model, radical candour and growth-focused feedback cultures.", 20, 3],
  ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [lc2, t, d, "video", min, ord] });

  const lc3 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c4, "Team Dynamics & Conflict", "Building high-performing teams and navigating conflict", 3] })).lastInsertRowid;
  for (const [t, d, min, ord] of [
    ["High-Performance Teams", "Tuckman's stages, team charters and psychological safety.", 17, 1],
    ["Managing Conflict at Work", "Thomas-Kilmann model and mediation techniques.", 19, 2],
    ["Motivation & Employee Engagement", "Maslow, Herzberg and intrinsic motivation in the workplace.", 18, 3],
  ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [lc3, t, d, "video", min, ord] });

  const lc4 = (await db.execute({ sql: "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)", args: [c4, "Emotional Intelligence", "Self-awareness, empathy and resilience for leaders", 4] })).lastInsertRowid;
  for (const [t, d, min, ord] of [
    ["Understanding Emotional Intelligence (EQ)", "Goleman's five dimensions of EQ and why they matter for leaders.", 16, 1],
    ["Self-Awareness & Self-Regulation", "Identifying triggers, managing reactions and staying composed.", 18, 2],
    ["Empathy & Social Awareness at Work", "Reading the room, perspective-taking and inclusive leadership.", 15, 3],
  ]) await db.execute({ sql: "INSERT INTO lessons (module_id, title, description, content_type, duration_minutes, sort_order) VALUES (?,?,?,?,?,?)", args: [lc4, t, d, "video", min, ord] });

  // Assessment for Course 4
  const a4Res = await db.execute({ sql: "INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)", args: [c4, "Leadership & Communication Quiz", "Test your understanding of leadership styles, communication frameworks and team dynamics.", 60] });
  const a4 = a4Res.lastInsertRowid;

  for (const [idx, q, opts] of [
    [1, "Which leadership style adjusts approach based on the follower's readiness?", [["Transformational", 0], ["Situational Leadership", 1], ["Autocratic", 0], ["Laissez-faire", 0]]],
    [2, "The SBI feedback model stands for:", [["Subject, Behaviour, Impact", 0], ["Situation, Behaviour, Impact", 1], ["Situation, Background, Insight", 0], ["Subject, Background, Intent", 0]]],
    [3, "In Tuckman's model, which stage involves high conflict as roles are established?", [["Forming", 0], ["Storming", 1], ["Norming", 0], ["Performing", 0]]],
    [4, "Which of Goleman's EQ dimensions involves recognising emotions in others?", [["Self-awareness", 0], ["Self-regulation", 0], ["Empathy", 1], ["Motivation", 0]]],
    [5, "Herzberg's two-factor theory distinguishes between:", [["Leadership styles and follower maturity", 0], ["Hygiene factors and motivators", 1], ["Intrinsic and extrinsic goals", 0], ["Formal and informal communication channels", 0]]],
  ]) {
    const qRes = await db.execute({ sql: "INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)", args: [a4, q, 1, idx] });
    for (const [text, correct] of opts)
      await db.execute({ sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)", args: [qRes.lastInsertRowid, text, correct] });
  }
}

/* ─────────────────────────────────────────────
   SEED 15 LEARNERS WITH COMPLETIONS
   Idempotent — skips if >= 15 learner users exist
───────────────────────────────────────────── */

export async function seedLearners(db) {
  const cnt = (await db.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'learner'")).rows[0].c;
  if (cnt >= 15) return;

  const admin = (await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")).rows[0];
  const adminId = admin?.id ?? 1;

  // All lesson IDs ordered by id (insertion order = course order)
  const allLessons = (await db.execute("SELECT id, duration_minutes FROM lessons ORDER BY id")).rows;
  const allCourseIds = (await db.execute("SELECT id FROM courses ORDER BY id")).rows.map((r) => r.id);

  // Assessments with their question counts
  const assessments = (await db.execute(`
    SELECT a.id, a.passing_score, COUNT(aq.id) AS total_q
    FROM assessments a
    JOIN assessment_questions aq ON aq.assessment_id = a.id
    GROUP BY a.id
    ORDER BY a.id
  `)).rows;

  // [first, last, email, dept, juneCount, mayCount, score, attempt: 1=passed 2=failed 0=none]
  const LEARNERS = [
    { first:"Sneha",   last:"Kulkarni", email:"sneha.k@edstellar.com",   dept:"Engineering", june:38, may:5,  score:93, attempt:1 },
    { first:"Kartik",  last:"Reddy",    email:"kartik.r@edstellar.com",   dept:"Sales",       june:36, may:5,  score:88, attempt:1 },
    { first:"Rahul",   last:"Verma",    email:"rahul.v@edstellar.com",    dept:"Engineering", june:32, may:6,  score:82, attempt:1 },
    { first:"Manish",  last:"Gupta",    email:"manish.g@edstellar.com",   dept:"HR",          june:30, may:5,  score:78, attempt:1 },
    { first:"Arun",    last:"Kumar",    email:"arun.k@edstellar.com",     dept:"Sales",       june:28, may:5,  score:75, attempt:1 },
    { first:"Priya",   last:"Sharma",   email:"priya.s@edstellar.com",    dept:"Sales",       june:26, may:5,  score:71, attempt:1 },
    { first:"Rohan",   last:"Desai",    email:"rohan.d@edstellar.com",    dept:"Operations",  june:24, may:4,  score:68, attempt:1 },
    { first:"Ananya",  last:"Singh",    email:"ananya.s@edstellar.com",   dept:"Operations",  june:22, may:4,  score:63, attempt:1 },
    { first:"Pooja",   last:"Bhatt",    email:"pooja.b@edstellar.com",    dept:"Engineering", june:20, may:4,  score:60, attempt:1 },
    { first:"Vikram",  last:"Iyer",     email:"vikram.i@edstellar.com",   dept:"Engineering", june:16, may:3,  score:52, attempt:2 },
    { first:"Nisha",   last:"Menon",    email:"nisha.m@edstellar.com",    dept:"HR",          june:14, may:3,  score:48, attempt:2 },
    { first:"Deepak",  last:"Nair",     email:"deepak.n@edstellar.com",   dept:"Operations",  june:12, may:2,  score:44, attempt:2 },
    { first:"Kavita",  last:"Joshi",    email:"kavita.j@edstellar.com",   dept:"Sales",       june:10, may:2,  score:0,  attempt:0 },
    { first:"Suresh",  last:"Patel",    email:"suresh.p@edstellar.com",   dept:"Operations",  june:8,  may:2,  score:0,  attempt:0 },
    { first:"Meena",   last:"Iyer",     email:"meena.i@edstellar.com",    dept:"HR",          june:6,  may:1,  score:0,  attempt:0 },
  ];

  const total = allLessons.length;

  for (let li = 0; li < LEARNERS.length; li++) {
    const l = LEARNERS[li];

    // Insert user
    const uRes = await db.execute({
      sql: "INSERT OR IGNORE INTO users (first_name, last_name, email, password, role, department) VALUES (?,?,?,?,?,?)",
      args: [l.first, l.last, l.email, hashPassword("Learner@123"), "learner", l.dept],
    });
    const userId = uRes.lastInsertRowid;
    if (!userId) continue; // already exists (IGNORE)

    // Assign to all courses
    for (const courseId of allCourseIds) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO user_course_assignments (user_id, course_id, assigned_by) VALUES (?,?,?)",
        args: [userId, courseId, adminId],
      });
    }

    // June completions — spread across June 1–28
    const juneCount = Math.min(l.june, total);
    for (let i = 0; i < juneCount; i++) {
      const day = String((i % 28) + 1).padStart(2, "0");
      await db.execute({
        sql: "INSERT OR IGNORE INTO user_lesson_completions (user_id, lesson_id, completed_at) VALUES (?,?,?)",
        args: [userId, allLessons[i].id, `2026-06-${day} 09:00:00`],
      });
    }

    // May completions — next slice of lessons
    const mayStart = juneCount;
    const mayCount = Math.min(l.may, total - mayStart);
    for (let i = 0; i < mayCount; i++) {
      const day = String((i % 20) + 8).padStart(2, "0");
      await db.execute({
        sql: "INSERT OR IGNORE INTO user_lesson_completions (user_id, lesson_id, completed_at) VALUES (?,?,?)",
        args: [userId, allLessons[mayStart + i].id, `2026-05-${day} 09:00:00`],
      });
    }

    // Assessment attempts
    if (l.attempt > 0) {
      const submittedDay = String(10 + li).padStart(2, "0");
      for (const asmt of assessments) {
        const totalQ = Number(asmt.total_q);
        const pct = l.attempt === 1 ? l.score : l.score;
        const numCorrect = Math.round(pct * totalQ / 100);
        const isPassed = pct >= Number(asmt.passing_score) ? 1 : 0;
        await db.execute({
          sql: "INSERT INTO user_assessment_attempts (user_id, assessment_id, score, total_questions, percentage, is_passed, submitted_at) VALUES (?,?,?,?,?,?,?)",
          args: [userId, asmt.id, numCorrect, totalQ, pct, isPassed, `2026-06-${submittedDay} 14:00:00`],
        });
      }
    }
  }
}

/* ─────────────────────────────────────────────
   SEED DEMO LEARNER (demolearner@gmail.com)
   Idempotent — checks by email then by completion count
───────────────────────────────────────────── */

export async function seedDemoLearner(db) {
  // 1. Get or create the demo user
  let demoUser = (await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: ["demolearner@gmail.com"] })).rows[0];

  if (!demoUser) {
    const res = await db.execute({
      sql: "INSERT INTO users (first_name, last_name, email, password, role, department) VALUES (?,?,?,?,?,?)",
      args: ["Priya", "Sharma", "demolearner@gmail.com", hashPassword("Demo@123"), "learner", "Sales"],
    });
    demoUser = { id: res.lastInsertRowid };
  }

  const userId = demoUser.id;

  // 2. Assign to all courses
  const courses = (await db.execute("SELECT id FROM courses ORDER BY id")).rows;
  const admin = (await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")).rows[0];

  for (const course of courses) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO user_course_assignments (user_id, course_id, assigned_by, assigned_at) VALUES (?,?,?,?)",
      args: [userId, course.id, admin?.id ?? 1, "2026-06-01 08:00:00"],
    });
  }

  // 3. Skip if completions already seeded
  const existingCnt = (await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_lesson_completions WHERE user_id = ?", args: [userId] })).rows[0].c;
  if (existingCnt >= 15) return;

  // 4. Seed partial lesson completions per course
  const allLessons = (await db.execute(`
    SELECT l.id, l.duration_minutes, cm.course_id
    FROM lessons l
    JOIN course_modules cm ON cm.id = l.module_id
    ORDER BY cm.course_id, cm.sort_order, l.sort_order
  `)).rows;

  const lessonsByCourse = {};
  for (const l of allLessons) {
    if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
    lessonsByCourse[l.course_id].push(l);
  }

  // completion ratios: C1 80%, C2 60%, C3 43%, C4 17%
  const courseIds = courses.map((c) => c.id);
  const ratios = [0.80, 0.60, 0.43, 0.17];
  let dayIdx = 0;

  for (let ci = 0; ci < courseIds.length; ci++) {
    const lessons = lessonsByCourse[courseIds[ci]] || [];
    const count = Math.min(Math.floor(lessons.length * (ratios[ci] ?? 0.3)), lessons.length);
    for (let i = 0; i < count; i++) {
      const day = String((dayIdx % 13) + 1).padStart(2, "0");
      dayIdx++;
      await db.execute({
        sql: "INSERT OR IGNORE INTO user_lesson_completions (user_id, lesson_id, completed_at) VALUES (?,?,?)",
        args: [userId, lessons[i].id, `2026-06-${day} 10:${String((i * 7) % 60).padStart(2, "0")}:00`],
      });
    }
  }

  // 5. Seed assessment attempt for course 1 (passed, 78%)
  const existingAttempts = (await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ?", args: [userId] })).rows[0].c;
  if (existingAttempts === 0) {
    const a1 = (await db.execute({
      sql: `SELECT a.id, a.passing_score, COUNT(aq.id) AS total_q
            FROM assessments a
            JOIN assessment_questions aq ON aq.assessment_id = a.id
            WHERE a.course_id = ? GROUP BY a.id LIMIT 1`,
      args: [courseIds[0]],
    })).rows[0];
    if (a1) {
      const pct = 78;
      await db.execute({
        sql: "INSERT INTO user_assessment_attempts (user_id, assessment_id, score, total_questions, percentage, is_passed, submitted_at) VALUES (?,?,?,?,?,?,?)",
        args: [userId, a1.id, Math.round(pct * Number(a1.total_q) / 100), Number(a1.total_q), pct, 1, "2026-06-10 14:00:00"],
      });
    }
  }
}
