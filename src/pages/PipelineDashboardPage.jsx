import { useEffect, useMemo, useState } from "react";

const STAGE_DURATION_MS = 1800;

function stageLabel(index, stages) {
  return stages[index].replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function stagePct(index, stages, stageStartedAt, now) {
  const stepSize = 100 / (stages.length - 1);
  const base = index * stepSize;
  if (index >= stages.length - 1) return 100;
  const elapsed = Math.max(0, now - (stageStartedAt ?? now));
  const inStage = Math.min(elapsed / STAGE_DURATION_MS, 1) * stepSize;
  return Math.min(base + inStage, 99.9);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function PipelineDashboardPage({
  campaigns,
  activeCampaign,
  selectedProspectId,
  onActiveCampaignChange,
  onSelectedProspectChange,
  stages,
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(timer);
  }, []);

  const total = activeCampaign?.prospects.length ?? 0;
  const complete = activeCampaign?.prospects.filter((p) => p.stage === stages.length - 1).length ?? 0;
  const inFlight = total - complete;
  const overallProgress = useMemo(() => {
    if (!activeCampaign || activeCampaign.prospects.length === 0) return 0;
    const sum = activeCampaign.prospects.reduce(
      (acc, prospect) => acc + stagePct(prospect.stage, stages, prospect.stageStartedAt, now),
      0
    );
    return Math.round(sum / activeCampaign.prospects.length);
  }, [activeCampaign, now, stages]);

  return (
    <section className="panel page-panel">
      <h2>Pipeline Dashboard (Real Time)</h2>

      <div className="row selector-row">
        <label htmlFor="pipeline-campaign">Campaign</label>
        <select
          id="pipeline-campaign"
          value={activeCampaign?.id ?? ""}
          onChange={(e) => {
            onActiveCampaignChange(e.target.value);
            const next = campaigns.find((c) => c.id === e.target.value);
            onSelectedProspectChange(next?.prospects[0]?.id ?? null);
          }}
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {activeCampaign ? (
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
            {activeCampaign.prospects.map((prospect) => (
              <div
                key={prospect.id}
                className={`prospect-item ${selectedProspectId === prospect.id ? "selected" : ""}`}
                onClick={() => onSelectedProspectChange(prospect.id)}
              >
                <div className="prospect-head">
                  <strong>{prospect.name}</strong>
                  <small>{stageLabel(prospect.stage, stages)}</small>
                </div>
                <p>{prospect.company}</p>
                <div className="rail">
                  <div
                    className="fill"
                    style={{ width: `${stagePct(prospect.stage, stages, prospect.stageStartedAt, now)}%` }}
                  />
                </div>
                <time>Updated {formatTime(prospect.updatedAt)}</time>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="empty">No campaigns yet.</p>
      )}
    </section>
  );
}

export default PipelineDashboardPage;
