import { Story, StoryVersion, User, ReadingProgress, BookshelfItem, BookshelfStatus, StoryComment, StoryReport, AppNotification } from '../types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, query, where, orderBy } from 'firebase/firestore';
import { DriveService } from './drive';

const STORAGE_KEYS = {
  STORIES: 'inokora_stories_v4',
  USER: 'inokora_user_v4',
  BOOKMARKS: 'inokora_bookmarks_v4',
  LIKES: 'inokora_likes_v4',
  BOOKSHELF: 'inokora_bookshelf_v4',
  PROGRESS: 'inokora_reading_progress_v4',
  COMMENTS: 'inokora_comments_v4',
  REPORTS: 'inokora_reports_v4',
  NOTIFICATIONS: 'inokora_notifications_v4',
  VERSIONS_PREFIX: 'inokora_story_versions_v4_',
  DRAFTS_PREFIX: 'inokora_unsaved_draft_v4_'
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

  // Authoritative getStories: Queries public published stories, user's private drafts in Firestore, and Google Drive
  async getStories(): Promise<Story[]> {
    const storiesMap = new Map<string, Story>();

    // 1. Load any locally stored stories first for instant responsiveness
    const local = this.getLocalStories();
    local.forEach(s => storiesMap.set(s.id, s));

    // 2. Load from Google Drive if authorized
    try {
      const driveStories = await DriveService.loadStories();
      driveStories.forEach(s => storiesMap.set(s.id, s));
    } catch {}

    if (!db) {
      return Array.from(storiesMap.values());
    }

    try {
      // 3. Fetch public stories with strict query constraint matching security rules
      const publicQuery = query(collection(db, 'stories'), where('visibility', '==', 'public'));
      const publicSnap = await getDocs(publicQuery);
      publicSnap.forEach(d => {
        storiesMap.set(d.id, d.data() as Story);
      });

      // 4. If user is signed in, fetch user's own stories (including private & unlisted)
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

  // Public discovery stories: STRICTLY public visibility and published status only.
  // Private drafts and unlisted stories never appear in public discovery.
  async getPublicStories(): Promise<Story[]> {
    const all = await this.getStories();
    return all.filter(s => s.visibility === 'public' && s.status === 'published');
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

    // Sync to Google Drive if authorized
    try {
      await DriveService.saveStory(storyWithCount);
    } catch (e) {
      console.warn('[StorageService] Google Drive sync skipped:', e);
    }

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

  // --- Version History & Draft Recovery ---
  getStoryVersions(storyId: string): StoryVersion[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.VERSIONS_PREFIX}${storyId}`);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  createStoryVersion(story: Story, label = 'Auto-snapshot'): StoryVersion {
    const versions = this.getStoryVersions(story.id);
    const newVersion: StoryVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storyId: story.id,
      timestamp: Date.now(),
      label,
      totalWordCount: story.totalWordCount || story.chapters.reduce((a, c) => a + (c.wordCount || 0), 0),
      chaptersCount: story.chapters.length,
      chapters: JSON.parse(JSON.stringify(story.chapters)),
      title: story.title,
      synopsis: story.synopsis
    };

    // Keep up to 25 historical snapshots
    const updated = [newVersion, ...versions.slice(0, 24)];
    try {
      localStorage.setItem(`${STORAGE_KEYS.VERSIONS_PREFIX}${story.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('[StorageService] Failed to cache story version:', e);
    }
    return newVersion;
  },

  saveUnsavedDraft(story: Story): void {
    try {
      localStorage.setItem(
        `${STORAGE_KEYS.DRAFTS_PREFIX}${story.id}`,
        JSON.stringify({ story, savedAt: Date.now() })
      );
    } catch (e) {
      console.warn('[StorageService] Failed to store temporary draft backup:', e);
    }
  },

  getUnsavedDraft(storyId: string): { story: Story; savedAt: number } | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.DRAFTS_PREFIX}${storyId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearUnsavedDraft(storyId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.DRAFTS_PREFIX}${storyId}`);
    } catch {}
  },

  // --- User Profile ---
  getUser(): User {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Never treat cached localStorage as the authoritative source of truth for administrative rights
        return {
          ...parsed,
          isAdmin: false
        };
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
      publicBookshelf: true,
      isAdmin: false
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

  toggleLike(storyId: string, user?: User, story?: Story): string[] {
    const likes = this.getLikes();
    const isAdding = !likes.includes(storyId);
    const updated = isAdding
      ? [...likes, storyId]
      : likes.filter(id => id !== storyId);
    localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(updated));

    if (isAdding && story && user && story.userId && story.userId !== user.id) {
      this.createNotification({
        recipientId: story.userId,
        senderId: user.id,
        senderName: user.name || 'A Reader',
        senderAvatar: user.avatar,
        type: 'like',
        storyId: story.id,
        storyTitle: story.title,
        message: `${user.name || 'A reader'} loved your story "${story.title}".`
      }).catch(() => {});
    }

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

  addComment(comment: StoryComment, story?: Story): StoryComment[] {
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

    // Dispatch real in-site notification to the author if commenter is not the author
    if (story && story.userId && story.userId !== comment.userId) {
      const preview = comment.text.length > 50 ? `${comment.text.slice(0, 50)}...` : comment.text;
      this.createNotification({
        recipientId: story.userId,
        senderId: comment.userId,
        senderName: comment.authorName || 'A Reader',
        senderAvatar: comment.avatar,
        type: 'comment',
        storyId: story.id,
        storyTitle: story.title,
        chapterId: comment.chapterId,
        message: `${comment.authorName} commented on ${comment.chapterTitle || 'your manuscript'}: "${preview}"`
      }).catch(err => console.warn('[StorageService] Failed to dispatch comment notification:', err));
    }

    return updated;
  },

  // --- In-Site Notifications ---
  getLocalNotifications(userId: string): AppNotification[] {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.NOTIFICATIONS}_${userId}`);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  saveLocalNotifications(userId: string, notifs: AppNotification[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.NOTIFICATIONS}_${userId}`, JSON.stringify(notifs));
    } catch (e) {
      console.warn('[StorageService] Failed to save local notifications:', e);
    }
  },

  async getNotifications(userId: string): Promise<AppNotification[]> {
    if (!userId || userId === 'guest') {
      return this.getLocalNotifications('guest');
    }

    const notifMap = new Map<string, AppNotification>();
    const local = this.getLocalNotifications(userId);
    local.forEach(n => notifMap.set(n.id, n));

    if (db) {
      try {
        const notifQuery = query(
          collection(db, 'notifications'),
          where('recipientId', '==', userId)
        );
        const snap = await getDocs(notifQuery);
        snap.forEach(d => {
          notifMap.set(d.id, d.data() as AppNotification);
        });
      } catch (err: any) {
        console.warn('[StorageService] Firestore getNotifications skipped or restricted:', err?.message || err);
      }
    }

    const list = Array.from(notifMap.values()).sort((a, b) => b.createdAt - a.createdAt);
    this.saveLocalNotifications(userId, list);
    return list;
  },

  async createNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<AppNotification | null> {
    // Avoid notifying oneself
    if (data.senderId && data.recipientId && data.senderId === data.recipientId) {
      return null;
    }

    const existing = this.getLocalNotifications(data.recipientId);

    // Prevent spam / duplicate notifications within 10 minutes for identical action
    const isDuplicate = existing.some(n => 
      n.type === data.type &&
      n.storyId === data.storyId &&
      n.senderId === data.senderId &&
      n.message === data.message &&
      (Date.now() - n.createdAt) < 10 * 60 * 1000
    );
    if (isDuplicate) {
      return null;
    }

    const newNotif: AppNotification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      read: false,
      createdAt: Date.now()
    };

    const updated = [newNotif, ...existing.slice(0, 49)]; // Keep up to 50 notifications
    this.saveLocalNotifications(data.recipientId, updated);

    if (db) {
      try {
        await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
      } catch (err: any) {
        console.warn('[StorageService] Firestore notification sync error:', err?.message || err);
      }
    }

    // Trigger local dispatch event so open tabs/components re-render
    try {
      window.dispatchEvent(new CustomEvent('inokora_notifications_changed', { detail: { recipientId: data.recipientId } }));
    } catch {}

    return newNotif;
  },

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    const list = this.getLocalNotifications(userId);
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    this.saveLocalNotifications(userId, updated);

    if (db) {
      try {
        await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
      } catch (err: any) {
        console.warn('[StorageService] Firestore markNotificationAsRead error:', err?.message || err);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('inokora_notifications_changed', { detail: { recipientId: userId } }));
    } catch {}
  },

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const list = this.getLocalNotifications(userId);
    const updated = list.map(n => ({ ...n, read: true }));
    this.saveLocalNotifications(userId, updated);

    if (db) {
      try {
        for (const n of list.filter(item => !item.read)) {
          setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true }).catch(() => {});
        }
      } catch (err: any) {
        console.warn('[StorageService] Firestore markAllNotificationsAsRead error:', err?.message || err);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('inokora_notifications_changed', { detail: { recipientId: userId } }));
    } catch {}
  },

  async deleteNotification(id: string, userId: string): Promise<void> {
    const list = this.getLocalNotifications(userId).filter(n => n.id !== id);
    this.saveLocalNotifications(userId, list);

    if (db) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch (err: any) {
        console.warn('[StorageService] Firestore deleteNotification error:', err?.message || err);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('inokora_notifications_changed', { detail: { recipientId: userId } }));
    } catch {}
  },

  async clearAllNotifications(userId: string): Promise<void> {
    const list = this.getLocalNotifications(userId);
    this.saveLocalNotifications(userId, []);

    if (db) {
      try {
        for (const n of list) {
          deleteDoc(doc(db, 'notifications', n.id)).catch(() => {});
        }
      } catch (err: any) {
        console.warn('[StorageService] Firestore clearAllNotifications error:', err?.message || err);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('inokora_notifications_changed', { detail: { recipientId: userId } }));
    } catch {}
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
