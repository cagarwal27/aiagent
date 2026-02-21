# Vimero — AI-Generated Personalized Sales Video at Scale

## One-Line Pitch

"Personalized video outreach gets 3-5x reply rates. But SDRs can't record 50 custom videos a day. Vimero researches your prospects, writes scripts, and generates personalized videos — 10 at a time, zero recording."

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

Upload a prospect list. Vimero does the rest:

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
| **MiniMax M2.5** | Script writing LLM + image generation (+ video stretch goal) | The @convex-dev/agent brain for research analysis and script writing. image-01 for scene visuals (fast, seconds). Hailuo video as stretch goal. |
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
│  │  Step 4: VISUALS ──→ MiniMax image-01                  │ │
│  │    │     Generate scene images (fast — seconds each)   │ │
│  │    │     Store image files in Convex file storage      │ │
│  │    ↓     Status: "generating_visuals" → "complete"     │ │
│  │                                                        │ │
│  │  NO "ASSEMBLE" STEP — the frontend IS the compositor.  │ │
│  │  It plays scene images in sequence synced with audio.  │ │
│  │  The "video" is a browser-based narrated slideshow.    │ │
│  │                                                        │ │
│  │  STRETCH: Hailuo video clips (async, 1-5 min each)    │ │
│  │  If time permits, generate video from images.          │ │
│  │  Poll via scheduled functions. Replace static images.  │ │
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
│  │  generateVideo    — MiniMax Hailuo (STRETCH GOAL)     │ │
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
    // → "generating_visuals" → "complete" → "failed"
    // NO "assembling" step — the frontend plays assets in sequence

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

    // Generated assets (per-scene)
    sceneAssets: v.optional(v.array(v.object({
      sceneNumber: v.number(),
      imageFileId: v.optional(v.id("_storage")),  // MiniMax image-01 (primary)
      videoFileId: v.optional(v.id("_storage")),  // MiniMax Hailuo (stretch goal)
      voiceFileId: v.optional(v.id("_storage")),  // ElevenLabs per-scene audio
    }))),
    // No finalVideoUrl — the frontend plays scenes in sequence with synced audio

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
| **Durable workflows** | Each prospect's 4-step pipeline (research → script → voice → images) survives crashes, retries on failure | 10 concurrent workflows running simultaneously is the hero demo moment |
| **Real-time queries** | Dashboard auto-updates as each prospect moves through pipeline stages. Zero polling, zero WebSocket code. | The audience SEES pipelines progressing live — this is what makes the demo land |
| **File storage** | Every generated asset (audio, images, video clips) stored in Convex, referenced by ID in the database | Files appear in the UI the instant they're stored — reactive file serving |
| **Delta streaming** | Script text streams to the UI word-by-word as the agent writes it | The audience watches a personalized script being written live |
| **Scheduled functions** | (Stretch) Poll MiniMax Hailuo for video clip completion every 15s. Also: scheduled campaign health checks. | Async generation tracked without blocking — Convex handles the polling loop |
| **ACID mutations** | Status transitions are atomic — "researching" → "scripted" with script data in one transaction | No torn state. Dashboard never shows inconsistent data. |
| **Vector search** | Find past scripts for similar companies/industries to improve new scripts | Agent learns from history — "write like the script that worked for a similar fintech company" |
| **HTTP actions** | Webhook endpoint for campaign triggers, API for future integrations | Extensible — could connect to CRM triggers |

**9 Convex features used naturally.** Not bolted on. Each one solves a real problem in the pipeline.

---

## How the "Video" Actually Works (Honest Version)

### The reality of AI video generation

MiniMax Hailuo generates 5-10 second video clips. They look like AI art — cinematic, stylized, abstract. They do NOT look like polished sales videos. Each clip takes 1-5 minutes and has a 5 RPM rate limit. Compositing audio onto video requires ffmpeg, which doesn't run in Convex actions.

### What we actually build: a narrated slideshow

The "video" is a **frontend-rendered presentation** that plays scene images in sequence with synced voiceover audio. The browser IS the compositor. No ffmpeg. No server-side rendering.

This is what most AI video tools actually do under the hood — Synthesia's "videos" are animated images with synced audio. The composition happens in the player.

```
Per scene:
  MiniMax image-01 → generates scene image (2-5 seconds, synchronous)
  ElevenLabs TTS → generates scene voiceover (5-10 seconds, synchronous)
  Both stored in Convex file storage

Frontend playback:
  Scene 1 image displays → Scene 1 audio plays → (scene duration elapses)
  Scene 2 image fades in → Scene 2 audio plays → ...
  Scene 3 image fades in → Scene 3 audio plays → ...
  Scene 4 image fades in → Scene 4 audio plays → end
```

### Why images, not video clips

