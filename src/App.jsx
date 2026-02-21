import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import CampaignManagerPage from "./pages/CampaignManagerPage";
import PipelineDashboardPage from "./pages/PipelineDashboardPage";
import GalleryPage from "./pages/GalleryPage";

const STAGES = ["queued", "researching", "scripting", "generating_voice", "generating_visuals", "complete"];
const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const SAMPLE_AUDIO = "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

let campaignCounter = 3;
let prospectCounter = 8;

function createImageSvgDataUrl(label, bg, fg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'>
<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${bg}'/><stop offset='100%' stop-color='${fg}'/></linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
<text x='50%' y='50%' text-anchor='middle' fill='white' font-size='58' font-family='Trebuchet MS, sans-serif'>${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeProspect(name, company, stage = 0) {
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

function seedCampaigns() {
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

function nextStage(current) {
  if (current >= STAGES.length - 1) return current;
  return Math.random() > 0.45 ? current + 1 : current;
}

function App() {
  const [campaigns, setCampaigns] = useState(seedCampaigns);
  const [activeCampaignId, setActiveCampaignId] = useState("c-1");
  const [selectedProspectId, setSelectedProspectId] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCampaigns((current) =>
        current.map((campaign) => ({
          ...campaign,
          prospects: campaign.prospects.map((prospect) => {
            const stage = nextStage(prospect.stage);
            if (stage !== prospect.stage) {
              const now = Date.now();
              return { ...prospect, stage, updatedAt: now, stageStartedAt: now };
            }
            return prospect;
          }),
        }))
      );
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0] ?? null,
    [campaigns, activeCampaignId]
  );

  const selectedProspect = useMemo(() => {
    if (!activeCampaign) return null;
    return activeCampaign.prospects.find((p) => p.id === selectedProspectId) ?? activeCampaign.prospects[0] ?? null;
  }, [activeCampaign, selectedProspectId]);

  useEffect(() => {
    if (!activeCampaign) return;
    if (!selectedProspect) {
      setSelectedProspectId(activeCampaign.prospects[0]?.id ?? null);
    }
  }, [activeCampaign, selectedProspect]);

  const assetsForSelected = useMemo(() => {
    if (!selectedProspect) return [];
    const assets = [];
    if (selectedProspect.stage >= 3) assets.push(selectedProspect.assets.audio);
    if (selectedProspect.stage >= 4) assets.push(...selectedProspect.assets.images);
    if (selectedProspect.stage >= 5) assets.push(selectedProspect.assets.video);
    return assets;
  }, [selectedProspect]);

  const selectedAsset = useMemo(
    () => assetsForSelected.find((asset) => asset.id === selectedAssetId) ?? assetsForSelected[0] ?? null,
    [assetsForSelected, selectedAssetId]
  );

  const onCreateCampaign = async (payload) => {
    campaignCounter += 1;
    const newId = `c-${campaignCounter}`;
    await new Promise((resolve) => setTimeout(resolve, 3200));
    const lines = payload.prospectsCsv
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const prospects =
      lines.length > 0
        ? lines.map((line, index) => {
            const [name, company] = line.split(",").map((part) => part?.trim() ?? "");
            return makeProspect(name || "New Prospect", company || "Unknown Co", index === 0 ? 5 : 0);
          })
        : [makeProspect("New Prospect", "Unknown Co", 5)];

    const campaign = {
      id: newId,
      name: payload.name.trim(),
      sender: payload.sender.trim() || "Sender",
      brief: payload.brief.trim() || "No brief set",
      prospects,
      createdAt: Date.now(),
    };

    setCampaigns((current) => [campaign, ...current]);
    setActiveCampaignId(newId);
    setSelectedProspectId(prospects[0]?.id ?? null);
    setSelectedAssetId(prospects[0]?.assets.video.id ?? null);
    return {
      campaignId: newId,
      prospectId: prospects[0]?.id ?? null,
      assetId: prospects[0]?.assets.video.id ?? null,
    };
  };

  const onUpdateCampaign = (campaignId, payload) => {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              name: payload.name.trim() || campaign.name,
              sender: payload.sender.trim() || campaign.sender,
              brief: payload.brief.trim() || campaign.brief,
            }
          : campaign
      )
    );
  };

  const onDeleteCampaign = (campaignId) => {
    setCampaigns((current) => current.filter((campaign) => campaign.id !== campaignId));
    if (campaignId === activeCampaignId) {
      const fallback = campaigns.find((campaign) => campaign.id !== campaignId);
      setActiveCampaignId(fallback?.id ?? null);
      setSelectedProspectId(fallback?.prospects[0]?.id ?? null);
    }
  };

  return (
    <BrowserRouter>
      <main className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">ProspectClip Ops</p>
            <h1>Sales Video Workflow Console</h1>
          </div>
          <div className="topbar-actions">
            <nav className="nav-tabs">
              <NavLink to="/campaigns">Campaign Manager</NavLink>
              <NavLink to="/pipeline">Pipeline Dashboard</NavLink>
              <NavLink to="/gallery">Gallery</NavLink>
            </nav>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <CampaignManagerPage
                campaigns={campaigns}
                activeCampaignId={activeCampaign?.id ?? null}
                onActiveCampaignChange={setActiveCampaignId}
                onSelectedProspectChange={setSelectedProspectId}
                onCreateCampaign={onCreateCampaign}
                onUpdateCampaign={onUpdateCampaign}
                onDeleteCampaign={onDeleteCampaign}
              />
            }
          />
          <Route
            path="/campaigns"
            element={
              <CampaignManagerPage
                campaigns={campaigns}
                activeCampaignId={activeCampaign?.id ?? null}
                onActiveCampaignChange={setActiveCampaignId}
                onSelectedProspectChange={setSelectedProspectId}
                onCreateCampaign={onCreateCampaign}
                onUpdateCampaign={onUpdateCampaign}
                onDeleteCampaign={onDeleteCampaign}
              />
            }
          />
          <Route
            path="/pipeline"
            element={
              <PipelineDashboardPage
                campaigns={campaigns}
                activeCampaign={activeCampaign}
                selectedProspectId={selectedProspect?.id ?? null}
                onActiveCampaignChange={setActiveCampaignId}
                onSelectedProspectChange={setSelectedProspectId}
                stages={STAGES}
              />
            }
          />
          <Route
            path="/gallery"
            element={
              <GalleryPage
                campaigns={campaigns}
                activeCampaign={activeCampaign}
                selectedProspect={selectedProspect}
                assets={assetsForSelected}
                selectedAsset={selectedAsset}
                onActiveCampaignChange={setActiveCampaignId}
                onSelectedProspectChange={setSelectedProspectId}
                onSelectedAssetChange={(assetId) => setSelectedAssetId(assetId)}
                stages={STAGES}
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
