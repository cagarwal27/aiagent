import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import NarratedSlideshow from "../components/NarratedSlideshow";
import { STAGES, SAMPLE_SCENES } from "../lib/mockData";

const SLIDE_COUNT = 6;

/* ===== Convex features per slide (null = no strip) ===== */
const SLIDE_CONVEX_FEATURES = [
  null,                                          // Problem — no tech
  "ACID Mutations · HTTP Actions",               // Upload
  "Durable Workflows · Real-time Queries",       // Pipeline
  "Agent · Delta Streaming · Vector Search",     // Script
  "File Storage",                                // Assets
  null,                                          // Stack — features are in the flowchart
];

/* ---------- Slide 0: The Problem ---------- */
function SlideTheProblem() {
  return (
    <div className="demo-slide demo-slide--problem">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        The Problem
      </motion.h2>
      <motion.p className="demo-stat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Sales reps spend <strong>3-5x</strong> more time on personalization than selling.
      </motion.p>
      <motion.div className="demo-compare" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="demo-compare-card demo-compare--old">
          <h4>Current Reality</h4>
          <ul>
            <li>Manual research per prospect</li>
            <li>Generic email templates</li>
            <li>2% reply rates</li>
            <li>Hours per personalized video</li>
          </ul>
        </div>
        <div className="demo-compare-card demo-compare--new">
          <h4>Vimero</h4>
          <ul>
            <li>AI-powered prospect research</li>
            <li>Custom scripts per person</li>
            <li>12%+ reply rates</li>
            <li>90 seconds per video</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Slide 1: Upload & Go (animated typing) ---------- */
const UPLOAD_FIELDS = [
  { label: "Campaign Name", text: "Fintech Outbound - Q1", tall: false },
  { label: "Sender Persona", text: "Sarah from Acme", tall: false },
  { label: "Campaign Brief", text: "Target compliance pain and speed-to-market blockers for fintech leaders.", tall: true },
  { label: "Prospects CSV", text: "Ava Reynolds, Northstar Fintech\nLiam Chen, Ledgerflow\nMaya Patel, Trailbank", tall: true },
];

function SlideUploadAndGo() {
  const [fieldIdx, setFieldIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [showLaunch, setShowLaunch] = useState(false);

  useEffect(() => {
    if (fieldIdx >= UPLOAD_FIELDS.length) {
      setShowLaunch(true);
      return;
    }
    const field = UPLOAD_FIELDS[fieldIdx];
    if (charIdx >= field.text.length) {
      const pause = setTimeout(() => {
        setFieldIdx((f) => f + 1);
        setCharIdx(0);
      }, 300);
      return () => clearTimeout(pause);
    }
    const timer = setTimeout(() => setCharIdx((c) => c + 1), 35);
    return () => clearTimeout(timer);
  }, [fieldIdx, charIdx]);

  return (
    <div className="demo-slide demo-slide--upload">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        Upload & Go
      </motion.h2>
      <motion.div className="demo-form-preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {UPLOAD_FIELDS.map((field, i) => (
          <div key={i} className="demo-field">
            <label>{field.label}</label>
            <div className={`demo-input ${field.tall ? "demo-input--tall" : ""} ${i === fieldIdx ? "typing" : ""}`}>
              {i < fieldIdx
                ? field.text
                : i === fieldIdx
                ? <>{field.text.slice(0, charIdx)}<span className="demo-typing-cursor">|</span></>
                : ""}
            </div>
          </div>
        ))}
      </motion.div>
      {showLaunch && (
        <motion.button
          className="demo-launch-btn"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          type="button"
        >
          Launch Campaign
        </motion.button>
      )}
    </div>
  );
}

/* ---------- Slide 2: Real-Time Pipeline (stage dot grid) ---------- */
const STAGE_LABELS = ["Queue", "Research", "Script", "Voice", "Images", "Done"];

