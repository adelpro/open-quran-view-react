import { useState, useCallback } from "react";
import { quranClient } from "../lib/quranClient";
import type { VerseTimestamp } from "../types/audio";
import type { Segment } from "@quranjs/api";

type UseChapterRecitationResult = {
  verses: VerseTimestamp[];
  loading: boolean;
  error: string | null;
  play: () => void;
};

export function useChapterRecitation(
  reciterId: number,
  surah: number
): UseChapterRecitationResult {
  const [verses, setVerses] = useState<VerseTimestamp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get verse recitations with segments for word-level timing
      const { audioFiles } = await quranClient.audio.findVerseRecitationsByChapter(
        surah as unknown as import("@quranjs/api").ChapterId,
        String(reciterId),
        { fields: { segments: true } }
      );

      if (!audioFiles || audioFiles.length === 0) {
        throw new Error("No audio files found for this surah and reciter");
      }

      // Build timestamps from verse recitations
      const verseTimestamps: VerseTimestamp[] = audioFiles.map((audio) => {
        return {
          verse_key: audio.verseKey,
          url: audio.url.startsWith("http") ? audio.url : `https://verses.quran.com/${audio.url}`,
          timestamp_from: 0,
          timestamp_to: 0,
          segments: (audio.segments || []).map((seg: Segment) => [
            seg[1], // wordIndex
            seg[2], // startMs
            seg[3], // endMs
          ] as [number, number, number]),
        };
      });

      setVerses(verseTimestamps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [reciterId, surah]);

  return { verses, loading, error, play };
}
