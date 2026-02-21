  Person 3 Delivery Status: READY TO INTEGRATE               
                                         
  The code is done for Person 3's scope. It cannot be        
  "tested" in isolation because it depends on:               
  1. Person 1 initializing the Convex project + installing   
  deps                                                       
  2. The _generated/ types that only exist after npx convex
  dev
  3. A real MINIMAX_API_KEY to test tool calling

  What Person 1 needs to do before Person 3's code works:

  # 1. Init Convex project (if not done)
  npm init -y
  npm install convex @convex-dev/agent @convex-dev/workflow
  @ai-sdk/openai zod

  # 2. Copy Person 3's files into the convex/ directory
  #    (already there: convex/agents/scriptAgent.ts,
  writeScript.ts, queries.ts)

  # 3. Use the schema.ts and convex.config.ts I provided (or
  merge with theirs)

  # 4. Start Convex dev server (generates _generated/ types)
  npx convex dev

  # 5. Set env var
  npx convex env set MINIMAX_API_KEY <key>

  Integration cheat sheet for the team:

  Person 1 — call it like this:
  // In workflow.ts
  await
  step.runAction(internal.agents.writeScript.writeScript, {
    prospectId,
    campaignId,
  });
  // After this returns, prospect.script is populated with 3
  scenes

  Person 2 — read the output like this:
  const prospect = await ctx.db.get(prospectId);
  for (const scene of prospect.script!.scenes) {
    // scene.narration → plain text, safe for ElevenLabs TTS
    // scene.visualPrompt → detailed prompt for MiniMax
  image-01
    // scene.sceneNumber → 1, 2, or 3
    // scene.durationSeconds → estimated speaking time
  }

  Person 4 — subscribe to streaming like this:
  import { useUIMessages } from "@convex-dev/agent/react";

  // prospect.scriptThreadId is set once agent starts (may be
   null initially)
  const { results } = useUIMessages(
    api.agents.queries.listMessages,
    { threadId: prospect.scriptThreadId! },
    { initialNumItems: 10, stream: true }
  );
  // Handle scriptThreadId === null with a loading state

  First thing to test once the project compiles:

  The #1 risk is MiniMax M2.1 tool calling with our nested
  schema. The very first test should be: create a campaign +
  prospect with fake data, trigger writeScript, and see if
  MiniMax produces a valid saveScript tool call. If it
  doesn't, we have two fallback options ready:
  1. Simplify the tool schema (flatten the scenes array)
  2. Switch to parsing structured JSON from the agent's text
  output instead of using tools

  Want me to write a quick test script that Person 1 can run
  once the project is up?