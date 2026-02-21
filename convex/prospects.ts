import {
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

// === PUBLIC QUERIES (Person 4 frontend) ===

export const getById = query({
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

// === INTERNAL QUERIES (Person 3 agent + workflow) ===

/** Get a prospect by ID. Used by writeScript to pre-fetch context. */
export const get = internalQuery({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getResearch = internalQuery({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    const prospect = await ctx.db.get(prospectId);
    return prospect?.researchData ?? null;
  },
});

// === INTERNAL MUTATIONS (workflow + Person 2 + Person 3) ===

/** Update prospect pipeline status. Called by workflow. */
export const updateStatus = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { prospectId, status, error }) => {
    const updates: Record<string, unknown> = { status };
    if (error !== undefined) updates.error = error;
    if (status === "complete") updates.completedAt = Date.now();
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

/** Save the generated script to a prospect record. Called by the agent's saveScript tool. */
export const saveScript = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    script: v.object({
      scenes: v.array(
        v.object({
          sceneNumber: v.number(),
          narration: v.string(),
          visualPrompt: v.string(),
          durationSeconds: v.number(),
        })
      ),
      fullNarration: v.string(),
    }),
  },
  handler: async (ctx, { prospectId, script }) => {
    await ctx.db.patch(prospectId, { script });
  },
});

/** Save the agent thread ID so the frontend can subscribe to streaming. */
export const saveThreadId = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    threadId: v.string(),
  },
  handler: async (ctx, { prospectId, threadId }) => {
    await ctx.db.patch(prospectId, { scriptThreadId: threadId });
  },
});

export const saveSceneAsset = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    sceneNumber: v.number(),
    type: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, { prospectId, sceneNumber, type, fileId }) => {
    const prospect = await ctx.db.get(prospectId);
    if (!prospect) throw new Error("Prospect not found");

    const sceneAssets = prospect.sceneAssets ?? [];
    const existingIndex = sceneAssets.findIndex(
      (a) => a.sceneNumber === sceneNumber
    );

    if (existingIndex >= 0) {
      const existing = sceneAssets[existingIndex];
      sceneAssets[existingIndex] = {
        ...existing,
        ...(type === "image" ? { imageFileId: fileId } : {}),
        ...(type === "video" ? { videoFileId: fileId } : {}),
        ...(type === "voice" ? { voiceFileId: fileId } : {}),
      };
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
