import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

// Helper: insert a campaign + prospect directly
async function seedCampaignAndProspect(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const campaignId = await ctx.db.insert("campaigns", {
      name: "Test", brief: "Brief", senderName: "Alice",
      senderCompany: "Co", senderCompanyInfo: "Info",
      voiceId: "v1", status: "draft",
      totalProspects: 1, completedProspects: 0,
    });
    const prospectId = await ctx.db.insert("prospects", {
      campaignId, name: "John", company: "Stripe",
      url: "https://stripe.com", status: "queued",
    });
    return { campaignId, prospectId };
  });
}

// === PUBLIC QUERIES ===

test("getById: returns a prospect by ID", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  const result = await t.query(api.prospects.getById, { prospectId });
  expect(result).not.toBeNull();
  expect(result!.name).toBe("John");
});

test("getByCampaign: returns all prospects for a campaign", async () => {
  const t = convexTest(schema);
  const { campaignId } = await seedCampaignAndProspect(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("prospects", {
      campaignId, name: "Jane", company: "Plaid",
      url: "https://plaid.com", status: "queued",
    });
  });

  const results = await t.query(api.prospects.getByCampaign, { campaignId });
  expect(results).toHaveLength(2);
});

test("getByCampaignAndStatus: filters by status", async () => {
  const t = convexTest(schema);
  const { campaignId, prospectId } = await seedCampaignAndProspect(t);

  await t.run(async (ctx) => {
    await ctx.db.patch(prospectId, { status: "researching" });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("prospects", {
      campaignId, name: "Jane", company: "Plaid",
      url: "https://plaid.com", status: "queued",
    });
  });

  const queued = await t.query(api.prospects.getByCampaignAndStatus, {
    campaignId, status: "queued",
  });
  expect(queued).toHaveLength(1);
  expect(queued[0].name).toBe("Jane");

  const researching = await t.query(api.prospects.getByCampaignAndStatus, {
    campaignId, status: "researching",
  });
  expect(researching).toHaveLength(1);
  expect(researching[0].name).toBe("John");
});

// === INTERNAL (Person 3's existing) ===

test("internal get: returns prospect by id", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  const result = await t.query(internal.prospects.get, { id: prospectId });
  expect(result).not.toBeNull();
  expect(result!.name).toBe("John");
});

// === INTERNAL MUTATIONS ===

test("updateStatus: transitions status and sets timestamps", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  await t.mutation(internal.prospects.updateStatus, {
    prospectId, status: "researching",
  });

  const afterResearch = await t.query(api.prospects.getById, { prospectId });
  expect(afterResearch!.status).toBe("researching");

  await t.mutation(internal.prospects.updateStatus, {
    prospectId, status: "complete",
  });

  const afterComplete = await t.query(api.prospects.getById, { prospectId });
  expect(afterComplete!.status).toBe("complete");
  expect(afterComplete!.completedAt).toBeDefined();
});

test("markFailed: sets status to failed with error message", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  await t.mutation(internal.prospects.markFailed, {
    prospectId, error: "API timeout",
  });

  const result = await t.query(api.prospects.getById, { prospectId });
  expect(result!.status).toBe("failed");
  expect(result!.error).toBe("API timeout");
});

test("saveResearch: stores research data on prospect", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  await t.mutation(internal.prospects.saveResearch, {
    prospectId, researchData: '{"company":"Stripe","summary":"Payments"}',
  });

  const result = await t.query(api.prospects.getById, { prospectId });
  expect(result!.researchData).toBe('{"company":"Stripe","summary":"Payments"}');
});

test("saveScript: stores structured script on prospect", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  const script = {
    scenes: [
      {
        sceneNumber: 1,
        narration: "Hi John, I saw Stripe...",
        visualPrompt: "Fintech office",
        durationSeconds: 15,
      },
    ],
    fullNarration: "Hi John, I saw Stripe...",
  };

  await t.mutation(internal.prospects.saveScript, {
    prospectId, script,
  });

  const result = await t.query(api.prospects.getById, { prospectId });
  expect(result!.script).toBeDefined();
  expect(result!.script!.scenes).toHaveLength(1);
  expect(result!.script!.scenes[0].narration).toBe("Hi John, I saw Stripe...");
});

test("saveThreadId: stores agent thread reference", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  await t.mutation(internal.prospects.saveThreadId, {
    prospectId, threadId: "thread_abc123",
  });

  const result = await t.query(api.prospects.getById, { prospectId });
  expect(result!.scriptThreadId).toBe("thread_abc123");
});

test("getResearch: returns research data or null", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedCampaignAndProspect(t);

  const before = await t.query(internal.prospects.getResearch, { prospectId });
  expect(before).toBeNull();

  await t.mutation(internal.prospects.saveResearch, {
    prospectId, researchData: "data",
  });
  const after = await t.query(internal.prospects.getResearch, { prospectId });
  expect(after).toBe("data");
});
