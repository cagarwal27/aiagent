# ProspectClip — AI-Generated Personalized Sales Video at Scale

## One-Line Pitch

"Personalized video outreach gets 3-5x reply rates. But SDRs can't record 50 custom videos a day. ProspectClip researches your prospects, writes scripts, and generates personalized videos — 10 at a time, zero recording."

---

## The Idea in Plain English

### The Problem

Every sales leader knows: personalized video outreach crushes text email. Vidyard, Loom, and HippoVideo all publish the data — 3-5x reply rates. But it doesn't scale.

An SDR sends 50-100 outreach messages per day. Recording a personalized 60-second video per prospect takes 5-10 minutes. That's 4-8 hours of recording per day. Nobody does it.

So sales teams either:
- Send generic text emails (low conversion)
- Record maybe 5 videos for their top prospects (doesn't scale)
- Use template videos with name insertion (feels fake, prospects notice)

**Executive time and SDR time are the bottleneck. The intent is there. The capacity isn't.**

### The Solution

Upload a prospect list. ProspectClip does the rest:

1. **Researches** each prospect's company (what they do, recent news, pain points)
2. **Writes** a personalized script that references their specific situation
3. **Generates** AI narration in a natural voice mentioning them by name
4. **Creates** a video with relevant visuals for each scene
5. **Tracks** all 10+ pipelines simultaneously on a real-time dashboard
6. **Delivers** finished videos ready to embed in outreach emails

No camera. No recording. No editing. Prompt to personalized video.

### The Wedge

**SDR teams at B2B SaaS companies (Series A-C, 10-50 person sales teams)** where:
- Outbound is the primary growth motion
- Deal size is $10K-100K ARR (high enough to justify personalization)
- They already use Vidyard/Loom but can't scale video volume
- Conversion rate improvements translate directly to revenue

Existing market validation: Tavus ($28M raised), HeyGen ($60M), Synthesia ($90M). All require recording a template video first. We generate from scratch.

### Why It Wins the Hackathon

- **Generative AI is the core product** — video + voice + text generation IS the thing, not a side feature
- **Convex is the natural backbone** — 10 parallel multi-step pipelines tracked in real-time is exactly the RunPod/GPU pattern Convex is purpose-built for
- **Every sponsor used deeply** — MiniMax (LLM + video + image), ElevenLabs (voice), rtrvr.ai (research), Speechmatics (voice input), Convex (everything)
- **The demo is visual and visceral** — watch 10 pipelines running simultaneously, assets appearing in real-time, a finished personalized video playing

---

## Sponsor Integration

| Sponsor | Role | How It's Used |
|---------|------|---------------|
| **MiniMax M2.5** | Script writing LLM + video generation + image generation | The @convex-dev/agent brain for research analysis and script writing. Hailuo for video scenes. image-01 for scene stills. |
| **rtrvr.ai** | Prospect research | `/scrape` endpoint fetches prospect company pages, recent news, product info. This is the data the scripts are personalized FROM. |
| **ElevenLabs** | AI narration voice | Flash v2.5 generates the voiceover for each video. Different voice per "sender persona." Prospect name spoken naturally. |
| **Speechmatics** | Voice input (stretch) | Operator can speak campaign briefs instead of typing. "Generate videos for these 5 fintech prospects focusing on compliance pain." |
| **Convex** | Entire backend | Real-time pipeline tracking, durable workflows, file storage for all generated assets, @convex-dev/agent for orchestration, vector search for similar past scripts. |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                          │
│                                                             │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Campaign     │ │ Pipeline     │ │ Video Preview +      │ │
│  │ Manager      │ │ Dashboard    │ │ Asset Gallery         │ │
│  │ (CRUD)       │ │ (real-time)  │ │ (play/download)      │ │
│  └─────────────┘ └──────────────┘ └──────────────────────┘ │
│                                                             │
│  All data via useQuery() — auto-subscribing, zero polling   │
│  Streaming script text via delta streaming                  │
│  Files served via Convex file storage URLs                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ WebSocket (automatic via Convex)
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    CONVEX BACKEND                            │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              DURABLE WORKFLOW ENGINE                    │ │
│  │              (@convex-dev/workflow)                     │ │
│  │                                                        │ │
│  │  Per prospect, runs this pipeline:                     │ │
│  │                                                        │ │
│  │  Step 1: RESEARCH ──→ rtrvr.ai /scrape                │ │
│  │    │     Fetch company page, news, product info        │ │
│  │    │     Store raw research in prospects table         │ │
│  │    ↓     Status: "researching" → "researched"          │ │
│  │                                                        │ │
│  │  Step 2: SCRIPT ──→ @convex-dev/agent + MiniMax M2.5  │ │
│  │    │     Agent analyzes research, writes 3-4 scenes    │ │
│  │    │     Delta-streamed to UI as it generates          │ │
│  │    ↓     Status: "scripting" → "scripted"              │ │
│  │                                                        │ │
│  │  Step 3: VOICE ──→ ElevenLabs TTS                     │ │
│  │    │     Generate narration per scene                  │ │
│  │    │     Store audio files in Convex file storage      │ │
│  │    ↓     Status: "generating_voice" → "voice_ready"    │ │
│  │                                                        │ │
│  │  Step 4: VISUALS ──→ MiniMax image-01 + Hailuo video  │ │
│  │    │     Generate scene images → animate to video      │ │
│  │    │     Poll for completion via scheduled functions    │ │
│  │    │     Store video files in Convex file storage      │ │
│  │    ↓     Status: "generating_video" → "video_ready"    │ │
│  │                                                        │ │
│  │  Step 5: ASSEMBLE                                      │ │
│  │          Combine voice + video references              │ │
│  │          Status: "complete"                             │ │
│  │          Final video playable from dashboard           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           @convex-dev/agent (SCRIPT AGENT)             │ │
│  │                                                        │ │
│  │  LLM: MiniMax M2.5 (via createOpenAI custom baseURL)  │ │
│  │  Thread: persistent per prospect (reusable for edits)  │ │
│  │  Embedding: text-embedding for vector search           │ │
│  │  Tools:                                                │ │
│  │    - getProspectResearch (query: read prospect data)   │ │
│  │    - getCampaignBrief (query: read campaign config)    │ │
│  │    - getCompanyContext (query: read sender company)     │ │
│  │    - getSimilarScripts (vector search past scripts)    │ │
│  │    - saveScript (mutation: persist generated script)    │ │
│  │  Delta streaming: script text streams to UI live       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    DATA TABLES                         │ │
│  │                                                        │ │
│  │  campaigns     — name, brief, sender persona, status   │ │
│  │  prospects     — name, company, url, research data     │ │
│  │  scripts       — prospect ref, scenes[], full text     │ │
│  │  generationJobs — type, status, externalId, fileId     │ │
│  │  assets        — storageId, type (voice/video/image)   │ │
│  │  + @convex-dev/agent internal tables (threads, msgs)   │ │
│  │  + @convex-dev/workflow internal tables (journal)       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              EXTERNAL API ACTIONS                      │ │
│  │                                                        │ │
│  │  scrapeProspect   — rtrvr.ai /scrape → research data  │ │
│  │  generateVoice    — ElevenLabs TTS → audio file       │ │
│  │  generateImage    — MiniMax image-01 → image file     │ │
│  │  generateVideo    — MiniMax Hailuo → video file       │ │
│  │  pollVideoStatus  — scheduled fn, checks completion   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Campaign: a batch of prospects to generate videos for
  campaigns: defineTable({
    name: v.string(),                    // "Q1 Fintech Outreach"
    brief: v.string(),                   // what to emphasize, pain points to target
    senderName: v.string(),              // "Sarah from Acme"
    senderCompany: v.string(),           // company context for scripts
    senderCompanyInfo: v.string(),       // product/value prop details
    voiceId: v.string(),                 // ElevenLabs voice ID for narration
    status: v.string(),                  // "draft" | "running" | "completed"
    totalProspects: v.number(),
    completedProspects: v.number(),
  }).index("by_status", ["status"]),

  // Prospect: one person to generate a video for
  prospects: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),                    // "John Smith"
    company: v.string(),                 // "Stripe"
    title: v.optional(v.string()),       // "VP of Engineering"
    url: v.string(),                     // company URL for research
    email: v.optional(v.string()),

    // Pipeline status
    status: v.string(),
    // "queued" → "researching" → "scripting" → "generating_voice"
    // → "generating_visuals" → "assembling" → "complete" → "failed"

    // Research output (from rtrvr.ai)
    researchData: v.optional(v.string()),

    // Script output (from agent)
    scriptThreadId: v.optional(v.string()),  // @convex-dev/agent thread
    script: v.optional(v.object({
      scenes: v.array(v.object({
        sceneNumber: v.number(),
        narration: v.string(),           // voiceover text for this scene
        visualPrompt: v.string(),        // image/video generation prompt
        durationSeconds: v.number(),
      })),
      fullNarration: v.string(),         // complete voiceover text
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
    externalJobId: v.optional(v.string()), // MiniMax task ID, etc.
    resultFileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    attempts: v.number(),
  })
    .index("by_prospect", ["prospectId"])
    .index("by_status", ["status"])
    .index("by_external_id", ["externalJobId"]),
});
```

---

## Convex Features Used (Why This Wins "Best Use of Convex")

| Feature | How It's Used | Why It Matters |
|---------|--------------|----------------|
| **@convex-dev/agent** | Script-writing agent with tools, persistent threads, vector search for similar past scripts | Core of the AI experience — not just API calls, a real agent with memory |
| **Durable workflows** | Each prospect's 5-step pipeline (research → script → voice → video → assemble) survives crashes, retries on failure | 10 concurrent workflows running simultaneously is the hero demo moment |
| **Real-time queries** | Dashboard auto-updates as each prospect moves through pipeline stages. Zero polling, zero WebSocket code. | The audience SEES pipelines progressing live — this is what makes the demo land |
| **File storage** | Every generated asset (audio, images, video clips) stored in Convex, referenced by ID in the database | Files appear in the UI the instant they're stored — reactive file serving |
| **Delta streaming** | Script text streams to the UI word-by-word as the agent writes it | The audience watches a personalized script being written live |
| **Scheduled functions** | Poll MiniMax Hailuo for video completion every 15 seconds | Async video generation tracked without blocking — Convex handles the polling loop |
| **ACID mutations** | Status transitions are atomic — "researching" → "scripted" with script data in one transaction | No torn state. Dashboard never shows inconsistent data. |
| **Vector search** | Find past scripts for similar companies/industries to improve new scripts | Agent learns from history — "write like the script that worked for a similar fintech company" |
| **HTTP actions** | Webhook endpoint for campaign triggers, API for future integrations | Extensible — could connect to CRM triggers |

**9 Convex features used naturally.** Not bolted on. Each one solves a real problem in the pipeline.

---

## How MiniMax Video Generation Works with Convex

MiniMax Hailuo is async — you submit a job, poll for completion, then download the result. This maps perfectly to Convex's scheduled function pattern:

```
1. Action: Call MiniMax Hailuo API to start video generation
   ↓ Returns task_id
