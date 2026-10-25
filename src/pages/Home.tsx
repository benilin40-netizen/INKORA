import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Compass, PenTool, ArrowRight, Star } from 'lucide-react';
import { Story, DailyQuote } from '../types';
import { StorageService } from '../services/storage';
import { DailyQuoteCard } from '../components/DailyQuoteCard';

interface HomeProps {
  onNavigate: (page: string, storyId?: string) => void;
  stories: Story[];
}

export const Home: React.FC<HomeProps> = ({ onNavigate, stories }) => {
  const publishedStories = stories.filter(s => s.status === 'published');
  const bookshelf = StorageService.getBookshelf();
  const progressMap = StorageService.getReadingProgressMap();

  // Active reading items
  const currentlyReadingItems = bookshelf
    .filter(item => item.status === 'reading')
    .map(item => ({
      item,
      story: stories.find(s => s.id === item.storyId),
      progress: progressMap[item.storyId]
    }))
    .filter(entry => entry.story !== undefined);

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] relative z-10">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28 border-b border-[#292524]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-medium mb-6 tracking-wide shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dedicated Storytelling & Reading Sanctuary</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif font-bold tracking-tight mb-8">
            Your imagination, <br />
            <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-rose-200 bg-clip-text text-transparent">
              in print.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-stone-300 mb-12 font-light leading-relaxed">
            The sanctuary for novelists, world-builders, and poets. Write chapters, organize outlines, design breathtaking book covers, and publish with AI to the world.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('mystories')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 group transition-all"
            >
              <PenTool className="w-5 h-5" />
              <span>Start Writing Your Book</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('library')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#1c1917]/80 hover:bg-stone-800 text-stone-200 font-medium border border-stone-800 flex items-center justify-center gap-2 transition-colors"
            >
              <Compass className="w-5 h-5 text-amber-400" />
              <span>Explore Public Library</span>
            </button>
          </div>

        </div>
      </section>

      {/* Discreet Atmospheric Daily Quote */}
      <DailyQuoteCard />

      {/* Continue Reading Section (If user has reading in progress) */}
      {currentlyReadingItems.length > 0 && (
        <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-rose-400 font-mono text-xs uppercase tracking-widest mb-1">Your Journey</div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">Continue Reading</h2>
            </div>
            <button
              onClick={() => onNavigate('bookshelf')}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
            >
              <span>View Bookshelf</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentlyReadingItems.slice(0, 3).map(({ story, progress }) => {
              if (!story) return null;
              const percent = progress?.percent ?? 0;
              const chapterIdx = progress?.currentChapterIndex ?? 0;

              return (
                <div
                  key={story.id}
                  onClick={() => onNavigate('reader', story.id)}
                  className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 hover:border-rose-800/60 rounded-2xl p-6 transition-all cursor-pointer group shadow-xl"
                >
                  <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
                    <span className="text-rose-400 font-medium">{story.genre}</span>
                    <span className="font-mono text-stone-300">{percent}% finished</span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-stone-100 group-hover:text-rose-300 transition-colors mb-1 truncate">
                    {story.title}
                  </h3>
                  <p className="text-xs text-stone-400 mb-4">Chapter {chapterIdx + 1} of {story.chapters.length || 1}</p>
                  
                  <div className="w-full bg-stone-800 h-1 rounded-full overflow-hidden mb-4">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-300 font-medium">
                    <span>Resume Story</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Masterpieces or Clean Empty State */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12">
          <div>
            <div className="text-rose-400 font-mono text-sm uppercase tracking-widest mb-2">Curated Shelf</div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-100">Featured Masterpieces</h2>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="mt-4 md:mt-0 text-rose-400 hover:text-rose-300 font-medium text-sm flex items-center gap-1 group"
          >
            <span>Browse all in Library</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {publishedStories.length === 0 ? (
          <div className="text-center py-20 bg-[#121110]/80 backdrop-blur-md border border-stone-800 rounded-3xl p-8 shadow-xl">
            <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <h3 className="text-xl font-serif font-bold text-stone-200 mb-2">No published stories yet</h3>
            <p className="text-stone-400 text-sm max-w-md mx-auto mb-8 font-light">
              Be the first author to publish a masterpiece to the global INKORA sanctuary.
            </p>
            <button
              onClick={() => onNavigate('mystories')}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors shadow-lg shadow-rose-950/40"
            >
              Create Your First Story
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {publishedStories.map(story => (
              <div
                key={story.id}
                onClick={() => onNavigate('reader', story.id)}
                className="bg-[#121110]/90 backdrop-blur-md border border-[#292524] rounded-2xl p-6 hover:border-rose-600/50 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-rose-950/60 text-rose-300 text-xs font-medium border border-rose-900/50">
                      {story.genre}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>4.9</span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-serif font-bold text-stone-100 mb-2 group-hover:text-rose-300 transition-colors">
                    {story.title}
                  </h3>
                  <p className="text-stone-400 text-sm line-clamp-3 mb-6 font-light leading-relaxed">
                    {story.synopsis}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-rose-900/60 flex items-center justify-center text-xs text-rose-200 font-bold">
                      {story.authorName[0]}
                    </div>
                    <span className="text-sm text-stone-300 font-medium">{story.authorName}</span>
                  </div>
                  <span className="text-xs text-stone-500">{story.totalWordCount.toLocaleString()} words</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
