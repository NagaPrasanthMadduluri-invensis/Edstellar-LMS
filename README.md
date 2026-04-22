# Invensis LMS

A Learning Management System built with Next.js 15, React 19, and shadcn/ui. The platform serves two distinct portals — **Learner** and **Admin** — within a single application using Next.js Route Groups.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, shadcn/ui, Tailwind CSS 4
- **Components:** Custom `<Text>` and `<Box>` primitives for consistent markup

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
app/
├── (auth)/          → Public auth pages (login, register)
├── (learner)/       → Learner portal (dashboard, courses, progress...)
├── (admin)/         → Admin portal (users, content, analytics...)
├── layout.js        → Root layout (fonts, CSS only)
└── api/             → API routes

components/
├── ui/              → Shadcn + Text, Box primitives
├── shared/          → Domain components shared across portals
├── learner/         → Learner-specific components
├── admin/           → Admin-specific components
└── layout/          → Shell components (topnav, sidebars)
```

## Architecture Rules

**Read [TASTE.md](./TASTE.md) before writing any code.** It defines:

- Rendering strategy (SSG shell + client fetch for authenticated pages, ISR for public pages)
- Server vs Client component boundaries
- Authentication flow and authorization patterns
- Component architecture and directory conventions
- Performance rules and styling standards
- Checklist for every new feature

Every new feature, page, or requirement must follow the rules in TASTE.md.

## Key Decisions

- **Single app, route groups** — Learner and Admin share UI/lib code but have completely separate layouts and sidebars. Zero admin code ships to learner bundles.
- **Hybrid rendering** — Static shells load instantly from CDN; user-specific data fills in via client-side fetch. No full SSR blocking.
- **`<Text>` and `<Box>`** — Used everywhere instead of raw HTML tags for consistent typography and layout primitives.
- **Tailwind only** — No inline styles. Colors via CSS variables. Responsive mobile-first.
