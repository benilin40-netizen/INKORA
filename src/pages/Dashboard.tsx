import React from 'react';
import { BookOpen, PenTool, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { Story, User } from '../types';

interface DashboardProps {
  user: User;
  stories: Story[];
  onNavigate: (page: string, storyId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, stories, onNavigate }) => {
  const userStories = stories.filter(s => s.userId === user.id);
  const totalWords = userStories.reduce((acc, s) => acc + s.totalWordCount, 0);
  const publishedCount = userStories.filter(s => s.status === 'published').length;

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-5">
            <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover border-2 border-rose-600 shadow-lg" />
            <div>
              <div className="text-xs uppercase tracking-widest text-rose-400 font-mono mb-1">Author Dashboard</div>
              <h1 className="text-3xl font-serif font-bold text-stone-100">Welcome back, {user.name}</h1>
              <p className="text-stone-400 text-sm mt-1">{user.bio}</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('mystories')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-sm shadow-lg flex items-center gap-2 transition-all"
          >
            <PenTool className="w-4 h-4" />
            <span>Create New Story</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-medium">Total Stories</span>
              <BookOpen className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-3xl font-serif font-bold text-stone-100">{userStories.length}</div>
            <div className="text-xs text-emerald-400 mt-2">{publishedCount} Published manuscripts</div>
          </div>

          <div className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-medium">Word Count</span>
              <PenTool className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-serif font-bold text-stone-100">{totalWords.toLocaleString()}</div>
            <div className="text-xs text-stone-400 mt-2">Across all chapters</div>
          </div>

          <div className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-medium">Writing Streak</span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-serif font-bold text-stone-100">14 Days</div>
            <div className="text-xs text-emerald-400 mt-2">Active daily habit</div>
          </div>

          <div className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-medium">Followers</span>
              <Award className="w-5 h-5 text-sky-400" />
            </div>
            <div className="text-3xl font-serif font-bold text-stone-100">{user.followersCount.toLocaleString()}</div>
            <div className="text-xs text-stone-400 mt-2">Global readers</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-stone-100">Recent Manuscripts</h2>
            <button onClick={() => onNavigate('mystories')} className="text-rose-400 hover:text-rose-300 text-sm font-medium flex items-center gap-1">
              <span>View all</span> <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStories.map(story => (
              <div
                key={story.id}
                onClick={() => onNavigate('editor', story.id)}
                className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-6 hover:border-rose-600/50 transition-all cursor-pointer group shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 text-xs font-medium">{story.genre}</span>
                    <span className="text-xs text-stone-500 uppercase">{story.status}</span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-stone-100 mb-2 group-hover:text-rose-300 transition-colors">{story.title}</h3>
                  <p className="text-stone-400 text-sm line-clamp-2 mb-4">{story.synopsis}</p>
                </div>

                <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                  <span>{story.chapters.length} Chapters</span>
                  <span>{story.totalWordCount.toLocaleString()} words</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
