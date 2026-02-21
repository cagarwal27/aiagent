import { test, expect } from "vitest";
import { internal } from "./_generated/api";

test("workflow function references resolve correctly", () => {
  // Validates that all internal function references used by the workflow
  // are importable and defined. Full workflow execution requires a real Convex backend.
  expect(internal.prospects.updateStatus).toBeDefined();
  expect(internal.services.scrapeProspect).toBeDefined();
  expect(internal.agents.writeScript.writeScript).toBeDefined();
  expect(internal.services.generateAllVoice).toBeDefined();
  expect(internal.services.generateAllImages).toBeDefined();
  expect(internal.campaigns.incrementCompleted).toBeDefined();
});
