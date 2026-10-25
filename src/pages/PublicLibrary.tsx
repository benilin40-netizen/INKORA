import React, { useState } from 'react';
import { Search, Compass, Star, Bookmark, Heart, BookOpen, ArrowUpDown, Check } from 'lucide-react';
import { Story, Genre, BookshelfStatus } from '../types';
import { StorageService } from '../services/storage';
import { BookCoverDisplay } from '../components/BookCoverDisplay';

interface PublicLibraryProps {
  stories: Story[];
  onReadStory: (storyId: string) => void;
  bookmarks: string[];
  likes: string[];
  onToggleBookmark: (storyId: string) => void;
  onToggleLike: (storyId: string) => void;
}

const GENRES: Genre[] = [
  'Romance',
  'Fantasy',
  'Mystery',
  'Adventure',
  'Thriller',
  'Science Fiction',
  'Drama',
  'Horror',
  'Poetry',
  'Short Stories',
  'Historical Fiction',
  'Literary Fiction',
  'Cyberpunk'
];

export const PublicLibrary: React.FC<PublicLibraryProps> = ({
  stories,
  onReadStory,
  bookmarks,
  likes,
  onToggleBookmark,
  onToggleLike
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
  const [bookshelfStatusMap, setBookshelfStatusMap] = useState<Record<string, BookshelfStatus>>(() => {
    const map: Record<string, BookshelfStatus> = {};
    StorageService.getBookshelf().forEach(item => {
      map[item.storyId] = item.status;
    });
    return map;
  });

  const handleShelfChange = (storyId: string, status: BookshelfStatus) => {
    StorageService.setBookshelfStatus(storyId, status);
    setBookshelfStatusMap(prev => ({ ...prev, [storyId]: status }));
  };

  const publishedStories = stories.filter(s => s.status === 'published' && s.visibility === 'public');

  const filtered = publishedStories.filter(story => {
    const matchesSearch =
      story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.synopsis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (story.tags && story.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesGenre = selectedGenre === 'All' || story.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'recent') {
      return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-medium mb-4 shadow-lg">
            <Compass className="w-3.5 h-3.5" />
            <span>Global Public Library</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-stone-100 mb-4">
            Discover Masterpieces
          </h1>
          <p className="text-stone-400 text-base font-light">
            Explore stories published by visionary authors around the world. Bookmark your favorites, track reading progress, and immerse in new worlds.
          </p>
        </div>

        {/* Search, Sort, and Genre Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by title, author, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#141210] border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              <ArrowUpDown className="w-4 h-4 text-stone-400" />
              <span className="text-xs text-stone-400 font-mono">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'alphabetical')}
                className="bg-[#141210] border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
              >
                <option value="recent">Recently Updated</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Genre Scroll Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedGenre('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedGenre === 'All'
                  ? 'bg-rose-900/60 text-rose-200 border border-rose-800/60 shadow-inner'
                  : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              All Genres
            </button>
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedGenre === g
                    ? 'bg-rose-900/60 text-rose-200 border border-rose-800/60 shadow-inner'
                    : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Stories Listing */}
        {sorted.length === 0 ? (
          <div className="text-center py-20 bg-[#121110]/80 backdrop-blur-md border border-stone-800 rounded-2xl shadow-xl p-8">
            <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <h3 className="text-lg font-serif font-medium text-stone-200 mb-1">No published stories found</h3>
            <p className="text-stone-400 text-sm max-w-sm mx-auto">
              {searchTerm || selectedGenre !== 'All'
                ? 'Try clearing your search filter or selecting another genre.'
                : 'Be the first author to publish a public story to the library.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sorted.map(story => {
              const isBookmarked = bookmarks.includes(story.id);
              const isLiked = likes.includes(story.id);
              const currentShelf = bookshelfStatusMap[story.id];

              return (
                <div
                  key={story.id}
                  className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl overflow-hidden hover:border-rose-600/50 transition-all flex flex-col justify-between shadow-xl group p-5"
                >
                  <div>
                    <div className="flex gap-4 mb-4">
                      {/* Visual Custom Book Cover */}
                      <div 
                        onClick={() => onReadStory(story.id)}
                        className="w-24 sm:w-28 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        title="Click to read story"
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
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-950/60 text-rose-300 text-[10px] font-medium border border-rose-900/50 uppercase tracking-wider font-mono">
                              {story.genre}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onToggleBookmark(story.id)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isBookmarked
                                    ? 'bg-amber-950/80 border-amber-800 text-amber-400'
                                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                                }`}
                                title="Bookmark"
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                              </button>
                              <button
                                onClick={() => onToggleLike(story.id)}
                                className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs ${
                                  isLiked
                                    ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                                }`}
                                title="Like"
                              >
                                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400' : ''}`} />
                                <span>{(story.likesCount || 0) + (isLiked ? 1 : 0)}</span>
                              </button>
                            </div>
                          </div>

                          <h3 
                            onClick={() => onReadStory(story.id)}
                            className="text-lg font-serif font-bold text-stone-100 cursor-pointer group-hover:text-rose-300 transition-colors line-clamp-2"
                          >
                            {story.title}
                          </h3>
                        </div>

                        <p className="text-stone-400 text-xs line-clamp-2 my-2 font-light leading-relaxed">
                          {story.synopsis}
                        </p>

                        {/* Tags */}
                        {story.tags && story.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {story.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-800"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-[#181614]/80 border-t border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-rose-900/60 flex items-center justify-center text-xs text-rose-200 font-bold">
                          {story.authorName[0]}
                        </div>
                        <span className="text-sm text-stone-300 font-medium">{story.authorName}</span>
                      </div>
                      <span className="text-xs text-stone-500">{story.totalWordCount.toLocaleString()} words</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
                      <select
                        value={currentShelf || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleShelfChange(story.id, e.target.value as BookshelfStatus);
                          }
                        }}
                        className="bg-stone-900 border border-stone-800 rounded-lg text-[11px] text-stone-300 px-2 py-1 focus:outline-none focus:border-rose-500"
                      >
                        <option value="">+ Add to Bookshelf</option>
                        <option value="reading">Currently Reading</option>
                        <option value="want_to_read">Want to Read</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        onClick={() => onReadStory(story.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                      >
                        <span>Read Chapter 1</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
