import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Copy, MoveUp, MoveDown, Save, Sparkles, 
  Eye, Download, Check, AlertCircle, RefreshCw, Globe, Lock, Send, Tag, Edit3, Palette
} from 'lucide-react';
import { Story, Chapter, Character } from '../types';
import { AIService } from '../services/ai';
import { BookCoverDisplay } from '../components/BookCoverDisplay';

interface StoryEditorProps {
  storyId: string;
  onBack: () => void;
  onSaveStory: (story: Story) => Promise<{ synced: boolean; error?: string } | void>;
  stories: Story[];
  onOpenCoverStudio?: (storyId: string) => void;
}

export const StoryEditor: React.FC<StoryEditorProps> = ({ storyId, onBack, onSaveStory, stories, onOpenCoverStudio }) => {
  const currentStory = stories.find(s => s.id === storyId) || stories[0];
  const [story, setStory] = useState<Story>(currentStory);
  const [activeChapterId, setActiveChapterId] = useState<string>(story?.chapters[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'chapters' | 'characters' | 'outline'>('chapters');
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState('Synced to Firebase (Cloud)');
  
  // AI Assistant Drawer
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiAction, setAiAction] = useState<'continue' | 'rewrite' | 'dialogue' | 'twist'>('continue');

  // Publish with AI Modal
  const [aiPublishLoading, setAiPublishLoading] = useState(false);
  const [showAiPublishModal, setShowAiPublishModal] = useState(false);
  const [generatedBlurb, setGeneratedBlurb] = useState('');
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [isPreview, setIsPreview] = useState(false);

  const activeChapter = story.chapters.find(c => c.id === activeChapterId) || story.chapters[0];
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (saveStatus === 'saved') {
      setSaveStatus('unsaved');
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [story]);

  const handleSave = async (isAutosave = false, storyOverride?: Story) => {
    setSaveStatus('saving');
    const targetStory = storyOverride || story;
    try {
      const res = await onSaveStory(targetStory) as any;
      setSaveStatus('saved');
      if (res && res.synced === false) {
        setSyncStatusMsg('Saved locally (Offline Recovery)');
        setErrorMessage(res.error || 'Cloud sync failed. Saved locally.');
      } else {
        setSyncStatusMsg('Synced to Firebase (Cloud)');
        setErrorMessage('');
      }
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save');
    }
  };

  const handleBack = () => {
    if (saveStatus === 'unsaved' || saveStatus === 'saving') {
      if (!confirm('You have unsaved changes. Are you sure you want to exit?')) {
        return;
      }
    }
    onBack();
  };

  const updateChapterContent = (newContent: string) => {
    const wordCount = newContent.trim() ? newContent.trim().split(/\s+/).length : 0;
    const updatedChapters = story.chapters.map(ch => {
      if (ch.id === activeChapterId) {
        return { ...ch, content: newContent, wordCount, lastModified: Date.now() };
      }
      return ch;
    });

    setStory(prev => ({
      ...prev,
      chapters: updatedChapters,
      totalWordCount: updatedChapters.reduce((acc, c: any) => acc + c.wordCount, 0),
      updatedAt: Date.now()
    }));
  };

  const handleAddChapter = () => {
    const newCh: Chapter = {
      id: `ch-${Date.now()}`,
      title: `Chapter ${story.chapters.length + 1}: Untitled`,
      content: '',
      wordCount: 0,
      order: story.chapters.length + 1,
      lastModified: Date.now()
    };

    const updated = {
      ...story,
      chapters: [...story.chapters, newCh]
    };
    setStory(updated);
    setActiveChapterId(newCh.id);
  };

  const handleDeleteChapter = (chId: string) => {
    if (story.chapters.length <= 1) {
      alert('A story must have at least one chapter.');
      return;
    }
    const updatedChapters = story.chapters.filter((c: any) => c.id !== chId);
    setStory(prev => ({ ...prev, chapters: updatedChapters }));
    if (activeChapterId === chId) {
      setActiveChapterId(updatedChapters[0].id);
    }
  };

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= story.chapters.length) return;

    const chapters = [...story.chapters];
    const temp = chapters[index];
    chapters[index] = chapters[newIndex];
    chapters[newIndex] = temp;

    chapters.forEach((c: any, i: number) => { c.order = i + 1; });
    setStory(prev => ({ ...prev, chapters }));
  };

  const handleDuplicateChapter = (ch: Chapter) => {
    const dup: Chapter = {
      ...ch,
      id: `ch-${Date.now()}`,
      title: `${ch.title} (Copy)`,
      lastModified: Date.now()
    };
    const index = story.chapters.findIndex((c: any) => c.id === ch.id);
    const chapters = [...story.chapters];
    chapters.splice(index + 1, 0, dup);
    chapters.forEach((c: any, i: number) => { c.order = i + 1; });
    setStory(prev => ({ ...prev, chapters }));
    setActiveChapterId(dup.id);
  };

  const handleExportStory = () => {
    const textContent = story.chapters
      .map((c: any) => `# ${c.title}\n\n${c.content}\n\n\n`)
      .join('---\n\n');

    const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.toLowerCase().replace(/\s+/g, '_')}_manuscript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAiAssistant = async () => {
    setAiLoading(true);
    setAiResult('');
    try {
      let result = '';
      if (aiAction === 'continue') {
        result = await AIService.continuePassage(activeChapter.content || story.synopsis);
      } else if (aiAction === 'rewrite') {
        result = await AIService.rewritePassage(aiPrompt || activeChapter.content, 'lyrical and evocative');
      } else if (aiAction === 'dialogue') {
        result = await AIService.improveDialogue(aiPrompt || activeChapter.content);
      } else if (aiAction === 'twist') {
        result = await AIService.brainstormPlotTwist(story.synopsis);
      }
      setAiResult(result);
    } catch (err: any) {
      setAiResult(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // 'Publish with AI' Trigger
  const handleInitiatePublishWithAi = async () => {
    setAiPublishLoading(true);
    try {
      const fullText = story.chapters.map(c => `${c.title}\n${c.content}`).join('\n\n');
      const generated = await AIService.generatePublishMetadata(story.title, story.genre || 'General', fullText || story.synopsis);
      setGeneratedBlurb(generated.blurb);
      setGeneratedTags(generated.tags.length > 0 ? generated.tags : [story.genre || 'General', 'Fiction', 'Featured']);
      setShowAiPublishModal(true);
    } catch (err: any) {
      alert('AI blurb generation failed: ' + (err.message || 'Please try again.'));
    } finally {
      setAiPublishLoading(false);
    }
  };

  // Confirm Publish with AI & write to Firestore
  const handleConfirmPublishWithAi = async () => {
    const updatedStory: Story = {
      ...story,
      synopsis: generatedBlurb.trim() || story.synopsis,
      tags: generatedTags,
      status: 'published',
      visibility: 'public',
      updatedAt: Date.now()
    };

    setStory(updatedStory);
    setShowAiPublishModal(false);

    // Persist updated metadata in Firestore
    await handleSave(false, updatedStory);
    alert('Congratulations! Your story has been published with AI-generated blurb and tags to the Public Library!');
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] flex flex-col relative z-10">
      
      {/* Editor Top Bar */}
      <header className="h-16 border-b border-[#292524] bg-[#0c0a09]/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-300 transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Stories</span>
          </button>

          <div className="hidden sm:block h-5 w-[1px] bg-stone-800" />

          <div>
            <h1 className="text-base font-serif font-bold text-stone-100 truncate max-w-xs sm:max-w-md">
              {story.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>{story.totalWordCount.toLocaleString()} words</span>
              <span>•</span>
              <span className="capitalize">{story.genre}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          
          <div className="hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800">
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{syncStatusMsg}</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-medium">Saving...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-stone-300 font-medium">Unsaved changes</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-medium">Save failed</span>
              </>
            )}
          </div>

          <button
            onClick={() => handleSave(false)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isPreview ? 'bg-rose-900 text-rose-200' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPreview ? 'Edit Mode' : 'Preview'}</span>
          </button>

          {onOpenCoverStudio && (
            <button
              onClick={() => onOpenCoverStudio(story.id)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 border border-stone-700 transition-colors"
              title="Design Book Cover in Studio"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Design Cover</span>
            </button>
          )}

          <button
            onClick={handleExportStory}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Export manuscript"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Export</span>
          </button>

          <button
            onClick={() => setAiDrawerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Partner</span>
          </button>

          {/* 'Publish with AI' Button */}
          <button
            onClick={handleInitiatePublishWithAi}
            disabled={aiPublishLoading}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-950/50 transition-all disabled:opacity-50"
            title="Generate professional blurb & tags with AI and publish"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiPublishLoading ? 'animate-spin' : ''}`} />
            <span>{aiPublishLoading ? 'Generating...' : 'Publish with AI'}</span>
          </button>

          {/* Regular Publish / Unpublish Toggle */}
          {story.status === 'draft' ? (
            <button
              onClick={() => {
                const updated: Story = { ...story, status: 'published', visibility: 'public', updatedAt: Date.now() };
                setStory(updated);
                handleSave(false, updated);
                alert('Story successfully published to the Public Library!');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const updated: Story = { ...story, status: 'draft', visibility: 'private', updatedAt: Date.now() };
                setStory(updated);
                handleSave(false, updated);
                alert('Story moved back to draft mode.');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unpublish</span>
            </button>
          )}

        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {!isPreview && (
          <aside className="w-80 border-r border-[#292524] bg-[#0c0a09]/80 backdrop-blur-md flex flex-col">
            
            <div className="grid grid-cols-3 border-b border-[#292524] text-xs font-medium">
              <button
                onClick={() => setActiveTab('chapters')}
                className={`py-3 text-center transition-colors ${
                  activeTab === 'chapters' ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-950/20' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Chapters
              </button>
              <button
                onClick={() => setActiveTab('characters')}
                className={`py-3 text-center transition-colors ${
                  activeTab === 'characters' ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-950/20' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Characters
              </button>
              <button
                onClick={() => setActiveTab('outline')}
                className={`py-3 text-center transition-colors ${
                  activeTab === 'outline' ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-950/20' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Outline
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'chapters' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Chapters</span>
                    <button
                      onClick={handleAddChapter}
                      className="p-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {story.chapters.map((ch: any, idx: number) => (
                    <div
                      key={ch.id}
                      onClick={() => setActiveChapterId(ch.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                        activeChapterId === ch.id ? 'bg-rose-950/40 border-rose-800 text-stone-100 shadow-md' : 'bg-[#141210] border-stone-800 hover:border-stone-700 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStory((prev: any) => ({
                              ...prev,
                              chapters: prev.chapters.map((c: any) => c.id === ch.id ? { ...c, title: val } : c)
                            }));
                          }}
                          className="bg-transparent border-b border-transparent hover:border-stone-600 focus:border-rose-500 text-sm font-medium focus:outline-none w-full mr-2"
                        />
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(idx, 'up'); }} className="p-1 text-stone-400 hover:text-white"><MoveUp className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(idx, 'down'); }} className="p-1 text-stone-400 hover:text-white"><MoveDown className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDuplicateChapter(ch); }} className="p-1 text-stone-400 hover:text-white"><Copy className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }} className="p-1 text-stone-400 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span>{ch.wordCount.toLocaleString()} words</span>
                        <span>Ch. {idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'characters' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Characters</span>
                    <button
                      onClick={() => {
                        const newChar: Character = {
                          id: `char-${Date.now()}`,
                          name: 'New Character',
                          role: 'Supporting',
                          description: 'Description...',
                          arc: 'Arc...'
                        };
                        setStory((prev: any) => ({ ...prev, characters: [...prev.characters, newChar] }));
                      }}
                      className="p-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {story.characters.map((char: any) => (
                    <div key={char.id} className="bg-[#141210] border border-stone-800 rounded-xl p-3.5 space-y-2">
                      <input
                        type="text"
                        value={char.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStory((prev: any) => ({
                            ...prev,
                            characters: prev.characters.map((c: any) => c.id === char.id ? { ...c, name: val } : c)
                          }));
                        }}
                        className="w-full bg-transparent font-medium text-sm text-stone-100 focus:outline-none border-b border-transparent focus:border-rose-500"
                      />
                      <textarea
                        rows={2}
                        value={char.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStory((prev: any) => ({
                            ...prev,
                            characters: prev.characters.map((c: any) => c.id === char.id ? { ...c, description: val } : c)
                          }));
                        }}
                        className="w-full bg-[#1c1917] border border-stone-800 rounded p-2 text-xs text-stone-300 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'outline' && (
                <div className="space-y-4">
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Outline</span>
                  <div>
                    <label className="block text-[11px] text-stone-400 uppercase mb-1">Premise</label>
                    <textarea
                      rows={4}
                      value={story.outline.premise}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStory((prev: any) => ({ ...prev, outline: { ...prev.outline, premise: val } }));
                      }}
                      className="w-full bg-[#141210] border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Center Writing Area */}
        <main className="flex-1 bg-[#121110]/90 backdrop-blur-md flex flex-col overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full px-6 py-12 flex-1 flex flex-col">
            <div className="mb-6 pb-6 border-b border-stone-800 flex items-center justify-between">
              <input
                type="text"
                value={activeChapter?.title || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setStory((prev: any) => ({
                    ...prev,
                    chapters: prev.chapters.map((c: any) => c.id === activeChapterId ? { ...c, title: val } : c)
                  }));
                }}
                disabled={isPreview}
                className="text-3xl font-serif font-bold text-stone-100 bg-transparent border-b border-transparent hover:border-stone-700 focus:border-rose-500 focus:outline-none w-full"
              />
              <span className="text-xs text-stone-500 whitespace-nowrap ml-4">{activeChapter?.wordCount || 0} words</span>
            </div>

            {isPreview ? (
              <div className="space-y-8">
                {/* Book Header Card in Preview */}
                <div className="bg-[#181614] border border-stone-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
                  <div className="w-28 sm:w-36 flex-shrink-0">
                    <BookCoverDisplay
                      cover={story.cover}
                      title={story.title}
                      author={story.authorName}
                      genre={story.genre}
                      aspectRatio="2/3"
                    />
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-medium">
                        {story.genre}
                      </span>
                      <span className="text-xs font-mono text-stone-400">
                        {story.chapters.length} Chapters • {story.totalWordCount.toLocaleString()} Words
                      </span>
                    </div>

                    <h2 className="text-2xl font-serif font-bold text-stone-100">
                      {story.title}
                    </h2>

                    <p className="text-xs text-stone-400 font-mono">
                      By {story.authorName}
                    </p>

                    <p className="text-xs text-stone-300 leading-relaxed font-light pt-1">
                      {story.synopsis}
                    </p>

                    {onOpenCoverStudio && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => onOpenCoverStudio(story.id)}
                          className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors border border-stone-700"
                        >
                          <Palette className="w-3 h-3 text-amber-400" />
                          <span>Customize Book Cover</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-stone-800 pt-6">
                  <div className="prose prose-invert max-w-none font-serif text-lg leading-relaxed text-stone-200 whitespace-pre-wrap">
                    {activeChapter?.content || 'No content written yet.'}
                  </div>
                </div>
              </div>
            ) : (
              <textarea
                value={activeChapter?.content || ''}
                onChange={(e) => updateChapterContent(e.target.value)}
                placeholder="Begin writing your masterpiece here..."
                className="w-full flex-1 bg-transparent text-stone-100 font-serif text-lg leading-relaxed focus:outline-none resize-none min-h-[500px]"
              />
            )}
          </div>
        </main>

      </div>

      {/* AI Publish Review Modal */}
      {showAiPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141210] border border-stone-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">Publish with AI Review</h3>
                  <p className="text-xs text-stone-400">Review and refine AI-generated metadata before publishing to Firestore.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiPublishModal(false)}
                className="text-stone-400 hover:text-stone-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-rose-400" />
                  <span>AI Generated Blurb / Synopsis</span>
                </label>
                <textarea
                  rows={4}
                  value={generatedBlurb}
                  onChange={(e) => setGeneratedBlurb(e.target.value)}
                  className="w-full bg-[#1c1917] border border-stone-800 rounded-xl p-3.5 text-sm text-stone-200 focus:outline-none focus:border-rose-500 leading-relaxed font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Discovery Tags</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {generatedTags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-1.5">
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => setGeneratedTags(generatedTags.filter((_, i) => i !== idx))}
                        className="hover:text-rose-100 text-stone-500 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTagInput.trim()) {
                          setGeneratedTags([...generatedTags, newTagInput.trim()]);
                          setNewTagInput('');
                        }
                      }
                    }}
                    className="flex-1 bg-[#1c1917] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTagInput.trim()) {
                        setGeneratedTags([...generatedTags, newTagInput.trim()]);
                        setNewTagInput('');
                      }
                    }}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowAiPublishModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmPublishWithAi}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all"
              >
                <Globe className="w-4 h-4" />
                <span>Confirm & Publish to Library</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Drawer */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#141210] border-l border-stone-800 p-6 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-400" />
                <h3 className="font-serif font-bold text-lg text-stone-100">AI Writing Partner</h3>
              </div>
              <button onClick={() => setAiDrawerOpen(false)} className="text-stone-400 hover:text-stone-200 text-sm font-medium">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAiAction('continue')} className={`p-3 rounded-xl border text-left text-xs font-medium ${aiAction === 'continue' ? 'bg-rose-950/60 border-rose-800 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-300'}`}>Continue Passage</button>
                <button onClick={() => setAiAction('rewrite')} className={`p-3 rounded-xl border text-left text-xs font-medium ${aiAction === 'rewrite' ? 'bg-rose-950/60 border-rose-800 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-300'}`}>Rewrite / Polish</button>
                <button onClick={() => setAiAction('dialogue')} className={`p-3 rounded-xl border text-left text-xs font-medium ${aiAction === 'dialogue' ? 'bg-rose-950/60 border-rose-800 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-300'}`}>Enhance Dialogue</button>
                <button onClick={() => setAiAction('twist')} className={`p-3 rounded-xl border text-left text-xs font-medium ${aiAction === 'twist' ? 'bg-rose-950/60 border-rose-800 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-300'}`}>Plot Twists</button>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Additional Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Make it more intense..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={runAiAssistant}
                disabled={aiLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>{aiLoading ? 'Thinking...' : 'Generate AI Suggestion'}</span>
              </button>

              {aiResult && (
                <div className="mt-6 bg-[#1c1917] border border-stone-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-rose-400 uppercase">Suggestion</span>
                    <button
                      onClick={() => {
                        updateChapterContent((activeChapter.content || '') + '\n\n' + aiResult);
                        setAiDrawerOpen(false);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-medium"
                    >
                      Insert
                    </button>
                  </div>
                  <p className="text-sm font-serif text-stone-200 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">{aiResult}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
