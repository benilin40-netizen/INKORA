import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Bookmark, Heart, ChevronLeft, ChevronRight, MessageSquare, 
  Flag, Send, Check, AlertCircle, X, ThumbsUp, User as UserIcon, Clock, 
  Sparkles, Sliders, Type, AlignJustify, Maximize2
} from 'lucide-react';
import { Story, StoryComment, StoryReport, BookshelfStatus, ReadingProgress } from '../types';
import { StorageService } from '../services/storage';
import { auth } from '../services/firebase';
import { BookCoverDisplay } from '../components/BookCoverDisplay';

interface ReaderProps {
  storyId: string;
  stories: Story[];
  onBack: () => void;
  bookmarks: string[];
  likes: string[];
  onToggleBookmark: (storyId: string) => void;
  onToggleLike: (storyId: string) => void;
}

type ReadingTheme = 'dark' | 'light' | 'sepia' | 'forest' | 'midnight';
type ReadingFont = 'cormorant' | 'playfair' | 'eb-garamond' | 'merriweather' | 'georgia' | 'montserrat' | 'courier';
type LineSpacing = 'compact' | 'normal' | 'relaxed';
type ContentWidth = 'compact' | 'comfortable' | 'wide';

interface ReadingPreferences {
  theme: ReadingTheme;
  fontSize: number;
  fontFamily: ReadingFont;
  lineSpacing: LineSpacing;
  contentWidth: ContentWidth;
}

const DEFAULT_PREFERENCES: ReadingPreferences = {
  theme: 'dark',
  fontSize: 19,
  fontFamily: 'cormorant',
  lineSpacing: 'normal',
  contentWidth: 'comfortable'
};