2. Mutation: Store task_id in generationJobs table with status "processing"
   ↓ Schedule a polling function
3. Scheduled action (every 15s): Call MiniMax to check task_id status
   ↓ If still processing: reschedule. If done: continue.
4. Action: Download completed video from MiniMax
   ↓ Store in Convex file storage
5. Mutation: Update generationJobs with resultFileId, status "complete"
   ↓ Update prospect's sceneAssets with the new video file
6. UI: Reactively shows the new video thumbnail (zero code for this)
```

This is the RunPod/GPU pattern. The frontend subscribes to the `prospects` table. When the mutation in step 5 fires, every connected client instantly sees the video appear. No WebSocket code. No polling from the client. Convex handles it.

---

## Video Structure Per Prospect

Each personalized video has 3-4 scenes (~60 seconds total):

| Scene | Duration | Narration (ElevenLabs) | Visual (MiniMax) |
|-------|----------|----------------------|------------------|
| **1. Hook** | 10-15s | "Hi [Name], I noticed [Company] is [specific thing from research]..." | Generated image/video of their industry/product |
| **2. Pain** | 15-20s | "Most [their role] struggle with [pain point from research]..." | Visual representing the problem |
| **3. Solution** | 15-20s | "At [Sender Company], we [value prop relevant to their pain]..." | Visual of the solution/product |
| **4. CTA** | 5-10s | "I'd love to show you how this works for [Company]. [CTA]" | Clean branded closing frame |

The script agent writes ALL of this — narration text AND visual prompts — personalized from the research data.

---

## Team Split (4 People, 4 Domains)

### Person 1: Convex Core (Backend Architect)

**Owns:** Schema, workflows, mutations, queries — the data backbone.

```
convex/
├── schema.ts                    # All table definitions
├── convex.config.ts             # Component registration (agent, workflow)
├── campaigns.ts                 # Campaign CRUD mutations + queries
├── prospects.ts                 # Prospect CRUD + status queries
├── workflow.ts                  # Durable workflow: the 5-step pipeline
├── generationJobs.ts            # Job tracking mutations + status queries
└── _generated/                  # Auto-generated types
```

**Key deliverables:**
- Schema design (the source of truth for all team members)
- The durable workflow that orchestrates the entire pipeline per prospect
- Campaign launch mutation (creates prospects, kicks off N parallel workflows)
- Real-time queries: `getProspectsByStatus`, `getCampaignProgress`, `getJobsForProspect`
- Status transition logic (queued → researching → scripting → ...)

**The workflow is the most important piece of code in the project:**

```typescript
// convex/workflow.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";

