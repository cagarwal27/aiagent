import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import schema from "./schema";

test("campaigns table: can insert and query a campaign", async () => {
  const t = convexTest(schema);
  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "Test Campaign",
      brief: "Test brief",
      senderName: "Alice",
      senderCompany: "TestCo",
      senderCompanyInfo: "We do testing",
      voiceId: "voice123",
      status: "draft",
      totalProspects: 0,
      completedProspects: 0,
    });
  });

  const result = await t.run(async (ctx) => {
    return await ctx.db.get(campaignId);
  });
  expect(result).not.toBeNull();
  expect(result!.name).toBe("Test Campaign");
  expect(result!.status).toBe("draft");
});

test("prospects table: can insert with campaign ref and query by index", async () => {
  const t = convexTest(schema);

  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "C1",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "info",
      voiceId: "v1",
      status: "draft",
      totalProspects: 1,
      completedProspects: 0,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("prospects", {
      campaignId,
      name: "John",
      company: "Stripe",
      url: "https://stripe.com",
      status: "queued",
    });
  });

  const prospects = await t.run(async (ctx) => {
    return await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();
  });

  expect(prospects).toHaveLength(1);
  expect(prospects[0].name).toBe("John");
  expect(prospects[0].status).toBe("queued");
});

test("generationJobs table: can insert and query by prospect", async () => {
  const t = convexTest(schema);

  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("campaigns", {
      name: "C1", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "info", voiceId: "v1", status: "draft",
      totalProspects: 1, completedProspects: 0,
    });
  });

  const prospectId = await t.run(async (ctx) => {
    return await ctx.db.insert("prospects", {
      campaignId,
      name: "Jane",
      company: "Plaid",
      url: "https://plaid.com",
      status: "queued",
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("generationJobs", {
      prospectId,
      type: "voice",
      status: "pending",
      attempts: 0,
    });
  });

  const jobs = await t.run(async (ctx) => {
    return await ctx.db
      .query("generationJobs")
      .withIndex("by_prospect", (q) => q.eq("prospectId", prospectId))
      .collect();
  });

  expect(jobs).toHaveLength(1);
  expect(jobs[0].type).toBe("voice");
});
