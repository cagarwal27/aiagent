# Person 1: Convex Core (Backend Architect) — 3-Terminal Execution Plan

## Role Summary

Person 1 owns the **data backbone** of ProspectClip: schema, durable workflows, mutations, queries, and project scaffolding. Everything other team members build depends on this foundation.

---

## Terminal Allocation Strategy

```
PHASE 1 — Foundation (T1 only, sequential)
  T1: Project scaffolding + schema + config + file utilities
  Duration: ~30-45 min
  Unblocks: T2, T3, and all other team members

PHASE 2 — Parallel Build (T2 + T3 simultaneously)
  T2: workflow.ts + prospects.ts (the pipeline core)
  T3: campaigns.ts + generationJobs.ts + dashboard queries
  Duration: ~60-90 min each
  These are independent once schema exists

PHASE 3 — Integration (T1 rejoins)
  T1: Stub actions for Person 2 & 3, integration testing, seed data
  Duration: ~30-45 min
  Unblocks: demo readiness
```

```
Timeline visualization:

T1: [==PHASE 1==]----idle---------[==PHASE 3==]
T2: ----waiting----[===PHASE 2===]---done------
T3: ----waiting----[===PHASE 2===]---done------
                   ^                 ^
                   Schema ready      Integration
```

---

## PHASE 1 — Foundation (Terminal 1)

### Task 1.1: Project Scaffolding

**Command:**
```bash
npm create convex@latest my-app -- -t react-vite-shadcn
```

Then move contents to repo root (or scaffold directly in the repo).

**Install additional dependencies:**
```bash
npm install @convex-dev/workflow @convex-dev/agent
```

**Verify:**
- `package.json` exists with convex, react, @convex-dev/workflow, @convex-dev/agent
- `convex/` directory created
- `src/` directory created with React boilerplate
- `npx convex dev` starts without errors

---

### Task 1.2: Schema (`convex/schema.ts`)

The source of truth for all team members. Must be complete and correct before T2/T3 begin.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Campaign: a batch of prospects to generate videos for
  campaigns: defineTable({
    name: v.string(),                    // "Q1 Fintech Outreach"
    brief: v.string(),                   // what to emphasize, pain points
    senderName: v.string(),              // "Sarah from Acme"
    senderCompany: v.string(),           // company context
    senderCompanyInfo: v.string(),       // product/value prop details
    voiceId: v.string(),                 // ElevenLabs voice ID
    status: v.string(),                  // "draft" | "running" | "completed"
    totalProspects: v.number(),
    completedProspects: v.number(),
  }).index("by_status", ["status"]),

  // Prospect: one person to generate a video for
  prospects: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    company: v.string(),
    title: v.optional(v.string()),
    url: v.string(),
    email: v.optional(v.string()),

    // Pipeline status
    status: v.string(),
    // "queued" | "researching" | "scripting" | "generating_voice"
    // | "generating_visuals" | "assembling" | "complete" | "failed"

    // Research output (from rtrvr.ai)
    researchData: v.optional(v.string()),

    // Script output (from agent)
    scriptThreadId: v.optional(v.string()),
    script: v.optional(v.object({
      scenes: v.array(v.object({
        sceneNumber: v.number(),
        narration: v.string(),
        visualPrompt: v.string(),
        durationSeconds: v.number(),
      })),
      fullNarration: v.string(),
    })),

    // Generated assets
    voiceFileId: v.optional(v.id("_storage")),
    sceneAssets: v.optional(v.array(v.object({
      sceneNumber: v.number(),
      imageFileId: v.optional(v.id("_storage")),
      videoFileId: v.optional(v.id("_storage")),
      voiceFileId: v.optional(v.id("_storage")),
    }))),

    // Final output
    finalVideoUrl: v.optional(v.string()),

    // Tracking
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_status", ["campaignId", "status"]),

  // Generation jobs: track async external API calls
  generationJobs: defineTable({
    prospectId: v.id("prospects"),
    type: v.string(),                    // "voice" | "image" | "video"
    sceneNumber: v.optional(v.number()),
    status: v.string(),                  // "pending" | "processing" | "complete" | "failed"
    externalJobId: v.optional(v.string()),
    resultFileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    attempts: v.number(),
  })
    .index("by_prospect", ["prospectId"])
    .index("by_status", ["status"])
    .index("by_external_id", ["externalJobId"]),
});
```

**Verify:** `npx convex dev` accepts the schema with no errors.

---

### Task 1.3: Component Config (`convex/convex.config.ts`)

```typescript
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import workflow from "@convex-dev/workflow/convex.config.js";

