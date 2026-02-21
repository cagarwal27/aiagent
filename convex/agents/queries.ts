// =============================================================================
// AGENT QUERIES — Exposes streaming messages for the frontend.
// Owner: Person 3 (Script Agent)
//
// Person 4 (Frontend) uses these queries via useUIMessages() to show
// the script being written in real-time (delta streaming).
//
// Usage in frontend:
//   import { useUIMessages, useSmoothText } from "@convex-dev/agent/react";
//
//   const { results } = useUIMessages(
//     api.agents.queries.listMessages,
//     { threadId },
//     { initialNumItems: 10, stream: true }
//   );
// =============================================================================

import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { components } from "../_generated/api";

// ---------------------------------------------------------------------------
// These helpers are confirmed exports from @convex-dev/agent.
// If import fails, check that @convex-dev/agent is installed and up to date.
// ---------------------------------------------------------------------------
import { vStreamArgs, listUIMessages, syncStreams } from "@convex-dev/agent";

/**
 * List messages for a thread with streaming support.
 *
 * The frontend calls this via useUIMessages() which auto-subscribes
 * to real-time updates. As the agent writes, new deltas appear
 * automatically — zero polling, zero WebSocket code.
 */
export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    // listUIMessages: returns paginated messages for the thread
    const paginated = await listUIMessages(ctx, components.agent, args);
    // syncStreams: merges in-progress stream deltas into the message list
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});
