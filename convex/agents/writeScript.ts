// =============================================================================
// WRITE SCRIPT — The internalAction that the workflow calls to generate a
// personalized script for one prospect.
// Owner: Person 3 (Script Agent)
//
// Called by: workflow.ts step 2 (Person 1)
//   await step.runAction(internal.agents.writeScript.writeScript, { prospectId, campaignId })
//
// What it does:
//   1. Pre-fetches ALL context (prospect + campaign) for reliability
//   2. Creates a persistent agent thread
//   3. Saves threadId to the prospect (so frontend can subscribe to streaming)
//   4. Runs the agent with delta streaming (text appears word-by-word in UI)
//   5. Verifies the script was saved (safety check for demo reliability)
//
// DESIGN DECISION: We pre-fetch data and pass it in the prompt rather than
// having the agent call tools to read it. This reduces tool calls from 3+
// to just 1 (saveScript), making the flow far more reliable for the demo.
// The agent still uses the tool framework (saveScript) to persist output.
// =============================================================================

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { scriptAgent } from "./scriptAgent";

export const writeScript = internalAction({
  args: {
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { prospectId, campaignId }) => {
    // -----------------------------------------------------------------
    // 1. Pre-fetch all context
    // -----------------------------------------------------------------
    // Doing this HERE (not in the agent via tools) means:
    //   - Fewer tool calls = fewer failure points
    //   - Faster execution (no agent round-trips to fetch data)
    //   - The agent focuses solely on writing + saving
    // -----------------------------------------------------------------

    const prospect = await ctx.runQuery(internal.prospects.get, {
      id: prospectId,
    });
    if (!prospect) {
      throw new Error(`Prospect ${prospectId} not found`);
    }

    const campaign = await ctx.runQuery(internal.campaigns.get, {
      id: campaignId,
    });
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // -----------------------------------------------------------------
    // 2. Create a persistent thread for this prospect
    // -----------------------------------------------------------------
    // The thread stores the conversation history. If we ever want to
    // let users "edit" or "regenerate" a script, we can continue the
    // same thread with follow-up prompts.
    // -----------------------------------------------------------------

    const { threadId } = await scriptAgent.createThread(ctx, {});

    // -----------------------------------------------------------------
    // 3. Save thread ID to the prospect
    // -----------------------------------------------------------------
    // The frontend subscribes to this threadId for delta streaming.
    // As the agent writes, text appears word-by-word in the UI.
    // -----------------------------------------------------------------

    await ctx.runMutation(internal.prospects.saveThreadId, {
      prospectId,
      threadId,
    });

    // -----------------------------------------------------------------
    // 4. Build the prompt with all context baked in
    // -----------------------------------------------------------------
    // Everything the agent needs is right here. No tool calls to fetch.
    // The only tool call it makes is saveScript at the end.
    // -----------------------------------------------------------------

    const prompt = buildPrompt(prospect, campaign, prospectId);

    // -----------------------------------------------------------------
    // 5. Run the agent with delta streaming
    // -----------------------------------------------------------------
    // saveStreamDeltas: streams chunks to the DB as they generate
    // chunking: "word" — splits on word boundaries (smooth reading)
    // throttleMs: 100 — writes at most every 100ms (good balance of
    //   real-time feel vs. write volume)
    // -----------------------------------------------------------------

    await scriptAgent.streamText(
      ctx,
      { threadId },
      {
        prompt,
      },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 100,
        },
      }
    );

    // -----------------------------------------------------------------
    // 6. Safety check: verify the script was saved
    // -----------------------------------------------------------------
    // If the agent completed without calling saveScript, the workflow
    // will proceed to voice generation and fail. Catching it here
    // gives a clear error message and allows the workflow to retry.
    // -----------------------------------------------------------------

    const updated = await ctx.runQuery(internal.prospects.get, {
      id: prospectId,
    });
    if (!updated?.script) {
      throw new Error(
        "Script agent completed but did not call saveScript. " +
          "The pipeline cannot continue without a saved script. " +
          "This may indicate a model/tool-calling issue."
      );
    }
  },
});

// ---------------------------------------------------------------------------
// Prompt builder — assembles all context into a clear, structured prompt
// ---------------------------------------------------------------------------

function buildPrompt(
  prospect: {
    name: string;
    company: string;
    title?: string | null;
    researchData?: string | null;
  },
  campaign: {
    senderName: string;
    senderCompany: string;
    senderCompanyInfo: string;
    brief: string;
  },
  prospectId: string
): string {
  const researchSection = prospect.researchData
    ? prospect.researchData
    : `No research data available. Use what you can infer from the company name "${prospect.company}" and write a plausible script. Focus on common pain points for companies like theirs.`;

  return `Write a personalized sales video script for this prospect.

=== PROSPECT ===
Name: ${prospect.name}
Company: ${prospect.company}
Title: ${prospect.title || "not specified"}

Company Research:
${researchSection}

=== SENDER (who this video is from) ===
Name: ${campaign.senderName}
Company: ${campaign.senderCompany}
Product / Value Prop: ${campaign.senderCompanyInfo}

=== CAMPAIGN BRIEF ===
${campaign.brief}

=== INSTRUCTIONS ===
Write the 3-scene script (Hook, Pain+Solution, CTA), then call saveScript with:
- prospectId: "${prospectId}"
- scenes: array of 3 scene objects

Draft the script text naturally first (it streams live to the viewer), then save the structured version.`;
}
