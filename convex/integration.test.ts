/**
 * COMPREHENSIVE INTEGRATION TESTS
 * Tests the full data flow: seed → campaign CRUD → prospect lifecycle →
 * generation jobs → status transitions → campaign completion.
 * Simulates what happens in production without external APIs.
 */
import { convexTest } from "convex-test";
import { test, expect, describe } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

// ============================================================================
// SEED DATA TESTS
// ============================================================================

describe("Seed Data", () => {
  test("seed creates 1 campaign + 5 prospects", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(api.seedData.seed, {});
    expect(result.status).toBe("seeded");
    expect(result.campaignId).toBeDefined();

    // Verify campaign
    const campaign = await t.query(api.campaigns.getById, {
      campaignId: result.campaignId,
    });
    expect(campaign).not.toBeNull();
    expect(campaign!.name).toBe("Q1 Fintech Outreach");
    expect(campaign!.senderName).toBe("Sarah Chen");
    expect(campaign!.senderCompany).toBe("ProspectClip");
    expect(campaign!.status).toBe("draft");
    expect(campaign!.totalProspects).toBe(5);
    expect(campaign!.completedProspects).toBe(0);

    // Verify prospects
    const prospects = await t.query(api.prospects.getByCampaign, {
      campaignId: result.campaignId,
    });
    expect(prospects).toHaveLength(5);

    const names = prospects.map((p) => p.name).sort();
    expect(names).toEqual([
      "David Wilson",
      "Emily Johnson",
      "John Smith",
      "Michael Lee",
      "Sarah Davis",
    ]);

    // All queued
    for (const p of prospects) {
      expect(p.status).toBe("queued");
      expect(p.campaignId).toBe(result.campaignId);
    }

    // Verify companies
    const companies = prospects.map((p) => p.company).sort();
    expect(companies).toEqual(["Brex", "Mercury", "Plaid", "Ramp", "Stripe"]);
  });

  test("seed is idempotent — second call returns already_seeded", async () => {
    const t = convexTest(schema);

    const first = await t.mutation(api.seedData.seed, {});
    expect(first.status).toBe("seeded");

    const second = await t.mutation(api.seedData.seed, {});
    expect(second.status).toBe("already_seeded");
    expect(second.campaignId).toBe(first.campaignId);

    // Still only 1 campaign
    const campaigns = await t.query(api.campaigns.list, {});
    expect(campaigns).toHaveLength(1);
  });
});

// ============================================================================
// CAMPAIGN CREATE + PROGRESS TESTS
// ============================================================================

describe("Campaign Lifecycle", () => {
  test("create campaign with prospects via mutation", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Integration Test Campaign",
      brief: "Test pain points",
      senderName: "Test Sender",
      senderCompany: "TestCo",
      senderCompanyInfo: "We do testing",
      voiceId: "test_voice",
      prospects: [
        { name: "Alice", company: "AliceCorp", url: "https://alice.com" },
        { name: "Bob", company: "BobInc", url: "https://bob.com", title: "CTO" },
        {
          name: "Charlie",
          company: "CharlieLLC",
          url: "https://charlie.com",
          email: "charlie@charlie.com",
        },
      ],
    });

    // Campaign created correctly
    const campaign = await t.query(api.campaigns.getById, { campaignId });
    expect(campaign!.status).toBe("draft");
    expect(campaign!.totalProspects).toBe(3);
    expect(campaign!.completedProspects).toBe(0);

    // Prospects created correctly
    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    expect(prospects).toHaveLength(3);

    // Check optional fields preserved
    const bob = prospects.find((p) => p.name === "Bob");
    expect(bob!.title).toBe("CTO");

    const charlie = prospects.find((p) => p.name === "Charlie");
    expect(charlie!.email).toBe("charlie@charlie.com");

    // All queued
    const queued = await t.query(api.prospects.getByCampaignAndStatus, {
      campaignId,
      status: "queued",
    });
    expect(queued).toHaveLength(3);
  });

  test("getProgress returns correct status breakdown", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Progress Test",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P1", company: "C1", url: "https://c1.com" },
        { name: "P2", company: "C2", url: "https://c2.com" },
        { name: "P3", company: "C3", url: "https://c3.com" },
        { name: "P4", company: "C4", url: "https://c4.com" },
      ],
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });

    // Move prospects through different stages
    await t.mutation(internal.prospects.updateStatus, {
      prospectId: prospects[0]._id,
      status: "researching",
    });
    await t.mutation(internal.prospects.updateStatus, {
      prospectId: prospects[1]._id,
      status: "scripting",
    });
    await t.mutation(internal.prospects.updateStatus, {
      prospectId: prospects[2]._id,
      status: "complete",
    });
    // prospects[3] stays "queued"

    const progress = await t.query(api.campaigns.getProgress, { campaignId });
    expect(progress!.total).toBe(4);
    expect(progress!.completed).toBe(1);
    expect(progress!.statusCounts["queued"]).toBe(1);
    expect(progress!.statusCounts["researching"]).toBe(1);
    expect(progress!.statusCounts["scripting"]).toBe(1);
    expect(progress!.statusCounts["complete"]).toBe(1);
    expect(progress!.inProgress).toBe(2); // researching + scripting
  });

  test("incrementCompleted auto-marks campaign completed", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Completion Test",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P1", company: "C1", url: "https://c1.com" },
        { name: "P2", company: "C2", url: "https://c2.com" },
      ],
    });

    // Simulate workflow completing both prospects
    await t.mutation(internal.campaigns.incrementCompleted, { campaignId });
    let campaign = await t.query(api.campaigns.getById, { campaignId });
    expect(campaign!.completedProspects).toBe(1);
    expect(campaign!.status).toBe("draft"); // not done yet

    await t.mutation(internal.campaigns.incrementCompleted, { campaignId });
    campaign = await t.query(api.campaigns.getById, { campaignId });
    expect(campaign!.completedProspects).toBe(2);
    expect(campaign!.status).toBe("completed"); // auto-completed!
  });
});