const wf = new WorkflowManager(components.workflow);

export const prospectPipeline = wf.define({
  args: { prospectId: v.id("prospects"), campaignId: v.id("campaigns") },
  handler: async (step, { prospectId, campaignId }) => {

    // Step 1: Research
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId, status: "researching"
    });
    const research = await step.runAction(internal.services.scrapeProspect, {
      prospectId
    });

    // Step 2: Script (via agent)
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId, status: "scripting"
    });
    await step.runAction(internal.agents.writeScript, {
      prospectId, campaignId
    });

    // Step 3: Voice generation
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId, status: "generating_voice"
    });
    await step.runAction(internal.services.generateAllVoice, {
      prospectId
    });

    // Step 4: Visual generation (async — kicks off jobs, polls)
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId, status: "generating_visuals"
    });
    await step.runAction(internal.services.generateAllVisuals, {
      prospectId
    });

    // Step 5: Mark complete
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId, status: "complete"
    });
  },
});
```

**Dependencies on others:**
- Person 2 implements the actions this workflow calls (`scrapeProspect`, `generateAllVoice`, `generateAllVisuals`)
- Person 3 implements the agent action (`writeScript`)
- Person 4 subscribes to the queries this exposes

---

### Person 2: Generation Engine (API Integrations)

**Owns:** All external API calls — rtrvr.ai, ElevenLabs, MiniMax video/image. The "hands" of the system.

```
convex/
├── services/
│   ├── rtrvr.ts                 # rtrvr.ai /scrape integration
│   ├── elevenlabs.ts            # ElevenLabs TTS — per-scene voice generation
│   ├── minimax_video.ts         # MiniMax Hailuo — video generation + polling
│   ├── minimax_image.ts         # MiniMax image-01 — scene stills
│   └── minimax_music.ts         # MiniMax Music-2.5 (stretch goal)
```

**Key deliverables:**

**rtrvr.ai research action:**
```typescript
// convex/services/rtrvr.ts
export const scrapeProspect = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    const prospect = await ctx.runQuery(internal.prospects.get, { prospectId });

    const response = await fetch("https://api.rtrvr.ai/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RTRVR_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: `Extract company description, what they do, recent news,
                key products, and any pain points or challenges mentioned`,
        urls: [prospect.url],
        response: { verbosity: "final", max_inline_output_bytes: 100000 },
      }),
    });

    const data = await response.json();

    await ctx.runMutation(internal.prospects.saveResearch, {
      prospectId,
      researchData: JSON.stringify(data.result),
    });
  },
});
```

**ElevenLabs voice generation:**
```typescript
// convex/services/elevenlabs.ts
export const generateSceneVoice = internalAction({
  args: {
    prospectId: v.id("prospects"),
    sceneNumber: v.number(),
    narrationText: v.string(),
    voiceId: v.string(),
  },
  handler: async (ctx, { prospectId, sceneNumber, narrationText, voiceId }) => {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: narrationText,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.2,
          },
        }),
      }
    );

    const audioBlob = await response.blob();
    const storageId = await ctx.storage.store(audioBlob);

    await ctx.runMutation(internal.prospects.saveSceneAsset, {
      prospectId,
      sceneNumber,
      type: "voice",
      fileId: storageId,
    });
  },
});
```

**MiniMax video generation (async with polling):**
```typescript
// convex/services/minimax_video.ts
export const startVideoGeneration = internalAction({
  args: {
    prospectId: v.id("prospects"),
    sceneNumber: v.number(),
    prompt: v.string(),
  },
  handler: async (ctx, { prospectId, sceneNumber, prompt }) => {
    // Start async video generation
    const response = await fetch("https://api.minimax.io/v1/video_generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "video-01",
        prompt: prompt,
      }),
    });
    const data = await response.json();
    const taskId = data.task_id;

    // Store job reference
    const jobId = await ctx.runMutation(internal.generationJobs.create, {
      prospectId,
      type: "video",
      sceneNumber,
      externalJobId: taskId,
      status: "processing",
    });

    // Schedule polling (check every 15 seconds)
    await ctx.scheduler.runAfter(15000, internal.services.pollVideoJob, {
      jobId, taskId
    });
  },
});

export const pollVideoJob = internalAction({
  args: { jobId: v.id("generationJobs"), taskId: v.string() },
  handler: async (ctx, { jobId, taskId }) => {
    const statusResponse = await fetch(
      `https://api.minimax.io/v1/query/video_generation?task_id=${taskId}`,
      {
        headers: { "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}` },
      }
    );
    const statusData = await statusResponse.json();

    if (statusData.status === "Success") {
      // Download the video
      const videoResponse = await fetch(statusData.file_id);
      const videoBlob = await videoResponse.blob();
      const storageId = await ctx.storage.store(videoBlob);

      // Update job and prospect
      await ctx.runMutation(internal.generationJobs.markComplete, {
        jobId, resultFileId: storageId
      });
    } else if (statusData.status === "Failed") {
      await ctx.runMutation(internal.generationJobs.markFailed, {
        jobId, error: statusData.error || "Video generation failed"
      });
    } else {
      // Still processing — poll again in 15 seconds
      await ctx.scheduler.runAfter(15000, internal.services.pollVideoJob, {
        jobId, taskId
      });
    }
  },
});
```

**Dependencies on others:**
- Person 1 provides the mutation functions (`saveResearch`, `saveSceneAsset`, `createJob`, `markComplete`)
- Person 3 provides the script (the narration text and visual prompts come from the agent)
- Person 4 displays the generated assets via file storage URLs

---

### Person 3: Script Agent (AI Brain)

**Owns:** The @convex-dev/agent that researches prospects and writes personalized video scripts. The "brain."

```
convex/
├── agents/
│   ├── scriptAgent.ts           # Agent definition + tools
│   ├── writeScript.ts           # Action: run agent for a prospect
│   └── tools.ts                 # Agent tools (DB reads, vector search)
```

**Key deliverables:**

**Agent definition with MiniMax:**
```typescript
// convex/agents/scriptAgent.ts
import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const minimax = createOpenAI({
  name: "minimax",
  baseURL: "https://api.minimax.io/v1",
  apiKey: process.env.MINIMAX_API_KEY!,
});

