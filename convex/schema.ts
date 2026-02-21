// =============================================================================
// SCHEMA — Source of truth for all tables.
// Owner: Person 1 (Convex Core). Provided here as a stub so agent code compiles.
// =============================================================================

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Campaign: a batch of prospects to generate videos for
  campaigns: defineTable({
    name: v.string(), // "Q1 Fintech Outreach"
    brief: v.string(), // what to emphasize, pain points to target
    senderName: v.string(), // "Sarah from Acme"
    senderCompany: v.string(), // company context for scripts
    senderCompanyInfo: v.string(), // product/value prop details
    voiceId: v.string(), // ElevenLabs voice ID for narration
    status: v.string(), // "draft" | "running" | "completed"
    totalProspects: v.number(),
    completedProspects: v.number(),
  }).index("by_status", ["status"]),

  // Prospect: one person to generate a video for
  prospects: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(), // "John Smith"
    company: v.string(), // "Stripe"
    title: v.optional(v.string()), // "VP of Engineering"
    url: v.string(), // company URL for research
    email: v.optional(v.string()),

    // Pipeline status
    // "queued" -> "researching" -> "scripting" -> "generating_voice"
    // -> "generating_visuals" -> "complete" -> "failed"
    status: v.string(),

    // Research output (from rtrvr.ai)
    researchData: v.optional(v.string()),

    // Script output (from agent)
    scriptThreadId: v.optional(v.string()), // @convex-dev/agent thread
    script: v.optional(
      v.object({
        scenes: v.array(
          v.object({
            sceneNumber: v.number(),
            narration: v.string(), // voiceover text for this scene
            visualPrompt: v.string(), // image/video generation prompt
            durationSeconds: v.number(),
          })
        ),
        fullNarration: v.string(), // complete voiceover text
      })
    ),

    // Generated assets (per-scene)
    sceneAssets: v.optional(
      v.array(
        v.object({
          sceneNumber: v.number(),
          imageFileId: v.optional(v.id("_storage")),
          videoFileId: v.optional(v.id("_storage")),
          voiceFileId: v.optional(v.id("_storage")),
        })
      )
    ),

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
    type: v.string(), // "voice" | "image" | "video"
    sceneNumber: v.optional(v.number()),
    status: v.string(), // "pending" | "processing" | "complete" | "failed"
    externalJobId: v.optional(v.string()),
    resultFileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    attempts: v.number(),
  })
    .index("by_prospect", ["prospectId"])
    .index("by_status", ["status"])
    .index("by_external_id", ["externalJobId"]),
});
