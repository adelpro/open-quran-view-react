import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import type { ChapterAudioData, VerseTiming } from "../types/audio";

export type AudioPlayerHandle = {
  togglePlay: () => void;
  playing: boolean;
};

type Props = {
  chapterAudio: ChapterAudioData | null;
  getWordId: (verseKey: string, position: number) => number | undefined;
  onTimeUpdate: (timeMs: number) => void;
  onWordHighlight: (wordId: number | null) => void;
  onVerseChange?: (verseKey: string) => void;
  onStop: () => void;
  onPlayingChange?: (playing: boolean) => void;
  theme: "light" | "dark";
  autoPlay?: boolean;
};

export const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(function AudioPlayer(
  {
    chapterAudio,
    getWordId,
    onTimeUpdate,
    onWordHighlight,
    onVerseChange,
    onStop,
    onPlayingChange,
    theme,
    autoPlay = false,
  },
  ref
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVerse, setCurrentVerse] = useState<VerseTiming | null>(null);

  const lastHighlightRef = useRef<number | null>(null);
  const lastVerseRef = useRef<string | null>(null);
  const autoPlayTriggeredRef = useRef(false);

  // Reset when audio changes
  useEffect(() => {
    setCurrentTime(0);
    setCurrentVerse(null);
    setPlaying(false);
    autoPlayTriggeredRef.current = false;
  }, [chapterAudio]);

  // Auto-play when triggered from parent
  useEffect(() => {
    if (autoPlay && chapterAudio && audioRef.current && !autoPlayTriggeredRef.current) {
      autoPlayTriggeredRef.current = true;
      audioRef.current.play().catch(console.error);
      setPlaying(true);
      onPlayingChange?.(true);
    }
  }, [autoPlay, chapterAudio, onPlayingChange]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !chapterAudio) return;

    const timeMs = audio.currentTime * 1000;
    setCurrentTime(timeMs);
    onTimeUpdate(timeMs);

    // Find active verse
    const activeVerse = chapterAudio.verse_timings.find(
      (v) => timeMs >= v.timestamp_from && timeMs <= v.timestamp_to
    );

    if (activeVerse && activeVerse.verse_key !== lastVerseRef.current) {
      lastVerseRef.current = activeVerse.verse_key;
      setCurrentVerse(activeVerse);
      onVerseChange?.(activeVerse.verse_key);
    } else if (!activeVerse && lastVerseRef.current !== null) {
      lastVerseRef.current = null;
      setCurrentVerse(null);
    }

    // Find active word
    let activeWordId: number | null = null;
    if (activeVerse) {
      for (const [position, startMs, endMs] of activeVerse.segments) {
        if (timeMs >= startMs && timeMs <= endMs) {
          const wordId = getWordId(activeVerse.verse_key, position);
          if (wordId) {
            activeWordId = wordId;
            break;
          }
        }
      }
    }

    if (activeWordId !== lastHighlightRef.current) {
      lastHighlightRef.current = activeWordId;
      onWordHighlight(activeWordId);
    }
  }, [chapterAudio, getWordId, onTimeUpdate, onWordHighlight, onVerseChange]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    autoPlayTriggeredRef.current = false;
    onStop();
    onPlayingChange?.(false);
    onWordHighlight(null);
  }, [onStop, onWordHighlight, onPlayingChange]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      onPlayingChange?.(false);
    } else {
      audio.play().catch(console.error);
      setPlaying(true);
      onPlayingChange?.(true);
    }
  }, [playing, onPlayingChange]);

  // Expose togglePlay and playing to parent via ref
  useImperativeHandle(ref, () => ({ togglePlay, playing }), [togglePlay, playing]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !chapterAudio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime / 1000;
    setCurrentTime(newTime);
    onTimeUpdate(newTime);
  }, [chapterAudio, onTimeUpdate]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!chapterAudio) {
    return null;
  }

  const durationMs = chapterAudio.duration || 0;

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
        src={chapterAudio.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Seek bar */}
      <div style={{ flex: 1 }}>
        <input
          type="range"
          min={0}
          max={durationMs}
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
          <span>{formatTime(durationMs)}</span>
        </div>
      </div>

      <div
        style={{
          fontSize: "12px",
          color: theme === "dark" ? "#aaa" : "#666",
          textAlign: "center",
          minHeight: "18px",
          marginTop: "8px",
        }}
      >
        {currentVerse ? `Verse: ${currentVerse.verse_key}` : " "}
      </div>
    </div>
  );
});
