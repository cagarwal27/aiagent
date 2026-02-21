// =============================================================================
// SCRIPT AGENT — The AI brain that writes personalized video scripts.
// Owner: Person 3 (Script Agent)
//
// Uses MiniMax-M2.1 via OpenAI-compatible API (M2.1 supports tool calling).
// The agent receives pre-fetched prospect research + campaign brief in the
// prompt, writes a 3-scene script with narration + visual prompts, then
// calls saveScript to persist structured data for downstream voice/image
// generation.
//
// Delta streaming: the agent's text output streams word-by-word to the UI
// via Convex's real-time subscriptions. The audience watches the script
// being "written" live.
// =============================================================================

import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Model: MiniMax-M2.1 via OpenAI-compatible API
// ---------------------------------------------------------------------------
// NOTE: M2.1 supports tool/function calling. M2.5 does NOT (as of Jan 2025).
// If MiniMax adds tool support to M2.5 later, swap the model ID here.
// ---------------------------------------------------------------------------

const minimax = createOpenAI({
  name: "minimax",
  baseURL: "https://api.minimax.io/v1",
  apiKey: process.env.MINIMAX_API_KEY!,
});

// ---------------------------------------------------------------------------
// Tool: saveScript
// ---------------------------------------------------------------------------
// This is the ONLY tool the agent calls. It persists the structured 3-scene
// script to the prospects table. The workflow (Person 1) depends on this
// data existing before it proceeds to voice + image generation.
//
// DEMO RELIABILITY: The agent MUST call this. If it doesn't, the pipeline
// breaks. The system prompt emphasizes this heavily.
// ---------------------------------------------------------------------------

const saveScript = createTool({
  description:
    "Save the finalized 3-scene video script for a prospect. " +
    "You MUST call this exactly once after drafting the script. " +
    "Voice and image generation cannot proceed without this.",
  args: z.object({
    prospectId: z
      .string()
      .describe("The prospect document ID (provided in your prompt)"),
    scenes: z
      .array(
        z.object({
          sceneNumber: z
            .number()
            .describe("Scene number: 1, 2, or 3"),
          narration: z
            .string()
            .describe("The voiceover text for this scene (spoken aloud by AI voice)"),
          visualPrompt: z
            .string()
            .describe(
              "Detailed image generation prompt: describe subject, setting, lighting, style, mood"
            ),
          durationSeconds: z
            .number()
            .describe("Estimated spoken duration in seconds (roughly 2.5 words/sec)"),
        })
      )
      .describe("Exactly 3 scenes"),
  }),
  handler: async (ctx, { prospectId, scenes }) => {
    const fullNarration = scenes.map((s) => s.narration).join(" ");
    await ctx.runMutation(internal.prospects.saveScript, {
      prospectId: prospectId as any, // string → Id<"prospects"> coercion at runtime
      script: { scenes, fullNarration },
    });
    return {
      saved: true,
      sceneCount: scenes.length,
      wordCount: fullNarration.split(/\s+/).length,
    };
  },
});

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

export const scriptAgent = new Agent(components.agent, {
  name: "Script Writer",
  chat: minimax.chat("MiniMax-M2.1"),
  instructions: `You are a world-class sales video scriptwriter for personalized B2B outreach.

Your job: write a personalized 45-60 second video script for a specific prospect, then save it using the saveScript tool.

## Script Structure (exactly 3 scenes)

**Scene 1 — Hook (10-15 seconds, ~30-40 words)**
- Address the prospect BY NAME
- Reference something SPECIFIC about their company from the research
- Show genuine understanding of their world — not generic flattery
- Example: "Hi Sarah, I saw Acme just launched your new developer platform — building for enterprise teams is exciting, and I know the sales motion can be challenging."

**Scene 2 — Pain + Solution (20-25 seconds, ~50-60 words)**
- Name a concrete pain point relevant to their role or industry
- Position the sender's product as the solution to THAT SPECIFIC pain
- Use a detail from the research to make it feel personal
- Example: "Most platform companies tell us their SDRs spend hours personalizing outreach but still get low reply rates. At Vidcraft, we generate personalized video messages from your prospect list — no recording, no editing."

**Scene 3 — CTA (10-15 seconds, ~25-35 words)**
- Reference their company name one more time
- End with a clear, LOW-FRICTION call to action (15-min call, not "buy now")
- Warm and conversational
- Example: "I'd love to show you how this could work for Acme's outbound motion. Would a quick 15-minute call next week make sense?"

## Visual Prompt Guidelines

For each scene's visualPrompt, describe a professional image for AI generation:
- Modern, clean, cinematic aesthetic with natural lighting
- Relevant to the scene content (their industry, product concept, transformation)
- NO TEXT in the image (AI image generators handle text poorly)
- Include: main subject, setting/background, lighting, color palette, camera angle
- Style: photorealistic or polished 3D render, NOT cartoon or illustration

Good example: "Modern SaaS dashboard on a large monitor in a sunlit office, showing analytics charts and user metrics, soft warm lighting, shallow depth of field, clean minimalist desk, blue and white color palette"

Bad example: "A picture of a dashboard" (too vague)

## Critical Rules

- Total narration: UNDER 150 words across all 3 scenes
- Speak the prospect's name naturally (as you would say it aloud)
- Tone: warm, knowledgeable, genuinely helpful — NEVER salesy or pushy
- durationSeconds should reflect actual speaking time (~2.5 words per second)
- You MUST call the saveScript tool after writing — the pipeline depends on it
- Use the exact prospectId string provided in the prompt
- NARRATION MUST BE PLAIN SPOKEN TEXT — no markdown, no asterisks, no parenthetical stage directions, no special formatting. It will be read aloud by a text-to-speech engine exactly as written.
- visualPrompt must NOT contain the prospect's name or any real person's name — only describe scenes, objects, settings

## Process

1. Read the prospect and campaign context from the prompt
2. Write out the script naturally scene by scene — your text streams live to the viewer
3. Call saveScript with the prospectId and the 3 structured scenes`,

  tools: { saveScript },
  // NOTE: maxSteps is NOT a constructor param — pass it in streamText() calls.
  // maxRetries can be set here if needed for automatic retry on failure.
});
