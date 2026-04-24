import { useState, useCallback, useRef, useEffect } from "react";
import { OpenQuranView } from "open-quran-view/view";
import type {
  MushafLayout,
  WordClickedData,
  PageLayout,
} from "open-quran-view/view/react";
import "./App.css";
import quranWordsData from "../data/tafseers/quran-words.json";
import type {
  WordMap,
  WordTafseer,
  VerseTafseer,
  SelectedTafseer,
} from "./types/tafseer";
import { TafseerDialog } from "./components/TafseerDialog";
import { AudioPlayer } from "./components/AudioPlayer";
import { useChapterRecitation } from "./hooks/useChapterRecitation";
import { useWordTimestamps } from "./hooks/useWordTimestamps";
import { quranClient } from "./lib/quranClient";
import { Language } from "@quranjs/api";

const MUSHAF_OPTIONS: { value: MushafLayout; label: string }[] = [
  { value: "hafs-v2", label: "Hafs (QCF V2)" },
  { value: "hafs-v4", label: "Hafs (QCF V4 with tajweed)" },
  { value: "hafs-unicode", label: "Hafs uncode (digital khat)" },
];

const quranWords = quranWordsData as WordMap;

function App() {
  const [page, setPage] = useState(1);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mushafLayout, setMushafLayout] = useState<MushafLayout>("hafs-v2");
  const [selectedTafseer, setSelectedTafseer] =
    useState<SelectedTafseer | null>(null);

  // Audio state
  const [currentReciter, setCurrentReciter] = useState<number>(1);
  const [currentSurah, setCurrentSurah] = useState<number>(1);
  const [activeWordRect, setActiveWordRect] = useState<DOMRect | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const quranContainerRef = useRef<HTMLDivElement>(null);

  // Word registry for highlighting
  const wordRectsRef = useRef<Map<number, DOMRect>>(new Map());

  const { verses, loading: audioLoading, error: audioError, play } =
    useChapterRecitation(currentReciter, currentSurah);

  const [reciters, setReciters] = useState<{ id: number; name: string }[]>([]);
  const [allSurahs, setAllSurahs] = useState<
    { value: number; name: string; page: number }[]
  >([]);
  const [availableChapterIds, setAvailableChapterIds] = useState<number[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [recitationsRes, chaptersRes] = await Promise.all([
          quranClient.resources.findAllRecitations({
            language: Language.ENGLISH,
          }),
          quranClient.chapters.findAll({ language: Language.ENGLISH }),
        ]);

        const formattedReciters = recitationsRes.map((r) => ({
          id: r.id!,
          name: r.reciterName || r.translatedName?.name || "Unknown",
        }));
        setReciters(formattedReciters);

        const formattedSurahs = chaptersRes.map((c) => ({
          value: c.id,
          name: c.nameSimple,
          page: c.pages[0],
        }));
        setAllSurahs(formattedSurahs);

        if (formattedReciters.length > 0)
          setCurrentReciter(formattedReciters[0].id);
      } catch (err) {
        console.error("Failed to load reciters or chapters", err);
      } finally {
        setIsDataLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch available chapters for the selected reciter
  useEffect(() => {
    if (!currentReciter) return;

    async function loadAvailableChapters() {
      try {
        const chapterRecitations =
          await quranClient.audio.findAllChapterRecitations(
            String(currentReciter),
          );
        const chapterIds = chapterRecitations.map((cr) => cr.chapterId);
        setAvailableChapterIds(chapterIds);

        // Auto-select the first available chapter if the current one is not available
        if (chapterIds.length > 0 && !chapterIds.includes(currentSurah)) {
          const firstAvailable = chapterIds[0];
          setCurrentSurah(firstAvailable);
          const surahInfo = allSurahs.find((s) => s.value === firstAvailable);
          if (surahInfo) setPage(surahInfo.page);
        }
      } catch (err) {
        console.error("Failed to load available chapters for reciter", err);
        setAvailableChapterIds([]);
      }
    }
    loadAvailableChapters();
  }, [currentReciter, currentSurah, allSurahs]);

  const { getWordId, registerWord } = useWordTimestamps();

  // Navigate to surah's starting page and play
  const handlePlay = useCallback(() => {
    const surahInfo = allSurahs.find((s) => s.value === currentSurah);
    if (surahInfo) {
      setPage(surahInfo.page);
    }
    play();
    setIsPlaying(true);
  }, [currentSurah, play, allSurahs]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleWordClick = useCallback((word: WordClickedData) => {
    if (word.charType === "end") {
      const verseKey = `${word.surahNumber}:${word.ayahNumber}`;
      const verseTafseer = quranWords[verseKey] as VerseTafseer | undefined;
      if (verseTafseer) {
        setSelectedTafseer({
          tafseer: verseTafseer.tafseer,
          verse: verseTafseer.verse,
          surah: verseTafseer.surah,
        });
      }
      return;
    }

    if (word.charType === "word") {
      const wordKey = `${word.surahNumber}:${word.ayahNumber}:${word.position}`;
      const wordTafseer = quranWords[wordKey] as WordTafseer | undefined;
      if (wordTafseer) {
        setSelectedTafseer({
          tafseer: wordTafseer.tafseer,
          verse: wordTafseer.verse,
          surah: wordTafseer.surah,
          position: word.position,
          text: wordTafseer.text,
        });
      }
      return;
    }
  }, []);

  const closeTafseerDialog = useCallback(() => {
    setSelectedTafseer(null);
  }, []);

  const handleLoad = useCallback(
    (layout: PageLayout) => {
      console.log("Page loaded:", layout);

      // Register words for timestamps directly from layout
      if (layout && layout.lines) {
        layout.lines.forEach((line) => {
          line.words?.forEach((word) => {
            if (word.charType === "word") {
              const verseKey = `${word.surah}:${word.verse}`;
              registerWord(verseKey, word.position, word.id);
            }
          });
        });
      }

      // We still need the DOM elements to know their bounding rectangles for highlighting
      setTimeout(() => {
        const container = document.querySelector("[data-quran-view]");
        if (!container) return;

        const wordElements = container.querySelectorAll("[data-word-id]");
        wordElements.forEach((el) => {
          const wordId = Number(el.getAttribute("data-word-id"));
          if (wordId && el instanceof HTMLElement) {
            wordRectsRef.current.set(wordId, el.getBoundingClientRect());
          }
        });
      }, 100);
    },
    [registerWord],
  );

  const handleTimeUpdate = useCallback((_timeMs: number) => {
    console.log(_timeMs);
    // Currently unused but kept for future progress display
  }, []);

  const handleWordHighlight = useCallback((wordId: number | null) => {
    if (wordId !== null) {
      const rect = wordRectsRef.current.get(wordId);
      setActiveWordRect(rect ?? null);
    } else {
      setActiveWordRect(null);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        background: theme === "dark" ? "#1a1a2e" : "#f5f5f5",
        transition: "background 0.3s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          padding: "0 20px",
        }}
      >
        <h1
          style={{
            color: theme === "dark" ? "#fff" : "#2c3e50",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Open Quran View
        </h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={mushafLayout}
            onChange={(e) => setMushafLayout(e.target.value as MushafLayout)}
            style={{
              padding: "10px 15px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: theme === "dark" ? "#333" : "#fff",
              color: theme === "dark" ? "#fff" : "#333",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {MUSHAF_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              setTheme((prev) => (prev === "light" ? "dark" : "light"))
            }
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              background: theme === "dark" ? "#667eea" : "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "20px",
        }}
      >
        <div style={{ position: "relative" }} ref={quranContainerRef}>
          <OpenQuranView
            page={page}
            width={500}
            height={700}
            theme={theme}
            mushafLayout={mushafLayout}
            onPageChange={handlePageChange}
            onWordClick={handleWordClick}
            onLoad={handleLoad}
          />

          {/* Word highlight overlay */}
          {activeWordRect && (
            <div
              style={{
                position: "absolute",
                top: activeWordRect.top,
                left: activeWordRect.left,
                width: activeWordRect.width,
                height: activeWordRect.height,
                background: "rgba(102, 126, 234, 0.4)",
                borderRadius: "4px",
                pointerEvents: "none",
                transition: "all 0.1s ease-out",
              }}
            />
          )}
        </div>

        <div
          style={{
            background: theme === "dark" ? "#2a2a3e" : "#fff",
            padding: "20px",
            borderRadius: "12px",
            width: "300px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              color: theme === "dark" ? "#fff" : "#2c3e50",
              fontFamily: "system-ui, -apple-system, sans-serif",
              marginBottom: "15px",
            }}
          >
            Quran Info
          </h2>
          <p style={{ color: theme === "dark" ? "#ccc" : "#666" }}>
            This is a demonstration of the Open Quran View component. The
            component displays Quran pages with Arabic text and navigation
            controls.
          </p>
          <div style={{ marginTop: "15px" }}>
            <p style={{ color: theme === "dark" ? "#aaa" : "#888" }}>
              <strong>Current Page:</strong> {page}
            </p>
            <p style={{ color: theme === "dark" ? "#aaa" : "#888" }}>
              <strong>Mushaf Layout:</strong>{" "}
              {MUSHAF_OPTIONS.find((o) => o.value === mushafLayout)?.label ||
                mushafLayout}
            </p>
            <p style={{ color: theme === "dark" ? "#aaa" : "#888" }}>
              <strong>Total Pages:</strong> 604
            </p>
          </div>

          {/* Audio Controls */}
          <div
            style={{
              marginTop: "20px",
              borderTop: "1px solid #ddd",
              paddingTop: "20px",
            }}
          >
            <h3
              style={{
                color: theme === "dark" ? "#fff" : "#2c3e50",
                marginBottom: "10px",
              }}
            >
              Audio Recitation
            </h3>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: theme === "dark" ? "#aaa" : "#666",
                fontSize: "14px",
              }}
            >
              Reciter
              <select
                value={currentReciter}
                onChange={(e) => setCurrentReciter(Number(e.target.value))}
                disabled={isDataLoading}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  background: theme === "dark" ? "#333" : "#fff",
                  color: theme === "dark" ? "#fff" : "#333",
                }}
              >
                {reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: theme === "dark" ? "#aaa" : "#666",
                fontSize: "14px",
              }}
            >
              Surah
              <select
                value={currentSurah}
                onChange={(e) => {
                  const newSurah = Number(e.target.value);
                  setCurrentSurah(newSurah);
                  const surahInfo = allSurahs.find((s) => s.value === newSurah);
                  if (surahInfo) {
                    setPage(surahInfo.page);
                  }
                }}
                disabled={isDataLoading || availableChapterIds.length === 0}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  background: theme === "dark" ? "#333" : "#fff",
                  color: theme === "dark" ? "#fff" : "#333",
                }}
              >
                {allSurahs
                  .filter((s) => availableChapterIds.includes(s.value))
                  .map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value}. {s.name}
                    </option>
                  ))}
              </select>
            </label>

            {/* Play Button */}
            <button
              onClick={handlePlay}
              disabled={audioLoading}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "12px",
                borderRadius: "8px",
                border: "none",
                background: audioLoading
                  ? "#999"
                  : theme === "dark"
                    ? "#667eea"
                    : "#333",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: audioLoading ? "not-allowed" : "pointer",
              }}
            >
              {audioLoading ? "Loading..." : isPlaying ? "Playing..." : "Play"}
            </button>

            {audioError && (
              <p
                style={{ color: "#e74c3c", fontSize: "12px", marginTop: "8px" }}
              >
                Error: {audioError}
              </p>
            )}

            <AudioPlayer
              verses={verses}
              getWordId={getWordId}
              onTimeUpdate={handleTimeUpdate}
              onWordHighlight={handleWordHighlight}
              onStop={handleStop}
              theme={theme}
              autoPlay={isPlaying}
            />
          </div>
        </div>
      </div>
      <TafseerDialog
        selectedTafseer={selectedTafseer}
        theme={theme}
        onClose={closeTafseerDialog}
      />
    </div>
  );
}

export default App;
