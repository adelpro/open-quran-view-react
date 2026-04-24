import { useRef, useState, useCallback, useEffect } from "react";
import type { VerseTimestamp } from "../types/audio";

type Props = {
  verses: VerseTimestamp[];
  getWordId: (verseKey: string, position: number) => number | undefined;
  onTimeUpdate: (timeMs: number) => void;
  onWordHighlight: (wordId: number | null) => void;
  onStop: () => void;
  theme: "light" | "dark";
  autoPlay?: boolean;
};

export function AudioPlayer({
  verses,
  getWordId,
  onTimeUpdate,
  onWordHighlight,
  onStop,
  theme,
  autoPlay = false,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);

  const lastHighlightRef = useRef<number | null>(null);
  const autoPlayTriggeredRef = useRef(false);

  // Reset when verses change
  useEffect(() => {
    setCurrentVerseIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    autoPlayTriggeredRef.current = false;
  }, [verses]);

  // Auto-play when verses becomes available and autoPlay is true
  useEffect(() => {
    if (autoPlay && verses.length > 0 && audioRef.current && !autoPlayTriggeredRef.current) {
      autoPlayTriggeredRef.current = true;
      audioRef.current.play().catch(console.error);
      setPlaying(true);
    }
  }, [autoPlay, verses]);

  const currentVerse = verses[currentVerseIndex];

  const findActiveWord = useCallback(
    (timeMs: number): number | null => {
      if (!currentVerse) return null;
      for (const [position, startMs, endMs] of currentVerse.segments) {
        if (timeMs >= startMs && timeMs <= endMs) {
          const wordId = getWordId(currentVerse.verse_key, position);
          return wordId ?? null;
        }
      }
      return null;
    },
    [currentVerse, getWordId]
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

  const handleEnded = useCallback(() => {
    if (currentVerseIndex < verses.length - 1) {
      // Play next verse
      setCurrentVerseIndex(prev => prev + 1);
      // It will auto-play because the src changes and we call play()
      setTimeout(() => {
         audioRef.current?.play().catch(console.error);
      }, 50);
    } else {
      // Finished all verses
      setPlaying(false);
      autoPlayTriggeredRef.current = false;
      onStop();
      onWordHighlight(null);
    }
  }, [currentVerseIndex, verses.length, onStop, onWordHighlight]);

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

  if (!currentVerse) {
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
        src={currentVerse.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
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
      <div style={{ fontSize: "12px", color: theme === "dark" ? "#aaa" : "#666", textAlign: "center" }}>
        Playing Verse: {currentVerse.verse_key} ({currentVerseIndex + 1} / {verses.length})
      </div>
    </div>
  );
}
