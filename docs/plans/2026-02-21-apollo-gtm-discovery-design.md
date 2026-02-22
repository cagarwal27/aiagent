# Apollo GTM Discovery — Design Document

**Date:** 2026-02-21
**Status:** Approved
**Scope:** Backend only (Apollo ICP discovery action + schema update)

---

## Problem

Prospects are currently manually seeded (hardcoded in `seedData.ts`) or manually entered via CSV in the Campaign Manager UI. There is no automated way to discover prospects by Ideal Customer Profile (ICP) criteria.

## Solution

Add an Apollo.io People Search integration that takes ICP filters and returns prospects with verified emails. These emails feed directly into the existing rtrvr.ai research pipeline (`retrieving.py` uses email as input).

## Architecture

```
User sets ICP filters (UI built later)
        │
        ▼
convex/apollo.ts — searchProspects(filters)
        │
        ▼  POST https://api.apollo.io/v1/mixed_people/search
        │
        ▼
Apollo returns matching contacts
        │
        ▼  Map to prospect shape: { name, company, title, url, email }
        │
        ▼
campaigns.create() with auto-discovered prospects
        │
        ▼
Existing pipeline: rtrvr.ai research (by email) → script → voice → images
```

## Frontend Modes (UI built later, not in this plan)

1. **Auto (GTM):** User sets ICP filters → Apollo finds prospects + emails → pipeline runs
2. **Manual:** User uploads company data → rtrvr.ai scopes and researches → pipeline runs

## What Gets Built

### 1. New file: `convex/apollo.ts`

**`searchProspects` action:**
- Args: ICP filter object (titles, industries, company size, location, limit)
- Calls Apollo People Search API: `POST https://api.apollo.io/v1/mixed_people/search`
- Maps response to prospect shape compatible with `campaigns.create()`
- Returns: `Array<{ name, company, title, url, email }>`

**`createCampaignFromICP` action:**
- Args: campaign data + ICP filters
- Calls `searchProspects` internally
- Creates campaign + prospects via existing mutations
- Stores ICP filters on campaign record for reproducibility
- Returns: campaignId

### 2. Schema update: `convex/schema.ts`

Add to `campaigns` table:
```typescript
icpFilters: v.optional(v.object({
  titles: v.optional(v.array(v.string())),
  industries: v.optional(v.array(v.string())),
  employeeRanges: v.optional(v.array(v.string())),
  locations: v.optional(v.array(v.string())),
  limit: v.optional(v.number()),
})),
source: v.optional(v.string()), // "apollo" | "manual"
```

### 3. Environment variable

```
APOLLO_API_KEY=   # https://app.apollo.io/#/settings/integrations/api-keys
```

Free tier: 10,000 credits/month, API access included, People Search does NOT consume credits (only enrichment does).

## Apollo API Details

**Endpoint:** `POST https://api.apollo.io/v1/mixed_people/search`

**Request shape:**
```json
{
  "api_key": "...",
  "person_titles": ["VP of Sales", "Head of Growth"],
  "organization_industry_tag_ids": ["fintech"],
  "organization_num_employees_ranges": ["51-200"],
  "person_locations": ["United States"],
  "per_page": 25
}
```

**Response mapping:**
| Apollo field | Prospect field |
|---|---|
| `first_name` + `last_name` | `name` |
| `organization.name` | `company` |
| `title` | `title` |
| `organization.website_url` | `url` |
| `email` | `email` |

## What Does NOT Change

- `convex/services.ts` — stubs remain as-is (Person 2 handles)
- `convex/workflow.ts` — pipeline stays the same
- `convex/agents/` — script agent unchanged
- Frontend — no changes in this plan
- No new npm dependencies required (uses `fetch`)

## Dependencies

- Apollo.io free account + API key
- No paid services required
