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
