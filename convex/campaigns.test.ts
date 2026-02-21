import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

// === PUBLIC QUERIES ===

test("list: returns campaigns in descending order", async () => {
  const t = convexTest(schema);

  await t.run(async (ctx) => {
    await ctx.db.insert("campaigns", {
      name: "First", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "i", voiceId: "v", status: "draft",
      totalProspects: 0, completedProspects: 0,
    });
    await ctx.db.insert("campaigns", {
      name: "Second", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "i", voiceId: "v", status: "draft",
      totalProspects: 0, completedProspects: 0,
    });
  });

  const results = await t.query(api.campaigns.list, {});
  expect(results).toHaveLength(2);
  expect(results[0].name).toBe("Second");
});

test("getById: returns a single campaign by ID", async () => {
  const t = convexTest(schema);

  const id = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "Test", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "i", voiceId: "v", status: "draft",
      totalProspects: 0, completedProspects: 0,
    });
  });

  const result = await t.query(api.campaigns.getById, { campaignId: id });
  expect(result).not.toBeNull();
  expect(result!.name).toBe("Test");
});

test("getProgress: returns status counts for a campaign", async () => {
  const t = convexTest(schema);

  const campaignId = await t.run(async (ctx) => {
    const cId = await ctx.db.insert("campaigns", {
      name: "C", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "i", voiceId: "v", status: "running",
      totalProspects: 3, completedProspects: 1,
    });
    await ctx.db.insert("prospects", {
      campaignId: cId, name: "P1", company: "C1",
      url: "https://c1.com", status: "queued",
    });
    await ctx.db.insert("prospects", {
      campaignId: cId, name: "P2", company: "C2",
      url: "https://c2.com", status: "researching",
    });
    await ctx.db.insert("prospects", {
      campaignId: cId, name: "P3", company: "C3",
      url: "https://c3.com", status: "complete",
    });
    return cId;
  });

  const progress = await t.query(api.campaigns.getProgress, { campaignId });
  expect(progress).not.toBeNull();
  expect(progress!.total).toBe(3);
  expect(progress!.completed).toBe(1);
  expect(progress!.statusCounts["queued"]).toBe(1);
  expect(progress!.statusCounts["researching"]).toBe(1);
  expect(progress!.statusCounts["complete"]).toBe(1);
  expect(progress!.inProgress).toBe(1);
});

// === INTERNAL (Person 3's existing) ===

test("internal get: returns campaign by id", async () => {
  const t = convexTest(schema);

  const id = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "Test", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "i", voiceId: "v", status: "draft",
      totalProspects: 0, completedProspects: 0,
    });
  });

  const result = await t.query(internal.campaigns.get, { id });
  expect(result).not.toBeNull();
  expect(result!.name).toBe("Test");
});

// === PUBLIC MUTATIONS ===

test("create: inserts campaign + prospects atomically", async () => {
  const t = convexTest(schema);

  const campaignId = await t.mutation(api.campaigns.create, {
    name: "Q1 Fintech",
    brief: "Target compliance pain",
    senderName: "Alice",
    senderCompany: "ProspectClip",
    senderCompanyInfo: "AI video platform",
    voiceId: "voice123",
    prospects: [
      { name: "John", company: "Stripe", url: "https://stripe.com" },
      { name: "Jane", company: "Plaid", url: "https://plaid.com" },
    ],
  });

  const campaign = await t.query(api.campaigns.getById, { campaignId });
  expect(campaign!.status).toBe("draft");
  expect(campaign!.totalProspects).toBe(2);
  expect(campaign!.completedProspects).toBe(0);

  const prospects = await t.run(async (ctx) => {
    return await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();
  });
  expect(prospects).toHaveLength(2);
  expect(prospects[0].status).toBe("queued");
});

test("launch: rejects non-draft campaigns", async () => {
  const t = convexTest(schema);

  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "Already Running", brief: "b", senderName: "A",
      senderCompany: "Co", senderCompanyInfo: "i", voiceId: "v",
      status: "running", totalProspects: 0, completedProspects: 0,
    });
  });

  await expect(
    t.mutation(api.campaigns.launch, { campaignId })
  ).rejects.toThrow("Campaign already launched");
});

// === INTERNAL MUTATIONS ===

test("incrementCompleted: increments count and marks completed when done", async () => {
  const t = convexTest(schema);

  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "C", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "i", voiceId: "v", status: "running",
      totalProspects: 2, completedProspects: 0,
    });
  });

  await t.mutation(internal.campaigns.incrementCompleted, { campaignId });
  let campaign = await t.query(api.campaigns.getById, { campaignId });
  expect(campaign!.completedProspects).toBe(1);
  expect(campaign!.status).toBe("running");

  await t.mutation(internal.campaigns.incrementCompleted, { campaignId });
  campaign = await t.query(api.campaigns.getById, { campaignId });
  expect(campaign!.completedProspects).toBe(2);
  expect(campaign!.status).toBe("completed");
});

test("getBrief: returns campaign brief fields", async () => {
  const t = convexTest(schema);

  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "C", brief: "Focus on compliance", senderName: "Sarah",
      senderCompany: "ProspectClip", senderCompanyInfo: "AI video platform",
      voiceId: "v", status: "draft", totalProspects: 0, completedProspects: 0,
    });
  });

  const brief = await t.query(internal.campaigns.getBrief, { campaignId });
  expect(brief.brief).toBe("Focus on compliance");
  expect(brief.senderName).toBe("Sarah");
  expect(brief.senderCompany).toBe("ProspectClip");
  expect(brief.senderCompanyInfo).toBe("AI video platform");
});
