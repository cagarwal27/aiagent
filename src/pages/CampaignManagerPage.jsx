import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

function CampaignManagerPage() {
  const createCampaign = useMutation(api.campaigns.create);
  const launchCampaign = useMutation(api.campaigns.launch);

  // State machine: "form" | "progress" | "result"
  const [phase, setPhase] = useState("form");
  const [campaignId, setCampaignId] = useState(null);
  const [prospectId, setProspectId] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    senderName: "",
    senderCompany: "",
    pitch: "",
    prospectName: "",
    prospectCompany: "",
    prospectUrl: "",
  });

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // --- Submit: create + launch, then move to progress ---
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.senderName.trim() || !form.prospectName.trim() || !form.prospectUrl.trim()) return;
    setError(null);

    try {
      const id = await createCampaign({
        name: `${form.prospectCompany.trim() || "Prospect"} Outreach`,
        brief: form.pitch.trim() || "Personalized outreach video",
        senderName: form.senderName.trim(),
        senderCompany: form.senderCompany.trim() || "My Company",
        senderCompanyInfo: form.pitch.trim() || "Personalized outreach video",
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        prospects: [
          {
            name: form.prospectName.trim(),
            company: form.prospectCompany.trim() || "Their Company",
            url: form.prospectUrl.trim().startsWith("http")
              ? form.prospectUrl.trim()
              : `https://${form.prospectUrl.trim()}`,
          },
        ],
      });

      await launchCampaign({ campaignId: id });
      setCampaignId(id);
      setPhase("progress");
    } catch (err) {
      console.error("Launch failed:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  const reset = () => {
    setPhase("form");
    setCampaignId(null);
    setProspectId(null);
    setError(null);
    setForm({
      senderName: "",
      senderCompany: "",
      pitch: "",
      prospectName: "",
      prospectCompany: "",
      prospectUrl: "",
    });
  };

  return (
    <section className="tryit-page">
      <h1 className="tryit-brand">VIMERO</h1>
      <p className="tryit-subtitle">Try It Live</p>

      {phase === "form" && (
        <FormState
          form={form}
          set={set}
          onSubmit={handleGenerate}
          error={error}
        />
      )}

      {phase === "progress" && campaignId && (
        <ProgressState
          campaignId={campaignId}
          onComplete={(pid) => {
            setProspectId(pid);
            setPhase("result");
          }}
        />
      )}

      {phase === "result" && prospectId && (
        <ResultState prospectId={prospectId} onReset={reset} />
      )}
    </section>
  );
}

// ─── State 1: Input Form ─────────────────────────────────────────────
function FormState({ form, set, onSubmit, error }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(e);
    setSubmitting(false);
  };

  return (
    <form className="tryit-form" onSubmit={handleSubmit}>
      <fieldset className="tryit-fieldset" disabled={submitting}>
        <legend className="tryit-legend">What are you selling?</legend>
        <div className="tryit-row">
          <label className="tryit-label">
            Your Name
            <input
              placeholder="e.g. Chirag"
              value={form.senderName}
              onChange={set("senderName")}
              required
            />
          </label>
          <label className="tryit-label">
            Your Company
            <input
              placeholder="e.g. Vimero"
              value={form.senderCompany}
              onChange={set("senderCompany")}
            />
          </label>
        </div>
        <label className="tryit-label">
          Your Pitch
          <textarea
            placeholder="e.g. AI-generated personalized sales videos that 3x your reply rates"
            value={form.pitch}
            onChange={set("pitch")}
            rows={2}
          />
        </label>
      </fieldset>

      <fieldset className="tryit-fieldset" disabled={submitting}>
        <legend className="tryit-legend">Who do you want to reach?</legend>
        <div className="tryit-row">
          <label className="tryit-label">
            Their Name
            <input
              placeholder="e.g. Patrick Collison"
              value={form.prospectName}
              onChange={set("prospectName")}
              required
            />
          </label>
          <label className="tryit-label">
            Their Company
            <input
              placeholder="e.g. Stripe"
              value={form.prospectCompany}
              onChange={set("prospectCompany")}
            />
          </label>
        </div>
        <label className="tryit-label">
          Company Website
          <input
            placeholder="e.g. stripe.com"
            value={form.prospectUrl}
            onChange={set("prospectUrl")}
            required
          />
          <span className="tryit-hint">We scrape this to personalize the video</span>
        </label>
      </fieldset>

      {error && <p className="tryit-error">{error}</p>}

      <button
        type="submit"
        className="tryit-generate-btn"
        disabled={submitting}
      >
        {submitting ? "Launching..." : "Generate Personalized Video"}
      </button>
    </form>
  );
}

