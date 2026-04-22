import { scryptSync, randomBytes } from "crypto";

/* ─────────────────────────────────────────────
   SCHEMA
───────────────────────────────────────────── */

export function createSchema(db) {
  db.exec(`
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
    );

    CREATE TABLE IF NOT EXISTS courses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      description   TEXT,
      thumbnail_url TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_modules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

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
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      description   TEXT,
      passing_score INTEGER NOT NULL DEFAULT 60,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assessment_questions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id   INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      question_text   TEXT    NOT NULL,
      marks           INTEGER NOT NULL DEFAULT 1,
      sort_order      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS assessment_options (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
      option_text TEXT    NOT NULL,
      is_correct  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_course_assignments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id),
      assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS user_lesson_completions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS user_assessment_attempts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assessment_id    INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      score            INTEGER NOT NULL DEFAULT 0,
      total_questions  INTEGER NOT NULL DEFAULT 0,
      percentage       INTEGER NOT NULL DEFAULT 0,
      is_passed        INTEGER NOT NULL DEFAULT 0,
      submitted_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_assessment_answers (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id         INTEGER NOT NULL REFERENCES user_assessment_attempts(id) ON DELETE CASCADE,
      question_id        INTEGER NOT NULL REFERENCES assessment_questions(id),
      selected_option_id INTEGER REFERENCES assessment_options(id),
      is_correct         INTEGER NOT NULL DEFAULT 0
    );
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

export function seedIfEmpty(db) {
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (count.c > 0) return;

  // ── Users ──
  const insertUser = db.prepare(`
    INSERT INTO users (first_name, last_name, email, password, role, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run("Admin", "User", "admin@edstellar.com", hashPassword("Admin@123"), "admin", null).lastInsertRowid;

  // ── Course 1 ──
  const c1 = db.prepare(`
    INSERT INTO courses (name, description) VALUES (?, ?)
  `).run(
    "Project Management Fundamentals",
    "Master the core concepts of project management including planning, execution, and control. Perfect for aspiring project managers and team leads."
  ).lastInsertRowid;

  const c1m1 = db.prepare("INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)").run(c1, "Introduction to Project Management", "Foundations of PM concepts and lifecycle", 1).lastInsertRowid;
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c1m1, "What is Project Management?", "An overview of project management and why it matters.", "video", "https://www.youtube.com/embed/GC7xs-tjNW4", 12, 1);
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c1m1, "Key PM Concepts & Terminology", "Essential terms every project manager must know.", "video", "https://www.youtube.com/embed/DdvSCPCGpoU", 15, 2);

  const c1m2 = db.prepare("INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)").run(c1, "Planning & Scheduling", "How to plan and schedule projects effectively", 2).lastInsertRowid;
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c1m2, "Work Breakdown Structure (WBS)", "Breaking down project scope into manageable work packages.", "video", "https://www.youtube.com/embed/J8p7H7ipToE", 18, 1);
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c1m2, "Creating a Project Schedule", "Gantt charts, dependencies, and milestone planning.", "video", "https://www.youtube.com/embed/SCtThLSX28g", 20, 2);

  const c1m3 = db.prepare("INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)").run(c1, "Risk & Quality Management", "Identifying risks and maintaining quality standards", 3).lastInsertRowid;
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c1m3, "Risk Identification & Assessment", "How to identify, analyze, and respond to project risks.", "video", "https://www.youtube.com/embed/OU2zexbOEVs", 16, 1);
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c1m3, "Quality Management Basics", "Quality planning, assurance, and control in projects.", "video", "https://www.youtube.com/embed/D_XiGF4uSNs", 14, 2);

  // Assessment for Course 1
  const a1 = db.prepare("INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)").run(c1, "PM Fundamentals Quiz", "Test your knowledge of project management fundamentals.", 60).lastInsertRowid;
  const addQ = db.prepare("INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)");
  const addO = db.prepare("INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)");

  const q1 = addQ.run(a1, "What is the primary purpose of a Work Breakdown Structure (WBS)?", 1, 1).lastInsertRowid;
  addO.run(q1, "To break down the project scope into manageable sections", 1);
  addO.run(q1, "To estimate project costs", 0);
  addO.run(q1, "To identify project risks", 0);
  addO.run(q1, "To assign team members to tasks", 0);

  const q2 = addQ.run(a1, "Which is NOT a phase of the Project Management lifecycle?", 1, 2).lastInsertRowid;
  addO.run(q2, "Initiating", 0);
  addO.run(q2, "Planning", 0);
  addO.run(q2, "Designing", 1);
  addO.run(q2, "Closing", 0);

  const q3 = addQ.run(a1, "What does the acronym SMART stand for in goal setting?", 1, 3).lastInsertRowid;
  addO.run(q3, "Systematic, Measurable, Accurate, Realistic, Time-bound", 0);
  addO.run(q3, "Specific, Measurable, Achievable, Relevant, Time-bound", 1);
  addO.run(q3, "Simple, Manageable, Achievable, Realistic, Trackable", 0);
  addO.run(q3, "Specific, Monitored, Accurate, Resourced, Timed", 0);

  const q4 = addQ.run(a1, "A Gantt chart is primarily used to:", 1, 4).lastInsertRowid;
  addO.run(q4, "Identify project stakeholders", 0);
  addO.run(q4, "Visualize project schedule and timeline", 1);
  addO.run(q4, "Track project budget", 0);
  addO.run(q4, "Manage team communications", 0);

  const q5 = addQ.run(a1, "Which document formally authorizes a project?", 1, 5).lastInsertRowid;
  addO.run(q5, "Project Plan", 0);
  addO.run(q5, "Statement of Work", 0);
  addO.run(q5, "Project Charter", 1);
  addO.run(q5, "Risk Register", 0);

  // ── Course 2 ──
  const c2 = db.prepare(`
    INSERT INTO courses (name, description) VALUES (?, ?)
  `).run(
    "Agile & Scrum Essentials",
    "Learn the Agile methodology and Scrum framework from scratch. Build a strong foundation for agile project delivery and iterative development."
  ).lastInsertRowid;

  const c2m1 = db.prepare("INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)").run(c2, "Agile Foundations", "The Agile manifesto, values, and principles", 1).lastInsertRowid;
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c2m1, "Agile Manifesto & Principles", "Understanding the 4 values and 12 principles of the Agile Manifesto.", "video", "https://www.youtube.com/embed/Z9QbYZh1YXY", 10, 1);
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c2m1, "Agile vs Traditional Methods", "Comparing Agile and Waterfall approaches to project delivery.", "video", "https://www.youtube.com/embed/WjwEh15M5Rw", 12, 2);

  const c2m2 = db.prepare("INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)").run(c2, "Scrum Framework", "Roles, events, and artifacts of Scrum", 2).lastInsertRowid;
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c2m2, "Scrum Roles & Responsibilities", "Product Owner, Scrum Master, and Development Team explained.", "video", "https://www.youtube.com/embed/m5u0P1WPfvs", 14, 1);
  db.prepare("INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)").run(c2m2, "Scrum Events & Ceremonies", "Sprint Planning, Daily Scrum, Sprint Review, and Retrospective.", "video", "https://www.youtube.com/embed/evOhJeOF9mk", 16, 2);

  // Assessment for Course 2
  const a2 = db.prepare("INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)").run(c2, "Agile & Scrum Quiz", "Validate your understanding of Agile and Scrum concepts.", 60).lastInsertRowid;

  const q6 = addQ.run(a2, "The Agile Manifesto values 'Working software over' what?", 1, 1).lastInsertRowid;
  addO.run(q6, "Customer collaboration", 0);
  addO.run(q6, "Responding to change", 0);
  addO.run(q6, "Comprehensive documentation", 1);
  addO.run(q6, "Individuals and interactions", 0);

  const q7 = addQ.run(a2, "In Scrum, who is responsible for maximizing the value of the product?", 1, 2).lastInsertRowid;
  addO.run(q7, "Scrum Master", 0);
  addO.run(q7, "Development Team", 0);
  addO.run(q7, "Product Owner", 1);
  addO.run(q7, "Stakeholders", 0);

  const q8 = addQ.run(a2, "What is the typical duration of a Sprint?", 1, 3).lastInsertRowid;
  addO.run(q8, "1 day", 0);
  addO.run(q8, "1 to 4 weeks", 1);
  addO.run(q8, "3 months", 0);
  addO.run(q8, "6 months", 0);

  const q9 = addQ.run(a2, "Which Scrum event is used to inspect and adapt the process?", 1, 4).lastInsertRowid;
  addO.run(q9, "Sprint Planning", 0);
  addO.run(q9, "Daily Scrum", 0);
  addO.run(q9, "Sprint Review", 0);
  addO.run(q9, "Sprint Retrospective", 1);

  const q10 = addQ.run(a2, "What artifact represents the work to be done in a Sprint?", 1, 5).lastInsertRowid;
  addO.run(q10, "Product Backlog", 0);
  addO.run(q10, "Sprint Backlog", 1);
  addO.run(q10, "Increment", 0);
  addO.run(q10, "Sprint Goal", 0);

}

