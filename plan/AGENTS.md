# AGENTS.md — Parade Plan & Task Collaboration Rules

This directory contains the shared plan that multiple AI agents collaborate on.
Read this file in full before touching any plan or task file.

## Files

| Path | Purpose | Who writes |
|------|---------|------------|
| [`progress.json`](progress.json:1) | Master task list. One object per task. | Planner agents create tasks. **Worker agents may only update the `status` field.** |
| [`tasks/<id>.json`](tasks/:1) | Per-task scratch sheet. Starts identical to the object in `progress.json`. | The assigned worker agent has full read/write access. |
| [`AGENTS.md`](AGENTS.md:1) | This file. | Planner agents only. |

## Task Schema

Every task object (both in `progress.json` and `tasks/<id>.json`) MUST contain:

```json
{
  "id": "unique-kebab-case-id",
  "title": "Short human readable title",
  "phase": "step-1-auth",
  "status": "pending",
  "requirements": [
    "Clear, testable requirement statements."
  ],
  "context": [
    "frontend/**",
    "frontend/src/components/User.tsx"
  ],
  "depends_on": ["other-task-id"],
  "notes": "Optional free-form scratch space (worker-owned)."
}
```

### Field rules

- **`id`** — unique, stable, kebab-case. Never reuse or rename an id once created.
- **`title`** — short description of the deliverable.
- **`phase`** — one of the roadmap steps, e.g. `step-1-auth`, `step-2-profile`,
  `step-3-matching`, `step-4-messaging`, `infra`.
- **`status`** — one of:
  - `pending` — not started
  - `in_progress` — actively being worked
  - `blocked` — waiting on a dependency or external input
  - `review` — implementation done, awaiting review
  - `done` — complete and verified
- **`requirements`** — explicit, verifiable statements of what "done" means.
- **`context`** — glob file paths indicating the approximate area of work.
  Use broad globs for bootstrapping (e.g. `frontend/**`) and specific paths for
  focused work (e.g. `frontend/src/components/User.tsx`).
- **`depends_on`** — array of task ids that must reach `done` first. May be empty.
- **`notes`** — optional scratch space. Worker agents may edit freely in the
  localized task file.

## Collaboration Rules

1. **Single source of truth for status is `progress.json`.** The `status` field
   there is authoritative.
2. **Worker agents may ONLY modify the `status` field in `progress.json`.**
   Do not add, remove, or reorder tasks, and do not edit any other field.
3. **Worker agents own their `tasks/<id>.json` file.** They may freely edit
   `notes`, refine `requirements`, and record progress there. Keep the `id`
   field identical to the parent task.
4. **`tasks/<id>.json` starts identical to its `progress.json` object.** When a
   task is created, copy the object verbatim into the task file.
5. **Planner agents own the structure** of `progress.json` (adding tasks,
   editing requirements, dependencies, context).
6. **Never delete a task.** If obsolete, set `status` to `done` and explain in
   `notes`.
7. **Keep ids and file names in sync.** The task file must be named
   `tasks/<id>.json`.

## Tooling: `jq`

`jq` is available in the environment and is the preferred tool for reading and
updating JSON safely. Examples:

```bash
# List all task ids and statuses
jq -r '.tasks[] | "\(.id)\t\(.status)"' projects/parade/plan/progress.json

# Read a single task
jq '.tasks[] | select(.id == "frontend-bootstrap")' projects/parade/plan/progress.json

# Update ONLY the status field for a task (worker agents)
jq '(.tasks[] | select(.id == "frontend-bootstrap") | .status) = "in_progress"' \
  projects/parade/plan/progress.json > /tmp/progress.json \
  && mv /tmp/progress.json projects/parade/plan/progress.json

# Read a localized task scratch file
jq '.' projects/parade/plan/tasks/frontend-bootstrap.json

# Update notes in a localized task file (worker-owned)
jq '.notes = "Blocked on Firebase project creation."' \
  projects/parade/plan/tasks/frontend-bootstrap.json > /tmp/task.json \
  && mv /tmp/task.json projects/parade/plan/tasks/frontend-bootstrap.json
```

Always write to a temp file and `mv` it back to avoid truncating the source on
failure. Validate with `jq empty <file>` before committing changes.
