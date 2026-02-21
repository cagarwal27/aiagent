import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// STUB: Person 2 replaces with rtrvr.ai integration
export const scrapeProspect = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    console.log(`[STUB] scrapeProspect: ${prospectId}`);
    await ctx.runMutation(internal.prospects.saveResearch, {
      prospectId,
      researchData: JSON.stringify({
        stub: true,
        summary: "Stub research — Person 2 replaces with rtrvr.ai /scrape",
        company: "Example Corp",
        recentNews: "Just raised Series B",
        painPoints: ["Manual processes", "Scaling outreach"],
      }),
    });
  },
});

// STUB: Person 2 replaces with ElevenLabs integration
export const generateAllVoice = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    console.log(`[STUB] generateAllVoice: ${prospectId}`);
    // In real impl: read prospect.script.scenes, generate voice per scene,
    // store audio in file storage, call saveSceneAsset for each
  },
});

// STUB: Person 2 replaces with MiniMax image-01 integration
export const generateAllImages = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    console.log(`[STUB] generateAllImages: ${prospectId}`);
    // In real impl: read prospect.script.scenes, generate image per scene
    // via MiniMax image-01, store in file storage, call saveSceneAsset for each
  },
});