// Tools the agent can use
const getProspectResearch = createTool({
  description: "Get the research data collected about a prospect's company",
  args: z.object({ prospectId: z.string() }),
  handler: async (ctx, { prospectId }) => {
    return await ctx.runQuery(internal.prospects.getResearch, { prospectId });
  },
});

const getCampaignBrief = createTool({
  description: "Get the campaign brief including sender info and messaging focus",
  args: z.object({ campaignId: z.string() }),
  handler: async (ctx, { campaignId }) => {
    return await ctx.runQuery(internal.campaigns.getBrief, { campaignId });
  },
});

const getSimilarScripts = createTool({
  description: "Search for past scripts written for similar companies or industries to use as reference",
  args: z.object({
    query: z.string().describe("Description of the company/industry to find similar scripts for"),
  }),
  handler: async (ctx, { query }) => {
    // Vector search over past agent messages (scripts)
    // @convex-dev/agent provides this automatically via thread message embeddings
    return await ctx.runQuery(internal.agents.searchPastScripts, { query });
  },
});

const saveScript = createTool({
  description: "Save the finalized script for a prospect",
  args: z.object({
    prospectId: z.string(),
    scenes: z.array(z.object({
      sceneNumber: z.number(),
      narration: z.string().describe("The voiceover text for this scene"),
      visualPrompt: z.string().describe("A detailed prompt for generating the visual/video for this scene"),
      durationSeconds: z.number(),
    })),
  }),
  handler: async (ctx, { prospectId, scenes }) => {
    const fullNarration = scenes.map(s => s.narration).join(" ");
    await ctx.runMutation(internal.prospects.saveScript, {
      prospectId,
      script: { scenes, fullNarration },
    });
    return { saved: true, sceneCount: scenes.length };
  },
});

