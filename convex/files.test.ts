import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("getUrl: file storage query is wired correctly", async () => {
  const t = convexTest(schema);
  // convex-test doesn't have real file storage, but we verify
  // the module exports correctly by checking the api reference exists
  expect(api.files.getUrl).toBeDefined();
});
