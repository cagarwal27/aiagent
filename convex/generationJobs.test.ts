import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

async function seedProspect(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const campaignId = await ctx.db.insert("campaigns", {
      name: "C", brief: "b", senderName: "A", senderCompany: "Co",
      senderCompanyInfo: "i", voiceId: "v", status: "running",
      totalProspects: 1, completedProspects: 0,
    });
    const prospectId = await ctx.db.insert("prospects", {
      campaignId, name: "John", company: "Stripe",
      url: "https://stripe.com", status: "generating_visuals",
    });
    return { campaignId, prospectId };
  });
}

test("create + getByProspect: creates a job and retrieves by prospect", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedProspect(t);

  await t.mutation(internal.generationJobs.create, {
    prospectId,
    type: "video",
    sceneNumber: 1,
    externalJobId: "minimax_task_123",
    status: "processing",
  });

  const jobs = await t.query(api.generationJobs.getByProspect, { prospectId });
  expect(jobs).toHaveLength(1);
  expect(jobs[0].type).toBe("video");
  expect(jobs[0].externalJobId).toBe("minimax_task_123");
  expect(jobs[0].attempts).toBe(1);
});

test("markFailed: sets error and increments attempts", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedProspect(t);

  const jobId = await t.mutation(internal.generationJobs.create, {
    prospectId,
    type: "image",
    sceneNumber: 2,
    status: "processing",
  });

  await t.mutation(internal.generationJobs.markFailed, {
    jobId,
    error: "MiniMax API timeout",
  });

  const jobs = await t.query(api.generationJobs.getByProspect, { prospectId });
  expect(jobs[0].status).toBe("failed");
  expect(jobs[0].error).toBe("MiniMax API timeout");
  expect(jobs[0].attempts).toBe(2);
});

test("getByExternalId: finds job by external task ID", async () => {
  const t = convexTest(schema);
  const { prospectId } = await seedProspect(t);

  await t.mutation(internal.generationJobs.create, {
    prospectId,
    type: "video",
    sceneNumber: 1,
    externalJobId: "hailuo_abc_789",
    status: "processing",
  });

  const job = await t.query(internal.generationJobs.getByExternalId, {
    externalJobId: "hailuo_abc_789",
  });
  expect(job).not.toBeNull();
  expect(job!.type).toBe("video");
});
