import React, { useState, useEffect } from 'react';
import { Sparkles, Quote as QuoteIcon } from 'lucide-react';
import { DailyQuote } from '../types';
import { fetchJson } from '../utils/api';

const STATIC_FALLBACK_QUOTES: { text: string; style: string }[] = [
  { text: 'Every story begins with a thought brave enough to become words.', style: 'storytelling' },
  { text: 'To love someone is to memorize the unwritten chapters of their heart.', style: 'romance' },
  { text: 'Silence is not the absence of words, but the space where meaning gathers.', style: 'wisdom' },
  { text: 'A true companion reads between the lines of your quietest moments.', style: 'friendship' },
  { text: 'Some heartbreaks cannot be healed by time, only rewritten into peace.', style: 'heartbreak' },
  { text: 'We do not run from shadows; we learn to illuminate the road ahead.', style: 'life' },
  { text: 'Between pages of parchment, time forgets to age.', style: 'storytelling' },
  { text: 'The quietest rooms often hold the loudest worlds.', style: 'wisdom' }
];

export const DailyQuoteCard: React.FC = () => {
  const [quote, setQuote] = useState<DailyQuote>(() => {
    const today = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash * 31 + today.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % STATIC_FALLBACK_QUOTES.length;
    const base = STATIC_FALLBACK_QUOTES[idx];
    return {
      date: today,
      text: base.text,
      style: base.style,
      attribution: 'Original quote',
      isAiGenerated: false,
      generatedAt: Date.now()
    };
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchDailyQuote() {
      try {
        const data = await fetchJson<DailyQuote>('/api/daily-quote');
        if (isMounted && data && data.text) {
          setQuote(data);
        }
      } catch (err) {
        console.warn('[DailyQuoteCard] Proxy request failed, using static fallback quote:', err);
        // Fallback already initialized in state
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchDailyQuote();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 my-10 relative z-20 text-center" aria-label="Daily literary reflection">
      <div className="py-7 px-8 rounded-2xl bg-[#141212]/70 border border-stone-800/60 backdrop-blur-md shadow-xl transition-all relative overflow-hidden group hover:border-rose-900/40">
        <div className="absolute top-3 left-4 text-stone-700/40 pointer-events-none">
          <QuoteIcon className="w-8 h-8 rotate-180" />
        </div>
        <div className="absolute bottom-3 right-4 text-stone-700/40 pointer-events-none">
          <QuoteIcon className="w-8 h-8" />
        </div>

        <p className="text-lg sm:text-xl font-serif italic text-stone-100 leading-relaxed font-light px-6">
          “{quote.text}”
        </p>

        <div className="mt-4 flex items-center justify-center gap-2.5 text-[11px] font-mono text-stone-400">
          <span className={`w-2 h-2 rounded-full ${quote.isAiGenerated ? 'bg-amber-400' : 'bg-rose-500'}`} />
          <span className="text-stone-300 font-medium">{quote.attribution}</span>
          <span>•</span>
          <span className="capitalize text-stone-400">{quote.style}</span>
        </div>
      </div>
    </section>
  );
};
