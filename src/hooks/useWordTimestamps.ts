import { useRef, useCallback } from "react";

// Registry mapping verseKey -> Map<position, wordId>
type WordRegistry = Map<string, Map<number, number>>;

type UseWordTimestampsResult = {
  getWordId: (verseKey: string, position: number) => number | undefined;
  registerWord: (verseKey: string, position: number, wordId: number) => void;
};

export function useWordTimestamps(): UseWordTimestampsResult {
  const registryRef = useRef<WordRegistry>(new Map());

  const registerWord = useCallback((verseKey: string, position: number, wordId: number) => {
    let verseMap = registryRef.current.get(verseKey);
    if (!verseMap) {
      verseMap = new Map();
      registryRef.current.set(verseKey, verseMap);
    }
    verseMap.set(position, wordId);
  }, []);

  const getWordId = useCallback((verseKey: string, position: number) => {
    return registryRef.current.get(verseKey)?.get(position);
  }, []);

  return { getWordId, registerWord };
}
