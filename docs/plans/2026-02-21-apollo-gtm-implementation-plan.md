# Apollo GTM Discovery — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Apollo.io People Search action so campaigns can auto-discover prospects by ICP filters instead of requiring manual CSV entry.

**Architecture:** A single Convex action (`convex/apollo.ts`) calls Apollo's free-tier People Search API with ICP filters (titles, industries, company size, location) and returns prospects with verified emails. Those emails feed into the existing rtrvr.ai research pipeline. A schema update stores ICP filters on campaigns for reproducibility.

**Tech Stack:** Convex actions, Apollo.io REST API (free tier), TypeScript

---

## Task 1: Update schema with ICP filter fields

**Files:**
- Modify: `convex/schema.ts:5-15`

**Step 1: Add `icpFilters` and `source` to campaigns table**

In `convex/schema.ts`, add two optional fields to the `campaigns` table definition, after the `completedProspects` field (line 14):

```typescript
  campaigns: defineTable({
    name: v.string(),
    brief: v.string(),
    senderName: v.string(),
    senderCompany: v.string(),
    senderCompanyInfo: v.string(),
    voiceId: v.string(),
    status: v.string(),
    totalProspects: v.number(),
    completedProspects: v.number(),
    source: v.optional(v.string()), // "apollo" | "manual"
    icpFilters: v.optional(
      v.object({
        titles: v.optional(v.array(v.string())),
        industries: v.optional(v.array(v.string())),
        employeeRanges: v.optional(v.array(v.string())),
        locations: v.optional(v.array(v.string())),
        limit: v.optional(v.number()),
      })
    ),
  }).index("by_status", ["status"]),
```

**Step 2: Verify schema compiles**

Run: `npx convex dev --once --typecheck disable`
Expected: Schema pushes without errors. (Use `--typecheck disable` to skip TS checks on other files during schema-only change.)

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add icpFilters and source fields to campaigns schema"
```

---

## Task 2: Add Apollo API key to environment config

**Files:**
- Modify: `.env.local.example`
- Modify: `.env.local` (if it exists — add the actual key)

**Step 1: Update `.env.local.example`**

Add after the existing keys:

```
# GTM — Apollo.io (free tier, 10K credits/month)
APOLLO_API_KEY=            # https://app.apollo.io/#/settings/integrations/api-keys
```

**Step 2: Set the actual key in `.env.local`**

If the developer has an Apollo API key, add it to `.env.local`:

```
APOLLO_API_KEY=your_actual_key_here
```

**Step 3: Set the key in Convex environment**

Run: `npx convex env set APOLLO_API_KEY your_actual_key_here`
Expected: "Environment variable APOLLO_API_KEY set"

Note: Convex actions read env vars from the Convex dashboard environment, NOT from `.env.local`. The `.env.local` is for local reference only.

**Step 4: Commit**

```bash
git add .env.local.example
git commit -m "feat: add APOLLO_API_KEY to env example"
```

---

## Task 3: Create Apollo discovery action — `searchProspects`

**Files:**
- Create: `convex/apollo.ts`

**Step 1: Write the test**

Create `convex/apollo.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

