import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { STAGES } from "../lib/mockData";
import ConvexBadge from "../components/ConvexBadge";

function stageLabel(status) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function stagePct(status) {
  const index = STAGES.indexOf(status);
  if (index < 0) return 0;
  return Math.round((index / (STAGES.length - 1)) * 100);
}

function PipelineDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const campaigns = useQuery(api.campaigns.list);
  const selectedCampaignId = searchParams.get("campaign") ?? campaigns?.[0]?._id;

  const progress = useQuery(
    api.campaigns.getProgress,
    selectedCampaignId ? { campaignId: selectedCampaignId } : "skip"
  );

  const overallProgress = useMemo(() => {
    if (!progress || progress.prospects.length === 0) return 0;
    const sum = progress.prospects.reduce(
      (acc, p) => acc + stagePct(p.status),
      0
    );
    return Math.round(sum / progress.prospects.length);
  }, [progress]);

  if (campaigns === undefined) {
    return (
      <section className="panel page-panel">
        <h2>Pipeline Dashboard</h2>
        <p className="empty">Loading...</p>
      </section>
    );
  }

  const total = progress?.total ?? 0;
  const complete = progress?.completed ?? 0;
  const failed = progress?.failed ?? 0;
  const inFlight = total - complete - failed;

  return (
    <section className="panel page-panel">
      <h2>Pipeline Dashboard (Real Time)</h2>
      <div className="page-badges">
        <ConvexBadge feature="real-time-query" />
        <ConvexBadge feature="durable-workflow" />
      </div>

      <div className="row selector-row">
        <label htmlFor="pipeline-campaign">Campaign</label>
        <select
          id="pipeline-campaign"
          value={selectedCampaignId ?? ""}
          onChange={(e) => setSearchParams({ campaign: e.target.value })}
        >
          {campaigns.map((campaign) => (
            <option key={campaign._id} value={campaign._id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {progress ? (
        <>
          <div className="metrics">
            <div>
              <span>Total</span>
              <strong>{total}</strong>
            </div>
            <div>
              <span>In Flight</span>
              <strong>{inFlight}</strong>
            </div>
            <div>
              <span>Complete</span>
              <strong>{complete}</strong>
            </div>
            {failed > 0 && (
              <div>
                <span>Failed</span>
                <strong>{failed}</strong>
              </div>
            )}
          </div>
          <div className="campaign-progress">
            <div className="campaign-progress-head">
              <span>Campaign Progress</span>
              <strong>{overallProgress}%</strong>
            </div>
            <div className="rail campaign-rail">
              <div className="fill campaign-fill" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
          <div className="prospect-list">
            {progress.prospects.map((prospect) => (
              <div key={prospect._id} className="prospect-item">
                <div className="prospect-head">
                  <strong>{prospect.name}</strong>
                  <small>{stageLabel(prospect.status)}</small>
                </div>
                <p>{prospect.company}</p>
                {prospect.error && (
                  <p style={{ color: "#e53e3e", fontSize: "0.85rem" }}>{prospect.error}</p>
                )}
                <div className="rail">
                  <div
                    className="fill"
                    style={{ width: `${stagePct(prospect.status)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : selectedCampaignId ? (
        <p className="empty">Loading pipeline...</p>
      ) : (
        <p className="empty">No campaigns yet. Create one first.</p>
      )}
    </section>
  );
}

export default PipelineDashboardPage;
