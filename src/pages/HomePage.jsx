import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

/* ===== Animated Number Counter (reused from demo) ===== */
function AnimatedNumber({ value, prefix = "", suffix = "", delay = 0 }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  const ref = useRef(null);

  useEffect(() => {
    if (started.current) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const timeout = setTimeout(() => {
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
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, delay]);

  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

/* ===== Fade-in-on-scroll wrapper ===== */
function FadeIn({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/* ===== Convex features data ===== */
const CONVEX_FEATURES = [
  {
    feature: "Durable Workflows",
    desc: "Our 5-step prospect pipeline (research, script, voice, visuals, delivery) runs as a single durable workflow. If any step fails, it retries automatically — no lost progress.",
    icon: "W",
  },
  {
    feature: "Real-time Queries",
    desc: "The pipeline dashboard updates live as each prospect moves through stages. No polling, no websocket boilerplate — just reactive subscriptions.",
    icon: "R",
  },
  {
    feature: "Agent Framework",
    desc: "Script generation uses Convex's agent framework with MiniMax M2.1. The agent calls a tool to save structured 3-scene scripts with delta streaming.",
    icon: "A",
  },
  {
    feature: "File Storage",
    desc: "AI-generated voice narrations and scene images are stored directly in Convex. Assets are served via signed URLs with zero external storage config.",
    icon: "F",
  },
  {
    feature: "ACID Mutations",
    desc: "Campaign creation atomically inserts the campaign and all prospect records. Status transitions are transactional — no half-updated states.",
    icon: "M",
  },
  {
    feature: "HTTP Actions",
    desc: "External API calls to rtrvr.ai, ElevenLabs, and MiniMax run as HTTP actions, keeping the workflow orchestration clean and retry-safe.",
    icon: "H",
  },
];

/* ===== Stack spine data ===== */
const SPINE_STEPS = [
  { step: "Upload CSV", external: null, convex: "ACID Mutations" },
  { step: "Research", external: "rtrvr.ai", convex: "HTTP Actions" },
  { step: "Script", external: "MiniMax M2.5", convex: "Agent + Streaming" },
  { step: "Voice", external: "ElevenLabs", convex: "File Storage" },
  { step: "Visuals", external: "MiniMax image-01", convex: "File Storage" },
  { step: "Video Ready", external: null, convex: "Real-time Queries" },
];

/* ===== Problem stats ===== */
const PROBLEM_STATS = [
  { value: 70, prefix: "", suffix: "%", label: "of rep time wasted on non-selling tasks", source: "Salesforce, 2026" },
  { value: 1, prefix: "<", suffix: "%", label: "average cold email reply rate", source: "Breakcold, 2026" },
  { value: 50, prefix: "$", suffix: "K", label: "pipeline generated per rep, per quarter", source: "Industry Average" },
];

/* ===== Before/After rows ===== */
const IMPACT_ROWS = [
  { before: "70%", beforeLabel: "time on non-selling tasks", after: "Instant", afterLabel: "AI-powered research", badge: "Time Saved" },
  { before: "<1%", beforeLabel: "cold email reply rate", after: "30%", afterLabel: "video reply rate", badge: "30x" },
  { before: "$50K", beforeLabel: "pipeline per quarter", after: "$250K", afterLabel: "pipeline per quarter", badge: "5x Revenue" },
];

function HomePage() {
  return (
    <div className="landing">
      {/* ===== HERO ===== */}
      <section className="landing-hero">
        <motion.h1
          className="landing-brand"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Vimero
        </motion.h1>
        <motion.p
          className="landing-headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          Personalized video outreach at scale.<br />
          Zero recording.
        </motion.p>
        <motion.p
          className="landing-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          Vimero researches each prospect, writes a custom script, generates voice-over
          narration, and composes a personalized sales video — all in under 90&nbsp;seconds.
        </motion.p>
        <motion.div
          className="landing-ctas"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link to="/campaigns" className="landing-btn landing-btn--primary">Try Vimero</Link>
          <Link to="/demo" className="landing-btn landing-btn--ghost">Watch Demo</Link>
        </motion.div>
      </section>

      {/* ===== THE PROBLEM ===== */}
      <section className="landing-section">
        <FadeIn>
          <h2 className="landing-section-title">The Broken Sales Funnel</h2>
          <p className="landing-section-sub">
            Your reps are drowning in research. Their emails are being ignored.
          </p>
        </FadeIn>
        <div className="landing-problem-grid">
          {PROBLEM_STATS.map((stat, i) => (
            <FadeIn key={i} delay={0.1 + i * 0.15}>
              <div className="landing-problem-card">
                <span className="landing-problem-number">
                  <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} delay={200 + i * 300} />
                </span>
                <span className="landing-problem-label">{stat.label}</span>
                <span className="landing-problem-source">{stat.source}</span>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="landing-section">
        <FadeIn>
          <h2 className="landing-section-title">How It Works</h2>
          <p className="landing-section-sub">
            From CSV upload to personalized video in five automated steps
          </p>
        </FadeIn>
        <div className="landing-steps">
          {[
            { num: "1", title: "Upload Prospects", desc: "Paste names and companies. Set your sender persona and campaign brief." },
            { num: "2", title: "AI Researches", desc: "Each prospect's company is scraped and analyzed for pain points and context." },
            { num: "3", title: "Script Generation", desc: "An AI agent writes a personalized 3-scene script referencing real research." },
            { num: "4", title: "Voice & Visuals", desc: "ElevenLabs generates narration. MiniMax creates cinematic scene images." },
            { num: "5", title: "Video Ready", desc: "Each prospect gets a unique narrated slideshow — ready to embed in outreach." },
          ].map((step, i) => (
            <FadeIn key={i} delay={0.05 + i * 0.1}>
              <div className="landing-step-card">
                <div className="landing-step-num">{step.num}</div>
                <div className="landing-step-text">
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ===== THE VIMERO EFFECT ===== */}
      <section className="landing-section">
        <FadeIn>
          <h2 className="landing-section-title">The Vimero Effect</h2>
          <p className="landing-section-sub landing-accent">Generate 5x more revenue</p>
        </FadeIn>

        <div className="landing-impact-header">
          <span className="landing-impact-label landing-impact-label--before">Without Vimero</span>
          <span />
          <span className="landing-impact-label landing-impact-label--after">With Vimero</span>
        </div>

        <div className="landing-impact-rows">
          {IMPACT_ROWS.map((r, i) => (
            <FadeIn key={i} delay={0.1 + i * 0.15}>
              <div className="landing-impact-row">
                <div className="landing-impact-before">
                  <span className="landing-impact-num landing-impact-num--danger">{r.before}</span>
                  <span className="landing-impact-desc">{r.beforeLabel}</span>
                </div>
                <div className="landing-impact-arrow">
                  <span className="landing-impact-badge">{r.badge}</span>
                  <svg width="36" height="14" viewBox="0 0 36 14"><path d="M0 7h30m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div className="landing-impact-after">
                  <span className="landing-impact-num landing-impact-num--success">{r.after}</span>
                  <span className="landing-impact-desc">{r.afterLabel}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ===== BUILT ON CONVEX ===== */}
      <section className="landing-section landing-convex-section">
        <FadeIn>
          <div className="landing-convex-header">
            <span className="landing-convex-badge">Convex</span>
            <h2 className="landing-section-title">Built on Convex</h2>
            <p className="landing-section-sub">
              Every part of Vimero's backend — database, file storage, workflows, AI agents,
              and real-time subscriptions — runs on a single Convex deployment.
              No infra to manage. No glue code.
            </p>
          </div>
        </FadeIn>

        <div className="landing-convex-grid">
          {CONVEX_FEATURES.map((f, i) => (
            <FadeIn key={i} delay={0.05 + i * 0.08}>
              <div className="landing-convex-card">
                <div className="landing-convex-icon">{f.icon}</div>
                <div>
                  <h4>{f.feature}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ===== THE STACK (spine) ===== */}
      <section className="landing-section">
        <FadeIn>
          <h2 className="landing-section-title">The Stack</h2>
          <p className="landing-section-sub">
            End-to-end pipeline orchestrated on Convex
          </p>
        </FadeIn>

        <div className="landing-spine-wrapper">
          <div className="landing-spine-line" />
          {SPINE_STEPS.map((s, i) => (
            <FadeIn key={i} delay={0.05 + i * 0.1} className="landing-spine-row">
              <div className="landing-spoke landing-spoke--left">
                {s.external && (
                  <>
                    <span className="landing-spoke-label">{s.external}</span>
                    <span className="landing-spoke-line" />
                  </>
                )}
              </div>
              <div className="landing-spine-node">
                <span className="landing-spine-step">{s.step}</span>
                <span className="landing-spine-feature">{s.convex}</span>
              </div>
              <div className="landing-spoke landing-spoke--right" />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ===== POWERED BY ===== */}
      <section className="landing-section">
        <FadeIn>
          <div className="landing-powered">
            <span className="landing-powered-label">Powered by</span>
            <div className="landing-powered-badges">
              {["Convex", "MiniMax", "ElevenLabs", "rtrvr.ai"].map((name) => (
                <span key={name} className="landing-powered-badge">{name}</span>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="landing-section landing-bottom-cta">
        <FadeIn>
          <h2 className="landing-section-title">Ready to see it in action?</h2>
          <p className="landing-section-sub">
            Generate a personalized sales video for any prospect in under 90 seconds.
          </p>
          <div className="landing-ctas">
            <Link to="/campaigns" className="landing-btn landing-btn--primary">Try Vimero</Link>
            <Link to="/demo" className="landing-btn landing-btn--ghost">Watch Demo</Link>
          </div>
        </FadeIn>
      </section>

      {/* ===== NAV PILLS ===== */}
      <nav className="landing-nav-pills">
        <Link to="/campaigns" className="nav-pill">Campaigns</Link>
        <Link to="/pipeline" className="nav-pill">Pipeline</Link>
        <Link to="/gallery" className="nav-pill">Gallery</Link>
      </nav>
    </div>
  );
}

export default HomePage;