export const scriptAgent = new Agent(components.agent, {
  name: "Script Writer",
  languageModel: minimax.chat("MiniMax-M2.5"),
  textEmbeddingModel: minimax.embedding("text-embedding-3-small"), // or OpenAI
  instructions: `You are a world-class sales video scriptwriter.

Your job: write a personalized 60-second sales video script for a prospect.

Process:
1. First, retrieve the prospect's research data and the campaign brief
2. Optionally, search for similar past scripts to maintain quality
3. Write a 3-4 scene script that:
   - Opens with a specific hook referencing something about THEIR company
   - Identifies a pain point relevant to their role/industry
   - Positions the sender's product as the solution to that specific pain
   - Ends with a clear, low-friction CTA
4. For each scene, write both the narration text AND a visual prompt
5. Save the script using the saveScript tool

Rules:
- Keep total narration under 150 words (60 seconds of speech)
- Each scene should be 10-20 seconds
- Reference the prospect's company BY NAME in scene 1
- Visual prompts should be descriptive enough for AI image/video generation
- Tone: professional but warm, not salesy or pushy`,
  tools: { getProspectResearch, getCampaignBrief, getSimilarScripts, saveScript },
  maxSteps: 8,
});
```

**The action that runs the agent (called by the workflow):**
```typescript
// convex/agents/writeScript.ts
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { scriptAgent } from "./scriptAgent";

