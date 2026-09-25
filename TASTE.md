# TASTE — Technical Architecture, Standards, and Engineering Rules

> **Every new feature, page, or requirement MUST follow these rules.**
> Read this before writing any code. If a decision contradicts these rules, update this document first — then code.

---

## 1. Application Structure

### 1.1 Single App, Route Groups, Admin Prefix

We use **one Next.js application** with route groups to separate Learner and Admin portals.

```
app/
├── (auth)/          → /login, /register        (no sidebar, no auth required)
├── (learner)/       → /dashboard, /courses ...  (learner sidebar + topnav)
├── (admin)/         → /admin/dashboard ...      (admin sidebar + topnav)
├── layout.js        → Root layout (fonts, CSS, <html>/<body> only)
└── page.js          → Entry redirect
```

**Rules:**
- Learner routes live under `(learner)/` — URLs have NO prefix (e.g., `/dashboard`)
- Admin routes live under `(admin)/` — URLs are prefixed with `/admin` (e.g., `/admin/dashboard`)
- Auth routes live under `(auth)/` — public, no layout shell
- Each route group has its **own `layout.js`** with its own sidebar — never conditionally render sidebars
- The root `layout.js` contains ONLY fonts, global CSS, and `<html>/<body>` — no providers, no sidebar, no auth logic

### 1.2 Never Mix Portals

- Learner code must never import admin components or vice versa
- Shared UI goes in `components/ui/` or `components/shared/`
- Shared data logic goes in `lib/`
- Portal-specific components go in `components/learner/` or `components/admin/`

---

## 2. Rendering Strategy (Hybrid)

### 2.1 The Core Principle

**Static shell + client-side data fetching** for authenticated pages.
**SSG/ISR** for public pages.

This gives the fastest perceived load:
1. Shell loads instantly from CDN (~10ms)
2. Skeleton placeholders show immediately
3. Data fills in via API (~100-200ms)

### 2.2 Rendering Decision Table

Use this table when adding any new page:

| Page Type | Has user-specific data? | Rendering | Example |
|---|---|---|---|
| Public, rarely changes | No | **SSG** | Login, Register |
| Public, changes periodically | No | **ISR (60-300s)** | Course Catalog |
| Authenticated, user-specific | Yes | **SSG shell + client fetch** | Dashboard, My Courses, Progress |
| Authenticated, list/table | Yes | **SSG shell + client fetch** | Payments, Users (admin) |
| Authenticated, detail view | Yes | **SSG shell + client fetch** | Course detail, User detail |
| Admin, analytics/charts | Yes | **SSG shell + client fetch** | Analytics, Reports |

### 2.3 Rules

- **NEVER use full SSR for authenticated pages** — it blocks rendering until all data is fetched
- **NEVER use `"use client"` on page.js files** — keep pages as Server Components that render static shells
- **Client data fetching happens inside small client components** embedded in the page
- **SSG shell means:** the page layout, headings, card containers, and skeleton loaders are rendered at build time; data is fetched on the client after mount
- **ISR pages** must specify `revalidate` — never leave it undefined

### 2.4 Example Pattern

```jsx
// (learner)/dashboard/page.js — Server Component (static shell)
import { DashboardStats } from "@/components/learner/dashboard-stats";
import { ActiveCourses } from "@/components/learner/active-courses";

export default function DashboardPage() {
  return (
    <Box className="space-y-5">
      <Text as="h1">My Dashboard</Text>
      <DashboardStats />    {/* Client Component — fetches /api/stats */}
      <ActiveCourses />     {/* Client Component — fetches /api/courses */}
    </Box>
  );
}
```

```jsx
// components/learner/dashboard-stats.jsx
"use client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiClient("/api/learner/stats").then(setStats);
  }, []);

  if (!stats) return <StatsSkeletonLoader />;
  return <StatsGrid data={stats} />;
}
```

---

## 3. Server vs Client Components

### 3.1 Decision Rule

**Default to Server Component. Only add `"use client"` when you NEED browser APIs or interactivity.**

### 3.2 Classification Table

| Component | Type | Reason |
|---|---|---|
| `app/layout.js` (root) | **Server** | Fonts + CSS only, zero JS |
| `(learner)/layout.js` | **Server** | Renders shell, reads auth cookie |
| `(admin)/layout.js` | **Server** | Renders shell, reads auth cookie |
| `page.js` files | **Server** | Static shell, no interactivity |
| `top-nav.jsx` | **Client** | Sidebar toggle, dropdowns, notifications |
| `learner-sidebar.jsx` | **Client** | Active link state, toggle animation |
| `admin-sidebar.jsx` | **Client** | Active link state, toggle animation |
| `components/ui/*` (shadcn) | **Client** | Interactive by nature |
| Data-fetching widgets | **Client** | useEffect, useState for API calls |
| Static display (Text, Box) | **Server** | No interactivity |
| Forms | **Client** | User input, validation |
| Tables with sorting/filtering | **Client** | Interactive |
| Tables with static data | **Server** | No interactivity |

### 3.3 Rules

- **Push `"use client"` to the smallest leaf component** — never on a page or layout
- **A Server Component can render a Client Component** — but not the reverse
- **Never pass functions as props** from Server to Client Components
- **Data fetching in Server Components** uses `fetch()` against the API — there
  is no database access in this project
- **Data fetching in Client Components** uses `useEffect` + `fetch()` or a data library (SWR/React Query)

---

## 4. Authentication & Authorization

> Auth is owned by the NestJS server (`server/src/modules/auth`). The client
> holds **no credential** — the token is an HttpOnly cookie the browser attaches
> and only the server reads. See `server/BACKEND_STRUCTURE.md` §5.

### 4.1 Auth Flow