const app = defineApp();
app.use(agent);
app.use(workflow);
export default app;
```

**Verify:** `npx convex dev` generates component types without errors.

---

### Task 1.4: File Storage Utility (`convex/files.ts`)

Simple utility so Person 4 can serve stored files:

```typescript
// convex/files.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, { fileId }) => {
    return await ctx.storage.getUrl(fileId);
  },
});
```

---

### Task 1.5: Shared Workflow Instance (`convex/workflowInit.ts`)

Create the shared WorkflowManager instance that workflow.ts will use:

```typescript
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: {
      maxAttempts: 3,
      initialBackoffMs: 1000,
      base: 2,
    },
    retryActionsByDefault: true,
  },
});
```

**PHASE 1 EXIT CRITERIA:**
- [ ] `npx convex dev` runs clean
- [ ] Schema deploys successfully
- [ ] Components (agent + workflow) register
- [ ] Commit and push so T2/T3 can pull

---

## PHASE 2 — Parallel Build

### Terminal 2: Workflow + Prospects (the pipeline core)

#### Task 2.1: Prospect Status Mutations (`convex/prospects.ts`)

```typescript
// convex/prospects.ts
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// === PUBLIC QUERIES (for frontend / Person 4) ===

export const get = query({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    return await ctx.db.get(prospectId);
  },
});

export const getByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    return await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();
  },
});

export const getByCampaignAndStatus = query({
  args: { campaignId: v.id("campaigns"), status: v.string() },
  handler: async (ctx, { campaignId, status }) => {
    return await ctx.db
      .query("prospects")
      .withIndex("by_campaign_status", (q) =>
        q.eq("campaignId", campaignId).eq("status", status)
      )
      .collect();
  },
});

// === INTERNAL MUTATIONS (called by workflow + other persons) ===

export const updateStatus = internalMutation({
  args: { prospectId: v.id("prospects"), status: v.string() },
  handler: async (ctx, { prospectId, status }) => {
    const updates: Record<string, unknown> = { status };
    if (status === "researching") {
      updates.startedAt = Date.now();
    }
    if (status === "complete") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(prospectId, updates);
  },
});

export const markFailed = internalMutation({
  args: { prospectId: v.id("prospects"), error: v.string() },
  handler: async (ctx, { prospectId, error }) => {
    await ctx.db.patch(prospectId, { status: "failed", error });
  },
});

export const saveResearch = internalMutation({
  args: { prospectId: v.id("prospects"), researchData: v.string() },
  handler: async (ctx, { prospectId, researchData }) => {
    await ctx.db.patch(prospectId, { researchData });
  },
});

export const saveScript = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    script: v.object({
      scenes: v.array(v.object({
        sceneNumber: v.number(),
        narration: v.string(),
        visualPrompt: v.string(),
        durationSeconds: v.number(),
      })),
      fullNarration: v.string(),
    }),
  },
  handler: async (ctx, { prospectId, script }) => {
    await ctx.db.patch(prospectId, { script });
  },
});

export const saveThreadId = internalMutation({
  args: { prospectId: v.id("prospects"), threadId: v.string() },
  handler: async (ctx, { prospectId, threadId }) => {
    await ctx.db.patch(prospectId, { scriptThreadId: threadId });
  },
});

export const saveSceneAsset = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    sceneNumber: v.number(),
    type: v.string(),  // "voice" | "image" | "video"
    fileId: v.id("_storage"),
  },
  handler: async (ctx, { prospectId, sceneNumber, type, fileId }) => {
    const prospect = await ctx.db.get(prospectId);
    if (!prospect) throw new Error("Prospect not found");

    const sceneAssets = prospect.sceneAssets ?? [];
    const existingIndex = sceneAssets.findIndex(
      (a) => a.sceneNumber === sceneNumber
    );

    const assetUpdate = { sceneNumber } as Record<string, unknown>;
    assetUpdate[`${type}FileId`] = fileId;

    if (existingIndex >= 0) {
      sceneAssets[existingIndex] = { ...sceneAssets[existingIndex], ...assetUpdate };
    } else {
      sceneAssets.push({
        sceneNumber,
        imageFileId: type === "image" ? fileId : undefined,
        videoFileId: type === "video" ? fileId : undefined,
        voiceFileId: type === "voice" ? fileId : undefined,
      });
    }

    await ctx.db.patch(prospectId, { sceneAssets });
  },
});

// === INTERNAL QUERIES (called by Person 3's agent tools) ===

