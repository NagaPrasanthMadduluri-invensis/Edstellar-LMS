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
| `navy` | `#1E2D40` | Chrome: sidebar, topbar, primary buttons |
| `navy-soft` | `#25344D` | Active nav item, hover on navy |
| `navy-deep` | `#192636` | Deepest navy, when a third step is needed |
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

**The navy scale was LIFTED**, from `#0F1923` to `#1E2D40`. The original read
as black with a hint of blue rather than as navy: a dark panel dominated
whatever page it sat on, and the accent figure it carried had to fight it.
Every step moved by the same offset, so `deep < navy < hover < soft` still
order the way they did.

Contrast was never the constraint — the old scale passed AA and so does this
one (body text 10.95:1, the on-navy-3 eyebrow 5.48:1, `accent-soft` 8.94:1).
The change is about how heavy the chrome FEELS, which is judged by looking at
it. If it moves again, move the whole family by one offset and keep the
ordering.

**`ink` stays `#0F1923`, and that is not an oversight.** Primary text on a
light surface and the navy chrome merely shared a hex; they are different
roles. Lifting the text along with the chrome would have washed out every
paragraph in the product.

**`lib/brand.js` mirrors these and must move with them.** A chart series drawn
from the JS mirror sits beside chrome painted from the CSS token, and the two
disagreeing is visible on one screen.

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

**`text-lime` on a navy surface is the alias trap, and it shipped.** In the old
system lime was a BRIGHT colour and navy was its natural field, so `text-lime`
on `surface-dark` was correct everywhere it appeared. The migration remapped it
to `accent-blue`, which is a DARK colour for light surfaces — so every one of
those call sites silently became dark-on-dark. Measured against `navy`:

| Colour | Contrast on navy | |
|---|---|---|
| `accent-blue` (what `lime` became) | 3.73:1 | murky — the defect |
| `accent-soft` | **11.36:1** | what belongs there |
| `success` | 2.29:1 | fails outright |
| `warning` / `rust` | 3.23:1 | *worse* than the defect |

That last row is worth keeping: a green or an amber reads as the obvious choice
for a positive figure like points earned, and both are **less** legible on navy
than the blue being replaced. Spectra's greens and ochres are dark inks for
light fields. On dark chrome the only light tint in the palette is
`accent-soft`, which is exactly what it is for.

Fixed in `course-reward.jsx`, `lesson-content.jsx` and the course hero's
progress figure. `bg-lime text-navy` was left alone — navy ON accent-blue is
the readable direction — as was `.cta-lime`, which is its own component class.

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

### 10.2.1 The product is Spectra LMS, by Edstellar

The name appears in four places — the top bar, the login card, the browser
title and the certificate — and it lives in ONE constant, `PRODUCT_NAME` /
`PRODUCT_BY` in `lib/brand.js`. It was written out four times before, and a
rename that misses one leaves the old name on the document a learner keeps
forever.

**Name and byline are separate strings, not one sentence.** They are set at
different sizes and weights wherever both appear, and a single "Spectra LMS by
Edstellar" cannot be styled in two parts. `PRODUCT_FULL` exists for the places
where only a flat string fits.

- **Top bar**: two lines inside the 56px header, both `leading-none` so the
  byline fits without growing the chrome. The byline takes `accent-soft`, not
  `accent-blue` — §10.1's rule for accent on navy, and the reason the smaller
  line stays readable against the dark chrome.

  **The byline is TRACKED OUT to the name's exact width**, so the two lines
  are flush left and right — the standard logo lockup. Three things that took
  a wrong turn first, worth not repeating:

  - `text-align-last: justify` is the WRONG tool. With a two-word string it
    spreads the single word gap and gives "By&nbsp;&nbsp;&nbsp;&nbsp;Edstellar"
    — the space opens between the words, not between the letters.
  - `truncate` silently disables it either way: it sets `white-space: nowrap`,
    and nowrap text cannot be justified or spread.
  - **letter-spacing adds a gap after the LAST character too.** Without a
    matching negative `margin-right` the box overhangs the name by one gap and
    the lines stop being flush. `-mr-[0.45em]` beside `tracking-[0.45em]`.

  The values are MEASURED, not guessed: at 18px the name renders 105.86px and
  the byline 56.4px, so 11 gaps need 4.50px = 0.45em. The name is responsive
  (`text-base` → `sm:text-lg`), so there are two values — one tracking cannot
  match two name widths. Verified flush to **0.00px at both breakpoints**.
  Retune if either string changes.