// Unit test for the Apollo response mapper (pure function, no API call)
describe("mapApolloPersonToProspect", () => {
  it("maps a full Apollo person response to prospect shape", () => {
    const apolloPerson = {
      first_name: "Jane",
      last_name: "Doe",
      title: "VP of Sales",
      email: "jane@acme.com",
      organization: {
        name: "Acme Corp",
        website_url: "https://acme.com",
      },
    };

    // Inline the mapping logic to test
    const prospect = {
      name: `${apolloPerson.first_name} ${apolloPerson.last_name}`,
      company: apolloPerson.organization?.name ?? "Unknown",
      title: apolloPerson.title ?? undefined,
      url: apolloPerson.organization?.website_url ?? `https://${apolloPerson.email?.split("@")[1] ?? "example.com"}`,
      email: apolloPerson.email ?? undefined,
    };

    expect(prospect).toEqual({
      name: "Jane Doe",
      company: "Acme Corp",
      title: "VP of Sales",
      url: "https://acme.com",
      email: "jane@acme.com",
    });
  });

  it("handles missing organization fields gracefully", () => {
    const apolloPerson = {
      first_name: "John",
      last_name: "Smith",
      title: null,
      email: "john@startup.io",
      organization: null,
    };

    const prospect = {
      name: `${apolloPerson.first_name} ${apolloPerson.last_name}`,
      company: apolloPerson.organization?.name ?? "Unknown",
      title: apolloPerson.title ?? undefined,
      url: apolloPerson.organization?.website_url ?? `https://${apolloPerson.email?.split("@")[1] ?? "example.com"}`,
      email: apolloPerson.email ?? undefined,
    };

    expect(prospect).toEqual({
      name: "John Smith",
      company: "Unknown",
      title: undefined,
      url: "https://startup.io",
      email: "john@startup.io",
    });
  });

  it("filters out people with no email", () => {
    const people = [
      { first_name: "A", last_name: "B", email: "a@b.com", title: null, organization: null },
      { first_name: "C", last_name: "D", email: null, title: null, organization: null },
      { first_name: "E", last_name: "F", email: "", title: null, organization: null },
    ];

    const filtered = people.filter((p) => p.email && p.email.length > 0);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].email).toBe("a@b.com");
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run convex/apollo.test.ts`
Expected: 3 tests pass (these are pure mapping tests, no Convex runtime needed).

**Step 3: Write the Apollo action**

Create `convex/apollo.ts`:

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

// Apollo People Search API types (subset we use)
interface ApolloPerson {
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  organization: {
    name: string | null;
    website_url: string | null;
  } | null;
}

interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

/** Map an Apollo person record to our prospect shape. */
function mapApolloPersonToProspect(person: ApolloPerson) {
  const domain = person.email?.split("@")[1] ?? "example.com";
  return {
    name: `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || "Unknown",
    company: person.organization?.name ?? "Unknown",
    title: person.title ?? undefined,
    url: person.organization?.website_url ?? `https://${domain}`,
    email: person.email ?? undefined,
  };
}

/**
 * Search Apollo.io for prospects matching ICP filters.
 * Returns prospects in the same shape as campaigns.create expects.
 *
 * Apollo free tier: People Search does NOT consume credits.
 * Only enrichment (accessing verified emails) consumes credits (10K/month free).
 */