export const getResearch = internalQuery({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    const prospect = await ctx.db.get(prospectId);
    return prospect?.researchData ?? null;
  },
});
```

**File count:** 1 file, ~120 lines

---

#### Task 2.2: Durable Workflow (`convex/workflow.ts`)

The most critical piece — the 5-step pipeline per prospect:

```typescript
// convex/workflow.ts
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { workflow } from "./workflowInit";

export const prospectPipeline = workflow.define({
  args: {
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
  },
  handler: async (step, { prospectId, campaignId }) => {
    // Step 1: Research via rtrvr.ai
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "researching",
    });
    await step.runAction(internal.services.scrapeProspect, {
      prospectId,
    });

    // Step 2: Script via @convex-dev/agent + MiniMax
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "scripting",
    });
    await step.runAction(internal.agents.writeScript, {
      prospectId,
      campaignId,
    });

    // Step 3: Voice generation via ElevenLabs
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_voice",
    });
    await step.runAction(internal.services.generateAllVoice, {
      prospectId,
    });

    // Step 4: Visual generation via MiniMax (async with polling)
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_visuals",
    });
    await step.runAction(internal.services.generateAllVisuals, {
      prospectId,
    });

    // Step 5: Mark complete + update campaign counter
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "complete",
    });
    await step.runMutation(internal.campaigns.incrementCompleted, {
      campaignId,
    });
  },
});
```

**File count:** 1 file, ~50 lines

---

#### Task 2.3: Stub Actions for Person 2 & 3

Create stub internal actions so `workflow.ts` compiles. Person 2 and 3 replace these with real implementations.

```typescript
// convex/services.ts (stubs — Person 2 replaces)
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const scrapeProspect = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    // STUB: Person 2 implements rtrvr.ai integration
    console.log(`[STUB] scrapeProspect called for ${prospectId}`);
    await ctx.runMutation(internal.prospects.saveResearch, {
      prospectId,
      researchData: JSON.stringify({
        stub: true,
        summary: "Stub research data — replace with rtrvr.ai integration",
      }),
    });
  },
});

export const generateAllVoice = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    // STUB: Person 2 implements ElevenLabs integration
    console.log(`[STUB] generateAllVoice called for ${prospectId}`);
  },
});

export const generateAllVisuals = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    // STUB: Person 2 implements MiniMax image + video integration
    console.log(`[STUB] generateAllVisuals called for ${prospectId}`);
  },
});
```

```typescript
// convex/agents.ts (stubs — Person 3 replaces)
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const writeScript = internalAction({
  args: {
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { prospectId, campaignId }) => {
    // STUB: Person 3 implements @convex-dev/agent script writer
    console.log(`[STUB] writeScript called for ${prospectId}`);
    await ctx.runMutation(internal.prospects.saveScript, {
      prospectId,
      script: {
        scenes: [
          {
            sceneNumber: 1,
            narration: "Hi [Name], I noticed your company is doing great things...",
            visualPrompt: "Professional office setting with modern tech",
            durationSeconds: 15,
          },
          {
            sceneNumber: 2,
            narration: "Most teams struggle with scaling personalized outreach...",
            visualPrompt: "Person overwhelmed at desk with multiple screens",
            durationSeconds: 15,
          },
          {
            sceneNumber: 3,
            narration: "That is exactly what we help with at our company...",
            visualPrompt: "Clean dashboard showing automated workflow",
            durationSeconds: 15,
          },
        ],
        fullNarration: "Hi [Name], I noticed your company is doing great things... Most teams struggle with scaling personalized outreach... That is exactly what we help with at our company...",
      },
    });
  },
});
```

**T2 EXIT CRITERIA:**
- [ ] `prospects.ts` — all public queries + internal mutations compile
- [ ] `workflow.ts` — pipeline compiles and references valid function refs
- [ ] Stub actions exist so workflow can execute end-to-end
- [ ] Test: create a campaign + prospect manually, run workflow, see status transitions

---

### Terminal 3: Campaigns + Generation Jobs + Dashboard Queries

#### Task 3.1: Campaign CRUD (`convex/campaigns.ts`)

```typescript
// convex/campaigns.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { workflow } from "./workflowInit";

// === PUBLIC QUERIES ===

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("campaigns").order("desc").collect();
  },
});

export const get = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    return await ctx.db.get(campaignId);
  },
});

export const getProgress = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) return null;

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();

    const statusCounts: Record<string, number> = {};
    for (const p of prospects) {
      statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    }

    return {
      campaign,
      prospects,
      statusCounts,
      total: prospects.length,
      completed: statusCounts["complete"] ?? 0,
      failed: statusCounts["failed"] ?? 0,
      inProgress: prospects.length
        - (statusCounts["complete"] ?? 0)
        - (statusCounts["failed"] ?? 0)
        - (statusCounts["queued"] ?? 0),
    };
  },
});

