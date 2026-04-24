import { useRef, useState, useCallback } from "react";
import type { WordTimestamp } from "../hooks/useWordTimestamps";

type Props = {
  audioUrl: string | null;
  wordTimestamps: Map<number, WordTimestamp>;
  onTimeUpdate: (timeMs: number) => void;
  onWordHighlight: (wordId: number | null) => void;
  theme: "light" | "dark";
};

export function AudioPlayer({
  audioUrl,
  wordTimestamps,
  onTimeUpdate,
  onWordHighlight,
  theme,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastHighlightRef = useRef<number | null>(null);

  const findActiveWord = useCallback(
    (timeMs: number): number | null => {
      for (const [wordId, { start, end }] of wordTimestamps) {
        if (timeMs >= start && timeMs <= end) {
          return wordId;
        }
      }
      return null;
    },
    [wordTimestamps]
  );

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const timeMs = audio.currentTime * 1000;
    setCurrentTime(timeMs);
    onTimeUpdate(timeMs);

    const activeWord = findActiveWord(timeMs);
    if (activeWord !== lastHighlightRef.current) {
      lastHighlightRef.current = activeWord;
      onWordHighlight(activeWord);
    }
  }, [findActiveWord, onTimeUpdate, onWordHighlight]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration * 1000);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime / 1000;
    setCurrentTime(newTime);
    onTimeUpdate(newTime);
  }, [onTimeUpdate]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div
      style={{
        background: theme === "dark" ? "#2a2a3e" : "#fff",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        marginTop: "16px",
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={togglePlay}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: theme === "dark" ? "#667eea" : "#333",
            color: "#fff",
            cursor: "pointer",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <div style={{ flex: 1 }}>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: "100%",
              accentColor: theme === "dark" ? "#667eea" : "#333",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: theme === "dark" ? "#aaa" : "#666",
              marginTop: "4px",
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