```
Login Page (SSG)
  └── POST {NEXT_PUBLIC_SERVER_URL}/api/auth/login
        ├── Success → server sets HttpOnly cookie "lms_token" (signed JWT)
        │   ├── role: "learner" → redirect to /dashboard
        │   └── role: "admin"   → redirect to /admin/dashboard
        └── Failure → Show error on login page
```

The response body carries the **user only** — never the token.

### 4.2 Auth Check in Layouts

Layouts never parse cookies by hand. `lib/session.js` asks the API who the
caller is (`GET /api/auth/me`), so identity has exactly one source — the server:

```jsx
// (learner)/layout.js
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function LearnerLayout({ children }) {
  const user = await getSessionUser();   // resolved by the API, or null
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin/dashboard");

  return (
    <SidebarProvider>
      <TopNav />
      <LearnerSidebar />
      <main>{children}</main>
    </SidebarProvider>
  );
}
```

### 4.3 Middleware (Optional, Recommended)

Middleware is **allowed and does NOT break SSG**. It runs at the edge (~1ms) before serving static pages.

```
Request → Middleware (reads cookie, redirects if unauthorized) → Serves page
```

- Middleware here checks only whether the auth cookie is PRESENT — it cannot
  read the token (HttpOnly, and the frontend holds no secret to verify it).
- Role-based redirects therefore happen in the route-group layouts (Section 4.2),
  which know the real user.
- Middleware does NOT convert SSG pages to SSR — the page is still served from CDN cache
- `/scorm/*` is excluded from the matcher: it is a rewrite to the API serving
  SCORM package content, and gating it would break the player's iframe.

### 4.4 Rules

- **The token is an HttpOnly cookie** — never localStorage, and never a cookie
  written by client JavaScript. Nothing in `components/` may read a token.
- **Identity comes from the API** (`lib/session.js` calls `GET /api/auth/me`).
  The frontend holds no signing secret and never decodes the token itself.
- **Auth redirects happen server-side** (in layout or middleware) — never rely on client-side redirects alone for security
- **Middleware is a navigation gate, not a security boundary.** Authorization is
  enforced by the API on every request.
- **Roles are `"admin"` and `"learner"`** — one vocabulary. There is no
  `role.slug`, no `lms_admin`, no `customer`.

---

## 5. Component Architecture

### 5.1 Directory Structure

```
components/
├── ui/              # Shadcn components + Text, Box (shared, no business logic)
├── shared/          # Domain components used by BOTH portals
│   ├── stat-card.jsx
│   ├── progress-bar.jsx
│   ├── course-card.jsx
│   └── data-table.jsx
├── learner/         # Learner-specific components (never imported by admin)
│   ├── dashboard-stats.jsx
│   ├── active-courses.jsx
│   └── ...
├── admin/           # Admin-specific components (never imported by learner)
│   ├── user-management.jsx
│   ├── course-editor.jsx
│   └── ...
└── layout/          # Shell components
    ├── top-nav.jsx
    ├── learner-sidebar.jsx
    └── admin-sidebar.jsx
```

### 5.2 Rules

- Use `<Text>` instead of raw `h1`–`h5`, `p`, `span` tags everywhere
- Use `<Box>` instead of raw `div` tags everywhere
- **Every component file = one concern** — don't mix data fetching with presentation
- **No business logic in `components/ui/`** — these are pure design system primitives
- **Shared domain components** go in `components/shared/` — must be portal-agnostic
- **Portal-specific components** go in `components/learner/` or `components/admin/`

---

## 6. Data & API Layer

### 6.1 There is no API in this project

This is a **pure frontend**. `client/app/api/` does not exist and must not be
recreated. There is no database driver, no schema and no secret here.

New endpoints belong in `server/src/modules/`, per
`server/BACKEND_STRUCTURE.md`.

### 6.2 Calling the API

Always go through `apiClient` from `lib/api-client.js`. It targets
`NEXT_PUBLIC_SERVER_URL` and sets `credentials: "include"` so the HttpOnly auth
cookie travels with every request.

```js
apiClient("/api/learner/courses");
apiClient("/api/admin/certificates", { method: "DELETE" });
```

Never pass a token — client JavaScript has none.

### 6.3 Rules

- Legacy API routes validate the token independently — never trust the client
- Return minimal JSON — never return more data than the UI needs
- Use proper HTTP status codes (401, 403, 404, 422)
- API routes are always Server-side — never expose DB credentials or secrets

---

## 7. Performance Rules

### 7.1 Always

- **Use `loading.js`** in every route for instant skeleton UI while page loads
- **Lazy load heavy components** (charts, rich editors, calendars) with `dynamic()`
- **Images use `next/image`** — never raw `<img>` tags
- **Fonts use `next/font`** — never external CDN font links
- **Keep client bundles small** — if a component doesn't need interactivity, keep it as Server Component

### 7.2 Never

- Never fetch data in `layout.js` that could block shell rendering
- Never use `getServerSideProps` pattern thinking — App Router doesn't use it
- Never import an entire library when you need one function (tree-shake)
- Never put `"use client"` on a file just because it imports a client component — only the leaf needs it

---

## 8. Styling Rules

- **Tailwind CSS utility classes only** — no inline `style={}` props
- **Use `cn()` from `lib/utils.js`** for conditional class merging
- **Component variants use `class-variance-authority` (cva)** — same pattern as shadcn
- **Colors use CSS variables** defined in `globals.css` — never hardcode hex values in components. The full palette and its rules are §10.
- **Responsive: mobile-first** — use `sm:`, `md:`, `lg:` breakpoints

---

## 9. Checklist for Every New Feature

Before writing code for any new feature, answer these:

- [ ] Which portal does this belong to? `(learner)`, `(admin)`, or `(auth)`?
- [ ] Does the page show user-specific data? If yes → SSG shell + client fetch
- [ ] Does the page need interactivity? If yes → only the interactive parts are Client Components
- [ ] Can any component be shared between portals? If yes → put in `components/shared/`
- [ ] Does this page need a loading state? If yes → add `loading.js`
- [ ] Am I using `<Text>` and `<Box>` instead of raw HTML tags?
- [ ] Am I using Tailwind classes only (no inline styles)?
- [ ] Am I keeping the `"use client"` boundary at the smallest possible leaf?

---

## 10. Design system — colour & typography

The palette and type system are **closed**. Tokens live in `app/globals.css`;
the JS-side equivalents (Recharts, canvas, inline SVG) live in `lib/brand.js`.
Never introduce a hue that is not listed here.

### 10.1 Palette

The **Spectra** palette. Flat, square, hairline-ruled: no shadows, no
gradients, `--radius: 0`. Panels read as lifted because the canvas behind them
is the *darkest* of the light surfaces, not because anything casts a shadow.

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#EDECE9` | The page background — warm grey, darkest light surface |
| `surface` | `#FFFFFF` | Cards and panels |
| `surface-2` | `#F8F8F6` | Inputs, table headers, row hover |
| `surface-3` | `#EFEEEB` | Progress tracks, code, small highlighted areas |
| `line` | `#D8D8D4` | Every border — this is what replaced shadows |
| `line-strong` | `#C8C8C4` | Border on hover, dashed empty states |
| `navy` | `#0F1923` | Chrome: sidebar, topbar, primary buttons. Also primary text |
| `navy-soft` | `#162030` | Active nav item, hover on navy |
| `navy-deep` | `#0A1219` | Deepest navy, when a third step is needed |
| `accent-blue` | `#3B6FD4` | **The one interactive accent** — links, focus rings, active markers, first chart series |
| `accent-soft` | `#BDD0F0` | Accent ON navy: emphasis text and button labels on the dark chrome |
| `accent-tint` | `#F0F5FC` | Accent on light: tinted tiles and thumbnails |
| `success` | `#1A5E3A` | Complete / passed / present |
| `warning` | `#8A6200` | Late / partial / at risk |
| `rust` | `#B04A00` | Fourth categorical slot in charts |
| `danger` (`error`) | `#C94040` | **Errors and destructive states only** |
| `ink` | `#0F1923` | Primary text |
| `text-2` | `#555555` | Secondary text |
| `text-3` | `#888888` | Tertiary text, placeholders, "not started" |

**Rules**
- Those are all the hues. No purple, teal, pink or gradient fills.
- `danger` is never used for emphasis, only for genuine failure or destruction.
- **`accent-blue` means interactive.** On a light surface it belongs to links,
  focus, the active marker and data. The one sanctioned exception is the
  emphasis phrase in `page-header.jsx` (§10.2).
- **On navy, the accent becomes `accent-soft`.** `accent-blue` on `navy` is too
  dark to read; the soft tint is what the chrome uses for emphasis and for the
  label on a navy button.
- Greys are the real ramp above (`text-2`, `text-3`), not ink at opacity.
  `text-ink/60` still works and lands close to `text-2` — prefer the token.

**Legacy aliases.** The previous navy/lime system's token names are kept in
`globals.css` and `lib/brand.js` so existing markup keeps rendering, and they
now resolve to Spectra values: `lime` → `accent-blue`, `lime-soft` →
`accent-soft`, `paper` → `canvas`, `paper-warm` → `surface-2`, `paper-cream` →
`surface-3`. **Write new code against the Spectra names.** Note the reversal
that follows: `paper-warm` and `paper-cream` are now *lighter* than the page
background, not darker.

### 10.2 Typography

| Face | Class | Use |
|---|---|---|
| Inter | `font-display` | Headlines and display text |
| Inter, heavier | `font-editorial` | ONE emphasis phrase per headline |
| Inter | `font-sans` (default) | Body copy, UI, supporting text |
| IBM Plex Mono | `font-mono` | Labels, eyebrows, section markers, technical text |

One face carries the interface. **Spectra has no serif**, so the emphasis
phrase inside a headline is upright Inter at a heavier weight and in
`accent-blue` — never an italic. An Inter italic there reads as a typo rather
than as emphasis, which is why `font-editorial` survives as a token but no
longer means a different family.

`h1`–`h6` get Inter with the display tracking automatically from the base
layer — do not set a font on them. Base body size is **13px**: this is a dense,
data-forward interface, and a page that sets its own larger base is fighting it.

Headlines are **sentence case**. Use `components/shared/page-header.jsx` for every
page: it encodes eyebrow → title → emphasis → summary so the rule is not
re-decided per page. Avoid excessive bolding, underlining or decorative type.

### 10.3 Status

Unlike the previous system, Spectra **does** carry hue in status. Each state is
a tinted pill — the hue at 12% as the field, the hue itself as the text —
defined once as `.chip-*` in `globals.css` and mirrored by `statusChip()` in
`lib/brand.js`:

| State | Treatment |
|---|---|
| Complete / passed / present | `success` green at 12%, green text |
| In progress / active | `accent-blue` at 12%, accent text |
| Late / partial / at risk | `warning` ochre at 12%, ochre text |
| Not started / idle / behind | grey at 12%, `text-3` text |
| Failed / absent / revoked | `danger` at 12%, danger text |

Those five are the vocabulary. When adding a state, pick one of them — do not
invent a sixth hue. `statusChip()` currently routes late/partial to the
in-progress chip; `.chip-warning` exists for the cases that genuinely need the
ochre.

