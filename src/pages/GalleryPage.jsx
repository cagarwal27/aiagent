import { useMemo, useState } from "react";

function stageLabel(index, stages) {
  return stages[index].replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function assetDuration(asset) {
  if (asset.type === "video") return "0:24";
  if (asset.type === "audio") return "0:08";
  return "Scene";
}

function GalleryPage({
  campaigns,
  activeCampaign,
  selectedProspect,
  assets,
  selectedAsset,
  onActiveCampaignChange,
  onSelectedProspectChange,
  onSelectedAssetChange,
  stages,
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesType = typeFilter === "all" ? true : asset.type === typeFilter;
      const matchesSearch = asset.label.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [assets, search, typeFilter]);

  return (
    <section className="panel page-panel gallery-page">
      <h2>Gallery</h2>

      <div className="gallery-controls">
        <div className="row selector-row">
          <label htmlFor="gallery-campaign">Campaign</label>
          <select
            id="gallery-campaign"
            value={activeCampaign?.id ?? ""}
            onChange={(e) => {
              onActiveCampaignChange(e.target.value);
              const nextCampaign = campaigns.find((c) => c.id === e.target.value);
              onSelectedProspectChange(nextCampaign?.prospects[0]?.id ?? null);
            }}
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div className="row selector-row">
          <label htmlFor="gallery-prospect">Prospect</label>
          <select
            id="gallery-prospect"
            value={selectedProspect?.id ?? ""}
            onChange={(e) => onSelectedProspectChange(e.target.value)}
          >
            {(activeCampaign?.prospects ?? []).map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
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

      {selectedProspect ? (
        <div className="yt-watch-layout">
          <div className="yt-main">
            <div className="yt-player">
              {selectedAsset?.type === "video" && <video controls src={selectedAsset.url} />}
              {selectedAsset?.type === "audio" && (
                <div className="yt-audio-wrap">
                  <div className="yt-audio-art">
                    <p>{selectedProspect.company}</p>
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
                {selectedProspect.name} • {selectedProspect.company} • {stageLabel(selectedProspect.stage, stages)}
              </p>
              {selectedAsset && (
                <div className="row">
                  <button type="button" onClick={() => onSelectedAssetChange(selectedAsset.id)}>
                    Play
                  </button>
                  <a
                    href={selectedAsset.url}
                    download={`${selectedProspect.company}-${selectedAsset.label}`}
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
                onClick={() => onSelectedAssetChange(asset.id)}
              >
                <div className="yt-thumb">
                  {asset.type === "image" ? <img src={asset.url} alt={asset.label} /> : <span>{asset.type.toUpperCase()}</span>}
                  <small>{assetDuration(asset)}</small>
                </div>
                <div className="yt-item-meta">
                  <p>{asset.label}</p>
                  <small>
                    {selectedProspect.company} • {asset.type}
                  </small>
                </div>
              </button>
            ))}
            {filteredAssets.length === 0 && <p className="empty">No assets match this filter.</p>}
          </aside>
        </div>
      ) : (
        <p className="empty">Select a campaign and prospect to view assets.</p>
      )}
    </section>
  );
}

export default GalleryPage;