// ============================================================================
// PROSPECT PIPELINE SIMULATION
// ============================================================================

describe("Prospect Pipeline (simulated)", () => {
  test("full pipeline: queued → researching → scripting → voice → images → complete", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Pipeline Test",
      brief: "Full pipeline",
      senderName: "Alice",
      senderCompany: "TestCo",
      senderCompanyInfo: "Testing platform",
      voiceId: "v1",
      prospects: [
        { name: "Target", company: "TargetCo", url: "https://target.com" },
      ],
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    const prospectId = prospects[0]._id;

    // Step 1: Research
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "researching",
    });
    let prospect = await t.query(api.prospects.getById, { prospectId });
    expect(prospect!.status).toBe("researching");

    await t.mutation(internal.prospects.saveResearch, {
      prospectId,
      researchData: JSON.stringify({
        summary: "TargetCo is a B2B SaaS company",
        painPoints: ["Manual outreach", "Low reply rates"],
      }),
    });
    prospect = await t.query(api.prospects.getById, { prospectId });
    expect(prospect!.researchData).toBeDefined();

    // Verify getResearch internal query
    const research = await t.query(internal.prospects.getResearch, { prospectId });
    expect(research).not.toBeNull();
    expect(JSON.parse(research!).summary).toBe("TargetCo is a B2B SaaS company");

    // Step 2: Script writing
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "scripting",
    });

    // Save thread ID for frontend streaming
    await t.mutation(internal.prospects.saveThreadId, {
      prospectId,
      threadId: "thread_test_123",
    });
    prospect = await t.query(api.prospects.getById, { prospectId });
    expect(prospect!.scriptThreadId).toBe("thread_test_123");

    // Save script
    const script = {
      scenes: [
        {
          sceneNumber: 1,
          narration: "Hi Target, I noticed TargetCo is doing great things.",
          visualPrompt: "Modern SaaS dashboard in sunlit office",
          durationSeconds: 12,
        },
        {
          sceneNumber: 2,
          narration:
            "Most B2B teams struggle with manual outreach. We automate that.",
          visualPrompt: "Person overwhelmed by emails, then clean AI dashboard",
          durationSeconds: 18,
        },
        {
          sceneNumber: 3,
          narration: "Would love to show you how this works. Quick 15-min call?",
          visualPrompt: "Calendar icon with meeting confirmation animation",
          durationSeconds: 10,
        },
      ],
      fullNarration:
        "Hi Target, I noticed TargetCo is doing great things. Most B2B teams struggle with manual outreach. We automate that. Would love to show you how this works. Quick 15-min call?",
    };
    await t.mutation(internal.prospects.saveScript, { prospectId, script });

    prospect = await t.query(api.prospects.getById, { prospectId });
    expect(prospect!.script).toBeDefined();
    expect(prospect!.script!.scenes).toHaveLength(3);
    expect(prospect!.script!.scenes[0].sceneNumber).toBe(1);
    expect(prospect!.script!.scenes[1].sceneNumber).toBe(2);
    expect(prospect!.script!.scenes[2].sceneNumber).toBe(3);
    expect(prospect!.script!.fullNarration).toContain("Hi Target");

    // Step 3: Voice generation
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_voice",
    });

    // Step 4: Image generation
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_images",
    });

    // Step 5: Complete
    await t.mutation(internal.prospects.updateStatus, {
      prospectId,
      status: "complete",
    });
    prospect = await t.query(api.prospects.getById, { prospectId });
    expect(prospect!.status).toBe("complete");
    expect(prospect!.completedAt).toBeDefined();

    // Campaign counter
    await t.mutation(internal.campaigns.incrementCompleted, { campaignId });
    const campaign = await t.query(api.campaigns.getById, { campaignId });
    expect(campaign!.completedProspects).toBe(1);
    expect(campaign!.status).toBe("completed"); // 1/1 done
  });

  test("markFailed sets error and status", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Fail Test",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "FailGuy", company: "FailCo", url: "https://fail.com" },
      ],
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    const prospectId = prospects[0]._id;

    await t.mutation(internal.prospects.markFailed, {
      prospectId,
      error: "MiniMax M2.1 tool calling failed — schema too complex",
    });

    const prospect = await t.query(api.prospects.getById, { prospectId });
    expect(prospect!.status).toBe("failed");
    expect(prospect!.error).toBe(
      "MiniMax M2.1 tool calling failed — schema too complex"
    );
  });

  test("Person 3 internal get works with {id} arg pattern", async () => {
    const t = convexTest(schema);

    // This is how Person 3's writeScript.ts calls it
    const campaignId = await t.mutation(api.campaigns.create, {
      name: "P3 Compat",
      brief: "Test brief",
      senderName: "Sender",
      senderCompany: "Co",
      senderCompanyInfo: "Info",
      voiceId: "v",
      prospects: [
        { name: "Test", company: "TestCo", url: "https://test.com" },
      ],
    });

    // Person 3 calls: internal.prospects.get({ id: prospectId })
    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    const prospectResult = await t.query(internal.prospects.get, {
      id: prospects[0]._id,
    });
    expect(prospectResult).not.toBeNull();
    expect(prospectResult!.name).toBe("Test");

    // Person 3 calls: internal.campaigns.get({ id: campaignId })
    const campaignResult = await t.query(internal.campaigns.get, {
      id: campaignId,
    });
    expect(campaignResult).not.toBeNull();
    expect(campaignResult!.brief).toBe("Test brief");

    // Person 3 calls: internal.campaigns.getBrief({ campaignId })
    const brief = await t.query(internal.campaigns.getBrief, { campaignId });
    expect(brief.senderName).toBe("Sender");
    expect(brief.senderCompanyInfo).toBe("Info");
  });
});