export const writeScript = internalAction({
  args: { prospectId: v.id("prospects"), campaignId: v.id("campaigns") },
  handler: async (ctx, { prospectId, campaignId }) => {
    // Create a persistent thread for this prospect
    const { thread, threadId } = await scriptAgent.createThread(ctx, {
      title: `Script for prospect ${prospectId}`,
    });

    // Save thread reference to prospect
    await ctx.runMutation(internal.prospects.saveThreadId, {
      prospectId, threadId,
    });

    // Run the agent with delta streaming (script streams to UI live)
    await thread.streamText(
      {
        prompt: `Write a personalized sales video script for prospect ${prospectId} in campaign ${campaignId}. Start by fetching the research data and campaign brief.`,
      },
      {
        saveStreamDeltas: true,
        chunking: "word",
        throttleMs: 100,
      }
    );
  },
});
```

**Vector search for similar scripts:**
```typescript
// convex/agents/tools.ts
export const searchPastScripts = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    // This leverages @convex-dev/agent's built-in vector search
    // over past thread messages (scripts are stored as messages)
    // The agent framework handles embedding + search automatically
    // We just need to expose it as a queryable function
    // ... implementation depends on agent's context search API
  },
});
```

**Dependencies on others:**
- Person 1 provides the workflow that calls `writeScript`
- Person 2 provides nothing — Person 3 is upstream of Person 2 (scripts must exist before voice/video generation)
- Person 4 subscribes to delta streaming to show script being written live

---

### Person 4: Frontend (Dashboard + Demo)

**Owns:** Everything the audience sees. React app with Convex real-time subscriptions.

```
src/
├── App.tsx                      # Routing, Convex provider
├── pages/
│   ├── CampaignList.tsx         # List of campaigns
│   ├── CampaignView.tsx         # Single campaign — prospect grid
│   └── ProspectDetail.tsx       # Deep dive into one prospect's pipeline
├── components/
│   ├── ProspectCard.tsx         # Status badge, progress indicator
│   ├── PipelineTracker.tsx      # Step-by-step visual (research → script → ...)
│   ├── ScriptStream.tsx         # Live-streaming script text (delta streaming)
│   ├── AssetGallery.tsx         # Generated voice/image/video previews
│   ├── VideoPlayer.tsx          # Play assembled final video
│   ├── CampaignStats.tsx        # Aggregate stats: N complete, N in progress
│   └── CreateCampaign.tsx       # Form: campaign name, brief, prospects
├── hooks/
│   ├── useCampaign.ts           # useQuery wrappers
│   └── useProspect.ts           # useQuery + streaming hooks
└── lib/
    └── convex.ts                # Convex client setup
