# Edstellar LMS — Product & Technical Overview

> **Prepared for:** Tech Lead Review  
> **Date:** June 2026  
> **Status:** Production-ready (development server)

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Technology Stack](#2-technology-stack)
3. [Application Architecture](#3-application-architecture)
4. [Authentication & Security](#4-authentication--security)
5. [Database Schema](#5-database-schema)
6. [Course Management](#6-course-management)
7. [Sessions & Attendance](#7-sessions--attendance)
8. [SCORM Implementation](#8-scorm-implementation)
9. [Admin Portal — Features & Routes](#9-admin-portal--features--routes)
10. [Learner Portal — Features & Routes](#10-learner-portal--features--routes)
11. [API Catalogue](#11-api-catalogue)
12. [File & Asset Storage](#12-file--asset-storage)
13. [Key Engineering Patterns](#13-key-engineering-patterns)

---

## 1. Project Summary

Edstellar LMS is a single-codebase, full-stack Learning Management System built on **Next.js 15 App Router**. It serves two distinct user roles — **Admin** and **Learner** — through separate portal experiences within the same application. The platform supports structured course delivery (modules + lessons + assessments), instructor-led and virtual training sessions with attendance tracking, and full **SCORM 1.2 / 2004** e-learning content playback.

**Live data snapshot (as of June 2026):**
- 1 Admin account
- 19 Learner accounts
- 8 Courses (7 published, 1 draft)
- 5 Training Sessions (3 upcoming, 2 completed)
- SCORM infrastructure ready for package uploads

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Server + Client Components, Route Groups |
| Language | **JavaScript** (ESM) | No TypeScript |
| Database | **Turso / libsql** | Cloud-hosted SQLite, accessed via `@libsql/client` |
| Styling | **Tailwind CSS v4** | Utility-first, mobile-first |
| UI Components | **Shadcn UI** | Radix-based accessible primitives |
| Charts | **Recharts** | Dashboard analytics |
| Auth | **Custom JWT** | Hand-rolled HMAC-SHA256, HTTP-only cookies |
| SCORM Runtime | **scorm-again** | SCORM 1.2 + 2004 API provider |
| ZIP Extraction | **adm-zip** | Server-side package extraction |
| Manifest Parsing | **fast-xml-parser** | `imsmanifest.xml` parsing |
| Password Hashing | **Node.js crypto** | `scryptSync` with random salt |
| Deployment Target | Self-hosted / VPS | Node.js 18+ required |

---

## 3. Application Architecture

### 3.1 Route Group Structure

```
app/
├── (auth)/                    → /login, /register         Public, no sidebar
├── (learner)/                 → /dashboard, /my-courses … Learner sidebar + topnav
├── (admin)/                   → /admin/dashboard …        Admin sidebar + topnav
├── scorm-player/[packageId]/  → /scorm-player/:id         Full-screen, no sidebar
├── layout.js                  → Root: fonts + global CSS only
└── page.js                    → Redirects to /login
```

Each route group has its own `layout.js` which:
1. Reads the JWT cookie server-side
2. Redirects to `/login` if missing
3. Renders the appropriate sidebar + topnav shell

### 3.2 Rendering Strategy

All authenticated pages use **Static Shell + Client-side Data Fetching**:

```
Build time  →  Static HTML shell (headings, layout, skeleton loaders)
Runtime     →  useEffect() fetches data from API route → fills in content
```

This gives instant perceived load (~10ms CDN shell) with data arriving in ~100–200ms, avoiding full SSR blocking.

**Rule:** `page.js` files are always Server Components (no `"use client"`). Data-fetching widgets inside them are Client Components.

### 3.3 Component Architecture

```
components/
├── ui/          Shadcn primitives + Text, Box (no business logic)
├── shared/      Portal-agnostic domain components
├── learner/     Learner-specific components only
├── admin/       Admin-specific components only
├── layout/      TopNav, LearnerSidebar, AdminSidebar
└── scorm/       SCORM player client component
```

- `<Text>` replaces all raw `h1–h5`, `p`, `span` tags
- `<Box>` replaces all raw `div` tags
- All styling via Tailwind utility classes — zero inline `style={}` props

---

## 4. Authentication & Security

### 4.1 Token Flow

```
POST /api/auth/login
  └── Verify email + scrypt password hash
  └── signToken({ userId, role, email })   ← HMAC-SHA256 JWT, 7-day expiry
  └── Set HTTP-only cookie "token"
  └── Return { token, user } to client

Client stores token in:
  - HTTP-only cookie (server-side auth checks)
  - AuthContext state (client-side API calls as Bearer token)
```

### 4.2 JWT Payload Structure

```json
{
  "userId": 4,
  "role": "learner",
  "email": "demolearner@gmail.com",
  "exp": 1753000000
}
```

> **Important:** The JWT uses `userId` (not `id`). All API routes that need the learner's DB id reference `payload.userId`.

### 4.3 API Route Guards

```js
requireAuth(request)   // Any authenticated user — returns payload or null
requireAdmin(request)  // Admin only — checks role === "admin"
```

Every API route validates independently — the client is never trusted.

### 4.4 Password Policy

Enforced both client-side (live strength meter) and server-side:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character

Passwords are hashed with `scryptSync(password, salt, 64)` — a 128-character hex string stored as `hash.salt`.

---

## 5. Database Schema

All tables live in a single Turso (cloud SQLite) database. Schema is applied idempotently on every server startup via `createSchema(db)` using `CREATE TABLE IF NOT EXISTS`.

### 5.1 Core Tables (15 tables)

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| first_name, last_name | TEXT | |
| email | TEXT UNIQUE | |
| password | TEXT | scrypt hash |
| role | TEXT | `admin` or `learner` |
| department | TEXT | |
| location | TEXT | Added via migration |
| job_role | TEXT | Added via migration |
| employee_id | TEXT | Added via migration |
| is_active | INTEGER | 1=active, 0=inactive |
| created_at | TEXT | ISO datetime |

#### `courses`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | |
| description | TEXT | |
| thumbnail_url | TEXT | |
| is_active | INTEGER | 1=published, 0=draft |
| created_at, updated_at | TEXT | |

#### `course_modules`
Linked to `courses` via `course_id`. Has `sort_order` for ordering within a course.

#### `lessons`
Linked to `course_modules` via `module_id`. Fields: `content_type` (video/document), `content_url`, `duration_minutes`, `sort_order`, `is_preview`, `is_active`.

#### `assessments`
One assessment per course. Fields: `passing_score` (default 60%).

#### `assessment_questions` + `assessment_options`
Multiple-choice questions with one correct option per question.

#### `user_course_assignments`
Maps learners to courses. Admin assigns via `/admin/assign-learning`. Fields: `user_id`, `course_id`, `assigned_by`, `assigned_at`, `due_date`.

#### `user_lesson_completions`
Tracks per-lesson completion with timestamp. `UNIQUE(user_id, lesson_id)` prevents duplicates.

#### `user_assessment_attempts`
Each quiz submission stored with `score`, `total_questions`, `percentage`, `is_passed`.

#### `user_assessment_answers`
Stores which option was selected per question per attempt.

### 5.2 Sessions Tables (3 tables)

#### `sessions`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| title | TEXT | |
| session_type | TEXT | `ILT` or `Virtual` |
| department | TEXT | Target department |
| course_id | INTEGER FK | Optional course link |
| capacity | INTEGER | Max learners |
| trainer | TEXT | Instructor name |
| venue_url | TEXT | Room name or meeting URL |
| date | TEXT | `YYYY-MM-DD` |
| start_time, end_time | TEXT | `HH:MM` 24h |
| description | TEXT | |
| status | TEXT | `upcoming`, `completed`, `cancelled` |
| created_at | TEXT | |

#### `session_roster`
Maps learners to sessions. `UNIQUE(session_id, user_id)`.

#### `session_attendance`
Per-learner attendance record. Fields: `status` (present/absent/late/partial/excused), `is_locked` (1 = finalized, no further edits), `marked_by` (admin user id), `marked_at`.

### 5.3 SCORM Tables (3 tables)

#### `scorm_packages`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| title | TEXT | Auto-detected or override |
| version | TEXT | `1.2` or `2004` |
| entry_point | TEXT | Relative path to launch file |
| package_dir | TEXT UNIQUE | UUID subdirectory name |
| course_id | INTEGER FK | Optional course link |
| created_by | INTEGER FK | Admin who uploaded |
| is_active | INTEGER | 1=active, 0=inactive |
| created_at | TEXT | |

#### `user_scorm_assignments`
Maps learners to SCORM packages. Same pattern as `user_course_assignments`. `UNIQUE(user_id, package_id)`.

#### `scorm_tracking`
| Column | Type | Notes |
|---|---|---|
| user_id, package_id | INTEGER FK | UNIQUE pair |
| lesson_status | TEXT | SCORM 1.2: not attempted / incomplete / completed / passed / failed |
| completion_status | TEXT | SCORM 2004: unknown / not attempted / incomplete / completed |
| success_status | TEXT | SCORM 2004: unknown / passed / failed |
| score_raw, score_max | REAL | Numeric score |
| total_time | TEXT | Cumulative time string |
| suspend_data | TEXT | Arbitrary bookmark (up to 4096 chars) |
| location | TEXT | Lesson location bookmark |
| cmi_data | TEXT | Full CMI object as JSON blob |
| updated_at | TEXT | Last save timestamp |

---

## 6. Course Management

### 6.1 Content Library (Admin)

Courses follow a three-level hierarchy:

```
Course
  └── Module 1
        └── Lesson 1 (video / document)
        └── Lesson 2
  └── Module 2
        └── ...
  └── Assessment (quiz, multiple-choice)
```

**Draft / Publish toggle:** Every course has `is_active` (0=draft, 1=published).
- Draft courses are visible only in Content Library with a "Draft" badge
- Only published courses appear in Assign Learning
- Admin can toggle status in the course editor

### 6.2 Current Courses (7 published, 1 draft)

| ID | Name | Status | Modules | Notes |
|---|---|---|---|---|
| 1 | Project Management Fundamentals | Published | 6 | Core PM lifecycle, WBS, risk, stakeholders, budget, closure |
| 2 | Agile & Scrum Essentials | Published | 4 | Scrum, Kanban, Lean, SAFe scaling |
| 3 | AI for Banking | Published | 3 | AI operations, risk & compliance, future of AI in finance |
| 5 | AI for Finance & IT | Published | — | |
| 6 | Leadership & Communication | Published | 4 | Foundations, communication, team dynamics, EQ |
| 7 | *(test)* | Published | — | |
| 8 | *(test)* | Published | — | |
| 9 | Data Analytics Fundamentals | **Draft** | 3 | Data collection, EDA, visualisation & storytelling |

### 6.3 Assignment Flow

```
Admin → Assign Learning page
  └── Select course (published only)
  └── Select learners or department
  └── POST /api/admin/courses/[courseId]/assignments
      └── INSERT INTO user_course_assignments

Learner → My Courses page
  └── GET /api/learner/courses
      └── JOIN user_course_assignments → courses → modules → lessons
      └── JOIN user_lesson_completions to compute progress %
```

### 6.4 Progress Tracking

Progress % = `completed_lessons / total_lessons × 100`

Completion is recorded via `POST /api/learner/lessons/[lessonId]/complete` which inserts into `user_lesson_completions` (idempotent — `INSERT OR IGNORE`).

### 6.5 Assessments

- One assessment per course with configurable `passing_score` (default 60%)
- Multiple-choice only — one correct option per question
- Each attempt stored in `user_assessment_attempts` with `percentage` and `is_passed`
- Learner can retake; all attempts are stored (no limit)
- Admin Assessment Builder: create/edit questions and options via modal

---

## 7. Sessions & Attendance

### 7.1 Overview

Sessions represent instructor-led (ILT) or virtual training events. They are independent of courses (though optionally linkable). The full lifecycle is: **Create → Roster → Mark Attendance → Lock**.

### 7.2 Session Types

| Type | Description |
|---|---|
| `ILT` | In-person. `venue_url` holds the room/location name |
| `Virtual` | Online. `venue_url` holds the meeting link (Zoom, Google Meet, etc.) |

### 7.3 Current Sessions (5)

| ID | Title | Type | Date | Status |
|---|---|---|---|---|
| 1 | Project Management Bootcamp — Batch 1 | ILT | 10 Jul 2026 | Upcoming |
| 2 | Agile & Scrum Deep Dive — Virtual | Virtual | 15 Jul 2026 | Upcoming |
| 3 | Sales Leadership Masterclass | ILT | 5 Jun 2026 | Completed |
| 4 | HR Compliance & Policy Update | Virtual | 12 Jun 2026 | Completed |
| 5 | Operations Excellence Workshop | ILT | 22 Jul 2026 | Upcoming |

### 7.4 Roster Management

The **Roster Dialog** allows admin to:
- Add individual learners by searching and selecting
- Bulk-enroll an entire department with one click ("Enroll All")
- Remove learners from upcoming sessions

```
POST /api/admin/sessions/[sessionId]/roster
  Body: { user_id: 5 }                        ← single learner
  Body: { enroll_all: true, department: "HR" } ← bulk by dept

GET /api/admin/sessions/[sessionId]/roster
  Returns: { enrolled: [...], available: [...] }
```

Available learners = all active learners NOT already on the roster, with optional department filter.

### 7.5 Attendance Marking

**Mark Attendance tab** (admin):
1. Select session from dropdown
2. View all enrolled learners in an editable table
3. Set each learner's status: Present / Absent / Late / Partial / Excused
4. **Save Draft** — saves without locking (admin can edit later)
5. **Save & Lock** — finalizes (`is_locked = 1`), prevents further changes

Attendance statuses per learner stored in `session_attendance`. Locked records cannot be modified through the UI.

```
GET /api/admin/sessions/[sessionId]/attendance
  Returns: { records: [...], is_locked: boolean }

PUT /api/admin/sessions/[sessionId]/attendance
  Body: { records: [{user_id, status}, ...], lock: true|false }
  → UPSERTS each record with INSERT OR REPLACE
  → Sets is_locked on all records for that session
```

### 7.6 Attendance Reports Tab

Shows:
- 4 stat cards: Total Sessions, Total Enrolled, Overall Attendance Rate, Avg Capacity Used
- Per-session breakdown: attendance count, present/absent/late counts, progress bar

### 7.7 UI Conditional Logic

For **completed sessions**, the Roster and Edit buttons are hidden. Only "View Attendance" is shown.

For **upcoming sessions**, all actions are available: Roster | Mark Attendance | Edit | Cancel.

### 7.8 Training Calendars

**Admin Calendar** (`/admin/calendar`):
- Fetches ALL sessions from `GET /api/admin/sessions`
- Monthly grid view with color-coded chips by session type
- Click chip → detail popup with roster count, capacity, trainer, venue

**Learner Calendar** (`/training-calendar`):
- Fetches ONLY sessions the learner is enrolled in via `GET /api/learner/sessions`
- Query: JOINs `session_roster → sessions → courses → session_attendance`
- Shows `attendance_status` badge on completed sessions (Present / Absent / etc.)
- Calendar view + List view toggle
- Detail popup shows personal attendance status

---

## 8. SCORM Implementation

### 8.1 What is SCORM?

SCORM (Sharable Content Object Reference Model) is an e-learning standard for packaging and delivering interactive courses. A SCORM package is a `.zip` file containing:
- `imsmanifest.xml` — metadata declaring title, SCORM version, and launch entry point
- HTML / JS / CSS / media files — the actual course content

Two versions are supported:
- **SCORM 1.2** — most widely used, communicates via `window.API`
- **SCORM 2004** — newer standard, communicates via `window.API_1484_11`

The key principle: the LMS injects a JavaScript API object onto `window`. The SCORM content (running in an `<iframe>`) calls `window.parent.API.LMSGetValue(...)` to read/write progress data back to the LMS.

### 8.2 Upload & Extraction Flow

```
Admin uploads .zip file
    │
    ▼
POST /api/admin/scorm/upload  (multipart/form-data)
    │
    ├── Read file buffer from FormData
    ├── Generate UUID → package_dir
    ├── Create directory: public/scorm/{uuid}/
    ├── Extract ZIP with adm-zip → public/scorm/{uuid}/...
    │
    ├── Read imsmanifest.xml
    ├── Parse with fast-xml-parser + regex fallback
    │     ├── Detect version (schemaversion field)
    │     │     "1.2"              → SCORM 1.2
    │     │     "2004 *" / "CAM"   → SCORM 2004
    │     ├── Find entry point (first resource with adlcp:scormtype="sco")
    │     └── Extract title from <organization><title>
    │
    ├── INSERT INTO scorm_packages
    └── Return { package } with id, title, version, entry_point
```

**Manifest parsing strategy:**
1. Primary: `fast-xml-parser` with `ignoreAttributes: false` — handles well-formed manifests
2. Regex fallback: scans raw XML for `scormtype="sco"` and `href=` patterns
3. Last resort: defaults to `index.htm` as entry point

**Files are served statically** — Next.js automatically serves everything under `public/` at the root URL. A package extracted to `public/scorm/abc123/story.html` is immediately accessible at `/scorm/abc123/story.html`.

### 8.3 SCORM Player

Route: `/scorm-player/[packageId]` — a dedicated full-screen page **outside** all portal route groups (no sidebar, no topnav).

```
ScormPlayerPage (Server Component)
  └── ScormPlayerClient (Client Component — "use client")
        │
        ├── Fetch package metadata:  GET /api/admin/scorm/[packageId]
        ├── Fetch saved tracking:    GET /api/learner/scorm/[packageId]/tracking
        │
        ├── Dynamic import: import('scorm-again')
        │     ├── SCORM 1.2  → new Scorm12API({ autocommit: false })
        │     └── SCORM 2004 → new Scorm2004API({ autocommit: false })
        │
        ├── Load saved CMI data:     api.loadFromJSON(savedCmi, '')
        │     └── Restores lesson_status, score, suspend_data, location
        │         so learner resumes exactly where they left off
        │
        ├── Register event hooks:
        │     SCORM 1.2:   api.on('LMSCommit', save)
        │                  api.on('LMSFinish', save)
        │     SCORM 2004:  api.on('Commit',    save)
        │                  api.on('Terminate', save)
        │
        ├── Expose on window:
        │     window.API          (SCORM 1.2)
        │     window.API_1484_11  (SCORM 2004)
        │
        ├── Render:
        │     <TopBar>  title | version badge | status badge | Exit button
        │     <iframe src="/scorm/{package_dir}/{entry_point}" />
        │
        └── On Exit / unmount → final save + cleanup window.API
```

**How the iframe communicates:**

The SCORM content inside the iframe calls `window.parent.API.LMSGetValue('cmi.core.lesson_status')`. Because the player page IS the parent, and `window.API` is set on it, the call succeeds. The `scorm-again` library handles the full CMI data model — validation, error codes, data types — per the SCORM specification.

### 8.4 Tracking & Resume

```
POST /api/learner/scorm/[packageId]/tracking
  Body: { cmi_data: { ...full cmi object... } }

Server extracts key fields:
  SCORM 1.2 paths:   cmi.core.lesson_status   → lesson_status
                     cmi.core.score.raw        → score_raw
                     cmi.core.total_time       → total_time
                     cmi.suspend_data          → suspend_data
                     cmi.core.lesson_location  → location

  SCORM 2004 paths:  cmi.completion_status     → completion_status
                     cmi.success_status        → success_status
                     cmi.score.raw             → score_raw
                     cmi.total_time            → total_time
                     cmi.suspend_data          → suspend_data
                     cmi.location              → location

Full cmi_data JSON blob also stored for complete fidelity.

UPSERT: INSERT OR REPLACE → always only one row per (user_id, package_id)
```

**Resume flow:** On next launch, `cmi_data` is read from `scorm_tracking` and re-loaded into the fresh `scorm-again` instance via `api.loadFromJSON()`. The content receives its previous state and continues from the bookmark stored in `suspend_data` / `location`.

### 8.5 Assignment Flow

```
Admin → SCORM Manager page
  └── Assign button on package card
      └── Assign Dialog
            ├── Search / filter learners by department
            ├── Select learners (multi-select)
            └── POST /api/admin/scorm/[packageId]/assign
                  Body: { user_ids: [4, 7, 11] }
                  → INSERT OR IGNORE INTO user_scorm_assignments

Learner → SCORM Courses page (/scorm)
  └── GET /api/learner/scorm
        → JOIN user_scorm_assignments + scorm_packages + scorm_tracking
        → Returns packages with their tracking status for this learner
```

### 8.6 Package Storage

```
project root/
└── public/
    └── scorm/
        ├── .gitkeep
        └── {uuid}/                        ← one dir per uploaded package
              ├── imsmanifest.xml
              ├── index.html               ← entry point (varies)
              ├── content.js
              └── assets/
                    ├── course.css
                    └── images/...
```

Files are served by Next.js static serving at `/scorm/{uuid}/...`. No CDN or object storage required for self-hosted deployment.

### 8.7 Delete Flow

```
DELETE /api/admin/scorm/[packageId]
  1. DELETE FROM scorm_packages WHERE id = ?
     → Cascades to: user_scorm_assignments, scorm_tracking
  2. rm -rf public/scorm/{package_dir}
```

---

## 9. Admin Portal — Features & Routes

| Route | Feature | Description |
|---|---|---|
| `/admin/dashboard` | Dashboard | KPI cards, completion status pie, enrollment vs completion chart, activity line chart |
| `/admin/users` | User Management | List/search/filter learners; Add, Edit, Activate/Deactivate, Delete; Bulk CSV import; Export template |
| `/admin/courses` | Content Library | Create/edit courses with draft/publish toggle; Module + lesson management; Assessment builder |
| `/admin/courses/[id]` | Course Detail | Tabs: Overview, Modules & Lessons, Assessments, Enrolled Learners |
| `/admin/assign-learning` | Assign Learning | Assign published courses to individual learners or departments |
| `/admin/sessions` | Sessions & Attendance | 3-tab UI: Sessions list, Mark Attendance, Attendance Reports |
| `/admin/scorm` | SCORM Manager | Upload packages, assign to learners, view completion stats, delete |
| `/admin/calendar` | Training Calendar | Dynamic monthly calendar from sessions data |
| `/admin/departments` | Departments | Org-level analytics by department |
| `/admin/reports` | Reports | Learner progress reports with export |
| `/admin/learning-hours` | Learning Hours | Weekly activity charts, enrollment vs completion, hours distribution |
| `/admin/leaderboard` | Leaderboard | Top learners ranked by completion and score |

### 9.1 Admin Sidebar Sections

```
Main          → Dashboard
User Mgmt     → Manage Users · Roles & Permissions
Course Mgmt   → Content Library · Assessment Builder · Learning Journeys
              → Sessions & Attendance · SCORM Manager · Training Calendar
Assignments   → Assign Learning
Analytics     → Departments · Reports · Learning Hours · Leaderboard · Certificates
```

---

## 10. Learner Portal — Features & Routes

| Route | Feature | Description |
|---|---|---|
| `/dashboard` | Dashboard | Enrolled courses progress, recent activity, achievements |
| `/my-courses` | My Courses | All assigned courses with progress bars; lesson player |
| `/my-courses/[id]` | Course Detail | Modules, lessons (video player), assessment launch |
| `/scorm` | SCORM Courses | Assigned SCORM packages with status; Launch/Resume/Review buttons |
| `/training-calendar` | Training Calendar | Personal calendar — enrolled sessions only, with attendance status |
| `/progress` | My Progress | Per-course completion, lesson breakdown |
| `/learning-hours` | Learning Hours | Hours logged over time |
| `/achievements` | Achievements | Badges and milestones earned |
| `/leaderboard` | Leaderboard | Peer ranking |
| `/certifications` | Certificates | Completed course certificates |
| `/team-learning` | Team Learning | Manager view — 2 direct reports, completion rate, learning hours |
| `/change-password` | Change Password | Secure password update with live strength meter |

### 10.1 Learner Sidebar Sections

```
Main          → Dashboard
My Learnings  → My Courses · SCORM Courses · Training Calendar
My Progress   → My Progress · Learning Hours
My Achieve.   → My Achievements · Leaderboard · Certificates
My Team       → Team Learning
Footer        → Change Password · Logout
```

### 10.2 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@edstellar.com | Admin@123 |
| Learner (demo) | demolearner@gmail.com | Demo@123 |
| Learner (seeded) | sneha.k@edstellar.com | Learner@123 |

---

## 11. API Catalogue

### 11.1 Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Email + password → JWT token |
| GET | `/api/auth/me` | Verify token, return user profile |
| POST | `/api/auth/register` | Self-register as learner |

### 11.2 Admin — Users

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/users` | List all learners (with filters) |
| POST | `/api/admin/users` | Create new learner |
| GET/PUT/PATCH/DELETE | `/api/admin/users/[userId]` | Detail, edit, activate/deactivate, delete |
| POST | `/api/admin/users/bulk` | Bulk CSV import |
| GET | `/api/admin/users/template` | Download CSV template |

### 11.3 Admin — Courses

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/admin/courses` | List all / create course |
| GET/PUT/DELETE | `/api/admin/courses/[courseId]` | Detail / update / delete |
| GET/POST | `/api/admin/courses/[courseId]/modules` | List / add module |
| GET/POST | `/api/admin/courses/[courseId]/assignments` | Enrolled learners / assign |
| GET/POST | `/api/admin/courses/[courseId]/assessments` | Assessments for course |
| GET/PUT/DELETE | `/api/admin/modules/[moduleId]` | Update / delete module |
| GET/POST | `/api/admin/modules/[moduleId]/lessons` | List / add lesson |
| GET/PUT/DELETE | `/api/admin/lessons/[lessonId]` | Update / delete lesson |
| GET/PUT/DELETE | `/api/admin/assessments/[assessmentId]` | Assessment CRUD |
| GET/POST | `/api/admin/assessments/[assessmentId]/questions` | Questions |
| GET/PUT/DELETE | `/api/admin/questions/[questionId]` | Question CRUD |

### 11.4 Admin — Sessions

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/admin/sessions` | List sessions / create session |
| GET/PUT/DELETE | `/api/admin/sessions/[sessionId]` | Detail / update / delete |
| GET/POST/DELETE | `/api/admin/sessions/[sessionId]/roster` | View / add / remove learners |
| GET/PUT | `/api/admin/sessions/[sessionId]/attendance` | View / mark attendance |

### 11.5 Admin — SCORM

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/scorm` | List all packages with stats |
| POST | `/api/admin/scorm/upload` | Upload + extract + parse ZIP |
| GET/DELETE | `/api/admin/scorm/[packageId]` | Detail with assignments / delete package + files |
| POST/DELETE | `/api/admin/scorm/[packageId]/assign` | Assign / unassign learners |

### 11.6 Admin — Analytics

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | KPIs, completion stats, weekly activity |
| GET | `/api/admin/reports` | Per-learner progress report |
| GET | `/api/admin/learning-hours` | Weekly hours, enrollment vs completion |
| GET | `/api/admin/departments` | Per-department breakdown |
| GET | `/api/admin/leaderboard` | Ranked learner list |
| GET | `/api/admin/employees` | Employee list (with filters) |
| GET | `/api/admin/export` | Export data to XLSX |

### 11.7 Learner

| Method | Route | Description |
|---|---|---|
| GET | `/api/learner/dashboard` | Dashboard KPIs |
| GET | `/api/learner/courses` | Assigned courses with progress |
| GET | `/api/learner/courses/[courseId]` | Course detail + lessons |
| POST | `/api/learner/lessons/[lessonId]/complete` | Mark lesson done |
| GET | `/api/learner/assessments` | Available assessments |
| GET | `/api/learner/assessments/[id]` | Assessment with questions |
| POST | `/api/learner/assessments/[id]/attempt` | Submit quiz attempt |
| GET | `/api/learner/assessments/[id]/attempts` | Past attempts |
| GET | `/api/learner/progress` | Progress overview |
| GET | `/api/learner/learning-hours` | Hours logged |
| GET | `/api/learner/achievements` | Badges + milestones |
| GET | `/api/learner/leaderboard` | Peer ranking |
| GET | `/api/learner/sessions` | Enrolled sessions (calendar data) |
| GET | `/api/learner/scorm` | Assigned SCORM packages |
| GET/POST | `/api/learner/scorm/[packageId]/tracking` | Read / write SCORM CMI data |
| POST | `/api/learner/change-password` | Update password (verified against current) |

---

## 12. File & Asset Storage

| Asset Type | Storage Location | Served At |
|---|---|---|
| SCORM package files | `public/scorm/{uuid}/` | `/scorm/{uuid}/...` |
| Course thumbnails | External URL (content_url) | Direct link |
| Lesson videos | External URL (YouTube embeds) | Embedded iframe |
| CSV import template | Generated in-memory | `/api/admin/users/template` |
| XLSX exports | Generated in-memory | `/api/admin/export` |

SCORM files are the only runtime-written assets. All other media references are external URLs stored in the database. No object storage (S3/R2) is required for the current self-hosted setup.

---

## 13. Key Engineering Patterns

### 13.1 Idempotent Schema Migrations

All schema changes use `CREATE TABLE IF NOT EXISTS`. Column additions use `try { ALTER TABLE ... } catch {}` so repeated server restarts never fail:

```js
try {
  await db.execute("ALTER TABLE users ADD COLUMN location TEXT");
} catch { /* already exists — safe to ignore */ }
```

### 13.2 Idempotent Seed Functions

Every seed function checks existence before inserting. Example:
```js
export async function seedSessions(db) {
  const count = (await db.execute("SELECT COUNT(*) as c FROM sessions")).rows[0];
  if (Number(count.c) > 0) return; // already seeded
  // ...
}
```

This allows the database to be re-initialized without duplicate data.

### 13.3 Global DB Connection Cache

```js
const g = globalThis;
export async function getDb() {
  if (!g._lmsDb) {
    const client = createClient({ url: TURSO_DB_URL, authToken: TURSO_AUTH_TOKEN });
    await createSchema(client);
    await seedIfEmpty(client);
    // ... all seed functions
    g._lmsDb = client;
  }
  return g._lmsDb;
}
```

The Turso client is created once and cached on `globalThis` to survive Next.js hot-reloads during development. On cold starts (new deployment), it re-initializes.

> **Note:** When adding new DB tables during development, kill and restart the dev server to clear `g._lmsDb` and force schema re-application.

### 13.4 SCORM CMI Field Normalization

The tracking API handles both SCORM 1.2 and 2004 field paths in one handler:

```js
// SCORM 1.2 path          // SCORM 2004 path       // stored as
cmi.core.lesson_status  ?? cmi.completion_status  → lesson_status
cmi.core.score.raw      ?? cmi.score.raw          → score_raw
cmi.core.total_time     ?? cmi.total_time         → total_time
cmi.suspend_data        ?? cmi.suspend_data       → suspend_data (same in both)
```

The full `cmi_data` JSON blob is also stored, so no CMI data is ever lost regardless of version.

### 13.5 Draft / Publish Pattern

The `is_active` column controls visibility across the system:
- `0` = Draft — visible only in Content Library (admin), excluded from Assign Learning
- `1` = Published — visible everywhere

Filter applied in assign learning: `(d.courses || []).filter((c) => c.is_active)`

This same pattern is used for `scorm_packages.is_active`.

### 13.6 Password Security

```
hashPassword(password):
  salt = randomBytes(16).toString('hex')        // 32-char hex
  buf  = scryptSync(password, salt, 64)         // 64-byte derived key
  return `${buf.hex}.${salt}`                   // 161-char stored string

verifyPassword(input, stored):
  [hash, salt] = stored.split('.')
  derived = scryptSync(input, salt, 64)
  return timingSafeEqual(hash, derived)          // constant-time comparison
```

`timingSafeEqual` prevents timing attacks on password comparison.

---

*Document generated from codebase — Edstellar LMS, June 2026.*
