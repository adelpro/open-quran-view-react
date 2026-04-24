import { QuranClient } from '@quranjs/api';

export const quranClient = new QuranClient({
  clientId: import.meta.env.VITE_QURAN_CLIENT_ID,
  clientSecret: import.meta.env.VITE_QURAN_CLIENT_SECRET,
  authBaseUrl: '/auth-proxy',
  contentBaseUrl: '/api-proxy',
});
