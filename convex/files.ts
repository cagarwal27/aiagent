import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, { fileId }) => {
    return await ctx.storage.getUrl(fileId);
  },
});