/* ─────────────────────────────────────────────
   ENSURE AI BANKING COURSE
   Runs on every startup — idempotent (checks before inserting)
───────────────────────────────────────────── */

export function seedBankingCourse(db) {
  // Migrate old name if present
  const oldExists = db.prepare("SELECT id FROM courses WHERE name = ?").get("AI Banking Course");
  if (oldExists) {
    db.prepare("UPDATE courses SET name = ? WHERE name = ?").run("AI for Banking", "AI Banking Course");
    return;
  }

  const exists = db.prepare("SELECT id FROM courses WHERE name = ?").get("AI for Banking");
  if (exists) return;

  const courseId = db.prepare(`
    INSERT INTO courses (name, description) VALUES (?, ?)
  `).run(
    "AI for Banking",
    "Understand how Artificial Intelligence is transforming modern banking — from legacy pipeline failures to AI-driven fraud detection, credit decisions, and personalised customer engagement."
  ).lastInsertRowid;

  const moduleId = db.prepare(
    "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)"
  ).run(
    courseId,
    "AI in Modern Banking Operations",
    "How AI addresses legacy pipeline failures, parallel processing, fraud detection, and personalised engagement.",
    1
  ).lastInsertRowid;

  db.prepare(
    "INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order) VALUES (?,?,?,?,?,?,?)"
  ).run(
    moduleId,
    "Introduction to AI in Banking",
    "An overview of how AI is replacing legacy fragmented pipelines in modern financial institutions.",
    "video",
    "https://youtu.be/EAe48VzZ7Fc?si=JuKyzNtuTdEZqyDB",
    5,
    1
  );

  const assessmentId = db.prepare(
    "INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)"
  ).run(
    courseId,
    "AI in Modern Banking Operations — Quiz",
    "Test your understanding of how AI addresses legacy pipeline failures, fraud detection, credit decisioning, and customer engagement in modern banking.",
    60
  ).lastInsertRowid;

  const addQ = db.prepare("INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)");
  const addO = db.prepare("INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)");

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

  qs.forEach((item, idx) => {
    const qId = addQ.run(assessmentId, item.q, 1, idx + 1).lastInsertRowid;
    item.opts.forEach(([text, correct]) => addO.run(qId, text, correct));
  });
}