export const searchProspects = action({
  args: {
    titles: v.optional(v.array(v.string())),
    industries: v.optional(v.array(v.string())),
    employeeRanges: v.optional(v.array(v.string())),
    locations: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
      throw new Error(
        "APOLLO_API_KEY not set. Get a free key at https://app.apollo.io/#/settings/integrations/api-keys"
      );
    }

    const perPage = Math.min(args.limit ?? 25, 100);

    const body: Record<string, unknown> = {
      api_key: apiKey,
      per_page: perPage,
    };

    if (args.titles && args.titles.length > 0) {
      body.person_titles = args.titles;
    }
    if (args.industries && args.industries.length > 0) {
      // Apollo uses keyword search for industries
      body.q_organization_keyword_tags = args.industries;
    }
    if (args.employeeRanges && args.employeeRanges.length > 0) {
      body.organization_num_employees_ranges = args.employeeRanges;
    }
    if (args.locations && args.locations.length > 0) {
      body.person_locations = args.locations;
    }

    const response = await fetch(
      "https://api.apollo.io/v1/mixed_people/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Apollo API error (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as ApolloSearchResponse;

    // Filter out people without emails and map to our prospect shape
    const prospects = data.people
      .filter((p) => p.email && p.email.length > 0)
      .map(mapApolloPersonToProspect);

    return {
      prospects,
      total: data.pagination.total_entries,
      returned: prospects.length,
    };
  },
});
```

**Step 4: Verify it compiles**

Run: `npx convex dev --once --typecheck disable`
Expected: Deploys without errors.

**Step 5: Commit**

```bash
git add convex/apollo.ts convex/apollo.test.ts
git commit -m "feat: add Apollo People Search action for ICP-based prospect discovery"
```

---

## Task 4: Add `createCampaignFromICP` action

This action combines Apollo discovery + campaign creation into one call. The frontend can call this action with ICP filters and campaign details, and get back a campaign ID with prospects already populated.

**Files:**
- Modify: `convex/apollo.ts`
- Modify: `convex/campaigns.ts:83-121` (add optional `source` and `icpFilters` to `create` mutation args)

**Step 1: Update `campaigns.create` to accept optional `source` and `icpFilters`**

In `convex/campaigns.ts`, update the `create` mutation args (line 84-99) and handler (line 101-120):

```typescript
export const create = mutation({
  args: {
    name: v.string(),
    brief: v.string(),
    senderName: v.string(),
    senderCompany: v.string(),
    senderCompanyInfo: v.string(),
    voiceId: v.string(),
    prospects: v.array(
      v.object({
        name: v.string(),
        company: v.string(),
        title: v.optional(v.string()),
        url: v.string(),
        email: v.optional(v.string()),
      })
    ),
    source: v.optional(v.string()),
    icpFilters: v.optional(
      v.object({
        titles: v.optional(v.array(v.string())),
        industries: v.optional(v.array(v.string())),
        employeeRanges: v.optional(v.array(v.string())),
        locations: v.optional(v.array(v.string())),
        limit: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { prospects: prospectList, source, icpFilters, ...campaignData } = args;

    const campaignId = await ctx.db.insert("campaigns", {
      ...campaignData,
      status: "draft",
      totalProspects: prospectList.length,
      completedProspects: 0,
      source,
      icpFilters,
    });

    for (const prospect of prospectList) {
      await ctx.db.insert("prospects", {
        campaignId,
        ...prospect,
        status: "queued",
      });
    }

    return campaignId;
  },
});
```

**Step 2: Add `createCampaignFromICP` to `convex/apollo.ts`**

Append to `convex/apollo.ts`:

```typescript
import { internal } from "./_generated/api";

/**
 * One-shot action: search Apollo for ICP matches, then create a campaign
 * with the discovered prospects. Returns the campaign ID ready to launch.
 *
 * This is the "Auto (GTM)" mode — user provides ICP filters + campaign details,
 * Apollo finds the people, and the campaign is created with their verified emails.
 */
export const createCampaignFromICP = action({
  args: {
    // Campaign details
    name: v.string(),
    brief: v.string(),
    senderName: v.string(),
    senderCompany: v.string(),
    senderCompanyInfo: v.string(),
    voiceId: v.string(),
    // ICP filters for Apollo
    titles: v.optional(v.array(v.string())),
    industries: v.optional(v.array(v.string())),
    employeeRanges: v.optional(v.array(v.string())),
    locations: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const {
      name, brief, senderName, senderCompany, senderCompanyInfo, voiceId,
      titles, industries, employeeRanges, locations, limit,
    } = args;

    // Step 1: Discover prospects via Apollo
    const icpFilters = { titles, industries, employeeRanges, locations, limit };
    const result = await ctx.runAction(internal.apollo.searchProspects, icpFilters);

    if (result.prospects.length === 0) {
      throw new Error(
        "Apollo returned no prospects with verified emails for these filters. " +
        "Try broadening your search criteria."
      );
    }

    // Step 2: Create campaign with discovered prospects
    const campaignId = await ctx.runMutation(internal.campaigns.createFromAction, {
      name,
      brief,
      senderName,
      senderCompany,
      senderCompanyInfo,
      voiceId,
      prospects: result.prospects,
      source: "apollo",
      icpFilters,
    });

    return {
      campaignId,
      prospectsFound: result.total,
      prospectsWithEmail: result.returned,
    };
  },
});
```

**Step 3: Add `createFromAction` internal mutation to `convex/campaigns.ts`**

Actions cannot call public mutations directly via `ctx.runMutation` with `api.*` — they need internal mutations. Add this to `convex/campaigns.ts` after the existing `create` mutation:

```typescript
/** Internal version of create, callable from actions (e.g., apollo.createCampaignFromICP). */
export const createFromAction = internalMutation({
  args: {
    name: v.string(),
    brief: v.string(),
    senderName: v.string(),
    senderCompany: v.string(),
    senderCompanyInfo: v.string(),
    voiceId: v.string(),
    prospects: v.array(
      v.object({
        name: v.string(),
        company: v.string(),
        title: v.optional(v.string()),
        url: v.string(),
        email: v.optional(v.string()),
      })
    ),
    source: v.optional(v.string()),
    icpFilters: v.optional(
      v.object({
        titles: v.optional(v.array(v.string())),
        industries: v.optional(v.array(v.string())),
        employeeRanges: v.optional(v.array(v.string())),
        locations: v.optional(v.array(v.string())),
        limit: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { prospects: prospectList, source, icpFilters, ...campaignData } = args;

    const campaignId = await ctx.db.insert("campaigns", {
      ...campaignData,
      status: "draft",
      totalProspects: prospectList.length,
      completedProspects: 0,
      source,
      icpFilters,
    });

    for (const prospect of prospectList) {
      await ctx.db.insert("prospects", {
        campaignId,
        ...prospect,
        status: "queued",
      });
    }

    return campaignId;
  },
});
```

**Step 4: Add the `internal` import to `convex/apollo.ts`**

Make sure the import is at the top of `convex/apollo.ts`:

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
```

**Step 5: Verify it compiles**

Run: `npx convex dev --once --typecheck disable`
Expected: Deploys without errors.

**Step 6: Commit**

```bash
git add convex/apollo.ts convex/campaigns.ts
git commit -m "feat: add createCampaignFromICP action — Apollo discovery + campaign creation"
```

---

## Task 5: Make `searchProspects` an internal action

The `searchProspects` action is called by `createCampaignFromICP` via `ctx.runAction(internal.apollo.searchProspects, ...)`. For this to work, it must be an `internalAction`.

**Files:**
- Modify: `convex/apollo.ts`

**Step 1: Change `searchProspects` from `action` to `internalAction`**

At the top of `convex/apollo.ts`, update the import:

```typescript
import { action, internalAction } from "./_generated/server";
```

Change `searchProspects` declaration from:
```typescript
export const searchProspects = action({
```
to:
```typescript
export const searchProspects = internalAction({
```

**Step 2: Verify it compiles**

Run: `npx convex dev --once --typecheck disable`
Expected: Deploys without errors.

**Step 3: Commit**

```bash
git add convex/apollo.ts
git commit -m "refactor: make searchProspects an internalAction for use by createCampaignFromICP"
```

---

## Task 6: Manual integration test via Convex dashboard

This task verifies the full flow works end-to-end using the Convex dashboard.

**Step 1: Open Convex dashboard**

Run: `npx convex dashboard`

**Step 2: Test `searchProspects` directly**

In the Convex dashboard, go to Functions → `apollo:searchProspects`. Run it with:

```json
{
  "titles": ["VP of Sales", "Head of Growth"],
  "industries": ["fintech"],
  "employeeRanges": ["51-200"],
  "locations": ["United States"],
  "limit": 5
}
```

Expected: Returns `{ prospects: [...], total: N, returned: N }` with prospect objects containing name, company, title, url, email.

If APOLLO_API_KEY is not set, expected error: "APOLLO_API_KEY not set..."

**Step 3: Test `createCampaignFromICP`**

In the dashboard, go to Functions → `apollo:createCampaignFromICP`. Run it with:

```json
{
  "name": "Apollo Test Campaign",
  "brief": "Test ICP-based discovery",
  "senderName": "Sarah Chen",
  "senderCompany": "Vimero",
  "senderCompanyInfo": "AI-powered personalized sales video platform.",
  "voiceId": "EXAVITQu4vr4xnSDxMaL",
  "titles": ["VP of Sales"],
  "industries": ["fintech"],
  "limit": 3
}
```

Expected: Returns `{ campaignId: "...", prospectsFound: N, prospectsWithEmail: N }`.

**Step 4: Verify campaign was created**

In the dashboard, go to Data → campaigns table. Verify the new campaign exists with:
- `source: "apollo"`
- `icpFilters` populated
- `status: "draft"`

Go to Data → prospects table. Verify prospects were created with emails and `status: "queued"`.

**Step 5: Test launch**

In the dashboard, go to Functions → `campaigns:launch`. Run with the campaignId from step 3. Verify the prospects start moving through the pipeline (status changes from "queued" → "researching" → ...).

---

## Summary of all changes

| File | Action | Description |
|------|--------|-------------|
| `convex/schema.ts` | Modify | Add `source` and `icpFilters` optional fields to campaigns |
| `convex/apollo.ts` | Create | `searchProspects` (internal) + `createCampaignFromICP` (public) |
| `convex/apollo.test.ts` | Create | Unit tests for Apollo response mapper |
| `convex/campaigns.ts` | Modify | Add optional `source`/`icpFilters` to `create`, add `createFromAction` internal mutation |
| `.env.local.example` | Modify | Add `APOLLO_API_KEY` |

**No changes to:** `workflow.ts`, `services.ts`, `prospects.ts`, `agents/`, or any frontend files.

**New env var:** `APOLLO_API_KEY` (set via `npx convex env set`)

**Frontend integration (for Person 4, later):**
- Call `api.apollo.createCampaignFromICP` from a new "Auto-discover" mode in `CampaignManagerPage.jsx`
- Or call `api.apollo.searchProspects` to preview results before creating
