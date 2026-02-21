import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// === PUBLIC QUERIES (Person 4 frontend) ===

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("campaigns").order("desc").collect();
  },
});

export const getById = query({
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
      inProgress:
        prospects.length -
        (statusCounts["complete"] ?? 0) -
        (statusCounts["failed"] ?? 0) -
        (statusCounts["queued"] ?? 0),
    };
  },
});

// === INTERNAL QUERIES (Person 3 agent + workflow) ===

/** Get a campaign by ID. Used by writeScript to pre-fetch sender/brief context. */
export const get = internalQuery({
  args: { id: v.id("campaigns") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getBrief = internalQuery({
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

// === PUBLIC MUTATIONS ===

export const create = mutation({
  args: {
    name: v.string(),
    brief: v.string(),
    senderName: v.string(),
    senderCompany: v.string(),
    senderCompanyInfo: v.string(),
    voiceId: v.string(),
    prospects: v.array(
      v.object({
        name: v.string(),
        company: v.string(),
        title: v.optional(v.string()),
        url: v.string(),
        email: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { prospects: prospectList, ...campaignData } = args;

    const campaignId = await ctx.db.insert("campaigns", {
      ...campaignData,
      status: "draft",
      totalProspects: prospectList.length,
      completedProspects: 0,
    });

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

    await ctx.db.patch(campaignId, { status: "running" });

    const { workflow } = await import("./workflowInit");

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign_status", (q) =>
        q.eq("campaignId", campaignId).eq("status", "queued")
      )
      .collect();

    for (const prospect of prospects) {
      await workflow.start(ctx, internal.workflow.prospectPipeline, {
        prospectId: prospect._id,
        campaignId,
      });
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
