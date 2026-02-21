import { mutation } from "./_generated/server";

export const seed = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("campaigns").first();
    if (existing) {
      return { status: "already_seeded", campaignId: existing._id };
    }

    const campaignId = await ctx.db.insert("campaigns", {
      name: "Q1 Fintech Outreach",
      brief:
        "Focus on compliance pain points and manual process elimination. Emphasize how AI automation replaces repetitive SDR work.",
      senderName: "Sarah Chen",
      senderCompany: "ProspectClip",
      senderCompanyInfo:
        "AI-powered personalized sales video platform. Generate custom prospect videos from a URL — no camera, no recording, no editing.",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
      status: "draft",
      totalProspects: 5,
      completedProspects: 0,
    });

    const prospects = [
      {
        name: "John Smith",
        company: "Stripe",
        title: "VP of Sales",
        url: "https://stripe.com",
        email: "john@stripe.com",
      },
      {
        name: "Emily Johnson",
        company: "Plaid",
        title: "Head of Growth",
        url: "https://plaid.com",
        email: "emily@plaid.com",
      },
      {
        name: "Michael Lee",
        company: "Brex",
        title: "SDR Manager",
        url: "https://brex.com",
        email: "michael@brex.com",
      },
      {
        name: "Sarah Davis",
        company: "Ramp",
        title: "VP of Revenue",
        url: "https://ramp.com",
        email: "sarah@ramp.com",
      },
      {
        name: "David Wilson",
        company: "Mercury",
        title: "Sales Director",
        url: "https://mercury.com",
        email: "david@mercury.com",
      },
    ];

    for (const p of prospects) {
      await ctx.db.insert("prospects", {
        campaignId,
        ...p,
        status: "queued",
      });
    }

    return { status: "seeded", campaignId };
  },
});