**Sessions carry four states too** — upcoming, in progress, completed,
cancelled — mapped onto the same weights (idle, partial, complete, error).
"In progress" is derived by the API from the scheduled start time and arrives as
`display_status`; render that, and keep sending the stored `status` back when
editing. A session's training card shows the date, time, venue and trainer in
place of a progress bar: the learner cannot move that progress themselves — the
trainer marks the session complete — and a 0% bar would read as their own
inaction.

**These chips need care on a dark surface.** The 12% tints are mixed against a
light field and go muddy on navy. On the dark chrome, carry state with
`accent-soft` for the active one and the on-navy text ramp for the rest. Note also
that `.surface-dark` is a component-layer class, so a shadcn `Card`'s own
`bg-card` utility beats it — put `surface-dark` on a `Box` inside the card, not
on the card.

### 10.3.1 Lesson content types

A lesson's icon says **what it is**, not what state it is in: play for video,
package for SCORM, people for a live session, document for a file. State is
carried by the tile's fill weight instead — solid navy once complete, cream
while open, flat warm when locked. Swapping the glyph for a tick on completion
throws away the only cue that said what the lesson was.

Duration is mandatory for documents and SCORM and optional for video, so the
field always says where its number comes from. A required star with no
explanation reads as the form behaving inconsistently between types.

Supporting resources render under the primary content, never mixed into it, and
are labelled as reference material — they carry no duration and do not count
toward learning hours, and the learner should not have to guess that.

### 10.3.1.1 Closed lists

`job_level` and `location` on a user are **dropdowns, not text fields** — and
since `0031` their options are **per-tenant data fetched from
`/api/admin/organization/options`**, not a constant. `lib/workforce.js` is
gone.

**The rule below did not change; only who curates the list did.** Edstellar
sets each tenant's branch locations and job levels when it onboards them, and
the tenant picks from that. A form that let an org type its own value would
recreate the `job_role` problem the rest of this section describes — so the
tenant's endpoint is read-only and the writes are `@PlatformAdmin()`.

Three consequences for anything rendering these fields:

- **Fetch them; never import them.** An empty array is a real state, not a
  loading one — a tenant Edstellar has not given branch locations to genuinely
  has none, and the form says so rather than showing a blank dropdown.
- **Keep the value the person already has selectable**, even if it has since
  been retired (`withCurrent` in the profile dialog). Otherwise opening the
  form silently blanks it.
- **A learner or trainer gets 403 from the options endpoint** — it is
  `@Roles('admin')`. Their profile dialog falls back to what they already
  have. That is correct: the API still validates their two fields against the
  org's list, and offering a free choice they cannot save would be the
  control-that-lies failure.

The original argument, unchanged:

Both are filter and comparison dimensions in the Reports builder, and a
dimension is only useful if its values repeat across people. `job_role` beside
them is deliberately free text — it is a job title, not a reporting axis — and
the live database is the argument: 18 distinct job roles across 20 learners, so
filtering by one returns one person and comparing by it compares nothing.
Typing a location produced two spellings of one office and left three learners
matching no filter value at all, which is a silent omission rather than an
empty cell.

Adding a value means editing BOTH files. If they drift the dropdown offers
something the API rejects with a 422 naming the valid set — loud, not silent.

### 10.3.1.2 Row actions are icons

A table row's actions are square icon buttons, not text buttons: **eye** to
view, **pencil** to edit, **power** to activate/deactivate, **trash** to
delete. Four words per row across twenty rows is eighty words of chrome, and
they pushed the actions column off the right edge of a ten-column table.

Two rules come with that trade, because an icon is a glyph with no name:

- **Every icon button carries `title` AND `aria-label`.** The title is what a
  sighted admin hovers for; the label is the button's only name to a screen
  reader. A bare `<Trash2 />` in a button is an unlabelled control.
- **An action the API will refuse renders DISABLED, and its label says why.**
  The Manage Users table shows admins and trainers, and the API refuses to
  edit, deactivate or delete them — so those three icons are disabled on those
  rows and their title reads "Admin accounts are not editable here". An enabled
  button that always 403s is the screen-that-lies failure in miniature.

`IconAction` in `components/admin/admin-employees-content.jsx` is the shape;
lift it into `components/shared/` when a second table needs it.

**Hover on an icon action FILLS it** — solid `accent-blue` with white text,
solid `danger` for a destructive one — rather than tinting the background.
Five of them sit in a row on a course card, and a 10% wash on one was hard to
tell from the one beside it. `cursor-pointer` is explicit on every enabled
action: a `<button>` does not get it from the browser, and a control that does
not change the cursor reads as decoration.

**A figure that is clickable says so.** The Enrolled count on a course card
opens the roster, so it takes `accent-blue`, underlines on hover and gets a
pointer — while Complete and Avg score next to it stay plain ink. Styling all
three alike would make two of them look like buttons that do nothing.

### 10.3.1.3 Course category is the one coloured axis

Seven course categories, seven colours (`lib/course-taxonomy.js`, mirroring
`server/src/common/course-taxonomy.ts`). That is a deliberate, bounded
exception to "no new hues" in §10.1 — five of the seven are already palette
colours, and slate and violet exist only here.

The exception is earned by the job: a reader scans a grid of course cards and
needs to tell groups apart at a glance, and fill weight cannot separate seven
values the way it separates four states. The colour appears in exactly three
places on a card — the top stripe, the category chip, nothing else — so it
never competes with the status chip beside it.