- **Login card**: the byline is uppercase at wide tracking in `text-3`, which
  reads as a maker's mark rather than a subtitle competing with the heading.
- **Certificate**: ONE line, `PRODUCT_FULL`. The eyebrow there is uppercase at
  0.4em tracking, and a byline stacked under it would read as a second heading
  on a formal document. Edstellar's name stays on the certificate because
  Edstellar is who issues it.

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

**The mock's Manager field is not rendered HERE**, and that is now about the
profile dialog rather than the product. `0033` added the reporting line, so a
manager exists — but like department it is set by an admin, not by the person
(§10.3.1.15). It is a fact on somebody's record, not a field they may edit.

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

### 10.3.1.13 The trainer portal: calendar and feedback

Two pages beside My Sessions, and between them they are the whole trainer
portal's reason to be opened on a day with no attendance to mark.

**Training Calendar is a second VIEW, not a second page of data.** It reads
`GET /api/trainer/sessions` — the same call My Sessions makes — and lays the
rows on a month grid. There is no calendar endpoint, so the grid and the list
cannot disagree about which sessions are yours. Same rule as the KPI tiles
being reduced from the rows already on screen (§10.3.1.8).

- **Monday-first**, because that is how a working week is read here.
- **`in_progress` arrives derived** from the API as `display_status`. Nothing
  here recomputes it from the clock, or the calendar would contradict the
  session list beside it (§10.3).
- **A session with no date is NAMED, not dropped.** It cannot be placed on a
  grid, and silently leaving it off is how a trainer misses work — so a line
  under the grid says how many there are and where to find them.
- **The day chip opens a dialog, and the dialog says what is still owed.**
  "Attendance is not marked. Until it is, nobody on this roster has been
  credited for the training" — the one thing a trainer can still do wrong
  about a session that has already happened.

#### Feedback

**Anonymous, and the page says so rather than leaving it to be inferred.**
The API never sends a name — `user_id` is stored and no trainer route selects
it — so there is nothing this page could leak by accident. It states it
anyway, at the top, because a trainer who believes they can work out who wrote
something reads the comments differently, and so does a learner who is not
sure. The learner's form makes the same promise in the same words before the
first star is clicked.

**An average under three responses is withheld, not shown.** The card prints
"1 response — too few to average" instead of a number. A single 2/5 rendered
as "2.0" invites a conclusion three more responses might reverse — the
`sufficient: false` refusal from §10.12, applied to a smaller number.
"No responses yet" and "too few to average" are different sentences, because
they are different facts.

**Each dimension says whose it is to fix.** Content is the admin's, Trainer is
the trainer's, Delivery is shared — printed under every tile. Three ratings
exist precisely because they fail separately, and a trainer reading a low
Content score as a verdict on their teaching would be the page misleading them
about their own job.

**No reply, no delete.** Feedback a trainer can remove is feedback nobody
should trust, and replying would need the author. Abuse is an admin's to
handle, with the names.

#### Giving it, on the learner's side

The control lives in the learner's Training Calendar dialog, where they are
already looking at the session — not on a page of its own that nobody visits.

**It is ABSENT, not disabled, when the API would refuse.** Only somebody
marked present, late or partial for a completed session may rate it, and the
eligibility list is a separate fetch from the calendar's own because
attendance is not on the sessions read. A learner marked Absent sees their
attendance and no feedback control at all — §10.3.1.2's rule taken one step
further, because there is no useful "why" to put in a disabled button's title
that is not just "you were not there".

**All three stars are required and Save says why it is off** — "Rate all three
to save". A half-answered form makes a row that skews every average it lands
in. Re-opening it loads what was actually saved, so revising starts from the
existing answer rather than from blank, and the footer says "This replaces
your earlier answer."

**Opening the form CLOSES the session dialog** rather than stacking on it.
Two dialogs deep is a place with two Close buttons and no obvious back.

### 10.3.1.14 Roles in Manage Users, and the trainer a session needs

The session form's Trainer picker was correct and permanently empty: nothing
in the product could put a person on a trainer role, so the list could only be
filled over SSH. Two controls fix that, and they answer different questions.

**Add User gained a Role selector.** Omitted means Learner, which is exactly
what the dialog did before — an admin who ignores the field gets the old
behaviour. Two things follow the choice rather than being stated once:

- **the note under it**, because whether the account costs a seat is the thing
  an admin at the cap needs: *"Trainer does not use a seat — only active
  learners count."*
- **the button**, which reads "Add Trainer" rather than "Add Learner". A
  submit button that names the wrong thing is how somebody creates twenty of
  the wrong kind of account.

`+ Add User` stays ENABLED at the seat cap once a non-learner role is picked.
Disabling it there would be the mirror of §10.3.1.2 — refusing a control the
API would honour.

**Change role is a row action, and it is offered on EVERY row** — unlike Edit,
Deactivate and Delete, which render disabled for non-learners because
`assertMutableLearner` refuses them. `RolesService.assign` has no such rule,
and moving a trainer back to learner is exactly the thing an admin needs when
they pick wrong. The dialog says every consequence before Save:

- which portal they move to, **and that they will be signed out once** — an
  admin who does not know a role change ends somebody's session cannot consent
  to it;
- that becoming a learner takes a seat, or that leaving learner frees one;
- that a trainer *"can then be picked as the trainer on a session"*, which is
  the whole reason most admins will open this dialog.

**It disables when the change would leave the organization with no admin**,
counted from the rows already on screen, with the reason in words. The API
refuses it with a 409 regardless; the disable means the admin hears it while
reading rather than after pressing Save.

#### The session form now requires a trainer account

A session with no linked trainer is admin-only — nobody can mark its
attendance from a trainer portal — so Create is refused without one.

- **With trainers**: the picker reads "Select a trainer" and Create is
  disabled until one is chosen, its title saying why.
- **With none**: the picker is replaced by a bordered note that says what is
  missing, why it matters, and links to Manage Users. A dead end that explains
  itself is still a dead end; the route out is the point.
- **Free text survives only while EDITING a session that already has no
  account.** Those predate trainer accounts, and the field carries a `warning`
  line saying the session stays admin-only until one is linked. Offering the
  box on a new session would be a control the API refuses.

That link is worth one more sentence, because getting it wrong wasted a round
of verification: **Manage Users is `/admin/users`, not `/admin/employees`.**
`/admin/employees` is the API path for the learners-only endpoint and is a 404
in the browser — so the one route out of the empty state 404'd until the real
UI was driven. A link is not verified by reading it.

### 10.3.1.15 The reporting line, and Team Learning

**A manager is also a learner.** The Manager role sits on the learner portal,
so they keep My Courses, hours, certificates and the leaderboard, and gain one
module. Nothing about this screen treats them as a different kind of user —
which is why a manager who reports to somebody appears in that person's team
with their own progress, exactly like anybody else.

#### The Manager field

It sits on Add User and Edit User, and **offers everybody active except the
person being edited**. Not just Manager-role accounts: an admin or a trainer
manages people too, and restricting the list would mean the org chart could
only be recorded in a particular order. Self is excluded in the component as
well as refused by the API — leaving the option in would be offering a choice
that is always wrong (§10.3.1.2).

A CYCLE is not filtered out of the list, because detecting one needs a walk up
the chain, which is a query. The API refuses it with a sentence naming both
people, which reads better than a silently shorter dropdown.

The field says what it is FOR — *"Their manager sees this person's progress in
Team Learning"* — because "Manager" alone looks like a label and is in fact a
grant of visibility over somebody's learning record.

**Somebody with reports but no Manager role is flagged in the row**: "manages 3
· no Manager role", in `warning`, with the reason in its title. They have a
team recorded that they cannot see, and the Change role action that fixes it is
two icons away. A plain "manages 3" in grey is shown when the role is right, so
the flag reads as a problem rather than as a count.

#### Team Learning

It says **"Your team — 2 direct reports"** at the top, so the rule is on the
screen and not only in the query. The page follows the reference mock:

- **Six tiles, reduced from the rows below** — never a second query, so a tile
  cannot disagree with the table (§10.3.1.8).
- **Avg score renders `—` when nobody has been assessed**, never 0. "No score
  yet" and "averaged zero" are different facts, and the API sends null for
  exactly this reason.
- **"N need attention" appears only when N is non-zero.** A red zero is a false
  alarm, the same rule the sessions grid follows.
- **Action required says "Nothing needs attention — everyone is on track"**
  rather than rendering an empty panel. An admin has to be able to tell that
  from a panel that failed to load (§10.3.1.11).
