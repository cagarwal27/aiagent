import { useEffect, useRef, useState } from "react";
import ConvexBadge from "./ConvexBadge";

export default function ScriptStream({
  script,
  isPlaying = true,
  onComplete,
  wordsPerSecond = 6,
}) {
  const words = script.split(/\s+/);
  const [visibleCount, setVisibleCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    setVisibleCount(0);
  }, [script]);

  useEffect(() => {
    if (!isPlaying) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= words.length) {
          clearInterval(intervalRef.current);
          onComplete?.();
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / wordsPerSecond);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, words.length, wordsPerSecond, onComplete]);

  return (
    <div className="script-stream">
      <div className="script-stream-header">
        <span className="script-stream-title">AI Script Generation</span>
        <div className="script-stream-badges">
          <ConvexBadge feature="delta-streaming" />
          <ConvexBadge feature="agent" />
        </div>
      </div>
      <div className="script-stream-body">
        {words.slice(0, visibleCount).join(" ")}
        {visibleCount < words.length && <span className="script-cursor">|</span>}
      </div>
      <div className="script-stream-footer">
        {visibleCount} / {words.length} words
      </div>
    </div>
  );
}
