import { v } from "convex/values";
import { internal } from "./_generated/api";
import { workflow } from "./workflowInit";

export const prospectPipeline = workflow.define({
  args: {
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
  },
  handler: async (step, { prospectId, campaignId }) => {
    // Step 1: Research prospect via rtrvr.ai
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "researching",
    });
    await step.runAction(internal.services.scrapeProspect, {
      prospectId,
    });

    // Step 2: Write personalized script via AI agent
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "scripting",
    });
    await step.runAction(internal.agents.writeScript.writeScript, {
      prospectId,
      campaignId,
    });

    // Step 3: Generate voice narration via ElevenLabs
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_voice",
    });
    await step.runAction(internal.services.generateAllVoice, {
      prospectId,
    });

    // Step 4: Generate images via MiniMax image-01
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "generating_images",
    });
    await step.runAction(internal.services.generateAllImages, {
      prospectId,
    });

    // Step 5: Mark complete and update campaign counter
    await step.runMutation(internal.prospects.updateStatus, {
      prospectId,
      status: "complete",
    });
    await step.runMutation(internal.campaigns.incrementCompleted, {
      campaignId,
    });
  },
});
