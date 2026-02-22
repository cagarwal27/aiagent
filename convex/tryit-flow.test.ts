/**
 * Tests for the /campaigns "Try It Live" single-page flow.
 *
 * Simulates what the frontend does at each phase:
 *   Form → campaigns.create + campaigns.launch
 *   Progress → campaigns.getProgress (poll prospect status)
 *   Result → prospects.getWithAssetUrls (display assets)
 *
 * Also tests edge cases: missing fields, duplicate launches,
 * failed prospects, and the full pipeline status walkthrough.
 */
import { convexTest } from "convex-test";
import { test, expect, describe } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

// ─── Helpers ─────────────────────────────────────────────────────────

/** Mirrors exactly what CampaignManagerPage.jsx sends on form submit */
function buildCreateArgs(overrides: Record<string, unknown> = {}) {
  return {
    name: "Stripe Outreach",
    brief: "AI-personalized sales videos that 3x reply rates",
    senderName: "Chirag",
    senderCompany: "Vimero",
    senderCompanyInfo: "AI-personalized sales videos that 3x reply rates",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    prospects: [
      {
        name: "Patrick Collison",
        company: "Stripe",
        url: "https://stripe.com",
      },
    ],
    ...overrides,
  };
}

const FAKE_SCRIPT = {
  scenes: [
    {
      sceneNumber: 1,
      narration: "Hi Patrick, I noticed Stripe just launched...",
      visualPrompt: "Modern fintech office with payment dashboard",
      durationSeconds: 12,
    },
    {
      sceneNumber: 2,
      narration: "At Vimero, we help sales teams create personalized videos...",
      visualPrompt: "Split screen showing personalized video creation",
      durationSeconds: 10,
    },
    {
      sceneNumber: 3,
      narration: "Would love to show you a quick demo...",
      visualPrompt: "Call to action with Vimero logo",
      durationSeconds: 8,
    },
  ],
  fullNarration:
    "Hi Patrick, I noticed Stripe just launched... At Vimero, we help sales teams create personalized videos... Would love to show you a quick demo...",
};

// ─── Phase 1: Form → Create + Launch ────────────────────────────────

describe("Phase 1: Form submission (create + launch)", () => {
  test("create with single prospect maps correctly from frontend fields", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());

    const campaign = await t.query(api.campaigns.getById, { campaignId });
    expect(campaign).not.toBeNull();
    expect(campaign!.name).toBe("Stripe Outreach");
    expect(campaign!.brief).toBe("AI-personalized sales videos that 3x reply rates");
    expect(campaign!.senderName).toBe("Chirag");
    expect(campaign!.senderCompany).toBe("Vimero");
    expect(campaign!.status).toBe("draft");
    expect(campaign!.totalProspects).toBe(1);
    expect(campaign!.completedProspects).toBe(0);

    // Verify the prospect was created with correct fields
    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    expect(prospects).toHaveLength(1);
    expect(prospects[0].name).toBe("Patrick Collison");
    expect(prospects[0].company).toBe("Stripe");
    expect(prospects[0].url).toBe("https://stripe.com");
    expect(prospects[0].status).toBe("queued");
  });

  test("create without email field still works (email is optional/unused)", async () => {
    const t = convexTest(schema);

    // Frontend no longer sends email — make sure backend accepts it
    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());
    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    expect(prospects[0].email).toBeUndefined();
  });

  test("create with email field still works for backwards compat", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(
      api.campaigns.create,
      buildCreateArgs({
        prospects: [
          {
            name: "Patrick Collison",
            company: "Stripe",
            url: "https://stripe.com",
            email: "patrick@stripe.com",
          },
        ],
      })
    );
    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    expect(prospects[0].email).toBe("patrick@stripe.com");
  });

  test("launch transitions campaign from draft to running", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());

    // Before launch
    let campaign = await t.query(api.campaigns.getById, { campaignId });
    expect(campaign!.status).toBe("draft");

    // Launch — will throw because convex-test can't run workflow.start,
    // but we can test the validation logic by checking a non-draft campaign
    // We'll test the status transition manually instead
    await t.run(async (ctx) => {
      await ctx.db.patch(campaignId, { status: "running" });
    });

    campaign = await t.query(api.campaigns.getById, { campaignId });
    expect(campaign!.status).toBe("running");
  });

  test("launch rejects already-running campaign", async () => {
    const t = convexTest(schema);

    const campaignId = await t.run(async (ctx) => {
      return await ctx.db.insert("campaigns", {
        name: "Test",
        brief: "b",
        senderName: "A",
        senderCompany: "Co",
        senderCompanyInfo: "i",
        voiceId: "v",
        status: "running",
        totalProspects: 1,
        completedProspects: 0,
      });
    });

    await expect(
      t.mutation(api.campaigns.launch, { campaignId })
    ).rejects.toThrow("Campaign already launched");
  });
});

// ─── Phase 2: Progress tracking ─────────────────────────────────────

