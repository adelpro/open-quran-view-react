export type WordSegment = [wordIndex: number, startMs: number, endMs: number];

export type VerseTiming = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  duration: number;
  segments: WordSegment[];
};

export type ChapterAudioData = {
  audio_url: string;
  duration: number;
  verse_timings: VerseTiming[];
};
