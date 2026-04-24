import { useMemo, useRef } from "react";
import type { VerseTimestamp } from "../types/audio";

export type WordTimestamp = {
  start: number;
  end: number;
};

// Registry mapping (verseKey, position) -> wordId
type WordRegistry = Map<string, Map<number, number>>;

type UseWordTimestampsResult = {
  wordTimestamps: Map<number, WordTimestamp>;
  registerWord: (verseKey: string, position: number, wordId: number) => void;
  registerVerse: (verseKey: string, words: Array<{ position: number; id: number }>) => void;
};

export function useWordTimestamps(timestamps: VerseTimestamp[]): UseWordTimestampsResult {
  const registryRef = useRef<WordRegistry>(new Map());

  // Build wordId -> {start, end} lookup from timestamps
  const wordTimestamps = useMemo(() => {
    const map = new Map<number, WordTimestamp>();

    for (const verse of timestamps) {
      const verseKey = verse.verse_key; // e.g. "2:255"
      const positionToWordId = registryRef.current.get(verseKey);

      if (!positionToWordId) continue;

      for (const [wordIndex, startMs, endMs] of verse.segments) {
        // wordIndex is 1-based per ayah from API
        const wordId = positionToWordId.get(wordIndex);
        if (wordId !== undefined) {
          map.set(wordId, { start: startMs, end: endMs });
        }
      }
    }

    return map;
  }, [timestamps]);

  const registerWord = (verseKey: string, position: number, wordId: number) => {
    let verseMap = registryRef.current.get(verseKey);
    if (!verseMap) {
      verseMap = new Map();
      registryRef.current.set(verseKey, verseMap);
    }
    verseMap.set(position, wordId);
  };

  // Bulk register words for a verse (more efficient)
  const registerVerse = (
    verseKey: string,
    words: Array<{ position: number; id: number }>
  ) => {
    const verseMap = new Map<number, number>();
    for (const word of words) {
      verseMap.set(word.position, word.id);
    }
    registryRef.current.set(verseKey, verseMap);
  };

  return { wordTimestamps, registerWord, registerVerse };
}
