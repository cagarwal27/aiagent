import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// === Function 1: rtrvr.ai Research ===

export const scrapeProspect = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    const apiKey = process.env.RTRVR_API_KEY;
    if (!apiKey) throw new Error("[scrapeProspect] Missing RTRVR_API_KEY env var");

    const prospect = await ctx.runQuery(internal.prospects.get, { id: prospectId });
    if (!prospect) throw new Error(`[scrapeProspect] Prospect not found: ${prospectId}`);
    if (!prospect.url) throw new Error(`[scrapeProspect] Prospect has no URL: ${prospectId}`);

    console.log(`[scrapeProspect] Scraping ${prospect.url} for prospect ${prospectId}`);

    const response = await fetch("https://api.rtrvr.ai/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        urls: [prospect.url],
        response: { inlineOutputMaxBytes: 1048576 },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `[scrapeProspect] rtrvr.ai returned ${response.status}: ${body}`
      );
    }

    const data = await response.json();
    console.log(`[scrapeProspect] Research saved for prospect ${prospectId}`);

    await ctx.runMutation(internal.prospects.saveResearch, {
      prospectId,
      researchData: JSON.stringify(data),
    });
  },
});

// === Function 2: ElevenLabs TTS ===

export const generateAllVoice = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("[generateAllVoice] Missing ELEVENLABS_API_KEY env var");

    const prospect = await ctx.runQuery(internal.prospects.get, { id: prospectId });
    if (!prospect) throw new Error(`[generateAllVoice] Prospect not found: ${prospectId}`);
    if (!prospect.script?.scenes?.length) {
      throw new Error(`[generateAllVoice] No script/scenes for prospect ${prospectId}`);
    }

    const campaign = await ctx.runQuery(internal.campaigns.get, { id: prospect.campaignId });
    if (!campaign) throw new Error(`[generateAllVoice] Campaign not found: ${prospect.campaignId}`);
    if (!campaign.voiceId) throw new Error(`[generateAllVoice] Campaign has no voiceId: ${prospect.campaignId}`);

    console.log(`[generateAllVoice] Generating voice for ${prospect.script.scenes.length} scenes, prospect ${prospectId}`);

    for (const scene of prospect.script.scenes) {
      console.log(`[generateAllVoice] Scene ${scene.sceneNumber}: generating TTS`);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${campaign.voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: scene.narration,
            model_id: "eleven_flash_v2_5",
            voice_settings: {
              stability: 0.7,
              similarity_boost: 0.8,
              style: 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `[generateAllVoice] ElevenLabs returned ${response.status} for scene ${scene.sceneNumber}: ${body}`
        );
      }

      const audioBlob = await response.blob();
      const fileId = await ctx.storage.store(audioBlob);

      await ctx.runMutation(internal.prospects.saveSceneAsset, {
        prospectId,
        sceneNumber: scene.sceneNumber,
        type: "voice",
        fileId,
      });

      console.log(`[generateAllVoice] Scene ${scene.sceneNumber}: voice saved (${fileId})`);
    }

    console.log(`[generateAllVoice] All voice generated for prospect ${prospectId}`);
  },
});

// === Function 3: MiniMax image-01 ===

export const generateAllImages = internalAction({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) throw new Error("[generateAllImages] Missing MINIMAX_API_KEY env var");

    const prospect = await ctx.runQuery(internal.prospects.get, { id: prospectId });
    if (!prospect) throw new Error(`[generateAllImages] Prospect not found: ${prospectId}`);
    if (!prospect.script?.scenes?.length) {
      throw new Error(`[generateAllImages] No script/scenes for prospect ${prospectId}`);
    }

    console.log(`[generateAllImages] Generating images for ${prospect.script.scenes.length} scenes, prospect ${prospectId}`);

    for (const scene of prospect.script.scenes) {
      console.log(`[generateAllImages] Scene ${scene.sceneNumber}: generating image`);

      const response = await fetch("https://api.minimax.io/v1/image_generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "image-01",
          prompt: scene.visualPrompt,
          aspect_ratio: "16:9",
          n: 1,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `[generateAllImages] MiniMax returned ${response.status} for scene ${scene.sceneNumber}: ${body}`
        );
      }

      const data = await response.json();

      if (data.base_resp?.status_code !== 0) {
        throw new Error(
          `[generateAllImages] MiniMax error for scene ${scene.sceneNumber}: ${JSON.stringify(data.base_resp)}`
        );
      }

      const imageUrl = data.data?.image_urls?.[0];
      if (!imageUrl) {
        throw new Error(
          `[generateAllImages] No image URL in MiniMax response for scene ${scene.sceneNumber}`
        );
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `[generateAllImages] Failed to fetch image for scene ${scene.sceneNumber}: ${imageResponse.status}`
        );
      }

      const imageBlob = await imageResponse.blob();
      const fileId = await ctx.storage.store(imageBlob);

      await ctx.runMutation(internal.prospects.saveSceneAsset, {
        prospectId,
        sceneNumber: scene.sceneNumber,
        type: "image",
        fileId,
      });

      console.log(`[generateAllImages] Scene ${scene.sceneNumber}: image saved (${fileId})`);
    }

    console.log(`[generateAllImages] All images generated for prospect ${prospectId}`);
  },
});
