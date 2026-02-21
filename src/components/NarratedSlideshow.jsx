import { useCallback, useEffect, useRef, useState } from "react";

export default function NarratedSlideshow({ scenes, autoPlay = false }) {
  const [currentScene, setCurrentScene] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [fadeClass, setFadeClass] = useState("slide-visible");
  const timerRef = useRef(null);

  const advanceScene = useCallback(() => {
    setFadeClass("slide-hidden");
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
      return;
    }
    timerRef.current = setTimeout(() => {
      advanceScene();
    }, scenes[currentScene]?.duration ?? 4000);
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
