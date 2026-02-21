# Person 1 — 3-Terminal Orchestration Playbook

> **How to use this file:** You are the conductor. You run Terminal 1 yourself. At specific
> **INTERVENTION** points, you open Terminal 2 and Terminal 3 and paste the exact prompts
> provided. This file tells you **when**, **where**, and **what** to paste.

> **Full technical spec:** `docs/plans/2026-02-21-person1-implementation-plan.md`

---

## Pre-Flight

Open **3 terminal/shell windows** in `C:\GitHubProjects\aiagent`. Label them:

| Window | Label | Purpose |
|--------|-------|---------|
| 1 | **T1 — Foundation** | You run this first. Scaffolding, schema, config. Then returns for integration. |
| 2 | **T2 — Pipeline** | Prospects + Workflow + Stubs. Starts on your signal. |
| 3 | **T3 — Campaigns** | Campaigns + GenJobs + Queries. Starts on your signal. |

**Only T1 is active at the start.** T2 and T3 stay closed/idle until you reach the intervention point.

---

## TERMINAL 1 — Phase 1: Foundation

### Start Claude Code in T1

```
claude
```

### Paste this prompt into T1:

```
Read the implementation plan at docs/plans/2026-02-21-person1-implementation-plan.md

Execute PHASE 1 only (Tasks 1.1 through 1.5). Follow the plan exactly — TDD, exact commands, exact code. Use the superpowers:executing-plans skill.

Phase 1 tasks in order:
- Task 1.1: Scaffold Convex + React project (npm create convex, install deps, vitest config, .env.local.example)
- Task 1.2: Define schema (convex/schema.ts) with TDD — write test first, verify fail, implement, verify pass
- Task 1.3: Register components (convex/convex.config.ts) — agent + workflow
- Task 1.4: File storage utility (convex/files.ts) with TDD
- Task 1.5: Shared WorkflowManager instance (convex/workflowInit.ts)

After each task, commit. After Task 1.5, push to origin main.

STOP after pushing. Tell me "Phase 1 complete — T2 and T3 can start."
```

### Wait for T1 to finish

T1 will output: **"Phase 1 complete — T2 and T3 can start."**

If it doesn't say this, something failed. Fix it before continuing.

---

## ========================================================
## INTERVENTION POINT — LAUNCH T2 AND T3 NOW
## ========================================================

**When T1 says "Phase 1 complete":**

