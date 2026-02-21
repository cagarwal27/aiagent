// =============================================================================
// CONVEX CONFIG — Component registration.
// Owner: Person 1 (Convex Core). Must include agent + workflow components.
// =============================================================================

import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import workflow from "@convex-dev/workflow/convex.config";

const app = defineApp();
app.use(agent);
app.use(workflow);

export default app;