export const Reader: React.FC<ReaderProps> = ({
  storyId,
  stories,
  onBack,
  bookmarks,
  likes,
  onToggleBookmark,
  onToggleLike
}) => {
  const story = stories.find(s => s.id === storyId) || stories[0];
  const user = StorageService.getUser();

  // Load persistent user reading preferences
  const [preferences, setPreferences] = useState<ReadingPreferences>(() => {
    try {
      const raw = localStorage.getItem('inokora_reader_prefs_v3');
      if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false);

  // Update preferences and persist to localStorage
  const updatePreference = <K extends keyof ReadingPreferences>(key: K, value: ReadingPreferences[K]) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('inokora_reader_prefs_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Read readingProgress object from localStorage keyed by storyId
  const getSavedProgress = (): ReadingProgress | undefined => {
    try {
      const raw = localStorage.getItem('readingProgress');
      if (raw) {
        const map = JSON.parse(raw);
        if (map[storyId]) return map[storyId];
      }
    } catch (e) {
      console.warn('[Reader] Error reading readingProgress from localStorage:', e);
    }
    return StorageService.getReadingProgress(storyId);
  };

  const initialProgress = getSavedProgress();
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(() => {
    if (initialProgress && initialProgress.currentChapterIndex < (story?.chapters.length || 1)) {
      return initialProgress.currentChapterIndex;
    }
    return 0;
  });

  const [showComments, setShowComments] = useState<boolean>(true);
  const [commentsFilter, setCommentsFilter] = useState<'current' | 'all'>('current');
  const [comments, setComments] = useState<StoryComment[]>(() => StorageService.getComments(storyId));
  const [newCommentText, setNewCommentText] = useState('');
  
  // Resumption notification toast
  const [resumedNotice, setResumedNotice] = useState<string | null>(null);
  const scrollRestoredRef = useRef<boolean>(false);

  // Authenticated user credentials
  const currentAuthUser = auth.currentUser;
  const currentUserId = currentAuthUser?.uid || user.id || 'guest';
  const currentUserName = currentAuthUser?.displayName || user.name || 'Reader';
  const currentUserAvatar = currentAuthUser?.photoURL || user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
  const [commenterName, setCommenterName] = useState(currentUserName);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<StoryReport['reason']>('Inappropriate Content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const currentChapter = story?.chapters[activeChapterIndex] || story?.chapters[0];
  const isBookmarked = bookmarks.includes(story?.id);
  const isLiked = likes.includes(story?.id);

  // Filter comments for active chapter vs all chapters
  const chapterComments = comments.filter(c => c.chapterId === currentChapter?.id);
  const displayedComments = commentsFilter === 'current' ? chapterComments : comments;

  // 1. Initial Scroll Restoration: automatically scroll reader to saved position when story is reopened
  useEffect(() => {
    if (scrollRestoredRef.current) return;

    const saved = getSavedProgress();
    if (saved && typeof saved.scrollY === 'number' && saved.scrollY > 40) {
      const scrollTimer = setTimeout(() => {
        window.scrollTo({
          top: saved.scrollY,
          behavior: 'smooth'
        });
        scrollRestoredRef.current = true;
        setResumedNotice(`Resumed where you left off (Chapter ${saved.currentChapterIndex + 1})`);
        const toastTimer = setTimeout(() => setResumedNotice(null), 3500);
        return () => clearTimeout(toastTimer);
      }, 150);

      return () => clearTimeout(scrollTimer);
    } else {
      scrollRestoredRef.current = true;
    }
  }, [storyId]);

  // 2. Reading progress tracking: onScroll listener saving scrollY and progress in localStorage keyed by storyId
  useEffect(() => {
    if (!story || !currentChapter) return;

    let throttleTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollRatio = scrollHeight > 0 ? Math.min(1, Math.max(0, currentScrollY / scrollHeight)) : 0;

        const totalChapters = story.chapters.length || 1;
        const chapterFraction = 1 / totalChapters;
        const overallPercent = Math.min(100, Math.max(0, Math.round(((activeChapterIndex + scrollRatio) * chapterFraction) * 100)));

        try {
          const raw = localStorage.getItem('readingProgress');
          const progressMap = raw ? JSON.parse(raw) : {};
          const updatedProgress: ReadingProgress = {
            storyId: story.id,
            currentChapterId: currentChapter.id,
            currentChapterIndex: activeChapterIndex,
            scrollY: Math.round(currentScrollY),
            percent: overallPercent,
            lastReadAt: Date.now()
          };
          progressMap[story.id] = updatedProgress;
          localStorage.setItem('readingProgress', JSON.stringify(progressMap));
          StorageService.saveReadingProgress(updatedProgress);
        } catch (err) {
          console.warn('[Reader] Failed to persist scroll progress:', err);
        }
      }, 250);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [story, currentChapter, activeChapterIndex]);

  // Auto-add to bookshelf on open
  useEffect(() => {
    if (!story) return;
    const currentShelf = StorageService.getBookshelf().find(b => b.storyId === story.id);
    if (!currentShelf) {
      StorageService.setBookshelfStatus(story.id, 'reading');
    }
  }, [story]);

  const handleChapterChange = (newIndex: number) => {
    if (!story || newIndex < 0 || newIndex >= story.chapters.length) return;
    setActiveChapterIndex(newIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const totalChapters = story.chapters.length || 1;
    const percent = Math.round(((newIndex + 1) / totalChapters) * 100);
    const targetChapter = story.chapters[newIndex];

    try {
      const raw = localStorage.getItem('readingProgress');
      const progressMap = raw ? JSON.parse(raw) : {};
      const updated: ReadingProgress = {
        storyId: story.id,
        currentChapterId: targetChapter.id,
        currentChapterIndex: newIndex,
        scrollY: 0,
        percent,
        lastReadAt: Date.now()
      };
      progressMap[story.id] = updated;
      localStorage.setItem('readingProgress', JSON.stringify(progressMap));
      StorageService.saveReadingProgress(updated);

      if (percent === 100) {
        StorageService.setBookshelfStatus(story.id, 'completed');
      }
    } catch (e) {
      console.warn('[Reader] Chapter change progress error:', e);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentChapter) return;

    const comment: StoryComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storyId,
      chapterId: currentChapter.id,
      chapterTitle: currentChapter.title || `Chapter ${activeChapterIndex + 1}`,
      userId: currentUserId,
      authorName: commenterName.trim() || currentUserName,
      avatar: currentUserAvatar,
      text: newCommentText.trim(),
      createdAt: Date.now()
    };

    const updated = StorageService.addComment(comment);
    setComments(updated);
    setNewCommentText('');
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    const report: StoryReport = {
      id: `rep_${Date.now()}`,
      storyId,
      storyTitle: story?.title || 'Untitled',
      reporterEmail: user.email || 'reader@inokora.internal',
      reason: reportReason,
      details: reportDetails,
      createdAt: Date.now(),
      status: 'pending'
    };

    StorageService.submitReport(report);
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setShowReportModal(false);
      setReportDetails('');
    }, 1800);
  };

  // Theme style classes
  const themeClasses: Record<ReadingTheme, string> = {
    dark: 'bg-[#09090b] text-[#e7e5e4] selection:bg-rose-900 selection:text-white',
    light: 'bg-[#fafaf9] text-[#292524] selection:bg-rose-200 selection:text-stone-900',
    sepia: 'bg-[#fcf5e5] text-[#3f2e1e] selection:bg-amber-200 selection:text-stone-900',
    forest: 'bg-[#081510] text-[#d1fae5] selection:bg-emerald-900 selection:text-white',
    midnight: 'bg-[#050914] text-[#e0e7ff] selection:bg-indigo-900 selection:text-white'
  };

  // Font family styles
  const fontClasses: Record<ReadingFont, string> = {
    'cormorant': "'Cormorant Garamond', serif",
    'playfair': "'Playfair Display', serif",
    'eb-garamond': "'EB Garamond', serif",
    'merriweather': "'Merriweather', serif",
    'georgia': 'Georgia, serif',
    'montserrat': "'Montserrat', sans-serif",
    'courier': "'Courier Prime', monospace"
  };

  // Line spacing styles
  const lineSpacingClasses: Record<LineSpacing, string> = {
    compact: 'leading-relaxed',
    normal: 'leading-loose',
    relaxed: 'leading-[2.3]'
  };

  // Container width styles
  const widthClasses: Record<ContentWidth, string> = {
    compact: 'max-w-2xl',
    comfortable: 'max-w-3xl',
    wide: 'max-w-4xl'
  };

  if (!story) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f5f5f4] flex items-center justify-center">
        <div className="text-center p-8 bg-[#141210] border border-stone-800 rounded-3xl max-w-md shadow-2xl">
          <BookCoverDisplay cover={{ title: 'Missing Story', author: 'Unknown', bgColor: '#1c1917', bgGradient: '', overlayPattern: 'none', fontFamily: 'serif', titleColor: '#fff', authorColor: '#fff', titleSize: 2, titlePosition: { x: 50, y: 50 }, authorPosition: { x: 50, y: 80 } }} title="Story Unavailable" author="" aspectRatio="2/3" />
          <h2 className="text-xl font-serif font-bold text-stone-100 mt-4 mb-2">Story Unavailable</h2>
          <p className="text-stone-400 text-xs mb-6">This manuscript may have been moved back to private draft mode by its author or removed.</p>
          <button onClick={onBack} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white transition-colors shadow-lg">
            Return to Story Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses[preferences.theme]} transition-colors duration-300 flex flex-col relative z-10`}>
      
      {/* Resumed Reading Progress Toast */}
      {resumedNotice && (
        <div className="fixed top-20 right-6 z-50 animate-bounce bg-emerald-950/90 border border-emerald-600/60 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-medium">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{resumedNotice}</span>
        </div>
      )}

      {/* Sticky Reader Navigation Header */}
      <header className={`sticky top-0 z-40 border-b px-4 sm:px-6 h-16 flex items-center justify-between ${
        preferences.theme === 'dark' ? 'bg-[#0c0a09]/95 border-[#292524]' :
        preferences.theme === 'light' ? 'bg-white/95 border-stone-200' :
        preferences.theme === 'sepia' ? 'bg-[#f7edd4]/95 border-[#e4d6b6]' :
        preferences.theme === 'forest' ? 'bg-[#091812]/95 border-[#123124]' :
        'bg-[#060b18]/95 border-[#131c36]'
      } backdrop-blur-md shadow-sm`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium"
            title="Return to Story Library"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>
          <div className="max-w-[140px] sm:max-w-xs truncate">
            <h1 className="text-xs sm:text-sm font-serif font-bold truncate">{story.title}</h1>
            <p className="text-[10px] sm:text-[11px] opacity-70 truncate">by {story.authorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Reading Preferences Popover Toggle */}
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="px-3 py-1.5 rounded-lg bg-black/10 hover:bg-black/20 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Customize reading typography and themes"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Display</span>
          </button>

          {/* Quick Font Size Adjusters */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => updatePreference('fontSize', Math.max(14, preferences.fontSize - 2))}
              className="w-7 h-7 rounded-lg bg-black/10 flex items-center justify-center font-bold text-xs hover:bg-black/20 transition-colors"
              title="Decrease Font Size"
            >
              A-
            </button>
            <button
              onClick={() => updatePreference('fontSize', Math.min(30, preferences.fontSize + 2))}
              className="w-7 h-7 rounded-lg bg-black/10 flex items-center justify-center font-bold text-xs hover:bg-black/20 transition-colors"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={() => onToggleBookmark(story.id)}
            className={`p-2 rounded-lg border transition-colors ${
              isBookmarked ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'border-current/20 opacity-60 hover:opacity-100'
            }`}
            title="Bookmark this story"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Like Button */}
          <button
            onClick={() => onToggleLike(story.id)}
            className={`p-2 rounded-lg border transition-colors flex items-center gap-1 text-xs ${
              isLiked ? 'bg-rose-500/20 border-rose-500 text-rose-500' : 'border-current/20 opacity-60 hover:opacity-100'
            }`}
            title="Like this story"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
            <span>{(story.likesCount || 0) + (isLiked ? 1 : 0)}</span>
          </button>

          {/* Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 rounded-lg border border-current/20 opacity-60 hover:opacity-100 transition-colors"
            title="Report Story"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Preferences Drawer / Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141210] border border-stone-800 rounded-3xl max-w-md w-full p-6 text-stone-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-base text-stone-100">Reading Display Preferences</h3>
              </div>
              <button onClick={() => setShowPreferencesModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Selection */}
            <div>
              <label className="block text-xs uppercase font-medium tracking-wider text-stone-400 mb-2">Reading Atmosphere</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'dark' as ReadingTheme, name: 'Dark', bg: '#09090b', text: '#e7e5e4' },
                  { id: 'light' as ReadingTheme, name: 'Light', bg: '#fafaf9', text: '#292524' },
                  { id: 'sepia' as ReadingTheme, name: 'Sepia', bg: '#fcf5e5', text: '#3f2e1e' },
                  { id: 'forest' as ReadingTheme, name: 'Forest', bg: '#081510', text: '#d1fae5' },
                  { id: 'midnight' as ReadingTheme, name: 'Night', bg: '#050914', text: '#e0e7ff' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => updatePreference('theme', t.id)}
                    className={`py-3 px-1 rounded-xl text-center text-xs font-medium border transition-all ${
                      preferences.theme === t.id
                        ? 'border-amber-400 ring-2 ring-amber-400/30 font-bold'
                        : 'border-stone-800 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: t.bg, color: t.text }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography Selection */}
            <div>
              <label className="block text-xs uppercase font-medium tracking-wider text-stone-400 mb-2">Font Family</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'cormorant' as ReadingFont, name: 'Cormorant Garamond', style: "'Cormorant Garamond', serif" },
                  { id: 'playfair' as ReadingFont, name: 'Playfair Display', style: "'Playfair Display', serif" },
                  { id: 'eb-garamond' as ReadingFont, name: 'EB Garamond', style: "'EB Garamond', serif" },
                  { id: 'merriweather' as ReadingFont, name: 'Merriweather', style: "'Merriweather', serif" },
                  { id: 'georgia' as ReadingFont, name: 'Classic Georgia', style: 'Georgia, serif' },
                  { id: 'montserrat' as ReadingFont, name: 'Montserrat (Sans)', style: "'Montserrat', sans-serif" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => updatePreference('fontFamily', f.id)}
                    style={{ fontFamily: f.style }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      preferences.fontFamily === f.id
                        ? 'bg-rose-950/60 border-rose-700 text-rose-200 font-bold'
                        : 'bg-[#1c1917] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size & Line Spacing */}
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs text-stone-400 mb-1">
                  <span>Font Size</span>
                  <span className="font-mono text-stone-200">{preferences.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="28"
                  step="1"
                  value={preferences.fontSize}
                  onChange={(e) => updatePreference('fontSize', Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div>
                <span className="block text-xs text-stone-400 mb-1.5">Line Spacing</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact' as LineSpacing, label: 'Compact' },
                    { id: 'normal' as LineSpacing, label: 'Standard' },
                    { id: 'relaxed' as LineSpacing, label: 'Spacious' },
                  ].map(ls => (
                    <button
                      key={ls.id}
                      onClick={() => updatePreference('lineSpacing', ls.id)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                        preferences.lineSpacing === ls.id
                          ? 'bg-rose-950/60 border-rose-700 text-rose-200'
                          : 'bg-[#1c1917] border-stone-800 text-stone-400'
                      }`}
                    >
                      {ls.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs text-stone-400 mb-1.5">Reading Column Width</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact' as ContentWidth, label: 'Focused' },
                    { id: 'comfortable' as ContentWidth, label: 'Standard' },
                    { id: 'wide' as ContentWidth, label: 'Wide' },
                  ].map(w => (
                    <button
                      key={w.id}
                      onClick={() => updatePreference('contentWidth', w.id)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                        preferences.contentWidth === w.id
                          ? 'bg-rose-950/60 border-rose-700 text-rose-200'
                          : 'bg-[#1c1917] border-stone-800 text-stone-400'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-800 flex justify-end">
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Reading Flow */}
      <main className={`flex-1 ${widthClasses[preferences.contentWidth]} mx-auto w-full px-6 py-12 flex flex-col justify-between transition-all duration-300`}>
        <div>
          {/* Book Cover Hero on Chapter 1 */}
          {activeChapterIndex === 0 && (
            <div className="mb-14 pb-12 border-b border-current/15 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
              <div className="w-40 sm:w-48 flex-shrink-0 shadow-2xl">
                <BookCoverDisplay
                  cover={story.cover}
                  title={story.title}
                  author={story.authorName}
                  genre={story.genre}
                  aspectRatio="2/3"
                />
              </div>

              <div className="flex-1 space-y-3">
                {story.genre && (
                  <span className="px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs uppercase tracking-wider font-mono">
                    {story.genre}
                  </span>
                )}

                <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight">
                  {story.title}
                </h1>

                <p className="text-sm font-mono opacity-80">
                  By {story.authorName}
                </p>

                <p className="text-xs sm:text-sm opacity-70 leading-relaxed font-light">
                  {story.synopsis}
                </p>

                <div className="text-xs opacity-60 font-mono pt-1">
                  <span>{story.chapters.length} Chapters</span>
                  <span className="mx-2">•</span>
                  <span>{story.totalWordCount.toLocaleString()} Total Words</span>
                </div>
              </div>
            </div>
          )}

          {/* Chapter Heading */}
          <div className="mb-10 text-center pb-8 border-b border-current/10">
            {story.genre && (
              <span className="text-xs uppercase tracking-widest opacity-60 mb-2 block font-mono">{story.genre}</span>
            )}
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-3">{currentChapter?.title || 'Chapter'}</h2>
            <div className="flex items-center justify-center gap-3 text-xs opacity-60 font-mono">
              <span>Chapter {activeChapterIndex + 1} of {story.chapters.length || 1}</span>
              <span>•</span>
              <span>{currentChapter?.wordCount || 0} words</span>
            </div>
          </div>

          {/* Chapter Content with Customized Preferences */}
          <article
            style={{ 
              fontSize: `${preferences.fontSize}px`,
              fontFamily: fontClasses[preferences.fontFamily]
            }}
            className={`${lineSpacingClasses[preferences.lineSpacing]} whitespace-pre-wrap opacity-95 space-y-6 transition-all duration-200`}
          >
            {currentChapter?.content || 'No written words in this chapter yet.'}
          </article>
        </div>

        {/* Chapter Navigation Footer */}
        <div className="mt-20 pt-8 border-t border-current/10 flex items-center justify-between">
          <button
            onClick={() => handleChapterChange(activeChapterIndex - 1)}
            disabled={activeChapterIndex === 0}
            className="px-4 py-2.5 rounded-xl bg-black/10 hover:bg-black/20 disabled:opacity-30 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous Chapter
          </button>

          <span className="text-xs opacity-60 font-mono">
            Chapter {activeChapterIndex + 1} of {story.chapters.length || 1}
          </span>

          <button
            onClick={() => handleChapterChange(activeChapterIndex + 1)}
            disabled={activeChapterIndex === (story.chapters.length || 1) - 1}
            className="px-4 py-2.5 rounded-xl bg-black/10 hover:bg-black/20 disabled:opacity-30 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
          >
            Next Chapter <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Chapter-Specific Discussion & Comment Section */}
        <section className="mt-16 pt-10 border-t border-current/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg">Reader Discussion</h3>
                <p className="text-[11px] opacity-70">
                  Discussing: <span className="font-semibold">{currentChapter?.title || `Chapter ${activeChapterIndex + 1}`}</span>
                </p>
              </div>
            </div>

            {/* Filter Tabs: This Chapter vs All Chapters */}
            <div className="flex items-center gap-1 bg-black/10 rounded-xl p-1 text-xs">
              <button
                onClick={() => setCommentsFilter('current')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  commentsFilter === 'current'
                    ? 'bg-rose-900/60 text-rose-200 shadow'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                This Chapter ({chapterComments.length})
              </button>
              <button
                onClick={() => setCommentsFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  commentsFilter === 'all'
                    ? 'bg-rose-900/60 text-rose-200 shadow'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                All Chapters ({comments.length})
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Comment Submission Form linked to authenticated user ID & specific chapter ID */}
            <form onSubmit={handleAddComment} className="p-4 sm:p-5 rounded-2xl bg-black/10 border border-current/10 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-current/10">
                <div className="flex items-center gap-2">
                  <img
                    src={currentUserAvatar}
                    alt={currentUserName}
                    className="w-5 h-5 rounded-full object-cover border border-rose-500/40"
                  />
                  <span className="font-medium text-xs">
                    Posting as <span className="font-semibold text-rose-400">{commenterName}</span>
                  </span>
                  {currentUserId !== 'guest' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-[10px] font-mono">
                      Verified
                    </span>
                  )}
                </div>
                <span className="text-[11px] opacity-60 font-mono">
                  Linked to Chapter {activeChapterIndex + 1}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Your display name"
                  value={commenterName}
                  onChange={(e) => setCommenterName(e.target.value)}
                  className="w-full sm:w-1/3 px-3.5 py-2.5 rounded-xl bg-black/15 border border-current/20 text-xs focus:outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  placeholder={`Share your thoughts on ${currentChapter?.title || 'this chapter'}...`}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/15 border border-current/20 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] opacity-50 font-light hidden sm:inline">
                  Constructive literary reactions and impressions are celebrated.
                </span>
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="ml-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Chapter Comment</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            {displayedComments.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-current/15 opacity-70">
                <p className="text-xs">
                  {commentsFilter === 'current'
                    ? `No comments on Chapter ${activeChapterIndex + 1} yet. Be the first reader to share your impressions!`
                    : 'No reader comments for this story yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedComments.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-4 rounded-xl bg-black/5 border border-current/10 space-y-2 hover:border-current/20 transition-colors shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={comm.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                          alt={comm.authorName}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="font-semibold text-xs">{comm.authorName}</span>
                        {comm.userId === story.userId && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/60 text-rose-300 text-[10px] font-mono font-medium">
                            Author
                          </span>
                        )}
                        {comm.chapterTitle && (
                          <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-mono opacity-80">
                            {comm.chapterTitle}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 opacity-50 text-[11px] font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(comm.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed opacity-90 pl-7">
                      {comm.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Report Story Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141212] border border-stone-800 rounded-2xl max-w-md w-full p-6 text-stone-200 shadow-2xl relative">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-white">Report Story</h3>
                <p className="text-xs text-stone-400">Help keep the INOKORA community safe and respectful.</p>
              </div>
            </div>

            {reportSubmitted ? (
              <div className="p-6 text-center space-y-2">
                <Check className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-stone-100 text-sm">Report Submitted</h4>
                <p className="text-xs text-stone-400">Thank you. Our moderation team will review this story promptly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Reason for report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as StoryReport['reason'])}
                    className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Copyright Violation">Copyright Violation</option>
                    <option value="Spam or Deceptive">Spam or Deceptive</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Additional details (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the issue..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full bg-[#1c1917] border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shadow"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