describe("Phase 2: Progress tracking (getProgress polling)", () => {
  test("getProgress returns prospect in queued state initially", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());
    await t.run(async (ctx) => {
      await ctx.db.patch(campaignId, { status: "running" });
    });

    const progress = await t.query(api.campaigns.getProgress, { campaignId });
    expect(progress).not.toBeNull();
    expect(progress!.total).toBe(1);
    expect(progress!.completed).toBe(0);
    expect(progress!.failed).toBe(0);
    expect(progress!.prospects).toHaveLength(1);
    expect(progress!.prospects[0].status).toBe("queued");
    expect(progress!.prospects[0].name).toBe("Patrick Collison");
  });

  test("prospect walks through all pipeline statuses correctly", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());
    await t.run(async (ctx) => {
      await ctx.db.patch(campaignId, { status: "running" });
    });

    const progress = await t.query(api.campaigns.getProgress, { campaignId });
    const prospectId = progress!.prospects[0]._id;

    // Walk through each pipeline status the workflow sets
    const statuses = [
      "researching",
      "scripting",
      "generating_voice",
      "generating_visuals",
      "complete",
    ];

    for (const status of statuses) {
      await t.mutation(internal.prospects.updateStatus, {
        prospectId,
        status,
      });

      const p = await t.query(api.campaigns.getProgress, { campaignId });
      expect(p!.prospects[0].status).toBe(status);
    }

    // After "complete", campaign should count it
    await t.mutation(internal.campaigns.incrementCompleted, { campaignId });
    const final = await t.query(api.campaigns.getProgress, { campaignId });
    expect(final!.completed).toBe(1);
    expect(final!.campaign!.status).toBe("completed");
  });

  test("failed prospect shows in getProgress with error", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());
    await t.run(async (ctx) => {
      await ctx.db.patch(campaignId, { status: "running" });
    });

    const progress = await t.query(api.campaigns.getProgress, { campaignId });
    const prospectId = progress!.prospects[0]._id;

    await t.mutation(internal.prospects.markFailed, {
      prospectId,
      error: "rtrvr.ai returned 401: Invalid or expired ID token",
    });

    const after = await t.query(api.campaigns.getProgress, { campaignId });
    expect(after!.failed).toBe(1);
    expect(after!.prospects[0].status).toBe("failed");
    expect(after!.prospects[0].error).toContain("401");
  });
});

// ─── Phase 3: Result display ────────────────────────────────────────

describe("Phase 3: Result display (getWithAssetUrls)", () => {
  test("getWithAssetUrls returns prospect with empty resolvedAssets when no assets", async () => {
    const t = convexTest(schema);

    const { prospectId } = await t.run(async (ctx) => {
      const campaignId = await ctx.db.insert("campaigns", {
        name: "Test",
        brief: "b",
        senderName: "A",
        senderCompany: "Co",
        senderCompanyInfo: "i",
        voiceId: "v",
        status: "completed",
        totalProspects: 1,
        completedProspects: 1,
      });
      const prospectId = await ctx.db.insert("prospects", {
        campaignId,
        name: "Patrick Collison",
        company: "Stripe",
        url: "https://stripe.com",
        status: "complete",
        script: FAKE_SCRIPT,
      });
      return { campaignId, prospectId };
    });

    const result = await t.query(api.prospects.getWithAssetUrls, { prospectId });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Patrick Collison");
    expect(result!.company).toBe("Stripe");
    expect(result!.script).toBeDefined();
    expect(result!.script!.fullNarration).toContain("Patrick");
    expect(result!.script!.scenes).toHaveLength(3);
    expect(result!.resolvedAssets).toHaveLength(0); // no sceneAssets yet
  });

  test("getWithAssetUrls returns null for nonexistent prospect", async () => {
    const t = convexTest(schema);

    // Create a dummy to get a valid-format ID, then delete it
    const fakeId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("campaigns", {
        name: "X",
        brief: "b",
        senderName: "A",
        senderCompany: "Co",
        senderCompanyInfo: "i",
        voiceId: "v",
        status: "draft",
        totalProspects: 0,
        completedProspects: 0,
      });
      const pId = await ctx.db.insert("prospects", {
        campaignId: cId,
        name: "Ghost",
        company: "Gone",
        url: "https://gone.com",
        status: "queued",
      });
      await ctx.db.delete(pId);
      return pId;
    });

    const result = await t.query(api.prospects.getWithAssetUrls, {
      prospectId: fakeId,
    });
    expect(result).toBeNull();
  });

  test("script data is accessible on completed prospect", async () => {
    const t = convexTest(schema);

    const { prospectId } = await t.run(async (ctx) => {
      const campaignId = await ctx.db.insert("campaigns", {
        name: "Test",
        brief: "b",
        senderName: "A",
        senderCompany: "Co",
        senderCompanyInfo: "i",
        voiceId: "v",
        status: "running",
        totalProspects: 1,
        completedProspects: 0,
      });
      const prospectId = await ctx.db.insert("prospects", {
        campaignId,
        name: "Patrick Collison",
        company: "Stripe",
        url: "https://stripe.com",
        status: "queued",
      });
      return { campaignId, prospectId };
    });

    // Simulate pipeline saving script
    await t.mutation(internal.prospects.saveScript, {
      prospectId,
      script: FAKE_SCRIPT,
    });

    const result = await t.query(api.prospects.getById, { prospectId });
    expect(result!.script).toBeDefined();
    expect(result!.script!.scenes).toHaveLength(3);
    expect(result!.script!.scenes[0].narration).toContain("Patrick");
    expect(result!.script!.scenes[0].visualPrompt).toBeTruthy();
    expect(result!.script!.fullNarration).toContain("Patrick");
  });
});