| | MiniMax image-01 | MiniMax Hailuo video |
|---|---|---|
| Speed | **2-5 seconds** | 1-5 minutes |
| Rate limit | 10 RPM | 5 RPM |
| Compositing | None needed (frontend displays image) | Requires ffmpeg to overlay audio |
| Quality | High (good for stylized scenes) | High but abstract/artistic |
| Demo reliability | Very high (synchronous, fast) | Risky (async, slow, may fail) |

Image generation is fast enough to run LIVE in the demo. Video generation is not.

### Stretch goal: Hailuo video clips

If time permits, after images are generated, kick off Hailuo video generation for each scene in the background. Uses the async polling pattern:

```
1. Action: Call MiniMax Hailuo with scene image → get task_id
2. Mutation: Store task_id in generationJobs table
3. Scheduled function (every 15s): Poll for completion
4. When done: Download video, store in Convex file storage
5. Mutation: Update sceneAssets.videoFileId
6. Frontend: Reactively swaps static image for video clip
```

The upgrade from image → video happens seamlessly in the UI. But images are the MVP. Video clips are gravy.

---

## Video Structure Per Prospect

Each personalized "video" has 3 scenes (~45-60 seconds total):

| Scene | Duration | Narration (ElevenLabs) | Visual (MiniMax image-01) |
|-------|----------|----------------------|--------------------------|
| **1. Hook** | 10-15s | "Hi [Name], I noticed [Company] is [specific thing from research]..." | Generated image: their industry, a visual related to their product |
| **2. Pain + Solution** | 20-25s | "Teams like yours often struggle with [pain]. At [Sender], we [solution]..." | Generated image: visual representing the transformation |
| **3. CTA** | 10-15s | "I'd love to show you how this works for [Company]. [CTA]" | Generated image: clean branded closing with company names |

The script agent writes ALL of this — narration text AND image generation prompts — personalized from the rtrvr.ai research data. 3 scenes keeps generation fast (~30 seconds for all images + voice) while still telling a complete story.

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

    // Step 4: Image generation (fast — seconds per image via image-01)
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId, status: "generating_visuals"
    });
    await step.runAction(internal.services.generateAllImages, {
      prospectId
    });

    // Mark complete — frontend can now play the narrated slideshow
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId, status: "complete"
    });

    // STRETCH: Kick off Hailuo video generation in background
    // This upgrades static images to video clips asynchronously
    // await step.runAction(internal.services.startVideoUpgrades, {
    //   prospectId
    // });
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
│   ├── minimax_image.ts         # MiniMax image-01 — scene visuals (PRIMARY)
│   ├── minimax_video.ts         # MiniMax Hailuo — video clips (STRETCH GOAL)
│   └── minimax_music.ts         # MiniMax Music-2.5 (STRETCH GOAL)
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

**MiniMax image generation (PRIMARY — fast, synchronous):**
```typescript
// convex/services/minimax_image.ts
export const generateSceneImage = internalAction({
  args: {
    prospectId: v.id("prospects"),
    sceneNumber: v.number(),
    prompt: v.string(),
  },
  handler: async (ctx, { prospectId, sceneNumber, prompt }) => {
    const response = await fetch("https://api.minimax.io/v1/image_generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "image-01",
        prompt: prompt,
      }),
    });
    const data = await response.json();

    // Download the image
    const imageResponse = await fetch(data.data.image_url);
    const imageBlob = await imageResponse.blob();
    const storageId = await ctx.storage.store(imageBlob);

    // Save to prospect's scene assets
    await ctx.runMutation(internal.prospects.saveSceneAsset, {
      prospectId,
      sceneNumber,
      type: "image",
      fileId: storageId,
    });
  },
});

// Generate all scene images for a prospect (called by workflow)
export const generateAllImages = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    const prospect = await ctx.runQuery(internal.prospects.get, { prospectId });
    const scenes = prospect.script!.scenes;

    // Generate images for each scene (sequential to respect rate limits)
    for (const scene of scenes) {
      await generateSceneImage(ctx, {
        prospectId,
        sceneNumber: scene.sceneNumber,
        prompt: scene.visualPrompt,
      });
    }
  },
});
```

