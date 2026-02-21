import { Link } from "react-router-dom";

function HomePage() {
  return (
    <section className="hero-page">
      <div className="hero-block">
        <h2 className="hero-headline">
          Personalized video outreach at scale.<br />
          Zero recording.
        </h2>
        <p className="hero-sub">
          Vimero researches each prospect, writes a custom script, generates voice-over narration,
          and composes a personalized sales video — all in under 90 seconds.
        </p>
        <div className="hero-ctas">
          <Link to="/demo" className="hero-btn primary">Watch Demo</Link>
          <Link to="/campaigns" className="hero-btn secondary">Explore</Link>
        </div>
      </div>

      <div className="how-it-works">
        <h3>How It Works</h3>
        <div className="steps-row">
          <div className="step-card">
            <div className="step-number">1</div>
            <h4>Upload Prospects</h4>
            <p>Paste a CSV of names and companies. Set your sender persona and campaign brief.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h4>AI Pipeline Runs</h4>
            <p>Research, script, voice, and visual generation happen in parallel — tracked in real time.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h4>Send Videos</h4>
            <p>Each prospect gets a unique narrated slideshow video ready to embed in outreach.</p>
          </div>
        </div>
      </div>

      <div className="powered-by">
        <span className="powered-label">Powered by</span>
        <div className="sponsor-badges">
          <span className="sponsor-badge">Convex</span>
          <span className="sponsor-badge">MiniMax</span>
          <span className="sponsor-badge">ElevenLabs</span>
          <span className="sponsor-badge">rtrvr.ai</span>
          <span className="sponsor-badge">Speechmatics</span>
        </div>
      </div>

      <div className="nav-pills">
        <Link to="/campaigns" className="nav-pill">Campaigns</Link>
        <Link to="/pipeline" className="nav-pill">Pipeline</Link>
        <Link to="/gallery" className="nav-pill">Gallery</Link>
      </div>
    </section>
  );
}

export default HomePage;
