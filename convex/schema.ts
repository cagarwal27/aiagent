import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  campaigns: defineTable({
    name: v.string(),
    brief: v.string(),
    senderName: v.string(),
    senderCompany: v.string(),
    senderCompanyInfo: v.string(),
    voiceId: v.string(),
    status: v.string(),
    totalProspects: v.number(),
    completedProspects: v.number(),
    source: v.optional(v.string()), // "apollo" | "manual"
    icpFilters: v.optional(
      v.object({
        titles: v.optional(v.array(v.string())),
        industries: v.optional(v.array(v.string())),
        employeeRanges: v.optional(v.array(v.string())),
        locations: v.optional(v.array(v.string())),
        limit: v.optional(v.number()),
      })
    ),
  }).index("by_status", ["status"]),

  prospects: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    company: v.string(),
    title: v.optional(v.string()),
    url: v.string(),
    email: v.optional(v.string()),
    status: v.string(),
    researchData: v.optional(v.string()),
    scriptThreadId: v.optional(v.string()),
    script: v.optional(
      v.object({
        scenes: v.array(
          v.object({
            sceneNumber: v.number(),
            narration: v.string(),
            visualPrompt: v.string(),
            durationSeconds: v.number(),
          })
        ),
        fullNarration: v.string(),
      })
    ),
    voiceFileId: v.optional(v.id("_storage")),
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
    finalVideoUrl: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_status", ["campaignId", "status"]),

  generationJobs: defineTable({
    prospectId: v.id("prospects"),
    type: v.string(),
    sceneNumber: v.optional(v.number()),
    status: v.string(),
    externalJobId: v.optional(v.string()),
    resultFileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    attempts: v.number(),
  })
    .index("by_prospect", ["prospectId"])
    .index("by_status", ["status"])
    .index("by_external_id", ["externalJobId"]),
});