1. Open Terminal 2
2. Open Terminal 3
3. Paste the prompts below into each — **at the same time** (order doesn't matter, they work on different files)

---

## TERMINAL 2 — Phase 2: Prospects + Workflow + Stubs

### Start Claude Code in T2

```
claude
```

### Paste this prompt into T2:

```
Read the implementation plan at docs/plans/2026-02-21-person1-implementation-plan.md

Execute the PHASE 2 — Terminal 2 section only. Follow the plan exactly — TDD, exact commands, exact code. Use the superpowers:executing-plans skill.

IMPORTANT: First run `git pull origin main && npm install` to get Phase 1 foundation.

Terminal 2 tasks in order:
- Task 2.1: Prospect public queries (convex/prospects.ts Part A) — write failing tests, implement, verify pass, commit
- Task 2.2: Prospect internal mutations (convex/prospects.ts Part B) — write failing tests, append mutations, verify pass, commit
- Task 2.3: Stub actions for Person 2 (convex/services.ts) — create stubs, verify tests still pass, commit
- Task 2.4: Stub action for Person 3 (convex/agents.ts) — create stub, commit
- Task 2.5: Durable workflow (convex/workflow.ts) — write test, implement 5-step pipeline, verify pass, commit

After all tasks, push to origin main.

Do NOT touch these files (Terminal 3 owns them): campaigns.ts, generationJobs.ts
Do NOT run `npx convex dev` — just run vitest tests locally.

When done, tell me "T2 complete — all prospect/workflow code pushed."
```

---

## TERMINAL 3 — Phase 2: Campaigns + Generation Jobs

### Start Claude Code in T3

```
claude
```

### Paste this prompt into T3:

```
Read the implementation plan at docs/plans/2026-02-21-person1-implementation-plan.md

Execute the PHASE 2 — Terminal 3 section only. Follow the plan exactly — TDD, exact commands, exact code. Use the superpowers:executing-plans skill.

IMPORTANT: First run `git pull origin main && npm install` to get Phase 1 foundation.

Terminal 3 tasks in order:
- Task 3.1: Campaign public queries (convex/campaigns.ts Part A) — write failing tests, implement, verify pass, commit
- Task 3.2: Campaign mutations — create + launch (convex/campaigns.ts Part B) — write failing tests, implement, verify pass, commit
- Task 3.3: Campaign internal mutations (convex/campaigns.ts Part C) — write failing tests for incrementCompleted + getBrief, implement, verify pass, commit
- Task 3.4: Generation job tracking (convex/generationJobs.ts) — write failing tests, implement full CRUD, verify pass, commit

After all tasks, push to origin main.

Do NOT touch these files (Terminal 2 owns them): prospects.ts, workflow.ts, services.ts, agents.ts
Do NOT run `npx convex dev` — just run vitest tests locally.

IMPORTANT: getBrief must be internalQuery NOT internalMutation (the design doc had this wrong, the implementation plan has it correct).

When done, tell me "T3 complete — all campaign/job code pushed."
```

---

## WAIT FOR BOTH T2 AND T3 TO FINISH

Watch for these two messages:
- T2: **"T2 complete — all prospect/workflow code pushed."**
- T3: **"T3 complete — all campaign/job code pushed."**

**Both must finish before proceeding.** They may finish at different times — that's fine. Wait for whichever is slower.

If either fails:
- Read the error
- Fix in that terminal
- Make sure it pushes before continuing

---

## ========================================================
## INTERVENTION POINT — RETURN TO T1 FOR PHASE 3
## ========================================================

**When BOTH T2 and T3 report complete:**

Go back to **Terminal 1** (which has been idle since Phase 1).

---

## TERMINAL 1 — Phase 3: Integration + Seed + Verify

### Paste this prompt into T1:

```
Read the implementation plan at docs/plans/2026-02-21-person1-implementation-plan.md

Execute PHASE 3 only (Tasks P3.1 through P3.4). Follow the plan exactly. Use the superpowers:executing-plans skill.

IMPORTANT: First run `git pull origin main` to get T2 and T3's work.

Phase 3 tasks in order:
- Task P3.1: Create seed data script (convex/seedData.ts) with 5 fintech prospects
- Task P3.2: Run ALL tests across ALL files (`npx vitest run`). Fix any failures.
- Task P3.3: Deploy to Convex (`npx convex dev`), run seed data, smoke test in dashboard
- Task P3.4: Verify all 22 function references exist (check Person 2/3/4 handoff list)

After all tasks, do a final commit and push.

When done, tell me: "Person 1 COMPLETE. Backend ready for Persons 2, 3, and 4." and list any issues found.
```

---

## DONE — What Happens Next

When T1 reports **"Person 1 COMPLETE"**, you have:

```
convex/
├── schema.ts               ✓ 3 tables, all indexes
├── convex.config.ts         ✓ agent + workflow components
├── workflowInit.ts          ✓ WorkflowManager with retry config
├── files.ts                 ✓ File storage URL query
├── prospects.ts             ✓ 3 public queries + 7 internal mutations/queries
├── workflow.ts              ✓ 5-step durable pipeline
├── services.ts              ✓ 3 stub actions (Person 2 replaces)
├── agents.ts                ✓ 1 stub action (Person 3 replaces)
├── campaigns.ts             ✓ 3 queries + 2 mutations + 2 internal functions
├── generationJobs.ts        ✓ 1 query + 3 internal mutations + 1 internal query
├── seedData.ts              ✓ 5 demo prospects ready
├── *.test.ts (6 files)      ✓ Full test coverage
└── _generated/              ✓ Auto-generated types
```

**Hand off to teammates:**

| Person | What they do | Files they replace/extend |
|--------|-------------|--------------------------|
| **Person 2** | Replace stubs with real API calls | `convex/services.ts` → rtrvr.ai, ElevenLabs, MiniMax |
| **Person 3** | Replace stub with real agent | `convex/agents.ts` → @convex-dev/agent + MiniMax M2.5 |
| **Person 4** | Build React frontend | `src/` → uses `api.campaigns.*`, `api.prospects.*`, `api.files.*` |

---

## Quick Reference: Timing Expectations

| Phase | Terminal(s) | Estimated Duration |
|-------|-------------|-------------------|
| Phase 1 | T1 only | 30-45 min |
| Phase 2 | T2 + T3 parallel | 60-90 min (clock time) |
| Phase 3 | T1 only | 20-30 min |
| **Total** | | **~2-2.5 hours** |

---

## Troubleshooting

**T2 or T3 can't pull Phase 1 work:**
→ Go back to T1, verify `git push origin main` succeeded. Run `git log --oneline -5` to confirm.

**T2 and T3 have merge conflicts on push:**
→ They write DIFFERENT files. If conflicts appear in `_generated/`, delete `convex/_generated/` and let `npx convex dev` regenerate. The only real conflict risk is if both terminals modify the same file — the plan prevents this.

**Tests fail after pulling T2 + T3 work in Phase 3:**
→ Most likely cause: `campaigns.ts` references `internal.workflow.prospectPipeline` (from T2) but T2's code references `internal.campaigns.incrementCompleted` (from T3). Both must be pulled before tests pass together. This is expected — Phase 3 is the integration point.

**`npx convex dev` fails in Phase 3:**
→ Check the error. Common causes: missing import, type mismatch between what workflow.ts calls and what campaigns.ts exports. Fix in T1 and commit.

**`workflow.start()` fails in tests:**
→ Expected. `convex-test` can't mock the WorkflowManager component. The `launch` test is written to tolerate this. Full workflow testing happens in Phase 3 against real Convex.
