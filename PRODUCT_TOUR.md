# Edstellar LMS — Product Tour

> **For:** Stakeholders · Product Owners · Business Teams  
> **Purpose:** Understand what this platform does, who uses it, and how it all fits together

---

## What Is Edstellar LMS?

Edstellar LMS is a **Learning Management System** — a platform that helps organisations manage, deliver, and track employee training from one place.

Think of it as the single hub where:
- HR and L&D teams create and manage training content
- Employees access their assigned courses and complete training
- Managers see who has learned what and who still needs to

It handles everything from structured online courses and interactive e-learning packages to scheduled classroom and virtual training sessions — all under one roof.

---

## Who Uses It?

The platform has two types of users, each with their own dedicated experience.

---

### The Admin

> *Typically: HR Manager, L&D Lead, Training Coordinator*

The Admin sees the full picture. They can:
- Add and manage all employees on the platform
- Create training content and organise it into structured courses
- Schedule instructor-led and virtual training sessions
- Assign training to individuals, teams, or entire departments
- Upload third-party e-learning packages (SCORM)
- Track who has completed what, who is falling behind, and how the organisation is performing overall

---

### The Learner

> *Typically: Any employee in the organisation*

The Learner has a clean, focused experience. They can:
- See exactly what training has been assigned to them
- Complete courses at their own pace, lesson by lesson
- Take quizzes and assessments to test their knowledge
- View their enrolled training sessions on a personal calendar
- Track their own progress and achievements
- Launch interactive e-learning content assigned by their admin

---

## The Two Portals

To keep things clean and uncluttered, each role gets a completely separate portal:

| | **Admin Portal** | **Learner Portal** |
|---|---|---|
| **URL** | `/admin/dashboard` | `/dashboard` |
| **Purpose** | Manage, assign, track | Learn, complete, grow |
| **Sees others' data?** | Yes — everyone's progress | No — only their own |

Admins never see learner views accidentally. Learners never stumble into admin settings.

---

## How a Training Journey Works (End to End)

Here is how a typical learning journey plays out on Edstellar, from setup to completion.

---

### Step 1 — Admin Sets Up the Organisation

The Admin starts by adding employees to the platform. This can be done:
- **One by one** — filling in a form with name, email, department, and job role
- **In bulk** — uploading a CSV file with hundreds of employees at once

Each employee gets login credentials they can use right away.

---

### Step 2 — Admin Builds the Training Content

The Admin creates courses in the **Content Library**. A course is structured like this:

```
Course: "Project Management Fundamentals"
  ├── Module 1: Introduction to PM
  │     ├── Lesson 1: What is a Project?    (video)
  │     └── Lesson 2: PM Methodologies     (document)
  ├── Module 2: Planning & Scheduling
  │     └── ...
  └── Assessment: 20-question quiz (pass mark: 60%)
```

Courses can be saved as **drafts** while being built, then **published** when ready to assign to learners. Only published courses are visible to learners.

---

### Step 3 — Admin Assigns Training

Once content is ready, the Admin uses the **Assign Learning** page to push courses to the right people.

They can assign:
- A specific course to a specific individual
- A specific course to an entire department (e.g., all of Sales gets "Sales Leadership")
- Multiple courses to one person at once

The learner immediately sees the assignment in their portal.

---

### Step 4 — Learner Completes the Course

The Learner logs in and sees their assigned courses on the **My Courses** page. They work through it at their own pace:

1. Open the course
2. Watch videos or read documents, lesson by lesson
3. Each completed lesson is marked off automatically
4. Progress bar updates in real time (e.g., "6 of 10 lessons complete — 60%")
5. When all lessons are done, take the end-of-course assessment
6. Pass the quiz → course marked as **Completed** ✓

Learners can stop mid-course and pick up exactly where they left off.

---

### Step 5 — Admin Tracks Progress

The Admin doesn't need to chase anyone manually. The platform tracks everything automatically:

- **Dashboard** — live overview: how many learners are active, how many courses are completed, weekly activity trends
- **Reports** — per-learner breakdown: which courses assigned, completion %, quiz scores, hours spent learning
- **Departments** — compare performance across teams and departments
- **Leaderboard** — top learners by completions and scores
- **Learning Hours** — how much time the organisation is investing in training each week

---

## The Three Learning Formats

Edstellar supports three distinct ways to deliver training:

---

### Format 1 — Structured Courses (Self-Paced)

The most common format. Learners work through a course at their own time and pace — videos, reading material, and a quiz at the end.

**Best for:** Skills training, compliance courses, onboarding programmes, knowledge-based learning.

---

### Format 2 — Live Sessions (ILT & Virtual)

Scheduled training events, either in-person or online.

| | **ILT (In-Person)** | **Virtual** |
|---|---|---|
| **Format** | Classroom / workshop | Zoom, Google Meet, Teams |
| **Location** | Room or venue name | Meeting link |
| **Who manages it** | Admin creates the session, sets capacity, assigns a trainer |
| **Who attends** | Learners enrolled via the roster |

