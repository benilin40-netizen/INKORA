import React from 'react';
import { User, Story } from '../types';
import { ArrowRight, BookOpen, Bookmark } from 'lucide-react';
import { StorageService } from '../services/storage';

interface AuthorProfileProps {
  user: User;
  stories: Story[];
  onReadStory: (storyId: string) => void;
}

export const AuthorProfile: React.FC<AuthorProfileProps> = ({ user, stories, onReadStory }) => {
  const authorStories = stories.filter(s => s.userId === user.id && s.status === 'published');
  const bookshelf = StorageService.getBookshelf();
  const readingListStories = bookshelf
    .map(item => stories.find(s => s.id === item.storyId))
    .filter((s): s is Story => s !== undefined);

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] py-16 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Author Profile Card */}
        <div className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-28 h-28 rounded-full object-cover mx-auto mb-6 border-4 border-rose-600/60 shadow-xl"
          />
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-100 mb-2">{user.name}</h1>
          <p className="text-rose-400 font-mono text-xs uppercase tracking-widest mb-6">Author & Storyteller</p>
          <p className="max-w-xl mx-auto text-stone-300 text-base font-light leading-relaxed mb-8">{user.bio}</p>

          <div className="flex items-center justify-center gap-8 pt-6 border-t border-stone-800 text-sm">
            <div>
              <div className="text-2xl font-serif font-bold text-stone-100">{authorStories.length}</div>
              <div className="text-xs text-stone-400 mt-0.5">Published Books</div>
            </div>
            <div className="w-[1px] h-8 bg-stone-800" />
            <div>
              <div className="text-2xl font-serif font-bold text-stone-100">{readingListStories.length}</div>
              <div className="text-xs text-stone-400 mt-0.5">On Bookshelf</div>
            </div>
          </div>
        </div>

        {/* Published Works */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-100 mb-6">Published Works</h2>
          {authorStories.length === 0 ? (
            <div className="text-center py-12 bg-[#121110]/80 backdrop-blur-md border border-stone-800 rounded-2xl p-6">
              <BookOpen className="w-10 h-10 text-stone-600 mx-auto mb-3" />
              <h3 className="text-base font-serif font-bold text-stone-300 mb-1">No published works yet</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Stories published by {user.name} will be displayed here for the community to discover.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {authorStories.map(story => (
                <div
                  key={story.id}
                  onClick={() => onReadStory(story.id)}
                  className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-6 hover:border-rose-600/50 transition-all cursor-pointer group shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full bg-rose-950/65 text-rose-300 text-xs font-medium border border-rose-900/50">
                        {story.genre}
                      </span>
                      <span className="text-xs text-stone-400">{story.totalWordCount.toLocaleString()} words</span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-stone-100 mb-2 group-hover:text-rose-300 transition-colors">
                      {story.title}
                    </h3>
                    <p className="text-stone-400 text-sm line-clamp-3 mb-6 font-light leading-relaxed">
                      {story.synopsis}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-rose-400 text-sm font-medium">
                    <span>Read novel</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reading List */}
        {readingListStories.length > 0 && (
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-100 mb-6 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-400" />
              <span>Reading List</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {readingListStories.slice(0, 6).map(story => (
                <div
                  key={story.id}
                  onClick={() => onReadStory(story.id)}
                  className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-5 hover:border-stone-700 transition-all cursor-pointer group shadow-lg"
                >
                  <span className="text-[11px] text-rose-400 font-medium block mb-1">{story.genre}</span>
                  <h4 className="text-base font-serif font-bold text-stone-200 group-hover:text-rose-300 transition-colors truncate mb-1">
                    {story.title}
                  </h4>
                  <p className="text-xs text-stone-400">by {story.authorName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
