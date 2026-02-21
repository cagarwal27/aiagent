import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { STAGES, createImageSvgDataUrl } from "../lib/mockData";
import ConvexBadge from "../components/ConvexBadge";

function stageLabel(status) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function assetDuration(asset) {
  if (asset.type === "video") return "0:24";
  if (asset.type === "audio") return "0:08";
  return "Scene";
}

function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const campaigns = useQuery(api.campaigns.list);

  const selectedCampaignId = searchParams.get("campaign") ?? campaigns?.[0]?._id;

  const prospects = useQuery(
    api.prospects.getByCampaign,
    selectedCampaignId ? { campaignId: selectedCampaignId } : "skip"
  );

  const [selectedProspectId, setSelectedProspectId] = useState(null);
  const activeProspectId = selectedProspectId ?? prospects?.[0]?._id ?? null;

  const prospectWithAssets = useQuery(
    api.prospects.getWithAssetUrls,
    activeProspectId ? { prospectId: activeProspectId } : "skip"
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const assets = useMemo(() => {
    if (!prospectWithAssets) return [];
    const resolved = prospectWithAssets.resolvedAssets ?? [];
    const flat = [];
    for (const a of resolved) {
      if (a.imageUrl) {
        flat.push({
          id: `img-${a.sceneNumber}`,
          type: "image",
          label: `Scene ${a.sceneNumber} Image`,
          url: a.imageUrl,
        });
      }
      if (a.voiceUrl) {
        flat.push({
          id: `voice-${a.sceneNumber}`,
          type: "audio",
          label: `Scene ${a.sceneNumber} Voice`,
          url: a.voiceUrl,
        });
      }
      if (a.videoUrl) {
        flat.push({
          id: `video-${a.sceneNumber}`,
          type: "video",
          label: `Scene ${a.sceneNumber} Video`,
          url: a.videoUrl,
        });
      }
    }

    // If no resolved assets but script exists, show placeholder images
    if (flat.length === 0 && prospectWithAssets.script?.scenes) {
      for (const scene of prospectWithAssets.script.scenes) {
        flat.push({
          id: `placeholder-${scene.sceneNumber}`,
          type: "image",
          label: `Scene ${scene.sceneNumber} (Pending)`,
          url: createImageSvgDataUrl(
            `Scene ${scene.sceneNumber}`,
            "#1a365d",
            "#2b6cb0"
          ),
        });
      }
    }

    return flat;
  }, [prospectWithAssets]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesType = typeFilter === "all" || asset.type === typeFilter;
      const matchesSearch = asset.label.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [assets, search, typeFilter]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? assets[0] ?? null,
    [assets, selectedAssetId]
  );

  if (campaigns === undefined) {
    return (
      <section className="panel page-panel gallery-page">
        <h2>Gallery</h2>
        <p className="empty">Loading...</p>
      </section>
    );
  }

  return (
    <section className="panel page-panel gallery-page">
      <h2>Gallery</h2>
      <div className="page-badges">
        <ConvexBadge feature="file-storage" />
        <ConvexBadge feature="real-time-query" />
      </div>

      <div className="gallery-controls">
        <div className="row selector-row">
          <label htmlFor="gallery-campaign">Campaign</label>
          <select
            id="gallery-campaign"
            value={selectedCampaignId ?? ""}
            onChange={(e) => {
              setSearchParams({ campaign: e.target.value });
              setSelectedProspectId(null);
              setSelectedAssetId(null);
            }}
          >
            {campaigns.map((campaign) => (
              <option key={campaign._id} value={campaign._id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div className="row selector-row">
          <label htmlFor="gallery-prospect">Prospect</label>
          <select
            id="gallery-prospect"
            value={activeProspectId ?? ""}
            onChange={(e) => {
              setSelectedProspectId(e.target.value);
              setSelectedAssetId(null);
            }}
          >
            {(prospects ?? []).map((prospect) => (
              <option key={prospect._id} value={prospect._id}>
                {prospect.name} ({prospect.company})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="yt-search-row">
        <input
          className="yt-search"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="yt-chips">
          <button type="button" className={typeFilter === "all" ? "chip active" : "chip"} onClick={() => setTypeFilter("all")}>
            All
          </button>
          <button type="button" className={typeFilter === "video" ? "chip active" : "chip"} onClick={() => setTypeFilter("video")}>
            Video
          </button>
          <button type="button" className={typeFilter === "audio" ? "chip active" : "chip"} onClick={() => setTypeFilter("audio")}>
            Audio
          </button>
          <button type="button" className={typeFilter === "image" ? "chip active" : "chip"} onClick={() => setTypeFilter("image")}>
            Images
          </button>
        </div>
      </div>

      {prospectWithAssets ? (
        <div className="yt-watch-layout">
          <div className="yt-main">
            <div className="yt-player">
              {selectedAsset?.type === "video" && <video controls src={selectedAsset.url} />}
              {selectedAsset?.type === "audio" && (
                <div className="yt-audio-wrap">
                  <div className="yt-audio-art">
                    <p>{prospectWithAssets.company}</p>
                    <strong>{selectedAsset.label}</strong>
                  </div>
                  <audio controls src={selectedAsset.url} />
                </div>
              )}
              {selectedAsset?.type === "image" && <img src={selectedAsset.url} alt={selectedAsset.label} />}
              {!selectedAsset && <p className="empty">Assets will appear as this prospect progresses.</p>}
            </div>
            <div className="yt-meta">
              <h3>{selectedAsset?.label ?? "No asset selected"}</h3>
              <p>
                {prospectWithAssets.name} • {prospectWithAssets.company} • {stageLabel(prospectWithAssets.status)}
              </p>
              {prospectWithAssets.script?.fullNarration && (
                <details style={{ marginTop: "0.75rem" }}>
                  <summary>Full Script</summary>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    {prospectWithAssets.script.fullNarration}
                  </pre>
                </details>
              )}
              {selectedAsset && (
                <div className="row">
                  <a
                    href={selectedAsset.url}
                    download={`${prospectWithAssets.company}-${selectedAsset.label}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>

          <aside className="yt-sidebar">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={`yt-list-item ${selectedAsset?.id === asset.id ? "active" : ""}`}
                onClick={() => setSelectedAssetId(asset.id)}
              >
                <div className="yt-thumb">
                  {asset.type === "image" ? <img src={asset.url} alt={asset.label} /> : <span>{asset.type.toUpperCase()}</span>}
                  <small>{assetDuration(asset)}</small>
                </div>
                <div className="yt-item-meta">
                  <p>{asset.label}</p>
                  <small>
                    {prospectWithAssets.company} • {asset.type}
                  </small>
                </div>
              </button>
            ))}
            {filteredAssets.length === 0 && <p className="empty">No assets match this filter.</p>}
          </aside>
        </div>
      ) : activeProspectId ? (
        <p className="empty">Loading prospect assets...</p>
      ) : (
        <p className="empty">Select a campaign and prospect to view assets.</p>
      )}
    </section>
  );
}

export default GalleryPage;
