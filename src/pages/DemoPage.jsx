import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import NarratedSlideshow from "../components/NarratedSlideshow";
import { STAGES, SAMPLE_SCENES } from "../lib/mockData";

const SLIDE_COUNT = 8;

/* ===== Convex features per slide (null = no strip) ===== */
const SLIDE_CONVEX_FEATURES = [
  null,                                          // Problem — no tech
  "ACID Mutations · HTTP Actions",               // Upload
  "Durable Workflows · Real-time Queries",       // Pipeline
  "Agent · Delta Streaming · Vector Search",     // Script
  "File Storage",                                // Assets
  null,                                          // Results — no tech
  null,                                          // Market — no tech
  null,                                          // Stack — features are in the flowchart
];

/* ===== Animated Number Counter ===== */
function AnimatedNumber({ value, prefix = "", suffix = "", delay = 0 }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const timeout = setTimeout(() => {
      started.current = true;
      const duration = 1400;
      const startTime = performance.now();
      const tick = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(value * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return <>{prefix}{display}{suffix}</>;
}

/* ---------- Slide 0: The Problem (animated funnel) ---------- */
function SlideTheProblem() {
  const stats = [
    { value: 70, prefix: "", suffix: "%", label: "of rep time wasted on non-selling tasks", source: "Salesforce, 2026", delay: 400 },
    { value: 1, prefix: "<", suffix: "%", label: "average cold email reply rate", source: "Breakcold, 2026", delay: 800 },
    { value: 50, prefix: "$", suffix: "K", label: "pipeline generated per rep, per quarter", source: "Industry Average", delay: 1200 },
  ];

  return (
    <div className="demo-slide demo-slide--problem">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        The Broken Sales Funnel
      </motion.h2>
      <div className="problem-funnel">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="problem-stat-card"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.35, type: "spring", stiffness: 80 }}
          >
            {i > 0 && <div className="problem-connector" />}
            <div className="problem-stat-inner">
              <span className="problem-number">
                <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} delay={stat.delay} />
              </span>
              <div className="problem-text">
                <span className="problem-label">{stat.label}</span>
                <span className="problem-source">{stat.source}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p
        className="problem-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
      >
        Your reps are drowning in research. Their emails are being ignored.
      </motion.p>
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

/* ---------- Slide 5: The Vimero Effect (Before vs After) ---------- */
function SlideResults() {
  const rows = [
    { before: "70%", beforeLabel: "time on non-selling tasks", after: "Instant", afterLabel: "AI-powered research", badge: "Time Saved" },
    { before: "<1%", beforeLabel: "cold email reply rate", after: "30%", afterLabel: "video reply rate", badge: "30x" },
    { before: "$50K", beforeLabel: "pipeline per quarter", after: "$250K", afterLabel: "pipeline per quarter", badge: "5x Revenue" },
  ];

  return (
    <div className="demo-slide demo-slide--results">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        The Vimero Effect
      </motion.h2>
      <motion.p
        className="results-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        Generate 5x more revenue
      </motion.p>

      {/* Column headers */}
      <motion.div
        className="results-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="results-header-label results-header--before">Without Vimero</span>
        <span />
        <span className="results-header-label results-header--after">With Vimero</span>
      </motion.div>

      <div className="results-grid">
        {rows.map((r, i) => (
          <motion.div
            key={i}
            className="results-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 + i * 0.3 }}
          >
            <div className="results-before">
              <span className="results-number results-number--danger">{r.before}</span>
              <span className="results-label">{r.beforeLabel}</span>
            </div>
            <div className="results-arrow">
              <div className="results-badge">{r.badge}</div>
              <svg width="40" height="16" viewBox="0 0 40 16" className="results-arrow-svg">
                <path d="M0 8h34m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="results-after">
              <span className="results-number results-number--success">{r.after}</span>
              <span className="results-label">{r.afterLabel}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="results-source"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        Sources: Sendspark 2026, Salesforce State of Sales 2026, Warmly Case Study
      </motion.p>
    </div>
  );
}

/* ---------- Slide 6: Market Opportunity ---------- */
function SlideMarket() {
  return (
    <div className="demo-slide demo-slide--market">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        Market Opportunity
      </motion.h2>

      <motion.div
        className="market-tam"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 60 }}
      >
        <span className="market-number">
          $<AnimatedNumber value={50} delay={400} />B
        </span>
        <span className="market-label">Total Addressable Market</span>
      </motion.div>

      <div className="market-details">
        <motion.div className="market-detail-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <span className="market-detail-number">32%</span>
          <span className="market-detail-label">CAGR through 2033</span>
        </motion.div>
        <motion.div className="market-detail-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <span className="market-detail-number">$4.5B</span>
          <span className="market-detail-label">AI Video Market 2025</span>
        </motion.div>
        <motion.div className="market-detail-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
          <span className="market-detail-number">41%</span>
          <span className="market-detail-label">North America Share</span>
        </motion.div>
      </div>

      <motion.p
        className="market-positioning"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        AI-powered video prospecting is experiencing explosive growth.
        <br />
        Vimero is uniquely positioned to capture this wave.
      </motion.p>
    </div>
  );
}

/* ---------- Slide 7: The Stack (spine layout) ---------- */
const SPINE_STEPS = [
  { step: "Upload CSV", external: null, convex: "ACID Mutations" },
  { step: "Research", external: "rtrvr.ai", convex: "HTTP Actions" },
  { step: "Script", external: "MiniMax M2.5", convex: "Agent + Streaming" },
  { step: "Voice", external: "ElevenLabs", convex: "File Storage" },
  { step: "Visuals", external: "MiniMax image-01", convex: "File Storage" },
  { step: "Video Ready", external: null, convex: "Real-time Queries" },
];

const CONVEX_FEATURE_COUNT = new Set(SPINE_STEPS.map((s) => s.convex)).size;

function SlideTheStack() {
  return (
    <div className="demo-slide demo-slide--stack">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        The Stack
      </motion.h2>

      {/* --- Spine layout: external (left) · convex spine (center) · step labels (right) --- */}
      <div className="stack-spine-wrapper">
        {SPINE_STEPS.map((s, i) => (
          <motion.div
            key={i}
            className="stack-spine-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.18 }}
          >
            {/* Left: external API (or empty) */}
            <div className="stack-spoke stack-spoke--left">
              {s.external && (
                <>
                  <span className="stack-spoke-label">{s.external}</span>
                  <span className="stack-spoke-line" />
                </>
              )}
            </div>

            {/* Center: Convex spine node */}
            <div className="stack-spine-node">
              <span className="stack-spine-step">{s.step}</span>
              <span className="stack-spine-feature">{s.convex}</span>
            </div>

            {/* Connector to next node */}
            {i < SPINE_STEPS.length - 1 && (
              <div className="stack-spine-connector" />
            )}
          </motion.div>
        ))}

        {/* Vertical glow line behind nodes */}
        <motion.div
          className="stack-spine-line"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* --- Feature tally --- */}
      <motion.div
        className="stack-tally"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        <span className="stack-tally-number">{CONVEX_FEATURE_COUNT}</span>
        <span className="stack-tally-label">distinct Convex features across {SPINE_STEPS.length} pipeline steps</span>
      </motion.div>
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
  SlideResults,
  SlideMarket,
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
            <p className="demo-title-tagline">Generate 5x More Revenue</p>
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
