import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Copy, MoveUp, MoveDown, Save, Sparkles, 
  Eye, Download, Check, AlertCircle, RefreshCw, Globe, Lock, Send, Tag, 
  Edit3, Palette, History, Clock, RotateCcw, X, CheckCircle, FileText, CheckCheck
} from 'lucide-react';
import { Story, Chapter, Character, StoryVersion } from '../types';
import { AIService } from '../services/ai';
import { StorageService } from '../services/storage';
import { BookCoverDisplay } from '../components/BookCoverDisplay';

interface StoryEditorProps {
  storyId: string;
  onBack: () => void;
  onSaveStory: (story: Story) => Promise<{ story: Story; synced: boolean; error?: string } | void>;
  stories: Story[];
  onOpenCoverStudio?: (storyId: string) => void;
}

type AiAssistantMode = 'grammar' | 'clarity' | 'dialogue' | 'paragraphs' | 'pacing' | 'continue' | 'rewrite';

export const StoryEditor: React.FC<StoryEditorProps> = ({ 
  storyId, 
  onBack, 
  onSaveStory, 
  stories, 
  onOpenCoverStudio 
}) => {
  const initialStory = stories.find(s => s.id === storyId) || stories[0];
  const [story, setStory] = useState<Story>(initialStory);
  const [activeChapterId, setActiveChapterId] = useState<string>(story?.chapters[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'chapters' | 'characters' | 'outline'>('chapters');
  
  // Real Persistence State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState('Saved to Cloud (Firestore)');
  
  // Concurrency & Sequence Guards
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveStoryRef = useRef<Story | null>(null);
  const saveSequenceRef = useRef<number>(0);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSnapshotTimeRef = useRef<number>(Date.now());

  // Draft Recovery Notice
  const [recoverableDraft, setRecoverableDraft] = useState<{ story: Story; savedAt: number } | null>(null);

  // Version History Modal
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [versionsList, setVersionsList] = useState<StoryVersion[]>(() => StorageService.getStoryVersions(storyId));
  const [selectedVersionPreview, setSelectedVersionPreview] = useState<StoryVersion | null>(null);
  const [manualSnapshotLabel, setManualSnapshotLabel] = useState<string>('');

  // AI Assistant Drawer & Preview
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiAssistantMode>('grammar');
  const [aiCustomInstruction, setAiCustomInstruction] = useState('');
  const [aiBritishParagraphs, setAiBritishParagraphs] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOriginalText, setAiOriginalText] = useState('');
  const [aiSuggestedText, setAiSuggestedText] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Publish with AI Modal
  const [aiPublishLoading, setAiPublishLoading] = useState(false);
  const [showAiPublishModal, setShowAiPublishModal] = useState(false);
  const [generatedBlurb, setGeneratedBlurb] = useState('');
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [isPreview, setIsPreview] = useState(false);

  const activeChapter = story.chapters.find(c => c.id === activeChapterId) || story.chapters[0];

  // 1. Check for recoverable draft on mount
  useEffect(() => {
    const unsaved = StorageService.getUnsavedDraft(storyId);
    if (unsaved && unsaved.story && unsaved.savedAt > (initialStory.updatedAt || 0) + 2000) {
      setRecoverableDraft(unsaved);
    }
  }, [storyId]);

  // 2. Authoritative Persistence Function with Concurrency Lock & Sequence Checking
  const performSave = useCallback(async (targetStory: Story) => {
    if (isSavingRef.current) {
      // Queue latest state to avoid race conditions or dropped writes
      pendingSaveStoryRef.current = targetStory;
      return;
    }

    isSavingRef.current = true;
    const currentSeq = ++saveSequenceRef.current;
    setSaveStatus('saving');

    try {
      // Calculate accurate word counts
      const totalWords = targetStory.chapters.reduce((acc, ch) => acc + (ch.wordCount || 0), 0);
      const readyStory: Story = {
        ...targetStory,
        totalWordCount: totalWords,
        updatedAt: Date.now()
      };

      // Always save temporary draft backup immediately
      StorageService.saveUnsavedDraft(readyStory);

      // Perform persistent storage write
      const res = await onSaveStory(readyStory) as any;

      // Check sequence: if a newer save was triggered while this was in-flight, skip updating to 'saved'
      if (currentSeq === saveSequenceRef.current) {
        setSaveStatus('saved');
        if (res && res.synced === false) {
          setSyncStatusMsg('Saved locally in browser cache');
          setErrorMessage(res.error || 'Cloud sync offline. Changes preserved locally.');
        } else {
          setSyncStatusMsg('All changes saved to cloud');
          setErrorMessage('');
          StorageService.clearUnsavedDraft(readyStory.id);
        }

        // Automatic snapshot every 5 minutes if content changed
        const now = Date.now();
        if (now - lastSnapshotTimeRef.current > 5 * 60 * 1000) {
          StorageService.createStoryVersion(readyStory, 'Autosave checkpoint');
          setVersionsList(StorageService.getStoryVersions(readyStory.id));
          lastSnapshotTimeRef.current = now;
        }
      }
    } catch (err: any) {
      if (currentSeq === saveSequenceRef.current) {
        setSaveStatus('error');
        setErrorMessage(err?.message || 'Failed to persist manuscript.');
      }
    } finally {
      isSavingRef.current = false;
      // If a pending write occurred during the save operation, execute it now
      if (pendingSaveStoryRef.current) {
        const next = pendingSaveStoryRef.current;
        pendingSaveStoryRef.current = null;
        performSave(next);
      }
    }
  }, [onSaveStory]);

  // 3. Debounced Autosave Trigger
  useEffect(() => {
    // Only flag as unsaved if not already in that state
    setSaveStatus(prev => prev === 'saved' ? 'unsaved' : prev);

    // Save temporary local draft backup immediately on every keystroke
    StorageService.saveUnsavedDraft(story);

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performSave(story);
    }, 1400);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [story, performSave]);

  const handleManualSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    performSave(story);
  };

  const handleBack = () => {
    if (saveStatus === 'unsaved' || saveStatus === 'saving') {
      if (!confirm('You have unsaved changes being synchronized. Are you sure you wish to exit to Stories?')) {
        return;
      }
    }
    onBack();
  };

  // 4. Live Word Count and Chapter Content Updates
  const updateChapterContent = (newContent: string) => {
    const trimmed = newContent.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    
    setStory(prev => {
      const updatedChapters = prev.chapters.map(ch => {
        if (ch.id === activeChapterId) {
          return { ...ch, content: newContent, wordCount, lastModified: Date.now() };
        }
        return ch;
      });
      const totalWordCount = updatedChapters.reduce((acc, c) => acc + (c.wordCount || 0), 0);
      return {
        ...prev,
        chapters: updatedChapters,
        totalWordCount,
        updatedAt: Date.now()
      };
    });
  };

  // 5. Chapter Management Handlers
  const handleAddChapter = () => {
    const newOrder = story.chapters.length + 1;
    const newCh: Chapter = {
      id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `Chapter ${newOrder}: Untitled`,
      content: '',
      wordCount: 0,
      order: newOrder,
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
      alert('A manuscript must have at least one chapter.');
      return;
    }
    const target = story.chapters.find(c => c.id === chId);
    const confirmed = window.confirm(
      `Are you sure you want to delete "${target?.title || 'this chapter'}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    // Create a safety version snapshot before destructive deletion
    StorageService.createStoryVersion(story, `Before deleting ${target?.title}`);
    setVersionsList(StorageService.getStoryVersions(story.id));

    const updatedChapters = story.chapters
      .filter(c => c.id !== chId)
      .map((c, idx) => ({ ...c, order: idx + 1 }));

    const updated = {
      ...story,
      chapters: updatedChapters,
      totalWordCount: updatedChapters.reduce((a, c) => a + (c.wordCount || 0), 0),
      updatedAt: Date.now()
    };

    setStory(updated);
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

    chapters.forEach((c, i) => { c.order = i + 1; });
    setStory(prev => ({ ...prev, chapters }));
  };

  const handleDuplicateChapter = (ch: Chapter) => {
    const dup: Chapter = {
      ...ch,
      id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${ch.title} (Copy)`,
      lastModified: Date.now()
    };
    const index = story.chapters.findIndex(c => c.id === ch.id);
    const chapters = [...story.chapters];
    chapters.splice(index + 1, 0, dup);
    chapters.forEach((c, i) => { c.order = i + 1; });
    setStory(prev => ({
      ...prev,
      chapters,
      totalWordCount: chapters.reduce((a, c) => a + (c.wordCount || 0), 0)
    }));
    setActiveChapterId(dup.id);
  };

  const handleExportStory = () => {
    const textContent = story.chapters
      .map(c => `# ${c.title}\n\n${c.content}\n\n\n`)
      .join('---\n\n');

    const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_manuscript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 6. Version History & Restoration
  const handleCreateManualSnapshot = () => {
    const label = manualSnapshotLabel.trim() || 'Manual author milestone';
    StorageService.createStoryVersion(story, label);
    setVersionsList(StorageService.getStoryVersions(story.id));
    setManualSnapshotLabel('');
    alert(`Snapshot "${label}" created successfully.`);
  };

  const handleRestoreVersion = (version: StoryVersion) => {
    const confirmed = window.confirm(
      `Restore manuscript to version from ${new Date(version.timestamp).toLocaleString()} ("${version.label}")?\n\nA safety backup of your current draft will be created automatically before restoring.`
    );
    if (!confirmed) return;

    // Create safety snapshot of current state first so no edits are silently lost
    StorageService.createStoryVersion(story, 'Safety backup before version restore');

    const restoredStory: Story = {
      ...story,
      title: version.title || story.title,
      synopsis: version.synopsis || story.synopsis,
      chapters: JSON.parse(JSON.stringify(version.chapters)),
      totalWordCount: version.totalWordCount,
      updatedAt: Date.now()
    };

    setStory(restoredStory);
    setActiveChapterId(restoredStory.chapters[0]?.id || '');
    setVersionsList(StorageService.getStoryVersions(story.id));
    setShowVersionModal(false);
    performSave(restoredStory);
    alert('Version restored successfully. Current changes were preserved in version history.');
  };

  // 7. Feature 5 — Optional AI Writing Assistant
  const handleRunAiAssistant = async () => {
    const sourceText = activeChapter?.content || '';
    if (!sourceText.trim()) {
      alert('Please write or select some chapter text before invoking the AI assistant.');
      return;
    }

    setAiLoading(true);
    setAiErrorMessage('');
    setAiOriginalText(sourceText);
    setAiSuggestedText('');

    try {
      let result = '';
      if (aiMode === 'grammar') {
        result = await AIService.checkGrammarAndSpelling(sourceText);
      } else if (aiMode === 'clarity') {
        result = await AIService.refineSentenceClarity(sourceText);
      } else if (aiMode === 'dialogue') {
        result = await AIService.refineDialogue(sourceText);
      } else if (aiMode === 'paragraphs') {
        result = await AIService.structureParagraphs(sourceText, aiBritishParagraphs);
      } else if (aiMode === 'pacing') {
        result = await AIService.suggestPacingAndReadability(sourceText);
      } else if (aiMode === 'continue') {
        result = await AIService.continuePassage(sourceText);
      } else if (aiMode === 'rewrite') {
        result = await AIService.rewritePassage(sourceText, aiCustomInstruction || 'lyrical and evocative');
      }

      setAiSuggestedText(result.trim());
    } catch (err: any) {
      setAiErrorMessage(
        err?.message?.includes('GEMINI_API_KEY')
          ? 'Gemini API key is not configured or authenticated on the server. You can configure your key in Settings > Secrets.'
          : err?.message || 'AI assistant request failed. Please verify network connectivity.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestedText.trim()) return;

    // Create safety version snapshot before applying AI changes
    StorageService.createStoryVersion(story, `Before AI ${aiMode} application`);
    setVersionsList(StorageService.getStoryVersions(story.id));

    if (aiMode === 'continue') {
      updateChapterContent((activeChapter.content || '') + '\n\n' + aiSuggestedText);
    } else if (aiMode === 'pacing') {
      // Pacing is advice/feedback, so we append it as editor notes or copy
      alert('Pacing suggestions copied to clipboard. You can reference them as you write.');
      navigator.clipboard.writeText(aiSuggestedText);
    } else {
      updateChapterContent(aiSuggestedText);
    }

    setAiDrawerOpen(false);
    setAiSuggestedText('');
  };

  const handleCopyAiSuggestion = () => {
    if (!aiSuggestedText) return;
    navigator.clipboard.writeText(aiSuggestedText);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
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
      alert('AI blurb generation failed: ' + (err.message || 'Please verify AI configuration.'));
    } finally {
      setAiPublishLoading(false);
    }
  };

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
    await performSave(updatedStory);
    alert('Congratulations! Your story has been published to the Public Library!');
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] flex flex-col relative z-10">
      
      {/* Recoverable Unsaved Draft Banner */}
      {recoverableDraft && (
        <div className="bg-amber-950/90 border-b border-amber-600/70 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between z-50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Unsaved draft recovered from <strong>{new Date(recoverableDraft.savedAt).toLocaleTimeString()}</strong> ({recoverableDraft.story.chapters.length} chapters, {recoverableDraft.story.totalWordCount} words).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStory(recoverableDraft.story);
                setActiveChapterId(recoverableDraft.story.chapters[0]?.id || '');
                performSave(recoverableDraft.story);
                setRecoverableDraft(null);
              }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded font-semibold text-xs transition-colors"
            >
              Restore Draft
            </button>
            <button
              onClick={() => {
                StorageService.clearUnsavedDraft(storyId);
                setRecoverableDraft(null);
              }}
              className="px-2.5 py-1 text-stone-400 hover:text-white"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Editor Top Bar */}
      <header className="h-16 border-b border-[#292524] bg-[#0c0a09]/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-300 transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium"
            title="Return to Story Library"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Stories</span>
          </button>

          <div className="hidden sm:block h-5 w-[1px] bg-stone-800" />

          <div>
            <h1 className="text-sm sm:text-base font-serif font-bold text-stone-100 truncate max-w-xs sm:max-w-md">
              {story.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="font-mono text-emerald-400 font-semibold">{story.totalWordCount.toLocaleString()} story words</span>
              <span>•</span>
              <span className="font-mono text-stone-400">{activeChapter?.wordCount || 0} chapter words</span>
              <span>•</span>
              <span className="capitalize">{story.genre || 'General'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Detailed Save & Sync Indicator */}
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
                <span className="text-amber-400 font-medium">Saving manuscript...</span>
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
                <span className="text-rose-400 font-medium">{errorMessage || 'Save failed'}</span>
              </>
            )}
          </div>

          {/* Manual Save Button */}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Save changes immediately"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Version History & Recovery Button */}
          <button
            onClick={() => {
              setVersionsList(StorageService.getStoryVersions(story.id));
              setShowVersionModal(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-stone-700"
            title="View version snapshots and recover previous drafts"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">History ({versionsList.length})</span>
          </button>

          {/* Preview Toggle */}
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isPreview ? 'bg-rose-900 text-rose-200' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPreview ? 'Edit Mode' : 'Preview'}</span>
          </button>

          {/* Cover Studio Link */}
          {onOpenCoverStudio && (
            <button
              onClick={() => onOpenCoverStudio(story.id)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 border border-stone-700 transition-colors"
              title="Design Book Cover in Studio"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Cover Studio</span>
            </button>
          )}

          {/* Export Markdown */}
          <button
            onClick={handleExportStory}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Export manuscript as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Export</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={() => setAiDrawerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-stone-800 to-rose-950 hover:border-rose-700 text-rose-200 text-xs font-medium flex items-center gap-1.5 border border-stone-700 transition-all shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Publish with AI Trigger */}
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
                performSave(updated);
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
                performSave(updated);
                alert('Story moved back to private draft mode.');
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
                Chapters ({story.chapters.length})
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
                    <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Chapters List</span>
                    <button
                      onClick={handleAddChapter}
                      className="p-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200 transition-colors flex items-center gap-1 text-xs px-2"
                      title="Add Chapter"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {story.chapters.map((ch, idx) => (
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
                            setStory(prev => ({
                              ...prev,
                              chapters: prev.chapters.map(c => c.id === ch.id ? { ...c, title: val } : c)
                            }));
                          }}
                          className="bg-transparent border-b border-transparent hover:border-stone-600 focus:border-rose-500 text-sm font-medium focus:outline-none w-full mr-2"
                        />
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(idx, 'up'); }} className="p-1 text-stone-400 hover:text-white" title="Move Up"><MoveUp className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(idx, 'down'); }} className="p-1 text-stone-400 hover:text-white" title="Move Down"><MoveDown className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDuplicateChapter(ch); }} className="p-1 text-stone-400 hover:text-white" title="Duplicate Chapter"><Copy className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }} className="p-1 text-stone-400 hover:text-rose-400" title="Delete Chapter"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                        <span>{ch.wordCount.toLocaleString()} words</span>
                        <span>Ch. {idx + 1} of {story.chapters.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'characters' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Cast & Characters</span>
                    <button
                      onClick={() => {
                        const newChar: Character = {
                          id: `char-${Date.now()}`,
                          name: 'New Character',
                          role: 'Supporting',
                          description: 'Role and personality description...',
                          arc: 'Character arc...'
                        };
                        setStory(prev => ({ ...prev, characters: [...prev.characters, newChar] }));
                      }}
                      className="p-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs px-2 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>

                  {story.characters.map((char) => (
                    <div key={char.id} className="bg-[#141210] border border-stone-800 rounded-xl p-3.5 space-y-2">
                      <input
                        type="text"
                        value={char.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStory(prev => ({
                            ...prev,
                            characters: prev.characters.map(c => c.id === char.id ? { ...c, name: val } : c)
                          }));
                        }}
                        className="w-full bg-transparent font-medium text-sm text-stone-100 focus:outline-none border-b border-transparent focus:border-rose-500"
                      />
                      <textarea
                        rows={2}
                        value={char.description}
                        placeholder="Character description..."
                        onChange={(e) => {
                          const val = e.target.value;
                          setStory(prev => ({
                            ...prev,
                            characters: prev.characters.map(c => c.id === char.id ? { ...c, description: val } : c)
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
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Story Outline</span>
                  <div>
                    <label className="block text-[11px] text-stone-400 uppercase mb-1">Premise</label>
                    <textarea
                      rows={4}
                      value={story.outline.premise}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStory(prev => ({ ...prev, outline: { ...prev.outline, premise: val } }));
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
          <div className="max-w-4xl mx-auto w-full px-6 py-10 flex-1 flex flex-col">
            
            {/* Chapter Header with Live Word Count */}
            <div className="mb-6 pb-6 border-b border-stone-800 flex items-center justify-between">
              <input
                type="text"
                value={activeChapter?.title || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setStory(prev => ({
                    ...prev,
                    chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, title: val } : c)
                  }));
                }}
                disabled={isPreview}
                className="text-3xl font-serif font-bold text-stone-100 bg-transparent border-b border-transparent hover:border-stone-700 focus:border-rose-500 focus:outline-none w-full"
              />
              <div className="text-right whitespace-nowrap ml-4">
                <div className="text-xs text-stone-300 font-mono font-medium">{activeChapter?.wordCount || 0} chapter words</div>
                <div className="text-[11px] text-stone-500 font-mono">Total: {story.totalWordCount.toLocaleString()} words</div>
              </div>
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
                placeholder="Begin writing your chapter here... Your thoughts are preserved in real-time."
                className="w-full flex-1 bg-transparent text-stone-100 font-serif text-lg leading-relaxed focus:outline-none resize-none min-h-[550px]"
              />
            )}
          </div>
        </main>

      </div>

      {/* Version History & Draft Recovery Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141210] border border-stone-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-950/80 border border-sky-800 text-sky-400 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">Version History & Draft Recovery</h3>
                  <p className="text-xs text-stone-400">Recover historical manuscript snapshots without losing current progress.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVersionModal(false);
                  setSelectedVersionPreview(null);
                }}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create Manual Milestone */}
            <div className="p-4 rounded-2xl bg-[#1c1917] border border-stone-800 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Name a milestone (e.g. Completed Act 1 draft)..."
                value={manualSnapshotLabel}
                onChange={e => setManualSnapshotLabel(e.target.value)}
                className="w-full sm:flex-1 bg-[#141210] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={handleCreateManualSnapshot}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-900 hover:bg-rose-800 text-rose-200 text-xs font-medium whitespace-nowrap transition-colors"
              >
                Create Milestone Snapshot
              </button>
            </div>

            {/* Versions List & Side Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              <div className="space-y-2.5">
                <h4 className="text-xs uppercase font-medium tracking-wider text-stone-400">Saved Snapshots ({versionsList.length})</h4>
                {versionsList.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 italic">No previous versions recorded yet. Snapshots are created automatically as you write.</p>
                ) : (
                  versionsList.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVersionPreview(v)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedVersionPreview?.id === v.id
                          ? 'bg-rose-950/40 border-rose-800 text-stone-100'
                          : 'bg-[#181614] border-stone-800 hover:border-stone-700 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-rose-300">{v.label}</span>
                        <span className="text-[11px] opacity-60 font-mono">
                          {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] opacity-75 font-mono">
                        <span>{new Date(v.timestamp).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{v.chaptersCount} chapters</span>
                        <span>•</span>
                        <span>{v.totalWordCount.toLocaleString()} words</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Version Content Preview */}
              <div className="bg-[#181614] border border-stone-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs uppercase font-medium tracking-wider text-stone-400 mb-2">Version Preview</h4>
                  {selectedVersionPreview ? (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-stone-200">
                        {selectedVersionPreview.title}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        Snapshot date: {new Date(selectedVersionPreview.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs font-serif text-stone-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border-t border-stone-800 pt-2">
                        {selectedVersionPreview.chapters[0]?.content || 'Empty chapter content in this snapshot.'}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 italic py-8 text-center">
                      Select a snapshot on the left to inspect chapter content and word counts.
                    </p>
                  )}
                </div>

                {selectedVersionPreview && (
                  <div className="pt-4 border-t border-stone-800 flex justify-end">
                    <button
                      onClick={() => handleRestoreVersion(selectedVersionPreview)}
                      className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore This Version</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-stone-500 text-center pt-2">
              All snapshots are stored locally in the browser's persistent storage and tied to manuscript ID <code>{storyId}</code>.
            </div>
          </div>
        </div>
      )}

      {/* Feature 5 — Optional AI Writing Assistant Drawer */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-[#141210] border-l border-stone-800 p-6 flex flex-col h-full shadow-2xl">
            
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">Editorial Writing Assistant</h3>
                  <p className="text-[11px] text-stone-400">Optional literary styling & proofreading. Your original text is always preserved.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setAiDrawerOpen(false);
                  setAiSuggestedText('');
                  setAiErrorMessage('');
                }} 
                className="text-stone-400 hover:text-stone-200 text-sm font-medium"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              
              {/* Assistance Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Select Assistance Focus</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button 
                    onClick={() => setAiMode('grammar')} 
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      aiMode === 'grammar' ? 'bg-rose-950/60 border-rose-800 text-rose-200 shadow' : 'bg-[#1c1917] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    Grammar & Spelling
                  </button>
                  
                  <button 
                    onClick={() => setAiMode('clarity')} 
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      aiMode === 'clarity' ? 'bg-rose-950/60 border-rose-800 text-rose-200 shadow' : 'bg-[#1c1917] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    Sentence Flow & Clarity
                  </button>
                  
                  <button 
                    onClick={() => setAiMode('dialogue')} 
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      aiMode === 'dialogue' ? 'bg-rose-950/60 border-rose-800 text-rose-200 shadow' : 'bg-[#1c1917] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    Dialogue Refinement
                  </button>
                  
                  <button 
                    onClick={() => setAiMode('paragraphs')} 
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      aiMode === 'paragraphs' ? 'bg-rose-950/60 border-rose-800 text-rose-200 shadow' : 'bg-[#1c1917] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    Paragraph Structure
                  </button>
                  
                  <button 
                    onClick={() => setAiMode('pacing')} 
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      aiMode === 'pacing' ? 'bg-rose-950/60 border-rose-800 text-rose-200 shadow' : 'bg-[#1c1917] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    Pacing & Readability
                  </button>
                  
                  <button 
                    onClick={() => setAiMode('continue')} 
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      aiMode === 'continue' ? 'bg-rose-950/60 border-rose-800 text-rose-200 shadow' : 'bg-[#1c1917] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    Continue Passage
                  </button>
                </div>
              </div>

              {/* British-style paragraphing option */}
              {aiMode === 'paragraphs' && (
                <div className="p-3 bg-[#1c1917] rounded-xl border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-stone-200 block">British Publishing Format</span>
                    <span className="text-[11px] text-stone-400">Classical reflective cadence and single quotation marks for dialogue ('...').</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiBritishParagraphs}
                    onChange={(e) => setAiBritishParagraphs(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 rounded"
                  />
                </div>
              )}

              {/* Source Text Indicator */}
              <div className="p-3 bg-[#181614] rounded-xl border border-stone-800 text-xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span>Target Chapter: <strong>{activeChapter?.title}</strong></span>
                  <span className="font-mono">{activeChapter?.wordCount || 0} words</span>
                </div>
                <p className="text-stone-300 italic truncate font-serif">
                  "{activeChapter?.content?.slice(0, 120) || 'No text written yet'}..."
                </p>
              </div>

              {/* Run Assistant Trigger */}
              <button
                onClick={handleRunAiAssistant}
                disabled={aiLoading || !activeChapter?.content?.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                <span>{aiLoading ? 'Analyzing & Drafting...' : `Analyze with ${aiMode.toUpperCase()}`}</span>
              </button>

              {/* Error Message with Non-Repeating Notice */}
              {aiErrorMessage && (
                <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{aiErrorMessage}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-rose-900/60">
                    <span className="text-[11px] text-rose-400">Deterministic check: will not loop retries.</span>
                    <button
                      onClick={handleRunAiAssistant}
                      className="px-2.5 py-1 bg-rose-900 text-white rounded text-[11px] hover:bg-rose-800"
                    >
                      Retry Request
                    </button>
                  </div>
                </div>
              )}

              {/* Side-by-Side Review & Explicit Accept/Reject */}
              {aiSuggestedText && (
                <div className="mt-4 bg-[#1c1917] border border-stone-800 rounded-2xl p-4 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Suggested Changes Review</span>
                    </span>
                    <span className="text-[11px] text-stone-400">Original text remains intact until accepted.</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto font-serif text-sm text-stone-200 whitespace-pre-wrap leading-relaxed p-3 bg-[#141210] rounded-xl border border-stone-800">
                    {aiSuggestedText}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      onClick={handleCopyAiSuggestion}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedNotice ? 'Copied!' : 'Copy to Clipboard'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAiSuggestedText('')}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white text-xs font-medium transition-colors"
                      >
                        Discard Suggestion
                      </button>

                      <button
                        onClick={handleApplyAiSuggestion}
                        className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Accept & Apply to Chapter</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

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

    </div>
  );
};
