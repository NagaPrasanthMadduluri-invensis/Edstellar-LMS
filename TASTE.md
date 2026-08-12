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

| Token | Hex | Use |
|---|---|---|
| `navy` | `#0A1628` | Primary brand, dark surfaces, primary text |
| `navy-soft` | `#14233D` | Secondary dark surfaces, hover on navy |
| `navy-deep` | `#050D1A` | Deepest backgrounds (sidebar) |
| `lime` | `#C8F135` | The single accent — **dark surfaces only** |
| `lime-soft` | `#E4F89A` | Subtle highlights, data visuals |
| `paper` | `#FAFAF7` | Primary light background |
| `paper-warm` | `#F2F0E8` | Alternate light sections |
| `paper-cream` | `#EDE9DD` | Small highlighted areas |
| `white` | `#FFFFFF` | Cards and elevated surfaces |
| `ink` | `#0A1628` | Primary text |
| `error` | `#B3261E` | **Errors and destructive states only** |

**Rules**
- No gold, blue, red, green, amber, gradients or bright accents. There is no
  success green or warning amber — see §10.3.
- `error` is never used for emphasis, only for genuine failure or destruction.
- **Lime never appears as text or emphasis on a light background.** On dark
  surfaces it carries key emphasis and primary CTAs (lime field, navy text).
- Greys are expressed as ink at opacity (`text-ink/60`), never a grey ramp.

### 10.2 Typography

| Face | Class | Use |
|---|---|---|
| Sora | `font-display` | Headlines and display text |
| Cormorant Garamond *italic* | `font-editorial` | ONE emphasis phrase per headline |
| DM Sans | `font-sans` (default) | Body copy, UI, supporting text |
| DM Mono | `font-mono` | Labels, eyebrows, section markers, technical text |

`h1`–`h6` get Sora automatically from the base layer — do not set a font on them.

Headlines are **sentence case**. Use `components/shared/page-header.jsx` for every
page: it encodes eyebrow → title → italic emphasis → summary so the rule is not
re-decided per page. Avoid excessive bolding, underlining or decorative type.

### 10.3 Status without extra hues

Colour is not available to distinguish states, so status is carried by **fill
weight**. The four states, defined once as `.chip-*` in `globals.css` and
mirrored by `statusChip()` in `lib/brand.js`:

| State | Treatment |
|---|---|
| Complete / passed / present | Filled `navy`, `paper` text — the heaviest |
| In progress / partial / late | `paper-cream` fill, `ink` text, navy hairline |
| Not started / idle / behind | `paper-warm` fill, muted ink, hairline border |
| Failed / absent / revoked | `error` at 10%, `error` text |

When adding a state, pick one of these four. Do not invent a fifth colour.

### 10.4 Surfaces & data visualisation

- Alternate between `paper`, `paper-warm`, `navy` and `white`. Use white cards
  sparingly for elevation. Dark sections use the navy family and should feel
  immersive — helpers: `.surface-dark`, `.surface-dark-soft`, `.surface-dark-deep`.
- Avoid clutter, heavy shadows, glassmorphism and noisy backgrounds.
- Charts use the brand ramp in order: **lime-soft → lime → navy**. Import
  `seriesColor(i)`, `SEQUENTIAL` or `STATUS_RAMP` from `lib/brand.js` rather than
  writing a colour. Keep charts minimal and legible.
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
