import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function emptyForm() {
  return { name: "", sender: "", brief: "", prospectsCsv: "" };
}

function CampaignManagerPage({
  campaigns,
  activeCampaignId,
  onActiveCampaignChange,
  onSelectedProspectChange,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
}) {
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createStatus, setCreateStatus] = useState("");
  const navigate = useNavigate();

  const editingCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === editingCampaignId) ?? null,
    [campaigns, editingCampaignId]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || isCreating) return;
    if (editingCampaign) {
      onUpdateCampaign(editingCampaign.id, form);
      setEditingCampaignId(null);
      setForm(emptyForm());
      return;
    }
    setIsCreating(true);
    setCreateProgress(3);
    setCreateStatus("Creating campaign...");
    const interval = setInterval(() => {
      setCreateProgress((p) => Math.min(p + Math.ceil((100 - p) * 0.14), 92));
    }, 250);

    await onCreateCampaign(form);
    clearInterval(interval);
    setCreateProgress(100);
    setCreateStatus("Campaign ready. Opening video preview...");
    setForm(emptyForm());
    setTimeout(() => {
      navigate("/gallery");
      setIsCreating(false);
      setCreateProgress(0);
      setCreateStatus("");
    }, 600);
  };

  const startEdit = (campaign) => {
    setEditingCampaignId(campaign.id);
    setForm({
      name: campaign.name,
      sender: campaign.sender,
      brief: campaign.brief,
      prospectsCsv: campaign.prospects.map((p) => `${p.name}, ${p.company}`).join("\n"),
    });
  };

  return (
    <section className="panel page-panel">
      <h2>Campaign Manager (CRUD)</h2>
      <form className="form-grid" onSubmit={submit}>
        <input
          placeholder="Campaign name"
          value={form.name}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          placeholder="Sender persona"
          value={form.sender}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, sender: e.target.value }))}
        />
        <textarea
          placeholder="Campaign brief"
          value={form.brief}
          disabled={isCreating}
          onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
          rows={3}
        />
        {!editingCampaign && (
          <textarea
            placeholder={"Prospects (one per line):\nJane Doe, Example Co"}
            value={form.prospectsCsv}
            disabled={isCreating}
            onChange={(e) => setForm((f) => ({ ...f, prospectsCsv: e.target.value }))}
            rows={4}
          />
        )}
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
          <button type="submit">{isCreating ? "Creating..." : editingCampaign ? "Save Campaign" : "Create Campaign"}</button>
          {editingCampaign && (
            <button
              type="button"
              className="ghost"
              disabled={isCreating}
              onClick={() => {
                setEditingCampaignId(null);
                setForm(emptyForm());
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="campaign-list">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className={`campaign-item ${campaign.id === activeCampaignId ? "active" : ""}`}
            onClick={() => {
              onActiveCampaignChange(campaign.id);
              onSelectedProspectChange(campaign.prospects[0]?.id ?? null);
            }}
          >
            <div>
              <strong>{campaign.name}</strong>
              <p>{campaign.sender}</p>
            </div>
            <div className="item-actions">
              <button
                className="ghost"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(campaign);
                }}
              >
                Edit
              </button>
              <button
                className="danger"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCampaign(campaign.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CampaignManagerPage;
