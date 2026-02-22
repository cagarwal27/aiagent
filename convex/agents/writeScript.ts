// =============================================================================
// WRITE SCRIPT — Direct API call to MiniMax (no agent tool-calling).
//
// The agent approach was unreliable — MiniMax M2.1 intermittently fails to
// call the saveScript tool. For hackathon reliability, we make a direct
// chat completion call, ask for JSON output, parse it, and save directly.
// =============================================================================

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const writeScript = internalAction({
  args: {
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { prospectId, campaignId }) => {
    const prospect = await ctx.runQuery(internal.prospects.get, {
      id: prospectId,
    });
    if (!prospect) throw new Error(`Prospect ${prospectId} not found`);

    const campaign = await ctx.runQuery(internal.campaigns.get, {
      id: campaignId,
    });
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) throw new Error("Missing MINIMAX_API_KEY");

    const researchSection = prospect.researchData
      ? prospect.researchData
      : `No research data available. Use what you can infer from the company name "${prospect.company}".`;

    const systemPrompt = `You are a world-class sales video scriptwriter. You write personalized 45-60 second B2B outreach scripts.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation. Just the JSON object.

The JSON must have this exact shape:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "spoken text for scene 1",
      "visualPrompt": "image generation prompt for scene 1",
      "durationSeconds": 12
    },
    {
      "sceneNumber": 2,
      "narration": "spoken text for scene 2",
      "visualPrompt": "image generation prompt for scene 2",
      "durationSeconds": 15
    },
    {
      "sceneNumber": 3,
      "narration": "spoken text for scene 3",
      "visualPrompt": "image generation prompt for scene 3",
      "durationSeconds": 10
    }
  ],
  "fullNarration": "all narrations joined together"
}

Script rules:
- Scene 1 (Hook): Address prospect by name, reference their company research
- Scene 2 (Pain+Solution): Name a pain point, position sender's product as solution
- Scene 3 (CTA): Reference their company, end with low-friction CTA
- Total narration UNDER 150 words
- Narration is PLAIN SPOKEN TEXT — no markdown, no asterisks, no stage directions
- visualPrompt: detailed image prompts, NO text in images, NO real person names
- durationSeconds: ~2.5 words per second`;

    const userPrompt = `Write a script for this prospect:

Prospect: ${prospect.name} at ${prospect.company}
Title: ${prospect.title || "not specified"}

Research:
${researchSection}

Sender: ${campaign.senderName} from ${campaign.senderCompany}
Product: ${campaign.senderCompanyInfo}
Brief: ${campaign.brief}

Respond with ONLY the JSON object. No other text.`;

    console.log(`[writeScript] Calling MiniMax for prospect ${prospectId}`);

    const response = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MiniMax returned ${response.status}: ${body}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        `MiniMax returned no content: ${JSON.stringify(data).slice(0, 500)}`
      );
    }

    console.log(`[writeScript] Got response, parsing JSON...`);

    // Strip markdown code fences if the model wraps in ```json
    const cleaned = content
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let script;
    try {
      script = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(
        `Failed to parse script JSON: ${(e as Error).message}\nRaw: ${cleaned.slice(0, 500)}`
      );
    }

    // Validate structure
    if (!script.scenes || !Array.isArray(script.scenes) || script.scenes.length < 1) {
      throw new Error(`Invalid script structure: ${JSON.stringify(script).slice(0, 500)}`);
    }

    // Ensure fullNarration exists
    if (!script.fullNarration) {
      script.fullNarration = script.scenes.map((s: any) => s.narration).join(" ");
    }

    // Ensure all required fields exist on each scene
    for (const scene of script.scenes) {
      if (!scene.sceneNumber || !scene.narration || !scene.visualPrompt) {
        throw new Error(`Scene missing required fields: ${JSON.stringify(scene)}`);
      }
      if (!scene.durationSeconds) {
        scene.durationSeconds = Math.ceil(scene.narration.split(/\s+/).length / 2.5);
      }
    }

    console.log(`[writeScript] Saving script with ${script.scenes.length} scenes`);

    await ctx.runMutation(internal.prospects.saveScript, {
      prospectId,
      script: {
        scenes: script.scenes.map((s: any) => ({
          sceneNumber: s.sceneNumber,
          narration: s.narration,
          visualPrompt: s.visualPrompt,
          durationSeconds: s.durationSeconds,
        })),
        fullNarration: script.fullNarration,
      },
    });

    console.log(`[writeScript] Script saved for prospect ${prospectId}`);
  },
});
