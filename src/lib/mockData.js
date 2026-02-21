export const STAGES = [
  "queued",
  "researching",
  "scripting",
  "generating_voice",
  "generating_visuals",
  "complete",
];

export const SAMPLE_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
export const SAMPLE_AUDIO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

let campaignCounter = 3;
let prospectCounter = 8;

export function createImageSvgDataUrl(label, bg, fg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'>
<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${bg}'/><stop offset='100%' stop-color='${fg}'/></linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
<text x='50%' y='50%' text-anchor='middle' fill='white' font-size='58' font-family='Trebuchet MS, sans-serif'>${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function makeProspect(name, company, stage = 0) {
  const now = Date.now();
  prospectCounter += 1;
  return {
    id: `p-${prospectCounter}`,
    name,
    company,
    stage,
    updatedAt: now,
    stageStartedAt: now,
    assets: {
      images: [
        {
          id: `img-${prospectCounter}-1`,
          type: "image",
          label: "Scene 1 Hook",
          url: createImageSvgDataUrl(`${company} Hook`, "#005f73", "#0a9396"),
        },
        {
          id: `img-${prospectCounter}-2`,
          type: "image",
          label: "Scene 2 Pain + Solution",
          url: createImageSvgDataUrl(`${company} Solution`, "#9b2226", "#ee9b00"),
        },
      ],
      audio: {
        id: `aud-${prospectCounter}`,
        type: "audio",
        label: "Narration Track",
        url: SAMPLE_AUDIO,
      },
      video: {
        id: `vid-${prospectCounter}`,
        type: "video",
        label: "Narrated Slideshow Preview",
        url: SAMPLE_VIDEO,
      },
    },
  };
}

export function seedCampaigns() {
  return [
    {
      id: "c-1",
      name: "Fintech Outbound - Q1",
      sender: "Sarah from Acme",
      brief: "Target compliance pain and speed-to-market blockers.",
      prospects: [
        makeProspect("Ava Reynolds", "Northstar Fintech", 5),
        makeProspect("Liam Chen", "Ledgerflow", 4),
        makeProspect("Maya Patel", "Trailbank", 2),
      ],
      createdAt: Date.now() - 1000 * 60 * 80,
    },
    {
      id: "c-2",
      name: "DevTools Expansion",
      sender: "Noah from OrbitOps",
      brief: "Focus on velocity, incident prevention, and platform reliability.",
      prospects: [
        makeProspect("Sofia Torres", "UnitScale", 1),
        makeProspect("Ethan Brooks", "Paycove", 3),
      ],
      createdAt: Date.now() - 1000 * 60 * 45,
    },
  ];
}

export function nextStage(current) {
  if (current >= STAGES.length - 1) return current;
  return Math.random() > 0.45 ? current + 1 : current;
}

export function getNextCampaignId() {
  campaignCounter += 1;
  return `c-${campaignCounter}`;
}

export const SAMPLE_SCRIPT = `Hey {{firstName}}, I noticed {{company}} just closed a Series B — congrats!

Most sales leaders at your stage tell us the same thing: their reps spend 40% of their time on research and personalization that still feels generic.

Vimero changes that. We use AI to research each prospect, write a custom script, generate a voice-over, and compose a personalized video — all in under 90 seconds.

Imagine your SDRs sending 200 personalized video messages a day without recording a single one. That's 3-5x more pipeline at half the cost.

I'd love to show you a live demo. Are you free for 15 minutes this week?`;

export const SAMPLE_SCENES = [
  {
    imageUrl: createImageSvgDataUrl("Hook — Pain Point", "#1a365d", "#2b6cb0"),
    narration: "Most sales teams waste 40% of their time on manual personalization that still feels generic.",
    duration: 4000,
  },
  {
    imageUrl: createImageSvgDataUrl("Solution — Vimero", "#22543d", "#38a169"),
    narration: "Vimero uses AI to research, script, voice, and compose a personalized video in under 90 seconds.",
    duration: 5000,
  },
  {
    imageUrl: createImageSvgDataUrl("CTA — Book a Demo", "#742a2a", "#e53e3e"),
    narration: "Imagine 200 personalized video messages a day — without recording a single one. Let's chat.",
    duration: 4000,
  },
];
