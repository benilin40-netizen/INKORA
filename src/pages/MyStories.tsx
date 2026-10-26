import React, { useState } from 'react';
import { Plus, BookOpen, PenTool, Sparkles, Trash2, Search, Globe, Lock, Palette } from 'lucide-react';
import { Story, Genre, User } from '../types';
import { AIService } from '../services/ai';
import { BookCoverDisplay } from '../components/BookCoverDisplay';

interface MyStoriesProps {
  user: User;
  stories: Story[];
  onOpenEditor: (storyId: string) => void;
  onOpenCoverStudio: (storyId: string) => void;
  onCreateStory: (newStory: Story) => Promise<any>;
  onDeleteStory: (storyId: string) => void;
}

const GENRES: Genre[] = [
  'Fantasy',
  'Science Fiction',
  'Mystery & Thriller',
  'Romance',
  'Historical Fiction',
  'Literary Fiction',
  'Cyberpunk',
  'Poetry',
  'Drama',
  'Horror'
];

export const MyStories: React.FC<MyStoriesProps> = ({
  user,
  stories,
  onOpenEditor,
  onOpenCoverStudio,
  onCreateStory,
  onDeleteStory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [showNewModal, setShowNewModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [workType, setWorkType] = useState<'prose' | 'poetry'>('prose');
  const [newGenre, setNewGenre] = useState<Genre>('Fantasy');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [nextStep, setNextStep] = useState<'editor' | 'cover'>('cover');
  const [isGeneratingPremise, setIsGeneratingPremise] = useState(false);

  // Filter only user's own stories or editable stories
  const userStories = stories.filter(s => {
    if (user.id !== 'guest') {
      return s.userId === user.id || s.authorName === user.name;
    }
    return true;
  });

  const filteredStories = userStories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          story.synopsis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || story.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const authorDisplayName = user.name || 'Author';

    const created: Story = {
      id: `story-${Date.now()}`,
      userId: user.id !== 'guest' ? user.id : 'author-local',
      authorName: authorDisplayName,
      title: newTitle.trim(),
      synopsis: newSynopsis.trim() || 'A captivating new tale waiting to be told.',
      genre: workType === 'poetry' ? 'Poetry' : newGenre,
      tags: [workType === 'poetry' ? 'Poetry' : newGenre, workType === 'poetry' ? 'Poetry Collection' : 'Original Work'],
      status: 'draft',
      visibility: 'private',
      chapters: [
        {
          id: `ch-${Date.now()}`,
          title: workType === 'poetry' ? 'I. First Stanza' : 'Chapter 1: The Beginning',
          content: workType === 'poetry' ? 'Write your poetry lines and stanzas here...\n\nPreserving all line breaks and rhythm.' : 'Begin writing your story here...',
          wordCount: workType === 'poetry' ? 12 : 5,
          order: 1,
          lastModified: Date.now()
        }
      ],
      characters: [],
      outline: {
        premise: newSynopsis.trim(),
        acts: ['Act I: Introduction', 'Act II: Confrontation', 'Act III: Resolution'],
        notes: ''
      },
      cover: {
        title: newTitle.trim(),
        author: authorDisplayName,
        subtitle: 'A Novel',
        tagline: 'When shadows speak, the cosmos listens.',
        genre: newGenre,
        showGenre: true,
        bgColor: '#1c1917',
        bgGradient: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #0c0a09 100%)',
        bgType: 'gradient',
        overlayPattern: 'stars',
        overlayOpacity: 0.35,
        overlayColor: '#000000',
        fontFamily: 'serif',
        fontStyle: 'normal',
        fontWeight: 'bold',
        textAlign: 'center',
        titleColor: '#f43f5e',
        subtitleColor: '#e4e4e7',
        authorColor: '#e4e4e7',
        titleSize: 2.4,
        subtitleSize: 1.1,
        titlePosition: { x: 50, y: 38 },
        authorPosition: { x: 50, y: 88 },
        badgeText: 'First Edition',
        artworkStyle: `${newGenre} aesthetic book cover`
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalWordCount: 5,
      likesCount: 0,
      readsCount: 0,
      bookmarksCount: 0,
    };

    await onCreateStory(created);
    setShowNewModal(false);
    setNewTitle('');
    setNewSynopsis('');

    if (nextStep === 'cover') {
      onOpenCoverStudio(created.id);
    } else {
      onOpenEditor(created.id);
    }
  };

  const handleAiPremise = async () => {
    setIsGeneratingPremise(true);
    try {
      const premise = await AIService.generatePremise(newGenre, newTitle || 'An unexpected journey');
      setNewSynopsis(premise);
    } catch (err: any) {
      alert(err.message || 'Failed to generate premise.');
    } finally {
      setIsGeneratingPremise(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-stone-800">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-100 flex items-center gap-3">
              <span>Author Workspace</span>
              <span className="text-xs font-mono font-normal px-2.5 py-1 rounded-full bg-rose-950/70 border border-rose-800/80 text-rose-300">
                {userStories.length} {userStories.length === 1 ? 'Manuscript' : 'Manuscripts'}
              </span>
            </h1>
            <p className="text-stone-400 text-sm mt-1">
              Authored by <span className="text-stone-200 font-medium">{user.name}</span> • Manage chapters, design bespoke covers, and publish drafts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenCoverStudio(userStories[0]?.id || '')}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center gap-2 transition-colors"
            >
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Cover Studio</span>
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Story</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search your stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141210] border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
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

        {/* Story List */}
        {filteredStories.length === 0 ? (
          <div className="text-center py-20 bg-[#121110]/80 backdrop-blur-md border border-stone-800 rounded-2xl shadow-xl p-8">
            <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <h3 className="text-lg font-serif font-medium text-stone-200 mb-1">No manuscripts found</h3>
            <p className="text-stone-400 text-sm max-w-sm mx-auto mb-6">
              {searchTerm || selectedGenre !== 'All'
                ? 'Try adjusting your filters or search query.'
                : 'Your creative vault is ready. Start your first book manuscript and design its cover.'}
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium shadow-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Story</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map(story => (
              <div
                key={story.id}
                className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 hover:border-rose-900/60 rounded-2xl p-5 transition-all shadow-xl flex flex-col justify-between group"
              >
                {/* Book Card Top: BookCover Thumbnail & Metadata */}
                <div>
                  <div className="flex gap-4 mb-4">
                    {/* Visual Custom Designed Book Cover */}
                    <div 
                      onClick={() => onOpenCoverStudio(story.id)}
                      className="w-24 sm:w-28 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      title="Click to redesign book cover"
                    >
                      <BookCoverDisplay
                        cover={story.cover}
                        title={story.title}
                        author={story.authorName}
                        genre={story.genre}
                        aspectRatio="2/3"
                      />
                    </div>

                    {/* Book Information */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[10px] uppercase tracking-wider font-mono">
                            {story.genre}
                          </span>
                          {story.status === 'published' ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-900/50">
                              <Globe className="w-2.5 h-2.5" /> Published
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-400 text-[10px] font-medium bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-900/50">
                              <Lock className="w-2.5 h-2.5" /> Draft
                            </span>
                          )}
                        </div>

                        <h3 
                          onClick={() => onOpenEditor(story.id)}
                          className="text-base sm:text-lg font-serif font-bold text-stone-100 cursor-pointer group-hover:text-rose-300 transition-colors line-clamp-2"
                        >
                          {story.title}
                        </h3>
                      </div>

                      <p className="text-stone-400 text-xs line-clamp-2 font-light leading-relaxed my-2">
                        {story.synopsis}
                      </p>

                      <div className="text-[11px] text-stone-500 font-mono flex items-center gap-3">
                        <span>{story.chapters.length} Ch.</span>
                        <span>{story.totalWordCount.toLocaleString()} Words</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center gap-2">
                  <button
                    onClick={() => onOpenEditor(story.id)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 transition-all"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Write Chapters</span>
                  </button>

                  <button
                    onClick={() => onOpenCoverStudio(story.id)}
                    className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 border border-stone-700 transition-colors"
                    title="Open Book Cover Designer"
                  >
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Cover</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${story.title}"?`)) {
                        onDeleteStory(story.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition-colors"
                    title="Delete Story"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* New Story Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141210] border border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl font-serif font-bold text-stone-100 mb-1">Create New Story</h3>
            <p className="text-stone-400 text-xs sm:text-sm mb-6">
              By author <span className="text-stone-200 font-medium">{user.name}</span>. Set your title, genre, and initial premise.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Work Type Selection */}
              <div>
                <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider mb-2">
                  Publication Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setWorkType('prose'); setNewGenre('Fantasy'); }}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      workType === 'prose'
                        ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                        : 'bg-[#1c1917] border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-stone-100">Prose Novel / Story</div>
                      <div className="text-[10px] text-stone-400">Chapters, narrative & plot</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setWorkType('poetry'); setNewGenre('Poetry'); }}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      workType === 'poetry'
                        ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                        : 'bg-[#1c1917] border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-stone-100">Poetry Collection</div>
                      <div className="text-[10px] text-stone-400">Stanzas, line breaks & verse</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider mb-1.5">
                  {workType === 'poetry' ? 'Collection / Poem Title' : 'Story Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={workType === 'poetry' ? 'e.g. Whispers of the Midnight Sea' : 'e.g. Chronicles of the Glass Kingdom'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {workType !== 'poetry' && (
                <div>
                  <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider mb-1.5">
                    Genre
                  </label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value as Genre)}
                    className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                  >
                    {GENRES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider">
                    Synopsis / Premise
                  </label>
                  <button
                    type="button"
                    onClick={handleAiPremise}
                    disabled={isGeneratingPremise}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingPremise ? 'Generating...' : 'AI Generate Premise'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Brief synopsis of your world, characters, and primary conflict..."
                  value={newSynopsis}
                  onChange={(e) => setNewSynopsis(e.target.value)}
                  className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Next Step Selection */}
              <div>
                <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider mb-2">
                  Next Step After Creation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNextStep('cover')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      nextStep === 'cover'
                        ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                        : 'bg-[#1c1917] border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Palette className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-stone-100">Design Book Cover</div>
                      <div className="text-[10px] text-stone-400">Craft artwork & 1600×2400 cover</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNextStep('editor')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      nextStep === 'editor'
                        ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                        : 'bg-[#1c1917] border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <PenTool className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-stone-100">Write Chapters</div>
                      <div className="text-[10px] text-stone-400">Jump right into Chapter 1</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium shadow-lg shadow-rose-950/50 transition-all"
                >
                  Create & Proceed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
