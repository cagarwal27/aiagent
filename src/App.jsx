import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DemoPage from "./pages/DemoPage";
import CampaignManagerPage from "./pages/CampaignManagerPage";
import PipelineDashboardPage from "./pages/PipelineDashboardPage";
import GalleryPage from "./pages/GalleryPage";

function FloatingHomeButton() {
  const location = useLocation();
  if (location.pathname === "/" || location.pathname === "/demo") return null;
  return (
    <Link to="/" className="floating-home">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </Link>
  );
}

function App() {
  return (
    <BrowserRouter>
      <FloatingHomeButton />
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/campaigns" element={<CampaignManagerPage />} />
          <Route path="/pipeline" element={<PipelineDashboardPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
