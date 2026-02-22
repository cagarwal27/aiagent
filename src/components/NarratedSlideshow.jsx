import { useCallback, useEffect, useRef, useState } from "react";

export default function NarratedSlideshow({ scenes, autoPlay = false }) {
  const [currentScene, setCurrentScene] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [fadeClass, setFadeClass] = useState("slide-visible");
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const advanceScene = useCallback(() => {
    setFadeClass("slide-hidden");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTimeout(() => {
      setCurrentScene((prev) => {
        const next = prev + 1;
        if (next >= scenes.length) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      setFadeClass("slide-visible");
    }, 400);
  }, [scenes.length]);

  useEffect(() => {
    if (!playing) {
      clearTimeout(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    const scene = scenes[currentScene];
    if (!scene) return;

    // Play audio if available
    if (scene.audioUrl && audioRef.current) {
      audioRef.current.src = scene.audioUrl;
      audioRef.current.play().catch(() => {});
    }

    timerRef.current = setTimeout(() => {
      advanceScene();
    }, scene.duration ?? 4000);
    return () => clearTimeout(timerRef.current);
  }, [playing, currentScene, scenes, advanceScene]);

  const togglePlay = () => {
    setPlaying((p) => !p);
  };

  const scene = scenes[currentScene];
  if (!scene) return null;

  return (
    <div className="narrated-slideshow">
      <div className={`slideshow-display ${fadeClass}`}>
        <img src={scene.imageUrl} alt={`Scene ${currentScene + 1}`} />
        <div className="slideshow-subtitle">
          <p>{scene.narration}</p>
        </div>
      </div>
      <audio ref={audioRef} style={{ display: "none" }} />
      <div className="slideshow-controls">
        <button type="button" className="slideshow-play" onClick={togglePlay}>
          {playing ? "Pause" : "Play"}
        </button>
        <div className="slideshow-dots">
          {scenes.map((_, i) => (
            <span
              key={i}
              className={`slideshow-dot ${i === currentScene ? "active" : ""}`}
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                setFadeClass("slide-hidden");
                setTimeout(() => {
                  setCurrentScene(i);
                  setFadeClass("slide-visible");
                }, 300);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