**MiniMax Hailuo video (STRETCH GOAL — async with polling):**
```typescript
// convex/services/minimax_video.ts
// Only implement if images are working and time permits.
// Upgrades static scene images to short video clips.
// Uses the async polling pattern:
//   1. Submit image → Hailuo image-to-video
//   2. Store task_id in generationJobs
//   3. Scheduled function polls every 15s
//   4. On completion: download, store in file storage
//   5. Update sceneAssets.videoFileId
//   6. Frontend reactively swaps image for video
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
│   ├── NarratedSlideshow.tsx    # Play scenes as narrated slideshow (images + audio)
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
    { key: "generating_visuals", label: "Images" },
    { key: "complete", label: "Ready" },
  ];

  return (
    <div className="border rounded-lg p-4">
      <h3>{prospect.name}</h3>
      <p className="text-sm text-gray-500">{prospect.company}</p>
      <PipelineTracker steps={steps} currentStatus={prospect.status} />
      {prospect.status === "complete" && (
        <NarratedSlideshow prospect={prospect} />
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

**Narrated slideshow — the frontend IS the video compositor:**
```tsx
// src/components/NarratedSlideshow.tsx
// This is the "video player" — it plays scene images in sequence
// synced with per-scene voiceover audio. No ffmpeg. No server rendering.
function NarratedSlideshow({ prospect }) {
  const [currentScene, setCurrentScene] = useState(0);
  const scenes = prospect.script.scenes;
  const assets = prospect.sceneAssets;

  // Get Convex file URLs for current scene
  const imageUrl = useQuery(api.files.getUrl,
    assets?.[currentScene]?.imageFileId
      ? { fileId: assets[currentScene].imageFileId }
      : "skip"
  );
  const audioUrl = useQuery(api.files.getUrl,
    assets?.[currentScene]?.voiceFileId
      ? { fileId: assets[currentScene].voiceFileId }
      : "skip"
  );

  // When audio ends, advance to next scene
  const handleAudioEnd = () => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene(prev => prev + 1);
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      {/* Scene image with fade transition */}
      <img
        src={imageUrl}
        className="w-full h-full object-cover transition-opacity duration-500"
      />

      {/* Narration text overlay (subtitles) */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 p-4">
        <p className="text-white text-sm">{scenes[currentScene]?.narration}</p>
      </div>

      {/* Audio player (hidden, auto-plays) */}
      {audioUrl && (
        <audio
          src={audioUrl}
          autoPlay
          onEnded={handleAudioEnd}
        />
      )}

      {/* Scene indicator dots */}
      <div className="absolute top-2 right-2 flex gap-1">
        {scenes.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${
            i === currentScene ? "bg-white" : "bg-white/40"
          }`} />
        ))}
      </div>
    </div>
  );
}
```

This plays like a video to the audience — image fades in, voiceover plays, subtitles show, advances to next scene automatically. No pre-rendering needed.

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
"This is Vimero. We have a campaign targeting 5 fintech companies. Watch what's happening."

Dashboard shows: 2 prospects complete (green), 1 generating images (progress bar moving), 2 queued.

**2. Click into a completed prospect (30s)**
Show the full pipeline: research data → generated script → voice narration → scene images. Hit play on the narrated slideshow. The audience sees an AI-generated image fade in while an AI voice says "Hi [Real Name], I noticed [Real Company] just [real thing from their website]..." — slides advance automatically with each scene.

**3. Click into an in-progress prospect (30s)**
Show real-time: the script is streaming word-by-word (delta streaming). A voice file just appeared (file storage URL resolves). Scene images are generating — 3 of 5 done, the 4th just popped in. The audience watches assets appear in real-time.

**4. Launch a new prospect LIVE (60s)**
"Let's add a new prospect right now." Type in a company name + URL. Hit generate. The audience watches:
- Status: "queued" → "researching" (rtrvr.ai scraping)
- Status: "researching" → "scripting" (script text starts streaming)
- The script appears word by word on screen
- This is the Convex magic moment — zero polling, zero refresh, just reactive data

**5. Show campaign stats (15s)**
"3 complete, 1 generating, 1 just started. 50 minutes ago this campaign had zero outreach assets. Now we have 3 ready to send."

**6. The pitch (30s)**
"Personalized video outreach gets 3-5x reply rates but nobody can scale it. We just generated 5 custom narrated presentations from a prospect list. No camera. No recording. No editing. That's Vimero."

### Demo timing for asset generation
- **Images** (MiniMax image-01): Seconds per image — fast enough to generate live during the demo
- **Voice** (ElevenLabs Flash v2.5): ~75ms latency per scene — nearly instant
- **Script** (MiniMax M2.5): Streams in real-time via delta streaming
- Pre-generated prospects handle the "show finished product" moment
- The live-launched prospect shows the real-time pipeline — research + script + images all complete fast enough to see progress during the demo
- **Stretch goal**: If Hailuo video clips are ready, swap one prospect's slideshow images for actual video clips to show the upgrade path

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

"Tavus, HeyGen, and Synthesia all require you to RECORD a template video. You sit in front of a camera, read a script, and the AI personalizes the name insertion. Vimero generates everything from scratch — script, voice, visuals — personalized from actual research about the prospect's company. Zero recording. That's a fundamentally different product."

When a judge asks "how is this different from HeyGen?":
**"HeyGen is a video editing tool with AI features. We're an AI research-to-visual-outreach pipeline. The input is a company URL, not a recording. The output is a narrated presentation that references things only someone who researched the prospect would know — and it scales to hundreds of prospects automatically."**

When a judge asks "is this really video?":
**"The narrated slideshow is the MVP. Each scene has a custom AI-generated image, professional voiceover, and subtitles — it plays like a video. And our architecture supports swapping in MiniMax Hailuo video clips per scene as a drop-in upgrade. The pipeline is the product, not the rendering format."**
