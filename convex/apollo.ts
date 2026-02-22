import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
export const searchProspects = internalAction({
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