// === PUBLIC MUTATIONS ===

export const create = mutation({
  args: {
    name: v.string(),
    brief: v.string(),
    senderName: v.string(),
    senderCompany: v.string(),
    senderCompanyInfo: v.string(),
    voiceId: v.string(),
    prospects: v.array(v.object({
      name: v.string(),
      company: v.string(),
      title: v.optional(v.string()),
      url: v.string(),
      email: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { prospects: prospectList, ...campaignData } = args;

    // Create campaign
    const campaignId = await ctx.db.insert("campaigns", {
      ...campaignData,
      status: "draft",
      totalProspects: prospectList.length,
      completedProspects: 0,
    });

    // Create prospect records
    for (const prospect of prospectList) {
      await ctx.db.insert("prospects", {
        campaignId,
        ...prospect,
        status: "queued",
      });
    }

    return campaignId;
  },
});

export const launch = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "draft") {
      throw new Error("Campaign already launched");
    }

    // Update campaign status
    await ctx.db.patch(campaignId, { status: "running" });

    // Get all queued prospects and kick off workflows
    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign_status", (q) =>
        q.eq("campaignId", campaignId).eq("status", "queued")
      )
      .collect();

    for (const prospect of prospects) {
      await workflow.start(
        ctx,
        internal.workflow.prospectPipeline,
        { prospectId: prospect._id, campaignId }
      );
    }
  },
});

// === INTERNAL MUTATIONS (called by workflow) ===

export const incrementCompleted = internalMutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) return;

    const newCount = campaign.completedProspects + 1;
    const updates: Record<string, unknown> = {
      completedProspects: newCount,
    };

    if (newCount >= campaign.totalProspects) {
      updates.status = "completed";
    }

    await ctx.db.patch(campaignId, updates);
  },
});

export const getBrief = internalMutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    return {
      brief: campaign.brief,
      senderName: campaign.senderName,
      senderCompany: campaign.senderCompany,
      senderCompanyInfo: campaign.senderCompanyInfo,
    };
  },
});
```

**File count:** 1 file, ~130 lines

---

#### Task 3.2: Generation Job Tracking (`convex/generationJobs.ts`)

```typescript
// convex/generationJobs.ts
import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// === PUBLIC QUERIES ===

export const getByProspect = query({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    return await ctx.db
      .query("generationJobs")
      .withIndex("by_prospect", (q) => q.eq("prospectId", prospectId))
      .collect();
  },
});

// === INTERNAL MUTATIONS (called by Person 2's service actions) ===

export const create = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    type: v.string(),
    sceneNumber: v.optional(v.number()),
    externalJobId: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generationJobs", {
      ...args,
      attempts: 1,
    });
  },
});

export const markComplete = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    resultFileId: v.id("_storage"),
  },
  handler: async (ctx, { jobId, resultFileId }) => {
    await ctx.db.patch(jobId, {
      status: "complete",
      resultFileId,
    });
  },
});

export const markFailed = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    error: v.string(),
  },
  handler: async (ctx, { jobId, error }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return;
    await ctx.db.patch(jobId, {
      status: "failed",
      error,
      attempts: job.attempts + 1,
    });
  },
});

export const getByExternalId = internalQuery({
  args: { externalJobId: v.string() },
  handler: async (ctx, { externalJobId }) => {
    return await ctx.db
      .query("generationJobs")
      .withIndex("by_external_id", (q) => q.eq("externalJobId", externalJobId))
      .first();
  },
});
```

**File count:** 1 file, ~70 lines

---

**T3 EXIT CRITERIA:**
- [ ] `campaigns.ts` — create, launch, list, get, getProgress all compile
- [ ] `generationJobs.ts` — CRUD + status tracking compile
- [ ] `launch` mutation successfully starts workflow instances
- [ ] `getProgress` returns real-time status counts

---

## PHASE 3 — Integration (Terminal 1 returns)

### Task 3.1: Integration Smoke Test

1. Start `npx convex dev`
2. Via Convex dashboard or a test script:
   - Create a campaign with 2-3 test prospects
   - Launch the campaign
   - Verify workflow kicks off for each prospect
   - Verify status transitions happen (queued → researching → scripting → ... → complete)
   - Verify stub data flows through (stub research saved, stub script saved)
3. Verify `getProgress` query returns correct counts

### Task 3.2: Seed Data Script (`convex/seedData.ts`)

Create a mutation that seeds the database with realistic demo data:

```typescript
// convex/seedData.ts
import { mutation } from "./_generated/server";

