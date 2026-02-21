import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import ConvexBadge from "../components/ConvexBadge";

function emptyForm() {
  return { name: "", senderName: "", senderCompany: "", brief: "", prospectsCsv: "" };
}

function CampaignManagerPage() {
  const campaigns = useQuery(api.campaigns.list);
  const createCampaign = useMutation(api.campaigns.create);
  const launchCampaign = useMutation(api.campaigns.launch);
  const seedData = useMutation(api.seedData.seed);

  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createStatus, setCreateStatus] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || isCreating) return;

    setIsCreating(true);
    setCreateProgress(10);
    setCreateStatus("Creating campaign...");
    const interval = setInterval(() => {
      setCreateProgress((p) => Math.min(p + Math.ceil((100 - p) * 0.14), 92));
    }, 250);

    try {
      const lines = form.prospectsCsv
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const prospects = lines.length > 0
        ? lines.map((line) => {
            const [name, company] = line.split(",").map((part) => part?.trim() ?? "");
            return {
              name: name || "New Prospect",
              company: company || "Unknown Co",
              url: `https://${(company || "example").toLowerCase().replace(/\s+/g, "")}.com`,
            };
          })
        : [{ name: "New Prospect", company: "Unknown Co", url: "https://example.com" }];

      const campaignId = await createCampaign({
        name: form.name.trim(),
        brief: form.brief.trim() || "No brief set",
        senderName: form.senderName.trim() || "Sender",
        senderCompany: form.senderCompany.trim() || "Company",
        senderCompanyInfo: "AI-powered personalized sales video platform.",
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        prospects,
      });

      await launchCampaign({ campaignId });

      clearInterval(interval);
      setCreateProgress(100);
      setCreateStatus("Campaign launched! Opening pipeline...");
      setForm(emptyForm());

      setTimeout(() => {
        navigate(`/pipeline?campaign=${campaignId}`);
        setIsCreating(false);
        setCreateProgress(0);
        setCreateStatus("");
      }, 600);
    } catch (err) {
      clearInterval(interval);
      setIsCreating(false);
      setCreateProgress(0);
      setCreateStatus("");
      console.error("Campaign creation failed:", err);
    }
  };

  const handleSeed = async () => {
    await seedData();
  };

  if (campaigns === undefined) {
    return (
      <section className="panel page-panel">
        <h2>Campaign Manager</h2>
        <p className="empty">Loading...</p>
      </section>
    );
  }

  return (
    <section className="panel page-panel">
      <h2>Campaign Manager</h2>
      <div className="page-badges">
        <ConvexBadge feature="acid-mutation" />
        <ConvexBadge feature="http-actions" />
      </div>
      <form className="form-grid" onSubmit={submit}>
        <input
          placeholder="Campaign name"
          value={form.name}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          placeholder="Sender name"
          value={form.senderName}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
        />
        <input
          placeholder="Sender company"
          value={form.senderCompany}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, senderCompany: e.target.value }))}
        />
        <textarea
          placeholder="Campaign brief"
          value={form.brief}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
          rows={3}
        />
        <textarea
          placeholder={"Prospects (one per line):\nJane Doe, Example Co"}
          value={form.prospectsCsv}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, prospectsCsv: e.target.value }))}
          rows={4}
        />
        {isCreating && (
          <div className="create-progress">
            <div className="create-progress-head">
              <span>{createStatus}</span>
              <strong>{createProgress}%</strong>
            </div>
            <div className="rail">
              <div className="fill create-progress-fill" style={{ width: `${createProgress}%` }} />
            </div>
          </div>
        )}
        <div className="row">
          <button type="submit">{isCreating ? "Creating..." : "Create & Launch Campaign"}</button>
        </div>
      </form>

      {campaigns.length === 0 && (
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <p className="empty">No campaigns yet.</p>
          <button type="button" onClick={handleSeed} style={{ marginTop: "0.75rem" }}>
            Load Demo Data
          </button>
        </div>
      )}

      <div className="campaign-list">
        {campaigns.map((campaign) => (
          <div
            key={campaign._id}
            className="campaign-item"
            onClick={() => navigate(`/pipeline?campaign=${campaign._id}`)}
          >
            <div>
              <strong>{campaign.name}</strong>
              <p>{campaign.senderName} — {campaign.status}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CampaignManagerPage;