- **Nudge stays said.** Once pressed it reads "Nudged" and disables, because a
  manager needs to know they already prodded this person rather than pressing
  it three more times.
- **The hours bar is per-person against the monthly goal**, green when on track
  and `warning` when not — the number beside it takes `danger` only below the
  goal, never as decoration.

**Postgres timestamps are not ISO.** `2026-09-12 14:50:57.807+00` has a `+00`
offset that `new Date()` rejects, so every Last active cell rendered `—` while
the API was sending a real date. Only the date is displayed, so take
`slice(0, 10)` and build from the parts. Worth knowing before adding another
date column to any screen that reads a raw row.

### 10.3.1.19 The Course Catalogue

What a learner may add to their own learning, in one page — courses and live
sessions together, because they are the same decision from the learner's side.

**It sits beside Dashboard, not under My Learnings.** Nothing in it is theirs
until they press the button; the moment they do, it appears in My Courses or
My Sessions like anything else. Filing browsing under "my learning" would put
things somebody has not chosen next to things they have.

**A course card and a session card are deliberately NOT the same card**, and
four things separate them rather than one — the eyebrow word (COURSE / LIVE
SESSION), the stripe colour, what the body reports, and what the button says.
One difference alone is a detail a reader skims past.

| | Course | Live session |
|---|---|---|
| stripe | the category hue (§10.3.1.3) | the delivery mode: accent-blue in person, navy virtual |
| body | lessons, total duration, how many are on it | date, time, venue, trainer, and a seat meter |
| button | "Add to my learning" | "Book my place" |
| once joined | "Already yours — open it" | "Booked — see My Sessions", plus "Give up my place" |

**Nothing on the page decides whether something is joinable.** `is_enrolled`,
`is_full`, `seats_left` and `waitlist_position` all arrive derived from the
API, which is also what enforces them. A browser recomputing "full" from
capacity and headcount would be a second definition of full, free to disagree
with the button it sits next to — the rule §10.3.1.11 states for
`contract_state` and §10.3 for `display_status`.

**A full session offers the waitlist, and says so BEFORE the click.** The
button reads "Join the waitlist" in `warning`, with *"This session is full.
You will be enrolled if a place frees up"* under it. Discovering from the
confirmation that you queued rather than booked is the control-that-lies
failure with an extra step.

**The queue position is shown, not just the fact of queuing.** "Number 2 on
the waitlist" — the list carries `waitlist_position`, so a refresh does not
downgrade it to "you are waiting".

**Leave exists for a session and not for a course, and the absence is the
honest part.** Leaving a course would delete lesson completions the learner
genuinely earned, so there is no control for it anywhere — not a disabled one.
The session control is a quiet text link rather than a button, because giving
up a place is the rare path, and it disappears once attendance is marked (the
API refuses it then, with a sentence naming who can help).

**After any action the page REFETCHES rather than patching the row.**
Enrolling moves a seat count and a queue position that other people also
move; a locally patched card would quietly disagree with what the next person
sees.

