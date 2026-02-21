import { Link } from "react-router-dom";

function HomePage() {
  return (
    <section className="panel page-panel">
      <h2>Home</h2>
      <p className="home-lead">
        Use this console to manage campaigns, monitor real-time generation pipelines, and view generated media assets.
      </p>

      <div className="home-grid">
        <article className="home-card">
          <h3>Campaign Manager</h3>
          <p>Create, edit, and delete campaigns with sender persona and prospect lists.</p>
          <Link to="/campaigns">Open Campaign Manager</Link>
        </article>

        <article className="home-card">
          <h3>Pipeline Dashboard</h3>
          <p>Track live prospect status through research, script, voice, and visuals.</p>
          <Link to="/pipeline">Open Pipeline Dashboard</Link>
        </article>

        <article className="home-card">
          <h3>Gallery</h3>
          <p>Preview generated video/audio/images and browse downloadable assets.</p>
          <Link to="/gallery">Open Gallery</Link>
        </article>
      </div>
    </section>
  );
}

export default HomePage;
