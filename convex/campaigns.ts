// =============================================================================
// CAMPAIGNS — Stub queries needed by the script agent.
// Owner: Person 1 (Convex Core). This is a MINIMAL stub for Person 3.
// Person 1 should expand with full CRUD, campaign launch logic, etc.
// =============================================================================

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/** Get a campaign by ID. Used by writeScript to pre-fetch sender/brief context. */
export const get = internalQuery({
  args: { id: v.id("campaigns") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