```

**Key components:**

**Campaign view — the hero screen:**
```tsx
// src/pages/CampaignView.tsx
function CampaignView({ campaignId }) {
  // Auto-subscribing — updates in real-time as prospects progress
  const prospects = useQuery(api.prospects.getByCampaign, { campaignId });
  const campaign = useQuery(api.campaigns.get, { campaignId });

  return (
    <div>
      <CampaignStats campaign={campaign} />
      <div className="grid grid-cols-3 gap-4">
        {prospects?.map((p) => (
          <ProspectCard key={p._id} prospect={p} />
        ))}
      </div>
    </div>
  );
}
```

**Prospect card — shows pipeline progress in real-time:**
```tsx
// src/components/ProspectCard.tsx
function ProspectCard({ prospect }) {
  const steps = [
    { key: "researching", label: "Research" },
    { key: "scripting", label: "Script" },
    { key: "generating_voice", label: "Voice" },
    { key: "generating_visuals", label: "Video" },
    { key: "complete", label: "Done" },
  ];

  return (
    <div className="border rounded-lg p-4">
      <h3>{prospect.name}</h3>
      <p className="text-sm text-gray-500">{prospect.company}</p>
      <PipelineTracker steps={steps} currentStatus={prospect.status} />
      {prospect.status === "complete" && (
        <VideoPlayer fileId={prospect.sceneAssets?.[0]?.videoFileId} />
      )}
    </div>
  );
}
```

**Script streaming — delta streaming from agent:**
```tsx
// src/components/ScriptStream.tsx
import { useUIMessages, useSmoothText } from "@convex-dev/agent/react";