// ─── State 2: Pipeline Progress ──────────────────────────────────────
const STAGE_ORDER = [
  { key: "researching", label: "Researching prospect" },
  { key: "writing", label: "Writing script" },
  { key: "generating_voice", label: "Generating voice" },
  { key: "creating_visuals", label: "Creating visuals" },
  { key: "complete", label: "Complete" },
];

function statusToStageIndex(status) {
  if (!status) return -1;
  if (status === "complete" || status === "completed") return 4;
  if (status === "failed") return -1;
  // Map prospect statuses to stage indices
  const map = {
    queued: -1,
    researching: 0,
    research_complete: 1,
    writing: 1,
    scripting: 1,
    scriptwriting: 1,
    script_complete: 2,
    voice: 2,
    generating_voice: 2,
    voice_complete: 3,
    visuals: 3,
    generating_visuals: 3,
    creating_visuals: 3,
    images: 3,
    image_generation: 3,
    rendering: 3,
  };
  return map[status] ?? 0;
}

function ProgressState({ campaignId, onComplete }) {
  const progress = useQuery(api.campaigns.getProgress, { campaignId });
  const completeCalled = useRef(false);

  const prospect = progress?.prospects?.[0];
  const prospectStatus = prospect?.status;
  const currentStage = statusToStageIndex(prospectStatus);
  const isFailed = prospectStatus === "failed";
  const isDone =
    prospectStatus === "complete" || prospectStatus === "completed";

  useEffect(() => {
    if (isDone && prospect && !completeCalled.current) {
      completeCalled.current = true;
      // Small delay so user sees the "Complete" checkmark
      setTimeout(() => onComplete(prospect._id), 1200);
    }
  }, [isDone, prospect, onComplete]);

  return (
    <div className="tryit-progress">
      <h2 className="tryit-progress-title">
        {isFailed
          ? "Generation failed"
          : isDone
            ? "Done!"
            : "Generating your video..."}
      </h2>

      {prospect && (
        <p className="tryit-progress-prospect">
          For <strong>{prospect.name}</strong>
          {prospect.company ? ` at ${prospect.company}` : ""}
        </p>
      )}

      <div className="tryit-stages">
        {STAGE_ORDER.map((stage, i) => {
          let icon = "pending";
          if (i < currentStage) icon = "done";
          else if (i === currentStage && !isDone && !isFailed) icon = "active";
          else if (isDone) icon = "done";

          return (
            <div key={stage.key} className={`tryit-stage tryit-stage--${icon}`}>
              <span className="tryit-stage-icon">
                {icon === "done" && "✓"}
                {icon === "active" && (
                  <span className="tryit-spinner" />
                )}
                {icon === "pending" && "○"}
              </span>
              <span className="tryit-stage-label">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {isFailed && (
        <p className="tryit-error">
          Pipeline encountered an error. Check logs or try again.
        </p>
      )}
    </div>
  );
}

// ─── State 3: Result Gallery ─────────────────────────────────────────
function ResultState({ prospectId, onReset }) {
  const data = useQuery(api.prospects.getWithAssetUrls, { prospectId });
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!data) {
    return (
      <div className="tryit-progress">
        <p>Loading results...</p>
      </div>
    );
  }

  const images = (data.resolvedAssets || [])
    .filter((a) => a.imageUrl)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  const audioAsset = (data.resolvedAssets || []).find((a) => a.voiceUrl);
  const videoAsset = (data.resolvedAssets || []).find((a) => a.videoUrl);

  return (
    <div className="tryit-result">
      <h2 className="tryit-result-title">
        Video for {data.name}
        {data.company ? ` — ${data.company}` : ""}
      </h2>

      {/* Video player if available */}
      {videoAsset && (
        <div className="tryit-video-wrap">
          <video controls src={videoAsset.videoUrl} />
        </div>
      )}

      {/* Image slideshow */}
      {images.length > 0 && !videoAsset && (
        <div className="tryit-slideshow">
          <div className="tryit-slide-display">
            <img
              src={images[currentSlide]?.imageUrl}
              alt={`Scene ${images[currentSlide]?.sceneNumber}`}
            />
          </div>
          {images.length > 1 && (
            <div className="tryit-slide-nav">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`tryit-slide-dot ${i === currentSlide ? "active" : ""}`}
                  onClick={() => setCurrentSlide(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audio */}
      {audioAsset && (
        <div className="tryit-audio-wrap">
          <audio controls src={audioAsset.voiceUrl} />
        </div>
      )}

      {/* Script */}
      {data.script && (
        <div className="tryit-script">
          <h3>Script</h3>
          <p>{data.script?.fullNarration ?? JSON.stringify(data.script)}</p>
        </div>
      )}

      <button className="tryit-generate-btn" onClick={onReset}>
        Generate Another
      </button>
    </div>
  );
}

export default CampaignManagerPage;
