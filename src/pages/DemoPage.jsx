import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import ConvexBadge from "../components/ConvexBadge";
import ScriptStream from "../components/ScriptStream";
import NarratedSlideshow from "../components/NarratedSlideshow";
import { STAGES, SAMPLE_SCRIPT, SAMPLE_SCENES } from "../lib/mockData";

const SLIDE_COUNT = 6;
const SLIDE_INTERVAL = 8000;

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
          <h4>ProspectClip</h4>
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

/* ---------- Slide 1: Upload & Go ---------- */
function SlideUploadAndGo() {
  return (
    <div className="demo-slide demo-slide--upload">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        Upload & Go
      </motion.h2>
      <motion.div className="page-badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <ConvexBadge feature="acid-mutation" />
        <ConvexBadge feature="http-actions" />
      </motion.div>
      <motion.div className="demo-form-preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="demo-field">
          <label>Campaign Name</label>
          <div className="demo-input">Fintech Outbound - Q1</div>
        </div>
        <div className="demo-field">
          <label>Sender Persona</label>
          <div className="demo-input">Sarah from Acme</div>
        </div>
        <div className="demo-field">
          <label>Campaign Brief</label>
          <div className="demo-input demo-input--tall">Target compliance pain and speed-to-market blockers for fintech leaders.</div>
        </div>
        <div className="demo-field">
          <label>Prospects CSV</label>
          <div className="demo-input demo-input--tall">Ava Reynolds, Northstar Fintech{"\n"}Liam Chen, Ledgerflow{"\n"}Maya Patel, Trailbank</div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Slide 2: Real-Time Pipeline ---------- */
function SlideRealtimePipeline() {
  const [prospects, setProspects] = useState(() => [
    { name: "Ava Reynolds", company: "Northstar Fintech", stage: 0 },
    { name: "Liam Chen", company: "Ledgerflow", stage: 0 },
    { name: "Maya Patel", company: "Trailbank", stage: 0 },
    { name: "Sofia Torres", company: "UnitScale", stage: 0 },
    { name: "Ethan Brooks", company: "Paycove", stage: 0 },
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

  const stageLabel = (i) =>
    STAGES[i].replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const pct = (stage) => Math.round((stage / (STAGES.length - 1)) * 100);

  return (
    <div className="demo-slide demo-slide--pipeline">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        Real-Time Pipeline
      </motion.h2>
      <motion.div className="page-badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <ConvexBadge feature="real-time-query" />
        <ConvexBadge feature="durable-workflow" />
        <ConvexBadge feature="scheduled-functions" />
      </motion.div>
      <motion.div className="demo-pipeline-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        {prospects.map((p, i) => (
          <div key={i} className="demo-pipeline-row">
            <div className="demo-pipeline-info">
              <strong>{p.name}</strong>
              <small>{stageLabel(p.stage)}</small>
            </div>
            <div className="rail">
              <div
                className="fill"
                style={{ width: `${pct(p.stage)}%`, transition: "width 0.5s ease" }}
              />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- Slide 3: AI Script Generation ---------- */
function SlideScriptGeneration() {
  return (
    <div className="demo-slide demo-slide--script">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        AI Script Generation
      </motion.h2>
      <motion.div className="page-badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <ConvexBadge feature="delta-streaming" />
        <ConvexBadge feature="agent" />
        <ConvexBadge feature="vector-search" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <ScriptStream script={SAMPLE_SCRIPT} isPlaying={true} wordsPerSecond={8} />
      </motion.div>
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
      <motion.div className="page-badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <ConvexBadge feature="file-storage" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <NarratedSlideshow scenes={SAMPLE_SCENES} autoPlay={true} />
      </motion.div>
    </div>
  );
}

/* ---------- Slide 5: The Stack ---------- */
function SlideTheStack() {
  const features = [
    "real-time-query",
    "durable-workflow",
    "delta-streaming",
    "file-storage",
    "acid-mutation",
    "scheduled-functions",
    "vector-search",
    "http-actions",
    "agent",
  ];

  return (
    <div className="demo-slide demo-slide--stack">
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        The Stack
      </motion.h2>
      <motion.div className="sponsor-badges" style={{ marginBottom: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <span className="sponsor-badge">Convex</span>
        <span className="sponsor-badge">MiniMax</span>
        <span className="sponsor-badge">ElevenLabs</span>
        <span className="sponsor-badge">rtrvr.ai</span>
        <span className="sponsor-badge">Speechmatics</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <h3 style={{ marginBottom: 10 }}>9 Convex Features in Action</h3>
        <div className="demo-feature-grid">
          {features.map((f) => (
            <ConvexBadge key={f} feature={f} size="md" />
          ))}
        </div>
        <div className="demo-flow">
          <span>Upload</span>
          <span className="demo-flow-arrow">&rarr;</span>
          <span>Research</span>
          <span className="demo-flow-arrow">&rarr;</span>
          <span>Script</span>
          <span className="demo-flow-arrow">&rarr;</span>
          <span>Voice</span>
          <span className="demo-flow-arrow">&rarr;</span>
          <span>Visuals</span>
          <span className="demo-flow-arrow">&rarr;</span>
          <span>Video</span>
        </div>
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
  SlideTheStack,
];

export default function DemoPage() {
  const [phase, setPhase] = useState("title"); // "title" | "playing" | "ended"
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-advance during playing phase
  useEffect(() => {
    if (phase !== "playing") return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (current < SLIDE_COUNT - 1) {
        setCurrent((c) => c + 1);
      } else {
        setPhase("ended");
      }
    }, SLIDE_INTERVAL);
    return clearTimer;
  }, [phase, current, clearTimer]);

  // Escape key — return to title during playback
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && phase === "playing") {
        clearTimer();
        setPhase("title");
        setCurrent(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, clearTimer]);

  const startPlayback = () => {
    setCurrent(0);
    setPhase("playing");
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
            <h1>ProspectClip</h1>
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

        {phase === "playing" && (
          <motion.div
            key={`slide-${current}`}
            className="demo-slide-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <SlideComponent />
          </motion.div>
        )}

        {phase === "ended" && (
          <motion.div
            key="ended"
            className="demo-slide-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <SlideComponent />
            <motion.div
              className="demo-end-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button type="button" onClick={replay}>Replay</button>
              <Link to="/">Back to Home</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
