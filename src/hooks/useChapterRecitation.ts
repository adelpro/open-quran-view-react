import { useState, useEffect, useRef } from "react";
import type { ChapterRecitation, VerseTimestamp } from "../types/audio";

const QURAN_API_BASE = import.meta.env.VITE_QURAN_API_BASE || "https://apis.quran.foundation";
const QURAN_OAUTH_ENDPOINT = import.meta.env.VITE_QURAN_OAUTH_ENDPOINT || "https://oauth2.quran.foundation";

type UseChapterRecitationResult = {
  audioUrl: string | null;
  timestamps: VerseTimestamp[];
  loading: boolean;
  error: string | null;
};

interface TokenCache {
  token: string;
  expiresAt: number;
}

export function useChapterRecitation(
  reciterId: number | null,
  surah: number | null
): UseChapterRecitationResult {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [timestamps, setTimestamps] = useState<VerseTimestamp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenCacheRef = useRef<TokenCache | null>(null);

  const getAccessToken = async (): Promise<string> => {
    // Return cached token if still valid
    if (tokenCacheRef.current && Date.now() < tokenCacheRef.current.expiresAt) {
      return tokenCacheRef.current.token;
    }

    const clientId = import.meta.env.VITE_QURAN_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_QURAN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing API credentials in .env");
    }

    const tokenUrl = `${QURAN_OAUTH_ENDPOINT}/oauth/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token fetch failed: HTTP ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    tokenCacheRef.current = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Refresh 1 min early
    };

    return data.access_token;
  };

  useEffect(() => {
    if (!reciterId || !surah) {
      setAudioUrl(null);
      setTimestamps([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const accessToken = await getAccessToken();
        if (cancelled) return;

        const url = `${QURAN_API_BASE}/content/api/v4/chapter_recitations/${reciterId}/${surah}?segments=true`;
        const res = await fetch(url, {
          headers: {
            "x-client-id": import.meta.env.VITE_QURAN_CLIENT_ID,
            "x-auth-token": accessToken,
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as ChapterRecitation;
        if (cancelled) return;

        setAudioUrl(data.audio_file.audio_url);
        setTimestamps(data.audio_file.timestamps || []);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [reciterId, surah]);

  return { audioUrl, timestamps, loading, error };
}