// ============================================================================
// GENERATION JOBS LIFECYCLE
// ============================================================================

describe("Generation Jobs", () => {
  test("create, track, and complete image generation jobs", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "GenJob Test",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P1", company: "C1", url: "https://c1.com" },
      ],
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });
    const prospectId = prospects[0]._id;

    // Create 3 image jobs (one per scene)
    for (let scene = 1; scene <= 3; scene++) {
      await t.mutation(internal.generationJobs.create, {
        prospectId,
        type: "image",
        sceneNumber: scene,
        externalJobId: `minimax_img_${scene}`,
        status: "processing",
      });
    }

    const jobs = await t.query(api.generationJobs.getByProspect, { prospectId });
    expect(jobs).toHaveLength(3);
    expect(jobs.every((j) => j.type === "image")).toBe(true);
    expect(jobs.every((j) => j.status === "processing")).toBe(true);
    expect(jobs.every((j) => j.attempts === 1)).toBe(true);
  });

  test("getByExternalId for polling async jobs", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Poll Test",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P1", company: "C1", url: "https://c1.com" },
      ],
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });

    await t.mutation(internal.generationJobs.create, {
      prospectId: prospects[0]._id,
      type: "video",
      sceneNumber: 1,
      externalJobId: "hailuo_task_abc",
      status: "processing",
    });

    // Simulate polling by external ID
    const job = await t.query(internal.generationJobs.getByExternalId, {
      externalJobId: "hailuo_task_abc",
    });
    expect(job).not.toBeNull();
    expect(job!.type).toBe("video");
    expect(job!.sceneNumber).toBe(1);

    // Non-existent external ID returns null
    const missing = await t.query(internal.generationJobs.getByExternalId, {
      externalJobId: "does_not_exist",
    });
    expect(missing).toBeNull();
  });

  test("markFailed increments attempts for retry tracking", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Retry Test",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P1", company: "C1", url: "https://c1.com" },
      ],
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });

    const jobId = await t.mutation(internal.generationJobs.create, {
      prospectId: prospects[0]._id,
      type: "image",
      sceneNumber: 1,
      status: "processing",
    });

    // Fail once
    await t.mutation(internal.generationJobs.markFailed, {
      jobId,
      error: "API rate limit",
    });
    let jobs = await t.query(api.generationJobs.getByProspect, {
      prospectId: prospects[0]._id,
    });
    expect(jobs[0].attempts).toBe(2);
    expect(jobs[0].error).toBe("API rate limit");

    // Fail again
    await t.mutation(internal.generationJobs.markFailed, {
      jobId,
      error: "API timeout",
    });
    jobs = await t.query(api.generationJobs.getByProspect, {
      prospectId: prospects[0]._id,
    });
    expect(jobs[0].attempts).toBe(3);
    expect(jobs[0].error).toBe("API timeout"); // latest error
  });
});

