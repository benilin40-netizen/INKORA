import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { AuthService, db } from './services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Story, User, CoverConfig } from './types';
import { fetchJson } from './utils/api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { StarBackground } from './components/StarBackground';
import { Home } from './pages/Home';
import { MyStories } from './pages/MyStories';
import { StoryEditor } from './pages/StoryEditor';
import { CoverStudio } from './pages/CoverStudio';
import { PublicLibrary } from './pages/PublicLibrary';
import { Reader } from './pages/Reader';
import { Dashboard } from './pages/Dashboard';
import { AuthorProfile } from './pages/AuthorProfile';
import { Settings } from './pages/Settings';
import { Auth } from './pages/Auth';
import { BookshelfPage } from './pages/BookshelfPage';
import { AdminPanel } from './pages/AdminPanel';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [user, setUser] = useState<User>(StorageService.getUser());
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [likes, setLikes] = useState<string[]>([]);

  // 1. Initial stories and bookmarks loading
  useEffect(() => {
    async function loadData() {
      const loadedStories = await StorageService.getStories();
      setStories(loadedStories);
      setBookmarks(StorageService.getBookmarks());
      setLikes(StorageService.getLikes());
    }
    loadData();
  }, []);

  // 2. Firebase Auth session restore listener
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        let profile = StorageService.getUser();
        if (db) {
          try {
            const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userSnap.exists()) {
              profile = userSnap.data() as User;
            } else {
              profile = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Author',
                email: firebaseUser.email || '',
                avatar: firebaseUser.photoURL || profile.avatar,
                bio: profile.bio || 'Writing thoughts and crafting worlds on INOKORA.',
                followersCount: 0,
                joinedDate: Date.now(),
                publicBookshelf: true
              };
            }
          } catch (e) {
            console.warn('[App] Could not fetch Firestore user profile:', e);
          }
        }

        // Check if admin safely
        try {
          const roleData = await fetchJson<{ isAdmin: boolean }>(`/api/admin/check-role?uid=${firebaseUser.uid}`);
          profile.isAdmin = !!roleData.isAdmin;
        } catch {
          profile.isAdmin = false;
        }

        setUser(profile);
        StorageService.saveUser(profile);

        // Reload stories with user's private drafts
        const userStories = await StorageService.getStories();
        setStories(userStories);
      } else {
        // User logged out: restore guest user
        const defaultGuest: User = {
          id: 'guest',
          name: 'Guest Storyteller',
          email: '',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          bio: 'Writing thoughts and crafting worlds on INOKORA.',
          followersCount: 0,
          joinedDate: Date.now(),
          publicBookshelf: true
        };
        setUser(defaultGuest);
        StorageService.saveUser(defaultGuest);
        // Reload stories to only show public ones
        StorageService.getStories().then(setStories);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleNavigate = (page: string, storyId?: string) => {
    if (storyId) {
      setActiveStoryId(storyId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveStory = async (updatedStory: Story) => {
    const res = await StorageService.saveStory(updatedStory);
    const refreshed = await StorageService.getStories();
    setStories(refreshed);
    return res;
  };

  const handleCreateStory = async (newStory: Story) => {
    // Attach current user identity if signed in
    const storyToCreate: Story = {
      ...newStory,
      userId: user.id !== 'guest' ? user.id : newStory.userId,
      authorName: user.name || newStory.authorName
    };
    const res = await StorageService.saveStory(storyToCreate);
    const refreshed = await StorageService.getStories();
    setStories(refreshed);
    setActiveStoryId(res.story.id);
    return res;
  };

  const handleDeleteStory = async (storyId: string) => {
    const remaining = await StorageService.deleteStory(storyId);
    setStories(remaining);
  };

  const handleSaveCover = async (storyId: string, cover: CoverConfig) => {
    const story = await StorageService.getStory(storyId);
    if (story) {
      const updated = { ...story, cover };
      await StorageService.saveStory(updated);
      const refreshed = await StorageService.getStories();
      setStories(refreshed);
    }
  };

  const handleToggleBookmark = (storyId: string) => {
    const updated = StorageService.toggleBookmark(storyId);
    setBookmarks(updated);
  };

  const handleToggleLike = (storyId: string) => {
    const updated = StorageService.toggleLike(storyId);
    setLikes(updated);
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } catch {}
    const defaultGuest: User = {
      id: 'guest',
      name: 'Guest Storyteller',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      bio: 'Writing thoughts and crafting worlds on INOKORA.',
      followersCount: 0,
      joinedDate: Date.now(),
      publicBookshelf: true
    };
    setUser(defaultGuest);
    StorageService.saveUser(defaultGuest);
    setCurrentPage('home');
  };

  if (currentPage === 'editor' && activeStoryId) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f5f5f4] relative overflow-hidden">
        <StarBackground />
        <StoryEditor
          storyId={activeStoryId}
          onBack={() => setCurrentPage('mystories')}
          onSaveStory={handleSaveStory}
          stories={stories}
        />
      </div>
    );
  }

  if (currentPage === 'reader' && activeStoryId) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f5f5f4] relative overflow-hidden">
        <StarBackground />
        <Reader
          storyId={activeStoryId}
          stories={stories}
          onBack={() => setCurrentPage('library')}
          bookmarks={bookmarks}
          likes={likes}
          onToggleBookmark={handleToggleBookmark}
          onToggleLike={handleToggleLike}
        />
      </div>
    );
  }

  if (currentPage === 'cover-studio') {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f5f5f4] relative overflow-hidden">
        <StarBackground />
        <CoverStudio
          stories={stories}
          initialStoryId={activeStoryId || undefined}
          currentUser={user}
          onBack={() => setCurrentPage('mystories')}
          onSaveCover={handleSaveCover}
        />
      </div>
    );
  }

  if (currentPage === 'auth') {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f5f5f4] relative overflow-hidden">
        <StarBackground />
        <Auth
          currentUser={user}
          onCancel={() => setCurrentPage('home')}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            StorageService.saveUser(updatedUser);
            StorageService.getStories().then(setStories);
            setCurrentPage('home');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f5f5f4] flex flex-col font-sans selection:bg-rose-900 selection:text-rose-100 relative overflow-x-hidden">
      <StarBackground />
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={() => setCurrentPage('auth')}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 relative z-10">
        {currentPage === 'home' && (
          <Home onNavigate={handleNavigate} stories={stories} />
        )}

        {currentPage === 'library' && (
          <PublicLibrary
            stories={stories}
            onReadStory={(id) => handleNavigate('reader', id)}
            bookmarks={bookmarks}
            likes={likes}
            onToggleBookmark={handleToggleBookmark}
            onToggleLike={handleToggleLike}
          />
        )}

        {currentPage === 'bookshelf' && (
          <BookshelfPage
            stories={stories}
            onReadStory={(id) => handleNavigate('reader', id)}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'mystories' && (
          <MyStories
            user={user}
            stories={stories}
            onOpenEditor={(id) => handleNavigate('editor', id)}
            onOpenCoverStudio={(id) => handleNavigate('cover-studio', id)}
            onCreateStory={handleCreateStory}
            onDeleteStory={handleDeleteStory}
          />
        )}

        {currentPage === 'dashboard' && (
          <Dashboard user={user} stories={stories} onNavigate={handleNavigate} />
        )}

        {currentPage === 'profile' && (
          <AuthorProfile 
            user={user} 
            stories={stories} 
            onReadStory={(id) => handleNavigate('reader', id)} 
          />
        )}

        {currentPage === 'settings' && (
          <Settings 
            user={user} 
            onSaveUser={(u) => { setUser(u); StorageService.saveUser(u); }} 
          />
        )}

        {currentPage === 'admin' && (
          <AdminPanel
            user={user}
            stories={stories}
            onSaveStory={handleSaveStory}
            onDeleteStory={handleDeleteStory}
            onBack={() => setCurrentPage('home')}
            onAdminStatusChange={(isAdmin) => {
              setUser(prev => ({ ...prev, isAdmin }));
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
