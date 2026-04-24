export type WordSegment = [wordIndex: number, startMs: number, endMs: number];

export type VerseTimestamp = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  segments: WordSegment[];
};

export type ChapterRecitation = {
  audio_file: {
    audio_url: string;
    timestamps: VerseTimestamp[];
  };
};
