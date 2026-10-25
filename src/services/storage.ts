import { Story, User, ReadingProgress, BookshelfItem, BookshelfStatus, StoryComment, StoryReport } from '../types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, query, where } from 'firebase/firestore';

const STORAGE_KEYS = {
  STORIES: 'inokora_stories_v4',
  USER: 'inokora_user_v4',
  BOOKMARKS: 'inokora_bookmarks_v4',
  LIKES: 'inokora_likes_v4',
  BOOKSHELF: 'inokora_bookshelf_v4',
  PROGRESS: 'inokora_reading_progress_v4',
  COMMENTS: 'inokora_comments_v4',
  REPORTS: 'inokora_reports_v4'
};

export const StorageService = {
  // --- Stories ---
  getLocalStories(): Story[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STORIES);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  saveLocalStories(stories: Story[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
    } catch (e) {
      console.error('[StorageService] Failed to cache local stories:', e);
    }
  },

  // Authoritative getStories: Queries public published stories and, if signed in, user's private drafts
  async getStories(): Promise<Story[]> {
    const storiesMap = new Map<string, Story>();

    // 1. Load any locally stored stories first for instant responsiveness
    const local = this.getLocalStories();
    local.forEach(s => storiesMap.set(s.id, s));

    if (!db) {
      return Array.from(storiesMap.values());
    }

    try {
      // 2. Fetch public stories with strict query constraint matching security rules
      const publicQuery = query(collection(db, 'stories'), where('visibility', '==', 'public'));
      const publicSnap = await getDocs(publicQuery);
      publicSnap.forEach(d => {
        storiesMap.set(d.id, d.data() as Story);
      });

      // 3. If user is signed in, fetch user's private drafts as well
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        const userQuery = query(collection(db, 'stories'), where('userId', '==', currentUid));
        const userSnap = await getDocs(userQuery);
        userSnap.forEach(d => {
          storiesMap.set(d.id, d.data() as Story);
        });
      }

      const combined = Array.from(storiesMap.values());
      this.saveLocalStories(combined);
      return combined;
    } catch (e: any) {
      console.warn('[StorageService] Firestore fetch failed or rules restricted:', e?.message || e);
      return Array.from(storiesMap.values());
    }
  },

  async getStory(id: string): Promise<Story | undefined> {
    if (db) {
      try {
        const docSnap = await getDoc(doc(db, 'stories', id));
        if (docSnap.exists()) {
          return docSnap.data() as Story;
        }
      } catch (err: any) {
        console.warn(`[StorageService] Could not fetch story ${id} from Firestore:`, err?.message || err);
      }
    }
    const local = this.getLocalStories();
    return local.find(s => s.id === id);
  },

  async saveStory(updatedStory: Story): Promise<{ story: Story; synced: boolean; error?: string }> {
    const totalWords = updatedStory.chapters.reduce((acc, ch) => acc + (ch.wordCount || 0), 0);
    const storyWithCount: Story = {
      ...updatedStory,
      totalWordCount: totalWords,
      updatedAt: Date.now()
    };

    // Cache locally immediately
    const stories = this.getLocalStories();
    const index = stories.findIndex(s => s.id === storyWithCount.id);
    if (index >= 0) {
      stories[index] = storyWithCount;
    } else {
      stories.unshift(storyWithCount);
    }
    this.saveLocalStories(stories);

    // Sync to Firestore
    try {
      if (db) {
        const docRef = doc(db, 'stories', storyWithCount.id);
        await setDoc(docRef, storyWithCount);
        return { story: storyWithCount, synced: true };
      }
      return { story: storyWithCount, synced: false, error: 'Database uninitialized' };
    } catch (err: any) {
      console.error('[StorageService] Firestore save error:', err);
      return {
        story: storyWithCount,
        synced: false,
        error: err.code === 'permission-denied'
          ? 'Sign in required to save cloud manuscript.'
          : err.message || 'Saved locally in browser cache.'
      };
    }
  },

  async deleteStory(id: string): Promise<Story[]> {
    const stories = this.getLocalStories().filter(s => s.id !== id);
    this.saveLocalStories(stories);

    if (db) {
      try {
        await deleteDoc(doc(db, 'stories', id));
      } catch (e: any) {
        console.error('[StorageService] Firestore delete error:', e);
      }
    }

    return stories;
  },

  // --- User Profile ---
  getUser(): User {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {
      id: 'guest',
      name: 'Guest Storyteller',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      bio: 'Writing thoughts and crafting worlds on INOKORA.',
      followersCount: 0,
      joinedDate: Date.now(),
      publicBookshelf: true
    };
  },

  saveUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (db && auth.currentUser && auth.currentUser.uid === user.id) {
      setDoc(doc(db, 'users', user.id), user, { merge: true }).catch(err => {
        console.warn('[StorageService] Firestore user profile sync error:', err?.message || err);
      });
    }
  },

  // --- Bookmarks & Likes ---
  getBookmarks(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  toggleBookmark(storyId: string): string[] {
    const bookmarks = this.getBookmarks();
    const updated = bookmarks.includes(storyId)
      ? bookmarks.filter(id => id !== storyId)
      : [...bookmarks, storyId];
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
    return updated;
  },

  getLikes(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LIKES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  toggleLike(storyId: string): string[] {
    const likes = this.getLikes();
    const updated = likes.includes(storyId)
      ? likes.filter(id => id !== storyId)
      : [...likes, storyId];
    localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(updated));
    return updated;
  },

  // --- Bookshelf ---
  getBookshelf(): BookshelfItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BOOKSHELF);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  setBookshelfStatus(storyId: string, status: BookshelfStatus): BookshelfItem[] {
    const shelf = this.getBookshelf();
    const existingIndex = shelf.findIndex(item => item.storyId === storyId);
    let updated: BookshelfItem[];

    if (existingIndex >= 0) {
      shelf[existingIndex].status = status;
      shelf[existingIndex].addedAt = Date.now();
      updated = [...shelf];
    } else {
      updated = [{ storyId, status, addedAt: Date.now(), isPrivate: true }, ...shelf];
    }

    localStorage.setItem(STORAGE_KEYS.BOOKSHELF, JSON.stringify(updated));
    return updated;
  },

  removeFromBookshelf(storyId: string): BookshelfItem[] {
    const shelf = this.getBookshelf().filter(item => item.storyId !== storyId);
    localStorage.setItem(STORAGE_KEYS.BOOKSHELF, JSON.stringify(shelf));
    return shelf;
  },

  // --- Reading Progress ---
  getReadingProgressMap(): Record<string, ReadingProgress> {
    try {
      const stored = localStorage.getItem('readingProgress') || localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  },

  getReadingProgress(storyId: string): ReadingProgress | undefined {
    const map = this.getReadingProgressMap();
    return map[storyId];
  },

  saveReadingProgress(progress: ReadingProgress): void {
    const map = this.getReadingProgressMap();
    map[progress.storyId] = progress;
    try {
      localStorage.setItem('readingProgress', JSON.stringify(map));
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(map));
    } catch (e) {
      console.warn('[StorageService] Failed to save readingProgress:', e);
    }
  },

  // --- Comments ---
  getComments(storyId: string, chapterId?: string): StoryComment[] {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.COMMENTS}_${storyId}`);
      const list: StoryComment[] = stored ? JSON.parse(stored) : [];
      if (chapterId) {
        return list.filter(c => c.chapterId === chapterId);
      }
      return list;
    } catch {
      return [];
    }
  },

  addComment(comment: StoryComment): StoryComment[] {
    const list = this.getComments(comment.storyId);
    const updated = [comment, ...list];
    try {
      localStorage.setItem(`${STORAGE_KEYS.COMMENTS}_${comment.storyId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('[StorageService] Failed to save comment locally:', e);
    }

    if (db) {
      try {
        setDoc(doc(db, 'comments', comment.id), comment).catch(err => {
          console.warn('[StorageService] Firestore comment sync skipped:', err?.message || err);
        });
      } catch {}
    }
    return updated;
  },

  // --- Content Reporting ---
  async submitReport(report: StoryReport): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REPORTS);
      const reports = stored ? JSON.parse(stored) : [];
      reports.unshift(report);
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

      if (db) {
        await setDoc(doc(db, 'reports', report.id), report);
      }
    } catch (e: any) {
      console.error('[StorageService] Submit report error:', e);
    }
  }
};