// ============================================================================
// CROSS-MODULE QUERIES
// ============================================================================

describe("Cross-module queries", () => {
  test("campaigns.list returns multiple campaigns in desc order", async () => {
    const t = convexTest(schema);

    await t.mutation(api.campaigns.create, {
      name: "Campaign A",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P1", company: "C1", url: "https://c1.com" },
      ],
    });

    await t.mutation(api.campaigns.create, {
      name: "Campaign B",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P2", company: "C2", url: "https://c2.com" },
      ],
    });

    const campaigns = await t.query(api.campaigns.list, {});
    expect(campaigns).toHaveLength(2);
    expect(campaigns[0].name).toBe("Campaign B"); // newer first
    expect(campaigns[1].name).toBe("Campaign A");
  });

  test("getByCampaignAndStatus filters correctly across statuses", async () => {
    const t = convexTest(schema);

    const campaignId = await t.mutation(api.campaigns.create, {
      name: "Filter Test",
      brief: "b",
      senderName: "A",
      senderCompany: "Co",
      senderCompanyInfo: "i",
      voiceId: "v",
      prospects: [
        { name: "P1", company: "C1", url: "https://c1.com" },
        { name: "P2", company: "C2", url: "https://c2.com" },
        { name: "P3", company: "C3", url: "https://c3.com" },
      ],
    });

    const prospects = await t.query(api.prospects.getByCampaign, { campaignId });

    await t.mutation(internal.prospects.updateStatus, {
      prospectId: prospects[0]._id,
      status: "complete",
    });
    await t.mutation(internal.prospects.updateStatus, {
      prospectId: prospects[1]._id,
      status: "failed",
      error: "some error",
    });
    // prospects[2] stays queued

    const complete = await t.query(api.prospects.getByCampaignAndStatus, {
      campaignId,
      status: "complete",
    });
    expect(complete).toHaveLength(1);

    const failed = await t.query(api.prospects.getByCampaignAndStatus, {
      campaignId,
      status: "failed",
    });
    expect(failed).toHaveLength(1); // updateStatus sets status directly

    const queued = await t.query(api.prospects.getByCampaignAndStatus, {
      campaignId,
      status: "queued",
    });
    expect(queued).toHaveLength(1); // only P3 still queued
  });

  test("launch rejects already-launched campaigns", async () => {
    const t = convexTest(schema);

    const campaignId = await t.run(async (ctx) => {
      return await ctx.db.insert("campaigns", {
        name: "Running",
        brief: "b",
        senderName: "A",
        senderCompany: "Co",
        senderCompanyInfo: "i",
        voiceId: "v",
        status: "running",
        totalProspects: 0,
        completedProspects: 0,
      });
    });

    await expect(
      t.mutation(api.campaigns.launch, { campaignId })
    ).rejects.toThrow("Campaign already launched");
  });
});