**How it works:**
1. Admin creates a session with a date, time, trainer, and venue
2. Enrols learners — either individually or by department in one click
3. The session appears on the learner's **Training Calendar** automatically
4. After the session, Admin marks attendance: Present / Absent / Late / Partial / Excused
5. Attendance is locked once finalised — creating a permanent record

**Best for:** Workshops, certifications, interactive group training, compliance sign-offs.

---

### Format 3 — SCORM (Interactive E-Learning)

SCORM packages are ready-made interactive e-learning courses built by external tools like Articulate Storyline, Adobe Captivate, or iSpring. They look like polished interactive experiences with animations, branching scenarios, and built-in tracking.

**How it works for Admin:**
1. Upload the SCORM package (a `.zip` file from the authoring tool)
2. The platform automatically reads the package, detects the title and version
3. Assign it to individual learners or full departments

**How it works for Learner:**
1. Open the SCORM Courses page
2. Click **Launch** — the course opens full-screen
3. Complete the interactive experience (it behaves like an app)
4. Click **Exit** — progress is saved instantly
5. Next time, click **Resume** — the course picks up exactly where it left off

The platform remembers the learner's score, time spent, last position, and pass/fail status — all automatically.

**Best for:** Compliance training, product demos, interactive simulations, vendor-provided e-learning content.

---

## Key Pages at a Glance

### Admin Portal

| Page | What It Does |
|---|---|
| **Dashboard** | Snapshot of the whole organisation — active users, completions, trends |
| **Manage Users** | Add, edit, activate, deactivate employees. Bulk import via CSV |
| **Content Library** | Build and publish courses with modules, lessons, and quizzes |
| **Sessions & Attendance** | Create training events, manage rosters, mark and lock attendance |
| **SCORM Manager** | Upload interactive e-learning packages and assign them to teams |
| **Assign Learning** | Push courses to individuals or departments |
| **Training Calendar** | Visual monthly view of all upcoming sessions |
| **Reports** | Per-learner progress, scores, completions |
| **Departments** | Team-level performance comparison |
| **Leaderboard** | Top performers across the organisation |
| **Learning Hours** | Time spent learning, week by week |

---

### Learner Portal

| Page | What It Does |
|---|---|
| **Dashboard** | Personal overview — assigned courses, recent activity |
| **My Courses** | All assigned courses with progress bars. Click in to start learning |
| **SCORM Courses** | Interactive e-learning packages assigned by admin |
| **Training Calendar** | Personal calendar — only shows sessions the learner is enrolled in |
| **My Progress** | Detailed breakdown of completions and quiz results |
| **Learning Hours** | Time spent learning over time |
| **Achievements** | Badges and milestones earned |
| **Leaderboard** | Where they rank against peers |
| **Team Learning** | For managers — a view of their direct reports' learning activity |
| **Change Password** | Secure account management |

---

## Security & Access

- Every user has a **private account** — employees only ever see their own training
- Admins and Learners are completely separated — no accidental crossover
- Passwords are securely encrypted — nobody, including the system, can read a stored password
- Sessions are managed through secure login tokens that expire automatically
- Admins can deactivate an employee account instantly (e.g., when they leave) — they lose access immediately

---

## What Makes This Platform Stand Out

| Capability | Benefit |
|---|---|
| All three learning formats in one platform | No need for separate tools for courses, sessions, and e-learning |
| Automatic progress tracking | No manual chasing — the system updates in real time |
| Bulk employee import | Onboard hundreds of employees at once with a spreadsheet |
| SCORM support | Re-use existing e-learning content from any authoring tool |
| Resume from where you left off | Learners are never forced to restart a course |
| Attendance locking | Finalised attendance records are tamper-proof |
| Department-level analytics | Identify training gaps across the whole organisation |
| Dual portal design | Clean, focused experience for each role |

---

## A Typical Week on Edstellar

**Monday** — HR Manager uploads a new e-learning package from the compliance team. Assigns it to all 120 employees in the Operations department.

**Tuesday** — A training session "Leadership Essentials Workshop" goes live for 25 selected employees. Each of them sees it appear on their Training Calendar automatically.

**Wednesday** — 18 of 25 attendees have launched their assigned SCORM package. The dashboard shows real-time completion progress.

**Thursday** — The workshop happens. Admin marks attendance directly in the platform: 22 Present, 2 Absent, 1 Late. Locks the record.

**Friday** — The L&D Lead exports the weekly learning report. It shows 340 lessons completed, 12 courses finished, and 2 learners who need a nudge.

---

## Summary

Edstellar LMS is a complete training platform that covers the full cycle of employee learning — from building content and scheduling sessions, to tracking progress and reporting outcomes. It is designed so that HR and L&D teams spend less time chasing and more time improving, while employees get a clean, focused experience that makes it easy to learn and grow.

---

*Edstellar LMS — June 2026*
