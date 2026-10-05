# TASTE — Technical Architecture, Standards, and Engineering Rules

> **These standards moved, and they were not deleted.**
>
> This file was 2,150 lines and loaded into every AI session in full —
> including sessions that never touched a client file. Claude Code's own
> guidance is that a file over 200 lines "consumes more context and reduces
> adherence", which is a polite way of saying a long file gets skimmed.
>
> It is now seventeen shorter, path-scoped files, so the design-system rules
> arrive when you open a component and the admin-screen decision records
> arrive only when you open an admin screen.

## Where to read them

```
edstellar-lms/              ← the workspace repository
└── .claude/rules/
    ├── 00-index.md         ← start here: the map
    ├── client-*.md         ← structure, rendering, auth, data, performance
    ├── design-*.md         ← palette, typography, status, surfaces
    └── screens-*.md        ← why each screen is the way it is
```

They live in the **workspace** repository rather than here, because that is
where Claude Code reads project rules from and where the agents, hooks and
harness also live. If you have only cloned `Edstellar-LMS`, you have the
application without its standards — clone the workspace repo alongside it.

## What did not move

- `server/BACKEND_STRUCTURE.md` — the API's standards, in the server repo.
- `AGENTS.md` — repo-wide boundaries, in the workspace repo.

## If you are changing a rule

Change it in `.claude/rules/`, not here. This file is a signpost; it carries
no rules of its own, and a rule written here would be one nothing loads.