**Importance is not a colour.** Mandatory and Compliance share one `danger`
ribbon, because they are the same instruction to the reader ("this is not
optional") and a second hue would imply a distinction that does not exist. The
ribbon's WORD says which.

### 10.3.1.4 The course page owns authoring

`/admin/courses/[courseId]` is the one place a course is built: four tabs —
Modules, Lessons, Assessments, Outline — over one fetch. All four read the same
course, modules, lessons and assessments, and refetch together, so the Outline
can never disagree with the list the admin just edited.

**Staged is a state the UI has to show, not hide.** A lesson with no module is
authored but not delivered — invisible to learners, worth no hours. The Lessons
tab puts staged lessons in their own section *above* the course, labelled with
what that means, because a lesson silently absent from the learner's view is
the worst possible outcome of this feature. The header count says
"15 lessons · 1 staged" for the same reason.

**Placement is a select, not drag-and-drop.** It is keyboard reachable, it
names the modules, and "Not placed (staged)" is one option in the same list
rather than a separate unlink button — so putting a lesson back is the same
gesture as moving it.

**Deleting a module is not deleting its lessons**, and the confirm dialog says
so with the count. The API unlinks them (`ON DELETE SET NULL`); the dialog has
to promise that, or an admin reorganising a course will not dare press the
button.

**Which fields a lesson form shows, and which are required, come from
`lib/lesson-content.js`** — the mirror of the catalogue the API validates
against. Seven content types, and the duration field states *why* it is
required for this one and optional for that one (§10.3.1). Same for the five
question types in the assessment editor: two storage shapes, and the editor
switches on the catalogue's `optionBacked`, not on a chain of `if (type ===)`.

**A control that the API ignores must not be rendered.** A new assessment is
created hidden — the API hardcodes it, so a half-built quiz cannot reach a
learner — so the create dialog shows a sentence saying that, and only the edit
dialog carries the Live switch.

**`SelectValue` needs children.** This Select renders the raw *value* unless
given them, so every dropdown whose value is an id or a key spells out its
label — a bare `<SelectValue />` over modules showed `1`, `2`, `3`.

There is no separate Assessment Builder page and no sidebar entry for one. An
assessment only means something beside what it tests.

### 10.3.1.5 Downloads report their own failures

Every file download goes through `downloadFile()` in `lib/download.js`, never a
bare `fetch().then(r => r.blob())`.

The two that predated it each repeated the same blob/object-URL/anchor dance
and each swallowed its errors in an empty `catch`, so a failed download was
indistinguishable from a slow one: nothing appeared, nothing was said, and the
admin clicked again. The helper throws instead, and the button renders the
message.

Three things it does that a hand-rolled version keeps forgetting:

- **Reads the filename from `Content-Disposition`**, falling back to the name
  the caller passed. The server names the file; the caller should not have to
  guess it. (This only works because the API sets
  `Access-Control-Expose-Headers` — see BACKEND_STRUCTURE §10.12.)
- **Parses the error body.** A route whose success path is binary still returns
  JSON on failure, so the real message is there to be read.
- **Refuses a 0-byte body.** Saving one produces a file Excel will not open,
  with nothing on screen to say why.

**A download button appears only once there is something to download**, and
when the on-screen table is capped it says the file is not — otherwise an admin
who can see "showing the first 500 of 3,214" has every reason to assume the
export is truncated the same way.

### 10.3.1.6 Icons are lucide components, always

Every glyph in this app is a `lucide-react` component. No inline `<svg>`, no
emoji, no icon font — a hand-pasted SVG ships unoptimised markup that nothing
tree-shakes and that cannot take a Tailwind size or colour class the way a
lucide component does.

This matters when porting from the reference mock, which uses emoji freely.
A catalogue that needs an icon stores the lucide component **NAME** as a string
(`icon: "ShieldCheck"`) and the page maps it to a component. That keeps the
catalogue plain data — it can be generated, serialised and diffed — while the
mapping stays in the one file that renders it.

### 10.3.1.7 Edstellar Services

`/admin/services` is the one page in the admin portal that is about Edstellar's
offering rather than the organization's own content, which is why it sits under
its own sidebar heading rather than inside Course Management.

**The catalogue is code, not a fetch.** `lib/edstellar-services.js` holds four
groups, eleven sub-groups and 42 services. The page fetches only what is
per-tenant: the requests this organization has filed. The server keeps its own
list of the 42 NAMES and refuses anything else, so the two files are edited
together (BACKEND_STRUCTURE §10.14).

**Two levels of tabs, because 42 cards on one screen is not a menu.** Group
first, sub-group second, and each carries its own one-line description — a
reader choosing between "OD Consulting" and "Assessment" needs to know what
those mean before clicking.

**The group colours are the chart ramp, not new hues.** accent-blue, success,
warning, rust (§10.4) — carried as a `tone` token in the catalogue and mapped
to full class names in the page, because Tailwind cannot see a class built by
string concatenation.

**The request form is rendered from the service's question set, never written
per service.** Fourteen sets cover the 42 services and anything without one
falls back to a generic set — which is why every Request button opens a working
form rather than 28 of them opening nothing. A conditional follow-up ("Other →
tell us more") renders only when its trigger is actually chosen, so the form
stays as short as the answers allow.

**Who the request is signed by is shown, not edited.** The API signs it from
the verified token regardless, so an editable contact field would be a control
that does nothing — the same rule as the assessment Live switch (§10.3.1.4).

### 10.3.1.8 The list-page shape

Course Library, Learning Paths and Live Sessions are the same page three times,
and they are built the same way on purpose — an admin who learns one has
learned all three:

```
KPI strip  →  toolbar  →  bulk bar (when something is selected)  →  select-all + count  →  cards
```

- **KPI tiles are reduced from the rows already on screen**, never a second
  query, so a tile cannot disagree with the list beneath it (§10.12 records the
  Manage Users version of this rule). Six tiles, `tile-accent` / `-success` /
  `-warning` / `-rust` for the icon.
- **A figure with nothing behind it renders `—`, not `0`.** "No score yet" and
  "averaged zero" are different facts.
- **One tile may be actionable and it says so in words.** Sessions' "Need
  attention" counts completed sessions whose attendance is not fully marked —
  until those names are marked nobody has been credited. It takes `danger` only
  when the count is non-zero; a red zero is a false alarm.
- **The archived toggle SWAPS the set**, and clears the selection when it does
  — those ids are no longer on screen and a bulk action would act on rows the
  admin can no longer see.
- **A bulk result that affected fewer rows than it named says so**, with the
  reason. Silent partial success is worse than a refusal.
- **Create is disabled while viewing archived.** There is nothing to create
  into.

**A destructive confirm names what else goes.** Deleting a session takes its
roster, its attendance and every completion it credited; deleting a path takes
everybody's place on it. Both dialogs say that and both point at archive as the
reversible alternative — an admin who does not know the cascade cannot consent
to it.

### 10.3.1.9 Assign Learning is one flow, not four tabs

`/admin/assign-learning` reads as one sentence — assign THESE items to THESE
people by THIS date — and the footer says the sentence back with real counts
before anything is sent.

It replaced a four-tab screen (Courses / Journeys / Groups / Assessments) where
each tab assigned one kind of thing to one kind of audience in its own shape.
Assigning a course and a path to the same department meant doing the job twice,
differently, and two of the four tabs assigned nothing at all.

- **Step 1 takes courses AND paths into one list.** They go to the same people,
  so they belong in the same basket.
- **Step 2's three modes resolve to one `audience` array**, computed once and
  read by the counter, the confirm dialog and the send — so the number the
  admin agreed to is the number that gets assigned.
- **Only deliverable items are offered.** Draft, archived and session-training
  courses are filtered out: a session is assigned by adding someone to its
  roster (§10.7), so offering it here would be a control that lies.
- **One request per ITEM carrying the whole audience**, not one per
  (item, learner) pair. The bulk endpoints are single statements, so a
  department cannot end up half-enrolled, and 3 items across 40 learners is 3
  requests rather than 120.
- **The confirm says progress is not reset.** Re-assigning a department is the
  common case and the opposite assumption is the alarming one.

### 10.3.1.10 The sessions grid IS the page

`/admin/sessions` has no tab bar. Marking attendance is something you do to one
sitting, not a mode the whole page sits in — so it is reached from a card and
shows a "← Back to sessions" link to return. The three-tab bar made the grid
one of three equals and buried the thing every visit starts with.

**A session card says what the session IS, and only what applies.** The
"Self enrolment" chip appears only when that is not the default — a chip on
every card reading "Admin assigned" is noise. A multi-batch session shows
"3 sittings" in place of a date, because it has no single date of its own and
naming one would name whichever sitting happened to be first.

**The fill meter is segmented per batch**, so an admin sees at a glance which
sitting still has room. A `pending` batch — one with no date yet — is hatched
rather than proportionally filled: a part-filled bar would read as a scheduled
sitting, which is exactly what it is not.

**"N per batch" is only said when it is true.** Batches may carry different
capacities, so mixed sizes report the total ("10 / 60 across 3 batches")
instead. The reference could assume one number because its mock had one; ours
cannot.

**The waitlist count is a button**, styled `warning` and underlined on hover,
because it opens the queue. Promoting somebody from it enrols them — the dialog
says whether there is room first, since promoting into a full session is a
deliberate override rather than a queue moving.

### 10.3.1.11 The super-admin portal

Five pages behind `(platform)`, and the landing one is **Platform Overview**
(`/platform/dashboard` — the route is unchanged so existing links and the
post-login redirect still work; only the label and the content moved).

**It leads with what is WRONG, not with revenue.** The money strip is at the
top because it is the page's subject, but immediately under it are three
attention panels — overdue invoices, contracts to renew, seat requests
waiting — because those are the only items on the page that need somebody to
do something today. When all three are zero the panels collapse to one green
line saying so, which is a claim worth making explicitly: an admin should be
able to tell "nothing needs attention" from "the page did not load".

**A contract warning is never just a chip.** `contract_state` arrives derived
from the API (`lib/tenant-account.js` holds only how each state READS, never
how it is computed — recomputing it in the browser would be a second
definition of "expiring" that drifts the first time the 60-day window moves).
The overview names every tenant inside its window, soonest first, and says
"in 30 days" or "10 days ago" beside the chip — a chip alone says a contract
is expiring without saying when, which is the one thing the reader needs.

#### The avatar menu

Every item in it does something. "Profile" and "Settings" previously had no
handler and no `href` at all — two controls that looked live, closed the menu
and changed nothing.

- **My profile** opens a dialog in every portal: read first, edit second,
  because most opens are somebody checking what their account says.
- **Organization settings** appears only for a TENANT admin. A platform admin
  has the whole Tenant Directory instead, and a learner or trainer gets a 403
  — so the item is not offered rather than offered and refused.
- **Change password** had no page in the admin or platform portals at all,
  while the learner and trainer portals both had one and the API route was
  already open to any role. Both pages now exist, and the menu resolves the
  href from the role.

**What cannot be edited is SHOWN, not hidden.** Email and Department render as
facts with "Set by your admin" under them, so nobody hunts for a control that
should not exist — and the edit form says outright that department decides who
can see your progress. The organization dialog does the same at a larger
scale: plan, contract dates, contract value and seat limit sit under a
padlocked "Your account with Edstellar" heading as facts, never as disabled
inputs. A greyed input reads as "temporarily unavailable"; these are "not
yours".

**The mock's Manager field is not rendered.** There is no reporting line in
this product, so it would be permanently "—".

**`DialogFooter` carries `-mx-4 -mb-4`**, which assumes the content keeps its
default `p-4`. Both of these dialogs set `p-0` so their navy header can meet
the edges, so both reset it with `mx-0 mb-0` — without that the footer renders
16px wider than the dialog and gives it a horizontal scrollbar.

**Opening a tenant signs you in as them, and the UI says so three times.**
The Tenant Directory's "Open tenant" is not a link to a read-only view — it
swaps the platform admin's cookie for one that acts as that tenant's admin. A
click with that consequence gets a confirm that names the person whose account
it will be, says the tenant's own activity log records it, and says the session
lasts an hour. All three before the click, not from the banner afterwards. The
button renders DISABLED with the reason in its title when the tenant has no
admin account (§10.3.1.2) — there is nothing to become and the API refuses it.

Once inside, `support-session-banner.jsx` is the first element in
`portal-shell.jsx` — above the topbar, sticky, outside the scroll container, on
every page of every portal. It is **not dismissible**: a banner you can close
is closed exactly when it matters. `danger` is correct here rather than an
exception to §10.1 — acting on the wrong tenant's data IS the failure this
prevents, and the bar is the only thing between the admin and it. Note the
`text-white` restated on the inner `Text`: the primitive's default ink colour
wins over the parent's otherwise, and the tenant name came out muddy on red.

Both navigations are `window.location.href`, never `router.push`. The auth
cookie has just been swapped, and every RSC payload the router has cached
belongs to the other session — a soft navigation renders one portal's pages
from the other's data.

**A tenant is created with its first admin, in one form.** The account fields
are required and marked so, because the API creates both in one transaction
and a tenant without an admin is exactly the state this page warns about on its
own cards. The temporary password is a plain text input, not masked — whoever
creates the tenant has to read it out to the customer, and masking a value the
author must transcribe helps nobody. The slug follows the name until the admin
edits it, then stops: typing a deliberate slug and then fixing a typo in the
name should not silently throw the slug away.

**A card names a real account, never a typed-in one.** The tenant card's
footer used to print the `contact_*` fields — free text an admin fills in — and
the demo rows had been filled from the reference mock, so the directory named
two people who have no accounts. It now shows the tenant's actual admin from
`users`, with `OWNER` or `ADMIN` beside the name and the email as a `mailto:`
link, and `+N more admin` when there is more than one. The commercial contact
is still editable and still shown, but separately and prefixed `Billing:`, and
only when somebody has genuinely recorded one. The rule generalises:

> If a field is displayed as an identity — who runs this, who to contact, who
> approved it — prefer the one the database can verify over the one somebody
> typed. A free-text name is fine as a supplement and dangerous as the answer,
> because nothing ever tells you it went stale.

A tenant with no active admin account gets a `warning` line saying so, not a
blank row.

**Money is scanned, not typed, so it is short.** `formatMoney()` renders
₹45.0 L and ₹1.20 Cr on a card; full precision stays in the number input where
it is being entered. A null contract value renders `—`, never ₹0.

**A refusal the API will certainly make is stated on the form before Save.**
The payment dialog says what the outstanding amount is and that a part payment
is fine; the invoice dialog says a draft owes nothing until it is issued; the
seat dialog says the number is the TOTAL you want, not how many to add. Each of
those is a rule the API enforces with a 422 or 409 — the form only means the
admin hears it while typing rather than after pressing Save. Where the guard is
certain the submit button also disables, per §10.3.1.2.

**Approving a seat request says that it writes the limit.** "Approve & set
limit", and under the number: *Saving sets this tenant's limit to 30
immediately.* The difference between recording a decision and changing what the
tenant can do is the whole feature, and a button labelled just "Approve" hides
it.

#### Seats, on the tenant's side

The **Seat Licence** panel sits in Manage Users **above the KPI tiles**,
because it is the one figure on that page that can STOP the admin: at the cap the API refuses
`+ Add User` with a 409. Showing the meter only after they had hit it would
make the refusal read as a bug.

- **`+ Add User` and `Bulk Upload` render DISABLED at the cap**, with a title
  saying why. That form only ever creates learners — which is exactly what a
  seat is — so the 409 is certain, and §10.3.1.2's rule applies: an enabled
  button that always fails is the screen that lies. A *failed* seat fetch
  leaves them enabled; the API is still the enforcement, and a network blip
  must not lock an admin out of adding people.
- **The panel states what a seat is**: only active learners count, admins and
  trainers do not, and deactivating somebody frees one. That is the first thing
  an admin at the cap will try, and they should not have to test whether it
  works.
- **The answer to the last request stays on screen** once it is no longer
  pending. An approval that silently changed a number would leave the admin
  guessing whether it landed; the note Edstellar wrote is rendered under the
  meter with the granted figure beside it.
- **Seats refetch with every directory refetch**, not just on mount — creating
  or deactivating somebody moves the meter, and a stale meter beside a table
  that just changed is the two-numbers-disagreeing failure §10.12 records for
  the KPI tiles.

With no limit configured the panel is one quiet line, not a meter reading
"unlimited of unlimited".

**The legend is context, not arithmetic — and that had to be designed for.**
The reference mock reads "20 of 50 seats used" and breaks it down as
1 admin + 1 trainer + 18 learners, which sums to the headline. Ours does not
count it that way: a seat is an active learner
(`server/.../0028_seat_limits.sql` records why — an organization should never
have to choose between an extra trainer and an extra learner). Three things
keep the panel from being read the mock's way, and all three are needed:

- the headline counts learners only, so the bar and the number agree;
- admins and trainers are grouped under ONE qualifier — *"1 admin and 1
  trainer — no seat used"*. Listed flat beside the learners they read as a
  sum, and a qualifier trailing the last item looks like it applies only to
  that item, which is what the first version did;
- the footnote says it a third time in words.

Two readings of one panel is how a customer ends up believing they bought
something they did not, so the repetition is deliberate rather than clutter.

**"onboarded 31 Aug 2026" comes from `organizations.created_at`.** Every
tenant that predates the console shares one timestamp because the tenancy
migration created them in a single transaction — that is truthful, not a bug,
and tenants provisioned through the directory get their real date.

### 10.3.1.12 The notification bell

One bell in `top-nav.jsx`, so all four portals get it from one component. It
replaced a hardcoded `3` on a button with no handler — a badge that never
moved, in every portal.

**Once seen, the badge is GONE — not a zero, not a grey dot.** The bell alone
is the read state, which is what makes its presence meaningful. Opening the
panel is what "seen" means, and the count clears **optimistically** the moment
it opens rather than after the round trip: the badge is about the person's
attention, not the server's state, and a number that lingers after you have
looked reads as broken. If the write fails the badge stays clear for the
session — they HAVE seen them — and the next poll restores the truth.

**Unread rows keep a tint inside the panel** even though the badge has gone,
so the list still shows which ones were new when it was opened. The badge and
the tint answer different questions.

**Polling is 60s, plus a refetch on window focus.** There is no websocket here
and a bell is not a chat — nothing in it justifies a request every few seconds
from every open tab in four portals. Focus is what actually catches somebody
up after they have been away.

**A failed poll is silent.** It does not put an error banner in the top bar of
every page; the message appears inside the panel, where somebody has asked to
look.

**It renders nothing without a session.** Mounted in the shell, it would
otherwise fire an unauthenticated request on the login page.

**Wording comes down ON the row, not from the catalogue.** `lib/notifications.js`
mirrors only the icon and the group — the stable parts. The title and body were
composed when the notification was written, because they name a course or a
person that may since have been renamed, and a notification describing what
happened then must keep saying that. Icons are lucide NAMES mapped in the bell
(§10.3.1.6), and `Map` is aliased there because the bare name shadows the
global `Map` constructor — a bug this codebase has already shipped once.

### 10.3.2 Descriptions

Every description — course, module, lesson, assessment, session — is capped at
**450 characters** and rendered as **at most two lines** wherever it is listed.

- Edit it through `components/shared/description-field.jsx`. Never a bare
  `<Textarea>`: the component carries the `maxLength`, the character counter and
  the same label, so the limit cannot differ between one dialog and the next.
  `DESCRIPTION_MAX_LENGTH` lives in `lib/content-limits.js`, mirroring
  `server/src/common/content-limits.ts`, which is what actually enforces it.
- The counter is weight, not colour. Reaching the cap is a constraint working,
  not a failure, and `error` is reserved for failures (§10.1).
- **Cards and lists clamp to two lines** (`line-clamp-2`). **Detail pages do
  not** — the lesson page, the assessment header, the learner's course hero and
  the calendar panels show the whole text, because that is the page the reader
  opened to read it. Clamping there would hide content with no way to reach it.
- **In a card grid, reserve the two lines** (`min-h-[2.75rem]`) and render the
  paragraph even when it is empty. Otherwise a card with no description pulls
  its divider and stats up while the card beside it keeps them down, and the
  grid stops lining up.
- Inside a button or an accordion trigger, add `text-left` — the button reset
  centres text, so a description put there without it is centred.

### 10.4 Surfaces & data visualisation

- **A card that pads itself must cancel the primitive's padding.**
  `components/ui/card.jsx` carries `py-4` and `gap-4` of its own. A card whose
  body is a `CardContent` or a padded `Box` therefore pays twice — and a card
  whose first child is a full-bleed banner gets a white band above the picture
  instead of the art meeting the card's edge. Put `py-0` (and `gap-0` when the
  card has more than one child) on those cards. The primitive's own
  `has-[>img:first-child]:pt-0` only fires for a bare `<img>`, and `next/image`
  with `fill` always needs a positioned wrapper, so it never fires here.
- **Nothing casts a shadow and nothing is rounded.** `--radius` is `0` and
  every edge is a 1px `line` border. A `shadow-*` or `rounded-*` utility added
  by hand is the one thing that will make a component look foreign here.
  `.panel` is the Spectra card if a shadcn `Card` is not already in play.
- Stack `canvas` (the page) → `surface` (cards) → `surface-2` (inputs, table
  headers, hover) → `surface-3` (tracks). Dark sections use the navy family and
  should feel immersive — helpers: `.surface-dark`, `.surface-dark-soft`,
  `.surface-dark-deep`. The chrome — sidebar and topbar — is always `navy`.
- Tinted icon tiles beside a stat use `.tile-accent`, `.tile-success`,
  `.tile-warning`, `.tile-rust`.
- Avoid clutter, glassmorphism and noisy backgrounds.
- Charts use the Spectra ramp in order: **accent-blue → navy → success → warning
  → rust**. Import `seriesColor(i)`, `SEQUENTIAL` or `STATUS_RAMP` from
  `lib/brand.js` rather than writing a colour, and `HAIRLINE` for axis rules.
  Keep charts minimal and legible.
- Motion is smooth and deliberate: slow reveals, gentle scaling, clean
  transitions. No particles, glows or neon. `prefers-reduced-motion` is
  respected globally in `globals.css`.

---

## 11. File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Route pages | `page.js` | `app/(learner)/dashboard/page.js` |
| Route layouts | `layout.js` | `app/(learner)/layout.js` |
| Loading states | `loading.js` | `app/(learner)/dashboard/loading.js` |
| Error states | `error.js` | `app/(learner)/dashboard/error.js` |
| Components | `kebab-case.jsx` | `components/learner/dashboard-stats.jsx` |
| Utilities | `kebab-case.js` | `lib/format-currency.js` |
| Hooks | `use-*.js` | `hooks/use-auth.js` |
| API routes | `route.js` | `app/api/learner/dashboard/route.js` |
