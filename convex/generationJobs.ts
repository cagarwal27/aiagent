import {
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
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

// === INTERNAL MUTATIONS (Person 2's service actions call these) ===

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

// === INTERNAL QUERIES ===

export const getByExternalId = internalQuery({
  args: { externalJobId: v.string() },
  handler: async (ctx, { externalJobId }) => {
    return await ctx.db
      .query("generationJobs")
      .withIndex("by_external_id", (q) =>
        q.eq("externalJobId", externalJobId)
      )
      .first();
  },
});