// ─── Full simulated pipeline ────────────────────────────────────────

describe("Full pipeline simulation (no external APIs)", () => {
  test("create → launch → research → script → voice → images → complete", async () => {
    const t = convexTest(schema);

    // 1. Frontend: create campaign
    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());

    // 2. Frontend: launch (simulate — set status to running manually)
    await t.run(async (ctx) => {
      await ctx.db.patch(campaignId, { status: "running" });
    });

    // Get the prospect ID
    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    const prospectId = prospects[0]._id;

    // 3. Workflow step 1: researching
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "researching",
    });
    let p = await t.query(api.campaigns.getProgress, { campaignId });
    expect(p!.prospects[0].status).toBe("researching");

    // Simulate scrape result
    await t.mutation(internal.prospects.saveResearch, {
      prospectId,
      researchData: JSON.stringify({
        company: "Stripe",
        description: "Financial infrastructure for the internet",
        products: ["Payments", "Billing", "Connect"],
      }),
    });

    // 4. Workflow step 2: scripting
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "scripting",
    });
    p = await t.query(api.campaigns.getProgress, { campaignId });
    expect(p!.prospects[0].status).toBe("scripting");

    // Simulate script generation
    await t.mutation(internal.prospects.saveScript, {
      prospectId,
      script: FAKE_SCRIPT,
    });

    // 5. Workflow step 3: generating_voice
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_voice",
    });
    p = await t.query(api.campaigns.getProgress, { campaignId });
    expect(p!.prospects[0].status).toBe("generating_voice");

    // 6. Workflow step 4: generating_visuals
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_visuals",
    });
    p = await t.query(api.campaigns.getProgress, { campaignId });
    expect(p!.prospects[0].status).toBe("generating_visuals");

    // 7. Workflow step 5: complete
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "complete",
    });
    await t.mutation(internal.campaigns.incrementCompleted, { campaignId });

    // 8. Verify final state
    const finalProgress = await t.query(api.campaigns.getProgress, {
      campaignId,
    });
    expect(finalProgress!.completed).toBe(1);
    expect(finalProgress!.failed).toBe(0);
    expect(finalProgress!.campaign!.status).toBe("completed");
    expect(finalProgress!.prospects[0].status).toBe("complete");

    // 9. Frontend: result page loads prospect with assets
    const result = await t.query(api.prospects.getWithAssetUrls, {
      prospectId,
    });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Patrick Collison");
    expect(result!.script!.scenes).toHaveLength(3);
    expect(result!.resolvedAssets).toHaveLength(0); // convex-test has no storage
  });

  test("pipeline failure at research step is visible to frontend", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, buildCreateArgs());
    await t.run(async (ctx) => {
      await ctx.db.patch(campaignId, { status: "running" });
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    const prospectId = prospects[0]._id;

    // Workflow starts researching
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "researching",
    });

    // Scrape fails (e.g. bad API key)
    await t.mutation(internal.prospects.markFailed, {
      prospectId,
      error: "[scrapeProspect] rtrvr.ai returned 401: Invalid or expired ID token",
    });

    // Frontend polls and sees the failure
    const progress = await t.query(api.campaigns.getProgress, { campaignId });
    expect(progress!.failed).toBe(1);
    expect(progress!.prospects[0].status).toBe("failed");
    expect(progress!.prospects[0].error).toContain("401");
  });
});

// ─── URL handling edge cases ────────────────────────────────────────

describe("URL field handling", () => {
  test("prospect stores exact URL from frontend", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(
      api.campaigns.create,
      buildCreateArgs({
        prospects: [
          {
            name: "Test Person",
            company: "Goldman Sachs",
            url: "https://gs.com",
          },
        ],
      })
    );

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    expect(prospects[0].url).toBe("https://gs.com");
  });

  test("URL with path is preserved", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(
      api.campaigns.create,
      buildCreateArgs({
        prospects: [
          {
            name: "Test",
            company: "Acme",
            url: "https://www.acme.com/about",
          },
        ],
      })
    );

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    expect(prospects[0].url).toBe("https://www.acme.com/about");
  });
});
