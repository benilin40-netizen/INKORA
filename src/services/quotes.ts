import { DailyQuote } from '../types';
import { FALLBACK_DAILY_QUOTES } from '../mockData';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fetchJson } from '../utils/api';

export const QuotesService = {
  getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getStorageKey(dateStr: string): string {
    return `inokora_daily_quote_v3_${dateStr}`;
  },

  getFallbackQuote(dateStr: string): DailyQuote {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % FALLBACK_DAILY_QUOTES.length;
    const base = FALLBACK_DAILY_QUOTES[index];
    return {
      ...base,
      date: dateStr
    };
  },

  getCachedQuote(dateStr: string): DailyQuote | null {
    try {
      const cached = localStorage.getItem(this.getStorageKey(dateStr));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[QuotesService] Failed to read localStorage quote:', e);
    }
    return null;
  },

  saveCachedQuote(quote: DailyQuote): void {
    try {
      localStorage.setItem(this.getStorageKey(quote.date), JSON.stringify(quote));
    } catch (e) {
      console.warn('[QuotesService] Failed to cache quote locally:', e);
    }
  },

  // Save the quote to Firestore database
  async saveToFirestore(quote: DailyQuote): Promise<void> {
    try {
      if (!db) return;
      const docRef = doc(db, 'daily_quotes', quote.date);
      await setDoc(
        docRef,
        {
          ...quote,
          updatedAt: Date.now()
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn('[QuotesService] Firestore quote sync skipped:', err?.message || err);
    }
  },

  // Fetch the daily quote from Firestore if available
  async fetchFromFirestore(dateStr: string): Promise<DailyQuote | null> {
    try {
      if (!db) return null;
      const docRef = doc(db, 'daily_quotes', dateStr);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as DailyQuote;
        if (data && data.text) {
          return data;
        }
      }
    } catch {
      // Ignore network errors or permission issues and proceed to API
    }
    return null;
  },

  async fetchOrGenerateDailyQuote(
    onBackgroundUpdate?: (updatedQuote: DailyQuote) => void
  ): Promise<DailyQuote> {
    const today = this.getTodayDateString();

    // 1. Instant cache check for immediate rendering (0ms delay)
    const cached = this.getCachedQuote(today);
    if (cached) {
      // Background sync with Firestore and server
      this.syncQuoteInBackground(today, cached, onBackgroundUpdate);
      return cached;
    }

    // 2. Prepare immediate deterministic fallback for 0ms initial paint
    const fallback = this.getFallbackQuote(today);

    // 3. Fetch canonical shared daily quote from server
    this.syncQuoteInBackground(today, fallback, onBackgroundUpdate);

    return fallback;
  },

  async syncQuoteInBackground(
    today: string,
    currentQuote: DailyQuote,
    onBackgroundUpdate?: (quote: DailyQuote) => void
  ): Promise<void> {
    try {
      // Check Firestore first
      const firestoreQuote = await this.fetchFromFirestore(today);
      if (firestoreQuote && firestoreQuote.text) {
        this.saveCachedQuote(firestoreQuote);
        if (onBackgroundUpdate && firestoreQuote.text !== currentQuote.text) {
          onBackgroundUpdate(firestoreQuote);
        }
        return;
      }

      // Query the server's authenticated daily-quote endpoint safely via proxy
      try {
        let authHeaders: Record<string, string> = {};
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            authHeaders['Authorization'] = `Bearer ${token}`;
          } catch {}
        }

        const serverQuote = await fetchJson<DailyQuote>('/api/daily-quote', {
          headers: authHeaders
        });
        if (serverQuote && serverQuote.text) {
          this.saveCachedQuote(serverQuote);
          await this.saveToFirestore(serverQuote);
          if (onBackgroundUpdate) {
            onBackgroundUpdate(serverQuote);
          }
          return;
        }
      } catch (quoteErr: any) {
        console.warn('[QuotesService] Server quote fetch skipped, using verified fallback:', quoteErr?.message || quoteErr);
      }

      // Fallback: save current fallback quote to Firestore and cache
      this.saveCachedQuote(currentQuote);
      await this.saveToFirestore(currentQuote);
    } catch (err: any) {
      console.warn('[QuotesService] Background quote sync error:', err?.message || err);
      this.saveCachedQuote(currentQuote);
    }
  }
};
