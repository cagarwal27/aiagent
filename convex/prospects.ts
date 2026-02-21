// =============================================================================
// PROSPECTS — Stub mutations/queries needed by the script agent.
// Owner: Person 1 (Convex Core). These are MINIMAL stubs for Person 3.
// Person 1 should expand with full CRUD, status transitions, etc.
// =============================================================================

import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get a prospect by ID. Used by writeScript to pre-fetch context. */
export const get = internalQuery({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Save the generated script to a prospect record. Called by the agent's saveScript tool. */
export const saveScript = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    script: v.object({
      scenes: v.array(
        v.object({
          sceneNumber: v.number(),
          narration: v.string(),
          visualPrompt: v.string(),
          durationSeconds: v.number(),
        })
      ),
      fullNarration: v.string(),
    }),
  },
  handler: async (ctx, { prospectId, script }) => {
    await ctx.db.patch(prospectId, { script });
  },
});

/** Save the agent thread ID so the frontend can subscribe to streaming. */
export const saveThreadId = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    threadId: v.string(),
  },
  handler: async (ctx, { prospectId, threadId }) => {
    await ctx.db.patch(prospectId, { scriptThreadId: threadId });
  },
});

/** Update prospect pipeline status. Called by workflow. */
export const updateStatus = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { prospectId, status, error }) => {
    const patch: Record<string, unknown> = { status };
    if (error !== undefined) patch.error = error;
    if (status === "complete") patch.completedAt = Date.now();
    await ctx.db.patch(prospectId, patch);
  },
});
