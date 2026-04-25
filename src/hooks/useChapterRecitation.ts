import { useState, useCallback } from "react";
import type { ChapterAudioData } from "../types/audio";

type UseChapterRecitationResult = {
  chapterAudio: ChapterAudioData | null;
  loading: boolean;
  error: string | null;
  play: () => void;
};

export function useChapterRecitation(
  reciterId: number,
  surah: number
): UseChapterRecitationResult {
  const [chapterAudio, setChapterAudio] = useState<ChapterAudioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch chapter audio file with segments from QDC API
      const response = await fetch(`https://api.quran.com/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${surah}&segments=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio data: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.audio_files || data.audio_files.length === 0) {
        throw new Error("No audio files found for this surah and reciter");
      }

      const audioFile = data.audio_files[0];

      setChapterAudio({
        audio_url: audioFile.audio_url,
        duration: audioFile.duration,
        verse_timings: audioFile.verse_timings || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [reciterId, surah]);

  return { chapterAudio, loading, error, play };
}