export const seed = mutation({
  handler: async (ctx) => {
    const campaignId = await ctx.db.insert("campaigns", {
      name: "Q1 Fintech Outreach",
      brief: "Focus on compliance pain points and manual process elimination",
      senderName: "Sarah Chen",
      senderCompany: "ProspectClip",
      senderCompanyInfo: "AI-powered personalized sales video platform",
      voiceId: "EXAVITQu4vr4xnSDxMaL", // ElevenLabs default
      status: "draft",
      totalProspects: 5,
      completedProspects: 0,
    });

    const prospects = [
      { name: "John Smith", company: "Stripe", title: "VP of Sales", url: "https://stripe.com" },
      { name: "Emily Johnson", company: "Plaid", title: "Head of Growth", url: "https://plaid.com" },
      { name: "Michael Lee", company: "Brex", title: "SDR Manager", url: "https://brex.com" },
      { name: "Sarah Davis", company: "Ramp", title: "VP of Revenue", url: "https://ramp.com" },
      { name: "David Wilson", company: "Mercury", title: "Sales Director", url: "https://mercury.com" },
    ];

    for (const p of prospects) {
      await ctx.db.insert("prospects", {
        campaignId,
        ...p,
        status: "queued",
      });
    }

    return campaignId;
  },
});
```

### Task 3.3: Handoff Verification

Ensure every function reference that Person 2, 3, and 4 need is exported:

**Person 2 needs (internal mutations to call from their actions):**
- `internal.prospects.saveResearch`
- `internal.prospects.saveSceneAsset`
- `internal.prospects.updateStatus`
- `internal.generationJobs.create`
- `internal.generationJobs.markComplete`
- `internal.generationJobs.markFailed`

**Person 3 needs (internal queries/mutations for agent tools):**
- `internal.prospects.getResearch`
- `internal.prospects.saveScript`
- `internal.prospects.saveThreadId`
- `internal.campaigns.getBrief`

**Person 4 needs (public queries for frontend):**
- `api.campaigns.list`
- `api.campaigns.get`
- `api.campaigns.getProgress`
- `api.campaigns.create`
- `api.campaigns.launch`
- `api.prospects.get`
- `api.prospects.getByCampaign`
- `api.prospects.getByCampaignAndStatus`
- `api.generationJobs.getByProspect`
- `api.files.getUrl`

---

## Complete File Manifest

```
convex/
├── schema.ts              # T1 — Phase 1 (Task 1.2)
├── convex.config.ts       # T1 — Phase 1 (Task 1.3)
├── workflowInit.ts        # T1 — Phase 1 (Task 1.5)
├── files.ts               # T1 — Phase 1 (Task 1.4)
├── workflow.ts            # T2 — Phase 2 (Task 2.2)
├── prospects.ts           # T2 — Phase 2 (Task 2.1)
├── campaigns.ts           # T3 — Phase 2 (Task 3.1)
├── generationJobs.ts      # T3 — Phase 2 (Task 3.2)
├── services.ts            # T2 — Phase 2 (Task 2.3) — stubs for Person 2
├── agents.ts              # T2 — Phase 2 (Task 2.3) — stubs for Person 3
├── seedData.ts            # T1 — Phase 3
└── _generated/            # Auto-generated by Convex
```

**Total: 10 files written by Person 1** (plus auto-generated)

---

## Dependency Graph

```
schema.ts ─────────────────┐
convex.config.ts ──────────┤
workflowInit.ts ───────────┤
files.ts ──────────────────┤
                           ▼
              ┌── T2: prospects.ts ──┐
              │    workflow.ts       │
              │    services.ts (stub)│
              │    agents.ts (stub)  │
              │                      ▼
              │              Integration test
              │                      ▲
              └── T3: campaigns.ts   │
                   generationJobs.ts │
                   ──────────────────┘
```

---

## Notifications & Risks

1. **`getBrief` should be `internalQuery` not `internalMutation`** — the architecture doc shows it as a query in the agent tools. Fix this during implementation.

2. **Workflow import path**: The architecture doc references `internal.services.pollVideoJob` — this is Person 2's responsibility, NOT Person 1's. The stub `services.ts` only needs the 3 actions the workflow directly calls.

3. **`workflow.start()` needs to be called from a mutation** — the `launch` mutation handles this correctly, but be aware the WorkflowManager's `.start()` only works in mutation context.

4. **Schema changes after deploy require migration** — get the schema right in Phase 1. Changes after Persons 2-4 start building will cause friction.

5. **Environment variables** — Person 1 does NOT need any API keys. Only Person 2 (rtrvr, ElevenLabs, MiniMax) needs env vars. But you should create a `.env.local.example` listing them for the team.