**The empty state names where the assigned work already is.** "Nothing is open
to join yet" plus links to My Courses and My Sessions — an empty catalogue is
not an empty product, and a learner should be able to tell those apart
(§10.3.1.11's rule about telling zero from failed-to-load).

#### The admin's two toggles

**One switch on the course form, one on the session form — no third screen.**
Which things are open is a property of the thing, not a list somebody
maintains separately.

- **On a course** it sits under the feedback block and says self-enrolment is
  *additive*: "You can still assign it as well." An admin who thinks the
  toggle replaces assignment will stop assigning.
- **On a session** it sits directly under Capacity, because the two only mean
  something together — opening a session to everyone without knowing how many
  seats it has is how a waitlist takes the whole organization.

**Both say what Save will send, before Save.** "Saving notifies every learner
who does not already have this course. It is announced once, not on every
edit." A fan-out to the whole organization is not something to discover from
the bell afterwards, and the second sentence is there because an admin who
fears re-announcing will avoid editing the course at all.

**A draft course says the quiet part**: "Draft courses are not in the
catalogue. Learners are notified when you publish it." The toggle is not
ignored, it is waiting — and a toggle that looks live while doing nothing is
the thing §10.3.1.2 exists to prevent.

### 10.3.1.18 Surveys & Feedback

Three forms per organization — standard, technical, compliance — editable by
the admin at `/admin/surveys`, and asked of the learner on the course page.

**The first thing every surface says is that it does not count.** The card
under the assessments is headed "optional — it does not affect completion",
the dialog's navy header says nothing here affects progress, hours or the
certificate, and the course form's switch says the same. That repetition is
deliberate, the same way the seat panel says three times what a seat is
(§10.3.1.11): a form sitting directly under the assessments is otherwise read
as the last thing between somebody and their certificate, and a learner who
believes that fills it in to get past it — which is the opposite of what
feedback is for.

**A course's CATEGORY picks its form, and the course can override it.**
Technical → the Technical form, Compliance → the Compliance form, everything
else → Standard. The course dialog shows what the category already decided
("Courses in Compliance use *Compliance course feedback*") beside a dropdown
that can change it, and "Follow the category" is one option in that same list
rather than a separate unlink control — the same gesture-symmetry the lesson
placement select uses (§10.3.1.4).

**The mapping is fetched, never mirrored.** `GET /admin/surveys/options`
returns `category_templates` already resolved. A copy of the rule in
`lib/feedback-questions.js` would be free to drift from the form the learner
is actually shown, so the file says so where the map would have been.

**The three built-in forms show a padlock and a disabled delete that says
why.** They are looked up by key, so deleting one would leave every course in
its category resolving to nothing. Everything else about them is editable —
that is the feature, not a concession.

**A card that renders nothing is better than an empty one.** The learner's
card is absent, not disabled, when the course asks for no feedback: feedback
switched off, or a session's companion training, which is rated through the
session instead. A failed fetch also renders nothing — this is the one
genuinely optional thing on the page, and a red banner over it would be
louder than the feature is important. §10.3.1.13 makes the same call for the
session feedback control.

**Save says why it is off.** "Answer the 2 starred questions to save", and
re-opening loads what was actually saved so revising starts from the existing
answer, with "This replaces your earlier answer." in the footer. Identical to
the session feedback form, because it is the same promise.

**An open text question cannot be marked required**, and its switch is
disabled with the reason in its title rather than simply absent. A mandatory
essay is how a form gets abandoned; the API refuses it too.

**The admin's responses read names, and the page says why that is fine.**
"named, because an admin is the only person who sees these" — the opposite of
the trainer's feedback page, which states its anonymity for the same reason:
a reader who is unsure who can see what reads the comments differently.

**An answer whose question has been rewritten reads as one.** The editor
replaces the whole question set, so old answers keep the old ids; the admin's
view pairs what it can and lists the rest as "a question that has since been
changed" rather than re-labelling them with the new wording.

### 10.3.1.17 Sessions left the course lists and got their own modules

Sessions are gone from BOTH course lists — the learner's My Courses and the
admin's Course Library. They live in **My Sessions** and **Sessions &
Attendance** instead.

**A session is still a course assignment underneath** (§10.7) — that is what
credits attendance, hours, the leaderboard and certificates, and none of it
changed. What changed is only which LIST it appears in.

**Why it never belonged in either list.** For the learner, a session's only
honest progress was "wait for the day": they cannot move the bar, the trainer
marks them present. For the admin, the companion training course is an
implementation detail — created and renamed by the session, refused by the
course editor, not publishable, assignable or archivable on its own. Six of
the eleven rows in the demo library were these, each offering an admin a row
where almost every control was refused.

**Learning Hours is untouched, by construction.** That service reads
`user_lesson_completions` directly (§10.4), never either list, so which module
a session appears in cannot change what an hour is worth. Measured on the demo
learner: **29.1 hours total, of which 18.0 come from session lessons.** Had
the split broken hours she would read 11.1. My Sessions says this in words
too, because a learner who watches sessions leave My Courses has every reason
to assume their hours left with them.

**The learner filter is in the SERVICE, not the repository.**
`assignedCourses` has four callers — `courses`, `dashboard`, `progress` and
`courseDetail` — and a session is still part of what somebody was assigned.
Narrowing the query would have silently dropped sessions out of the dashboard
and progress totals too, and made the dashboard disagree with Learning Hours.

**The admin filter also moved the archived COUNT.** `archivedCount` carries
the same `session_id IS NULL` predicate as the list, or the toggle's badge
promises rows the toggle will not show.

#### My Sessions, to the reference

Four tiles — Total sessions, Upcoming, Attended, Attendance rate — then
Upcoming and Past as separate card grids. A card carries its training course's
art (§10.10, no second column), a type pill, an attendance pill on past cards
only, trainer / date+time+duration / venue, and ONE action:

| State | Action |
|---|---|
| upcoming, virtual with a link | **Join →** |
| upcoming, in person | "In-person session" |
| past, eligible and unrated | **Give feedback** — the §10.20 dialog |
| past, already rated | "Feedback submitted" |
| past, absent or unmarked | says which, offers nothing |

That last row matters: eligibility comes from the feedback endpoint, not from
the status, so the button is ABSENT where the API would refuse rather than
present and refused (§10.3.1.2).

**Attendance rate renders `—` when nothing has finished**, never 0% — "nothing
has completed yet" and "you attended none of them" are different facts.

**Two things in the reference are deliberately NOT built.** The mock's "Open
Sessions — Join Now" lets a learner self-enrol; there is no learner
self-enrolment endpoint in this product, so a Register button would be a
control that does nothing. And the mock's emoji are lucide components here
(§10.3.1.6).

#### Sessions & Attendance, on the admin side

Six KPI tiles (Total Sessions, Upcoming, Completed, Total Registered, Avg
Attendance, Need Attention) and the toolbar already matched the reference.
The CARDS did not, and were rebuilt: wide list rows became a **three-up grid**,
which is what the reference is.

- **A 3px top rule in the delivery-mode colour**, and a matching type pill —
  accent-blue for in-person, navy for virtual, success for webinar. Three
  values, all already in the palette: §10.1's closed-hue rule is not bent to
  carry this.
- **Art, with the controls over it.** The selection box sits top-left in a
  white square, the type pill beside it, the status badge top-right as a SOLID
  block in the status hue. The 12% chips go muddy over a photograph, which is
  the same reason §10.3 gives for not using them on navy.
- **The enrolment mode is said on EVERY card** — Admin-assigned / Self-enrol /
  Webinar — where the old card showed a chip only for self-enrol. Three modes
  with different consequences, and "how do people get on this?" is the first
  thing an admin reading a roster figure needs to know.
- **The count block is pinned to the bottom of the body** (`mt-auto`), so
  cards in a row line their meters up however long the titles are.
- **An icon action bar across the foot**, full width and divided. Six text
  buttons do not fit a third of a row; every cell carries `title` AND
  `aria-label` because an icon has no name (§10.3.1.2), and hover FILLS rather
  than tints for the reason that section gives.

**One deliberate divergence: which actions appear.** The reference always
offers Roster and Edit; ours hides them on a completed session and adds Mark
completed, because that is what our API permits — editing a session whose
attendance has already credited learners is refused (§10.7). The mock has no
API to disagree with, so it can afford a uniform bar. A card with two cells
looks sparser than the reference and is telling the truth about what is left
to do.

§10.3.1.10 records why the grid IS the page. The nav says "Sessions &
Attendance"; the reference HTML calls the same screen "Live Sessions".

### 10.3.1.16 My Courses: the certificate button, and no type filter

**The Certificate button is keyed off a CERTIFICATE, not off the status.** A
completed course does not imply one exists — a session training never
auto-issues (§10.7), and a revoked one should not be linked to. So the API
returns `certificateId` per course and the button renders only when it is set.
The live data makes the point: the demo learner has **six completed courses and
two certificates**, because four of the six are session trainings. Keying the
button off `status === "completed"` would have sent them to a page their course
is not listed on — §10.3.1.2's screen that lies, one click further along.

**It deep-links.** `/certifications?certificate=<id>` opens that certificate
directly rather than dropping the learner on a list to scan. The page checks
the id is really in their own fetched list before opening, so a stale or
hand-typed id lands on the page instead of opening an empty dialog.

**The two buttons sit SIDE BY SIDE**, each `flex-1 min-w-0`, so the pair splits
the card evenly and a card with no certificate keeps one full-width button. A
fixed width would break the moment a status label grew longer than "Review
Course".

**The Type filter was removed.** It offered Video / SCORM / Live session / Doc,
which is how content is AUTHORED, not how a learner looks for it: somebody
returning to My Courses is looking for a course by name or by whether they have
finished it, and the search box and the status tabs already answer both. Status
tabs stay, and `activeFilterCount` now counts only status and search — a
"Clear filters (2)" that included a filter nobody set would misreport.

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
