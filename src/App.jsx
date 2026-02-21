import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DemoPage from "./pages/DemoPage";
import CampaignManagerPage from "./pages/CampaignManagerPage";
import PipelineDashboardPage from "./pages/PipelineDashboardPage";
import GalleryPage from "./pages/GalleryPage";
import {
  STAGES,
  makeProspect,
  seedCampaigns,
  nextStage,
  getNextCampaignId,
} from "./lib/mockData";

function FloatingHomeButton() {
  const location = useLocation();
  if (location.pathname === "/" || location.pathname === "/demo") return null;
  return (
    <Link to="/" className="floating-home">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </Link>
  );
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
    const newId = getNextCampaignId();
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
      <FloatingHomeButton />
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/demo" element={<DemoPage />} />
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