function SlideRealtimePipeline() {
  const [prospects, setProspects] = useState(() => [
    { name: "Ava Reynolds", stage: 0 },
    { name: "Liam Chen", stage: 0 },
    { name: "Maya Patel", stage: 0 },
    { name: "Sofia Torres", stage: 0 },
    { name: "Ethan Brooks", stage: 0 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProspects((prev) =>
        prev.map((p) => {
          if (p.stage >= STAGES.length - 1) return p;
          return Math.random() > 0.4 ? { ...p, stage: p.stage + 1 } : p;
        })
      );
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="demo-slide demo-slide--pipeline">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        Real-Time Pipeline
      </motion.h2>
      <motion.div className="demo-pipeline-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        {/* Header row */}
        <div className="demo-pipeline-header" />
        {STAGE_LABELS.map((label) => (
          <div key={label} className="demo-pipeline-header">{label}</div>
        ))}
        <div className="demo-pipeline-header">Status</div>
        {/* Prospect rows */}
        {prospects.map((p, pi) => (
          <Fragment key={pi}>
            <div className="demo-pipeline-name">{p.name}</div>
            {STAGE_LABELS.map((_, si) => (
              <div key={si} className="demo-pipeline-cell">
                <div
                  className={`demo-stage-dot ${
                    si < p.stage ? "complete" : si === p.stage ? "active" : "pending"
                  }`}
                />
              </div>
            ))}
            <div className="demo-pipeline-status">{STAGE_LABELS[p.stage]}</div>
          </Fragment>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- Slide 3: AI Script Generation (split view) ---------- */
const DEMO_SCRIPT =
  "Hi Ava, I noticed Northstar Fintech just expanded their compliance automation suite — impressive move in today's regulatory landscape. Most engineering leaders I talk to say their teams spend 40+ hours per week on manual reporting workflows. At Vimero, we help companies like yours turn prospect research into personalized video outreach in under 90 seconds — no recording needed. I'd love to show you how this could work for Northstar. Open to a quick call this week?";

const RESEARCH_ITEMS = [
  { label: "Company", value: "Northstar Fintech", detail: "B2B compliance platform, Austin TX", trigger: 5 },
  { label: "Focus Area", value: "Compliance automation", detail: "Expanding tooling suite Q1 2026", trigger: 10 },
  { label: "Pain Point", value: "Manual reporting workflows", detail: "40+ hrs/week per engineering team", trigger: 25 },
  { label: "Funding", value: "Series B — $45M", detail: "Raised December 2024", trigger: 35 },
];

function SlideScriptGeneration() {
  const words = DEMO_SCRIPT.split(/\s+/);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= words.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 100);
    return () => clearTimeout(timer);
  }, [visibleCount, words.length]);

  return (
    <div className="demo-slide demo-script-split">
      <div className="demo-research-panel">
        <h4>Research Briefing</h4>
        <div className="demo-prospect-brief">
          <strong>Ava Reynolds</strong>
          <span>VP Engineering</span>
        </div>
        {RESEARCH_ITEMS.map((item, i) => (
          <div
            key={i}
            className={`demo-research-item ${visibleCount >= item.trigger ? "highlight" : ""}`}
          >
            <span className="demo-research-label">{item.label}</span>
            <span className="demo-research-value">{item.value}</span>
            <span className="demo-research-detail">{item.detail}</span>
          </div>
        ))}
      </div>
      <div className="demo-script-panel">
        {words.slice(0, visibleCount).join(" ")}
        {visibleCount < words.length && <span className="demo-typing-cursor">|</span>}
      </div>
    </div>
  );
}

/* ---------- Slide 4: Generated Assets ---------- */
function SlideGeneratedAssets() {
  return (
    <div className="demo-slide demo-slide--assets">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        Generated Assets
      </motion.h2>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <NarratedSlideshow scenes={SAMPLE_SCENES} autoPlay={true} />
      </motion.div>
    </div>
  );
}

/* ---------- Slide 5: The Stack (vertical flowchart) ---------- */
const FLOW_STEPS = [
  { step: "Upload CSV", external: null, convex: "ACID Mutations", isTerminal: true },
  { step: "Research", external: "rtrvr.ai", convex: "HTTP Actions" },
  { step: "Script", external: "MiniMax M2.5", convex: "Agent + Streaming" },
  { step: "Voice", external: "ElevenLabs", convex: "File Storage" },
  { step: "Visuals", external: "MiniMax image-01", convex: "File Storage" },
  { step: "Video Ready", external: null, convex: "Real-time Queries", isTerminal: true },
];

function SlideTheStack() {
  return (
    <div className="demo-slide demo-slide--stack">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        The Stack
      </motion.h2>
      <motion.div
        className="sponsor-badges"
        style={{ marginBottom: 18 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="sponsor-badge">Convex</span>
        <span className="sponsor-badge">MiniMax</span>
        <span className="sponsor-badge">ElevenLabs</span>
        <span className="sponsor-badge">rtrvr.ai</span>
        <span className="sponsor-badge">Speechmatics</span>
      </motion.div>
      <div className="demo-flowchart">
        {FLOW_STEPS.map((s, i) => (
          <motion.div
            key={i}
            className="demo-flow-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.25 }}
          >
            {i > 0 && <div className="demo-flow-connector" />}
            <div className={`demo-flow-node ${s.isTerminal ? "demo-flow-node-start" : ""}`}>
              <span className="demo-flow-step-label">{s.step}</span>
              <div className="demo-flow-tags">
                {s.external && <span className="demo-flow-api-tag">{s.external}</span>}
                <span className="demo-flow-convex-tag">{s.convex}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main DemoPage ---------- */
const SLIDES = [
  SlideTheProblem,
  SlideUploadAndGo,
  SlideRealtimePipeline,
  SlideScriptGeneration,
  SlideGeneratedAssets,
  SlideTheStack,
];

export default function DemoPage() {
  const [phase, setPhase] = useState("title");
  const [current, setCurrent] = useState(0);
  // Guard: ignore clicks/keys for a brief window after phase transitions
  const guardRef = useRef(false);

  const advance = useCallback(() => {
    if (guardRef.current) return;
    if (phase === "playing") {
      if (current < SLIDE_COUNT - 1) {
        setCurrent((c) => c + 1);
      } else {
        setPhase("ended");
      }
    }
  }, [phase, current]);

  // Any key or click advances to the next slide
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPhase("title");
        setCurrent(0);
        return;
      }
      advance();
    };
    const onClick = () => advance();
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [phase, advance]);

  const startPlayback = (e) => {
    e.stopPropagation();
    guardRef.current = true;
    setCurrent(0);
    setPhase("playing");
    setTimeout(() => { guardRef.current = false; }, 600);
  };

  const replay = () => {
    setCurrent(0);
    setPhase("title");
  };

  const SlideComponent = SLIDES[current];

  return (
    <section className="demo-fullscreen">
      <AnimatePresence mode="wait">
        {phase === "title" && (
          <motion.div
            key="title"
            className="demo-title-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1>Vimero</h1>
            <p>AI-generated personalized sales videos in under 90 seconds.</p>
            <motion.button
              className="demo-play-btn"
              onClick={startPlayback}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              &#9654;
            </motion.button>
          </motion.div>
        )}

        {(phase === "playing" || phase === "ended") && (
          <motion.div
            key={`slide-${current}`}
            className="demo-slide-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <SlideComponent />
            {phase === "ended" && (
              <motion.div
                className="demo-end-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button type="button" onClick={(e) => { e.stopPropagation(); replay(); }}>Replay</button>
                <Link to="/" onClick={(e) => e.stopPropagation()}>Back to Home</Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle progress dots */}
      {(phase === "playing" || phase === "ended") && (
        <div className="demo-progress-dots">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`demo-progress-dot ${
                i === current ? "active" : i < current ? "done" : ""
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
