import React, { useState } from 'react';
import { BookOpen, Bookmark, CheckCircle2, Clock, Trash2, ArrowRight, Compass } from 'lucide-react';
import { Story, BookshelfStatus, BookshelfItem } from '../types';
import { StorageService } from '../services/storage';
import { BookCoverDisplay } from '../components/BookCoverDisplay';

interface BookshelfPageProps {
  stories: Story[];
  onReadStory: (storyId: string) => void;
  onNavigate: (page: string) => void;
}

export const BookshelfPage: React.FC<BookshelfPageProps> = ({
  stories,
  onReadStory,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<BookshelfStatus>('reading');
  const [bookshelfItems, setBookshelfItems] = useState<BookshelfItem[]>(StorageService.getBookshelf());
  const progressMap = StorageService.getReadingProgressMap();

  const handleUpdateStatus = (storyId: string, newStatus: BookshelfStatus) => {
    const updated = StorageService.setBookshelfStatus(storyId, newStatus);
    setBookshelfItems(updated);
  };

  const handleRemove = (storyId: string) => {
    const updated = StorageService.removeFromBookshelf(storyId);
    setBookshelfItems(updated);
  };

  // Filter stories on the shelf by active tab status
  const filteredItems = bookshelfItems.filter((item) => item.status === activeTab);
  const itemsWithStories = filteredItems
    .map((item) => {
      const story = stories.find((s) => s.id === item.storyId);
      const progress = progressMap[item.storyId];
      return { item, story, progress };
    })
    .filter((entry) => entry.story !== undefined);

  const readingCount = bookshelfItems.filter((i) => i.status === 'reading').length;
  const wantToReadCount = bookshelfItems.filter((i) => i.status === 'want_to_read').length;
  const completedCount = bookshelfItems.filter((i) => i.status === 'completed').length;

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-stone-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-medium mb-3 shadow-lg">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Personal Reading Vault</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-100">
              My Bookshelf
            </h1>
            <p className="text-stone-400 text-sm mt-1 font-light">
              Organize your reading journey, track chapter progress, and revisit your library.
            </p>
          </div>

          <button
            onClick={() => onNavigate('library')}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Discover More Books</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-800/60">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'reading'
                ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner'
                : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>Currently Reading ({readingCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('want_to_read')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'want_to_read'
                ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner'
                : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Want to Read ({wantToReadCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'completed'
                ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner'
                : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completed ({completedCount})</span>
          </button>
        </div>

        {/* Content Section */}
        {itemsWithStories.length === 0 ? (
          <div className="text-center py-20 bg-[#121110]/80 backdrop-blur-md border border-stone-800 rounded-3xl p-8 shadow-xl">
            <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <h3 className="text-xl font-serif font-bold text-stone-200 mb-2">
              No stories in "{activeTab.replace('_', ' ')}"
            </h3>
            <p className="text-stone-400 text-sm max-w-md mx-auto mb-8 font-light">
              Visit the public library to discover captivating stories and add them to your personal shelf.
            </p>
            <button
              onClick={() => onNavigate('library')}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors shadow-lg shadow-rose-950/50"
            >
              Explore Public Library
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itemsWithStories.map(({ item, story, progress }) => {
              if (!story) return null;
              const percent = progress?.percent ?? 0;
              const currentChapterIdx = progress?.currentChapterIndex ?? 0;
              const totalChapters = story.chapters.length || 1;

              return (
                <div
                  key={story.id}
                  className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl hover:border-stone-700 transition-all group"
                >
                  <div>
                    <div className="flex gap-4 mb-4">
                      {/* Book Cover Thumbnail */}
                      <div 
                        onClick={() => onReadStory(story.id)}
                        className="w-24 sm:w-28 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        title="Click to resume reading"
                      >
                        <BookCoverDisplay
                          cover={story.cover}
                          title={story.title}
                          author={story.authorName}
                          genre={story.genre}
                          aspectRatio="2/3"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 text-[10px] font-medium border border-rose-900/50 uppercase tracking-wider font-mono">
                              {story.genre}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <select
                                value={item.status}
                                onChange={(e) => handleUpdateStatus(story.id, e.target.value as BookshelfStatus)}
                                className="bg-[#1c1917] border border-stone-800 rounded-lg text-[10px] text-stone-300 px-1.5 py-0.5 focus:outline-none"
                              >
                                <option value="reading">Reading</option>
                                <option value="want_to_read">Want</option>
                                <option value="completed">Done</option>
                              </select>

                              <button
                                onClick={() => handleRemove(story.id)}
                                className="p-1 rounded-lg bg-stone-900 hover:bg-rose-950/60 text-stone-500 hover:text-rose-400 border border-stone-800 transition-colors"
                                title="Remove from Shelf"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <h3 
                            onClick={() => onReadStory(story.id)}
                            className="text-base font-serif font-bold text-stone-100 group-hover:text-rose-300 transition-colors line-clamp-2 cursor-pointer"
                          >
                            {story.title}
                          </h3>
                          <p className="text-[11px] text-stone-400 font-mono mt-0.5">by {story.authorName}</p>
                        </div>

                        <p className="text-stone-400 text-xs line-clamp-2 my-2 font-light">
                          {story.synopsis}
                        </p>
                      </div>
                    </div>

                    {/* Reading Progress Indicator */}
                    <div className="mb-4 space-y-1.5 bg-[#181614] p-3 rounded-xl border border-stone-800/60">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">
                          Chapter {currentChapterIdx + 1} of {totalChapters}
                        </span>
                        <span className="font-mono text-rose-300 font-semibold">{percent}%</span>
                      </div>
                      <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onReadStory(story.id)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <span>Continue Reading</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