function ScriptStream({ threadId }) {
  const messages = useUIMessages(
    api.agents.listMessages,
    { threadId },
    { stream: true }
  );

  const latestAssistant = messages
    .filter(m => m.role === "assistant")
    .pop();

  if (!latestAssistant) return <p>Waiting for script...</p>;

  return <SmoothText
    text={latestAssistant.text}
    startStreaming={latestAssistant.status === "streaming"}
    charsPerSec={60}
  />;
}
```

**File serving — Convex storage URLs:**
```tsx
function VideoPlayer({ fileId }) {
  // Convex generates a URL for the stored file
  const url = useQuery(api.files.getUrl, fileId ? { fileId } : "skip");
  if (!url) return <div className="animate-pulse bg-gray-200 h-48" />;
  return <video src={url} controls className="rounded-lg" />;
}
```

**Dependencies on others:**
- Person 1 provides all the queries (`getCampaign`, `getProspects`, `getCampaignProgress`)
- Person 3 provides the agent message listing for script streaming
- Person 2 provides file storage IDs that resolve to playable URLs

---

## How the Demo Runs (3-4 Minutes)

### Setup (before presentation)
- Pre-create a campaign with 5 prospects targeting real companies (use a judge's company if possible)
- Start 3 of the 5 pipelines 5 minutes before presenting so some are partially complete

### Live demo flow

**1. Show the dashboard (30s)**
"This is ProspectClip. We have a campaign targeting 5 fintech companies. Watch what's happening."

Dashboard shows: 2 prospects complete (green), 1 generating video (progress bar moving), 2 queued.

**2. Click into a completed prospect (30s)**
Show the full pipeline: research data → generated script → voice narration (play it) → video scenes → final assembled video. Play the video. The audience hears an AI voice saying "Hi [Real Name], I noticed [Real Company] just [real thing from their website]..."

**3. Click into an in-progress prospect (30s)**
Show real-time: the script is streaming word-by-word (delta streaming). A voice file just appeared (file storage URL resolves). Video generation is at 60% (polling via scheduled function). The audience watches it progress.

**4. Launch a new prospect LIVE (60s)**
"Let's add a new prospect right now." Type in a company name + URL. Hit generate. The audience watches:
- Status: "queued" → "researching" (rtrvr.ai scraping)
- Status: "researching" → "scripting" (script text starts streaming)
- The script appears word by word on screen
- This is the Convex magic moment — zero polling, zero refresh, just reactive data

**5. Show campaign stats (15s)**
"3 complete, 1 generating, 1 just started. 50 minutes ago this campaign had zero videos. Now we have 3 ready to send."

**6. The pitch (30s)**
"Personalized video gets 3-5x reply rates but nobody can scale it. We just generated 5 custom sales videos from a prospect list. No camera. No recording. No editing. That's ProspectClip."

### Demo timing for video generation
MiniMax Hailuo takes 1-5 minutes per clip. For the demo:
- Pre-generated prospects handle the "show finished product" moment
- The live-launched prospect shows the real-time pipeline (research + script are fast, video is in progress when demo ends)
- The video generation being slow is GOOD — it shows the real-time tracking working: "See how the dashboard updates as each scene completes? That's Convex reactive queries. Zero polling."

---

## API Keys Required

| Service | Env Variable | Where to Get |
|---------|-------------|--------------|
| MiniMax | `MINIMAX_API_KEY` | [platform.minimax.io](https://platform.minimax.io) |
| rtrvr.ai | `RTRVR_API_KEY` | [rtrvr.ai/cloud?view=api-keys](https://www.rtrvr.ai/cloud?view=api-keys) |
| ElevenLabs | `ELEVENLABS_API_KEY` | [elevenlabs.io/app/settings](https://elevenlabs.io/app/settings) |
| Speechmatics | `SPEECHMATICS_API_KEY` | [portal.speechmatics.com](https://portal.speechmatics.com) |

Convex doesn't need a separate key — it's the hosting platform.

---

## What Makes This Defensible as a Pitch

"Tavus, HeyGen, and Synthesia all require you to RECORD a template video. You sit in front of a camera, read a script, and the AI personalizes the name insertion. ProspectClip generates everything from scratch — script, voice, visuals — personalized from actual research about the prospect's company. Zero recording. That's a fundamentally different product."

When a judge asks "how is this different from HeyGen?":
**"HeyGen is a video editing tool with AI features. We're an AI research-to-video pipeline. The input is a company URL, not a recording. The output is a video that references things only someone who researched the prospect would know."**
