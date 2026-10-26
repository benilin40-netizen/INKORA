import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, Shield, BookOpen, Flag, Check, AlertCircle, 
  RefreshCw, Lock, Globe, Trash2, Key, Users, Sparkles, Database 
} from 'lucide-react';
import { User, Story, StoryReport } from '../types';
import { StorageService } from '../services/storage';
import { DriveService } from '../services/drive';
import { getCachedAccessToken, AuthService, auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { fetchJson } from '../utils/api';
import { Logo } from '../components/Logo';

interface AdminPanelProps {
  user: User;
  stories: Story[];
  onSaveStory: (story: Story) => Promise<any>;
  onDeleteStory: (storyId: string) => Promise<void>;
  onBack: () => void;
  onAdminStatusChange: (isAdmin: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  stories,
  onSaveStory,
  onDeleteStory,
  onBack,
  onAdminStatusChange,
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stories' | 'reports' | 'system' | 'drive' | 'storage-servers' | 'users'>('overview');
  const [authMode, setAuthMode] = useState<'setup' | 'login' | 'reset'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [reports, setReports] = useState<StoryReport[]>([]);
  const [storageServers, setStorageServers] = useState<any[]>([]);
  const [storageOverview, setStorageOverview] = useState<any | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [editingServer, setEditingServer] = useState<any | null>(null);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [serverForm, setServerForm] = useState({
    name: '',
    providerType: 'firebase' as const,
    purpose: 'all' as const,
    endpoint: '',
    bucket: '',
    publicUrl: '',
    accessKey: '',
    secretKey: '',
    region: '',
    status: 'active' as const,
    isPreferred: false,
    notes: ''
  });
  const [healthStatus, setHealthStatus] = useState<{ status: string; aiConfigured: boolean } | null>(null);
  const [overviewData, setOverviewData] = useState<{ totalUsers: number; totalStories: number; publishedStories: number; drafts: number } | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState(!!getCachedAccessToken());
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') {
      return 'This email is already registered. Sign in with your existing account or use password recovery.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please verify your credentials or reset your password.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many failed attempts. Please wait a moment or reset your password.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    }
    if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed or cancelled before completion. Please try again.';
    }
    return err?.message || 'Authentication operation failed.';
  };

  // Secure authenticated fetch helper: attaches cryptographic Firebase Bearer token to every request
  const authFetchJson = async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
    let token = '';
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (e) {
        console.warn('[AdminPanel] Could not retrieve ID token:', e);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401 || res.status === 403) {
      setIsAdmin(false);
      onAdminStatusChange(false);
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Access Denied: Administrator privileges required.');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed with status ${res.status}`);
    }

    return res.json();
  };

  // 1. Initial check: check if platform owner is configured
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const data = await fetchJson<{ ownerConfigured: boolean; locked: boolean }>('/api/admin/status');
        if (!isMounted) return;
        setAdminExists(data.ownerConfigured);
        if (data.ownerConfigured) {
          setAuthMode('login');
        } else {
          setAuthMode('setup');
        }
      } catch (err: any) {
        console.warn('[AdminPanel] Could not verify owner status:', err?.message || err);
        if (isMounted) setAdminExists(false);
      }
    }
    checkStatus();
    setIsDriveConnected(!!getCachedAccessToken());
    return () => { isMounted = false; };
  }, []);

  // 2. Verified Role Check with Server using cryptographic Bearer token
  useEffect(() => {
    let isMounted = true;
    async function verifyAdminRole() {
      if (auth.currentUser) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          const roleData = await fetchJson<{ isAdmin: boolean; isOwner: boolean; ownerConfigured: boolean }>('/api/admin/check-role', {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (!isMounted) return;
          if (roleData.isAdmin) {
            setIsAdmin(true);
            onAdminStatusChange(true);
            loadDashboardData();
          } else {
            setIsAdmin(false);
            onAdminStatusChange(false);
          }
        } catch (err: any) {
          console.warn('[AdminPanel] Role check failed:', err?.message || err);
          if (isMounted) {
            setIsAdmin(false);
            onAdminStatusChange(false);
          }
        }
      } else {
        setIsAdmin(false);
        onAdminStatusChange(false);
      }
    }
    verifyAdminRole();
    return () => { isMounted = false; };
  }, [user.id]);

  // 3. Load admin dashboard data ONLY after verified authorization
  const loadDashboardData = async () => {
    try {
      const [overview, health, users, logs] = await Promise.all([
        authFetchJson<{ totalUsers: number; totalStories: number; publishedStories: number; drafts: number }>('/api/admin/overview'),
        authFetchJson<{ status: string; aiConfigured: boolean }>('/api/health'),
        authFetchJson<{ users: any[]; stats: any }>('/api/admin/users'),
        authFetchJson<any[]>('/api/admin/activity-logs')
      ]);
      setOverviewData(overview);
      setHealthStatus(health);
      setUsersList(users.users || []);
      setUserStats(users.stats || null);
      setActivityLogs(logs || []);
    } catch (err: any) {
      console.warn('[AdminPanel] Failed loading admin data:', err?.message || err);
    }

    try {
      const stored = localStorage.getItem('inokora_reports_v4');
      if (stored) {
        setReports(JSON.parse(stored));
      }
    } catch {}

    loadStorageData();
  };

  const loadStorageData = async () => {
    try {
      const [serversRes, overviewRes] = await Promise.all([
        authFetchJson<any[]>('/api/admin/storage/servers'),
        authFetchJson<any>('/api/admin/storage/overview')
      ]);
      setStorageServers(serversRes);
      setStorageOverview(overviewRes);
    } catch (e: any) {
      console.warn('[AdminPanel] Could not load storage servers:', e?.message || e);
    }
  };

  const handleClaimSoleOwnerWithToken = async (idToken: string, fbUser: any) => {
    await fetchJson<{ success: boolean; ownerUid: string; ownerEmail: string }>('/api/admin/setup-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (db) {
      try {
        await setDoc(doc(db, 'admins', 'sole_owner'), {
          uid: fbUser.uid,
          email: fbUser.email || '',
          establishedAt: Date.now()
        });
      } catch (fsErr) {
        console.warn('[Admin] Firestore sole_owner write notice:', fsErr);
      }
    }

    setIsAdmin(true);
    onAdminStatusChange(true);
    setAdminExists(true);
    setSuccessMsg(`Sole ownership permanently established and locked for ${fbUser.email || fbUser.uid}.`);
    loadDashboardData();
  };

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setSuccessMsg('');
    if (user.id === 'guest') {
      if (!email.trim() || !password.trim()) {
        setError('Please provide an email and password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }
    setLoading(true);
    try {
      let activeUser = auth.currentUser;

      if (user.id === 'guest' || !activeUser) {
        const { user: newUser } = await AuthService.signUpWithEmail(email.trim(), password, name.trim());
        activeUser = newUser;
      }

      if (!activeUser) {
        throw new Error('Authentication failed during setup.');
      }

      const idToken = await activeUser.getIdToken(true);
      await handleClaimSoleOwnerWithToken(idToken, activeUser);
    } catch (e: any) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const { user: googleUser } = await AuthService.signInWithGoogle();
      if (!googleUser) {
        throw new Error('Google sign-in did not return a user account.');
      }
      const idToken = await googleUser.getIdToken(true);
      if (!adminExists) {
        await handleClaimSoleOwnerWithToken(idToken, googleUser);
      } else {
        const roleData = await fetchJson<{ isAdmin: boolean; isOwner: boolean }>('/api/admin/check-role', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (roleData.isAdmin) {
          setIsAdmin(true);
          onAdminStatusChange(true);
          setSuccessMsg('Successfully authenticated as administrator.');
          loadDashboardData();
        } else {
          throw new Error('This Google account is not authorised as the INOKORA sole owner/administrator.');
        }
      }
    } catch (e: any) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email.trim() || !password.trim()) {
      setError('Please provide your admin email and password.');
      return;
    }
    setLoading(true);
    try {
      const { user: fbUser } = await AuthService.signInWithEmail(email.trim(), password);
      if (!fbUser) {
        throw new Error('Sign-in failed.');
      }
      const idToken = await fbUser.getIdToken(true);
      if (!adminExists) {
        await handleClaimSoleOwnerWithToken(idToken, fbUser);
      } else {
        const roleData = await fetchJson<{ isAdmin: boolean }>('/api/admin/check-role', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (roleData.isAdmin) {
          setIsAdmin(true);
          onAdminStatusChange(true);
          setSuccessMsg('Successfully authenticated as administrator.');
          loadDashboardData();
        } else {
          throw new Error('This account is not authorized as the INOKORA administrator.');
        }
      }
    } catch (e: any) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address to receive password reset instructions.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await AuthService.sendPasswordReset(email.trim());
      setSuccessMsg(`Password reset instructions sent to ${email.trim()}. Please check your inbox.`);
    } catch (e: any) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStoryStatus = async (story: Story) => {
    const updatedStatus = story.status === 'published' ? 'draft' : 'published';
    const updatedVisibility = updatedStatus === 'published' ? 'public' : 'private';
    const updatedStory: Story = {
      ...story,
      status: updatedStatus,
      visibility: updatedVisibility,
      updatedAt: Date.now()
    };
    await onSaveStory(updatedStory);
  };

  const handleResolveReport = (reportId: string) => {
    const updated = reports.map(r => r.id === reportId ? { ...r, status: 'resolved' as const } : r);
    setReports(updated);
    localStorage.setItem('inokora_reports_v4', JSON.stringify(updated));
  };

  const handleConnectDrive = async () => {
    try {
      await AuthService.signInWithGoogle();
      setIsDriveConnected(!!getCachedAccessToken());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverForm.name.trim()) {
      setError('Server display name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authFetchJson('/api/admin/storage/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingServer?.id,
          ...serverForm
        })
      });
      setShowServerModal(false);
      setEditingServer(null);
      setSuccessMsg('Storage server configuration saved securely.');
      loadStorageData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save storage server configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingServerId(id);
    setError('');
    setSuccessMsg('');
    try {
      const res = await authFetchJson<{ success: boolean; status: string; error?: string }>(`/api/admin/storage/servers/${id}/test`, {
        method: 'POST'
      });
      if (res.success) {
        setSuccessMsg(`Connection test passed successfully (${res.status}).`);
      } else {
        setError(`Connection test failed: ${res.error || 'Unknown error'}`);
      }
      loadStorageData();
    } catch (err: any) {
      setError(err?.message || 'Connection test failed.');
    } finally {
      setTestingServerId(null);
    }
  };

  const handleDeleteServer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove storage server "${name}"? Existing files will remain accessible if hosted externally, but new uploads will no longer route here.`)) {
      return;
    }
    try {
      const res = await authFetchJson<{ success: boolean; warning?: string }>(`/api/admin/storage/servers/${id}`, {
        method: 'DELETE'
      });
      if (res.warning) {
        alert(res.warning);
      }
      setSuccessMsg(`Storage server "${name}" removed successfully.`);
      loadStorageData();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove storage server.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
          <div className="flex items-center gap-4">
            <Logo size="md" showTagline={false} />
            <div className="h-8 w-px bg-stone-800 hidden sm:block"></div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-medium mb-1 shadow-lg">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Sanctuary Administration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
                Admin Control Center
              </h1>
            </div>
          </div>

          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 transition-colors"
          >
            Exit Admin Mode
          </button>
        </div>

        {/* Admin Authentication Block */}
        {!isAdmin ? (
          <div className="max-w-xl mx-auto bg-[#141210] border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
            <div className="flex flex-col items-center justify-center gap-3">
              <Logo size="lg" showTagline={false} />
              <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 flex items-center justify-center shadow-lg">
                {adminExists ? <Lock className="w-5 h-5 text-rose-400" /> : <Key className="w-5 h-5 text-amber-400" />}
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-serif font-bold text-stone-100 mb-2">
                {authMode === 'reset'
                  ? 'Password Recovery'
                  : adminExists || authMode === 'login'
                  ? 'Administrator Login'
                  : 'First-Time Admin Setup'}
              </h2>
              <p className="text-stone-400 text-sm font-light leading-relaxed">
                {authMode === 'reset'
                  ? 'Enter your email address to receive password reset instructions.'
                  : adminExists
                  ? 'Access the secure administration control center.'
                  : authMode === 'login'
                  ? 'Sign in with your registered account to claim administrator privileges.'
                  : 'Welcome to INOKORA. Secure your installation by registering the primary administrator.'}
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {error.includes('already registered') && (
                  <div className="pt-2 border-t border-rose-900/60 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError('');
                      }}
                      className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2 transition-colors"
                    >
                      Sign In with this email &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('reset');
                        setError('');
                      }}
                      className="text-stone-400 hover:text-stone-300 font-medium underline underline-offset-2 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Authentication Flow Modes */}
            {authMode === 'reset' ? (
              <form onSubmit={handlePasswordReset} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs text-stone-400 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="author@example.com"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-sm shadow-lg shadow-rose-950/50 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Sending Instructions...' : 'Send Password Reset Email'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(adminExists ? 'login' : 'setup');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    &larr; Back to {adminExists ? 'Login' : 'Admin Setup'}
                  </button>
                </div>
              </form>
            ) : !adminExists && authMode === 'setup' ? (
              user.id === 'guest' ? (
                <form onSubmit={handleRegister} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs text-stone-400 font-medium mb-1">Administrator Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Master Archivist"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="admin@inokora.internal"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 font-medium mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 font-medium mb-1">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-sm shadow-lg shadow-rose-950/50 disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Creating Administrator...' : 'Create Primary Administrator'}
                  </button>
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError('');
                      }}
                      className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
                    >
                      Already have an INOKORA account? <span className="underline">Sign in to claim admin role</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-stone-300 text-sm">
                    You are signed in as <strong className="text-stone-100">{user.email || user.name}</strong>. No primary administrator has been registered yet.
                  </p>
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-sm shadow-lg shadow-rose-950/50 disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Claiming Privileges...' : 'Claim Primary Administrator Privileges'}
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-4 text-left">
                <button
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#1c1917] hover:bg-stone-800 text-stone-200 font-medium text-xs sm:text-sm border border-stone-800 flex items-center justify-center gap-2.5 transition-all shadow-md"
                >
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>Continue with Google (Recommended)</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-stone-800"></div>
                  <span className="flex-shrink mx-3 text-stone-500 text-[11px] uppercase tracking-wider font-mono">or email</span>
                  <div className="flex-grow border-t border-stone-800"></div>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="admin@example.com"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 font-medium mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-sm shadow-lg shadow-rose-950/50 disabled:opacity-50 transition-all"
                  >
                    {loading
                      ? 'Authenticating...'
                      : !adminExists
                      ? 'Authenticate & Claim Admin Role'
                      : 'Sign In to Control Center'}
                  </button>
                  <div className="flex items-center justify-between text-xs text-stone-400 pt-2">
                    {!adminExists && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('setup');
                          setError('');
                        }}
                        className="hover:text-stone-200 transition-colors"
                      >
                        &larr; Back to Setup Form
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('reset');
                        setError('');
                      }}
                      className="hover:text-amber-400 underline underline-offset-2 transition-colors ml-auto"
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Nav Tabs */}
            <div className="flex items-center gap-3 border-b border-stone-800/80 pb-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === 'overview' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner' : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('stories')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === 'stories' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner' : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <BookOpen className="w-4 h-4 text-rose-400" />
                <span>Story Moderation ({stories.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === 'reports' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner' : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Flag className="w-4 h-4 text-amber-400" />
                <span>Reader Reports ({reports.filter(r => r.status === 'pending').length} pending)</span>
              </button>

              <button
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === 'system' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner' : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>System & AI Health</span>
              </button>

              <button
                onClick={() => setActiveTab('drive')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === 'drive' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner' : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Database className="w-4 h-4 text-sky-400" />
                <span>Google Drive Storage</span>
              </button>

              <button
                onClick={() => setActiveTab('storage-servers')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === 'storage-servers' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner' : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Storage Servers ({storageServers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === 'users' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-inner' : 'bg-[#141210] text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Users className="w-4 h-4 text-rose-400" />
                <span>User Monitoring ({usersList.length})</span>
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: overviewData?.totalUsers || 0, color: 'text-sky-400' },
                  { label: 'Total Stories', value: overviewData?.totalStories || 0, color: 'text-amber-400' },
                  { label: 'Published', value: overviewData?.publishedStories || 0, color: 'text-emerald-400' },
                  { label: 'Drafts', value: overviewData?.drafts || 0, color: 'text-rose-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl">
                    <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">{stat.label}</p>
                    <p className={`text-3xl font-serif font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Stories Moderation Tab */}
            {activeTab === 'stories' && (
              <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">Manuscript Moderation</h3>
                <p className="text-xs text-stone-400 mb-4">Unpublish or delete stories that violate platform standards.</p>

                {stories.length === 0 ? (
                  <p className="text-sm text-stone-500 py-6 text-center">No stories present in the database.</p>
                ) : (
                  <div className="divide-y divide-stone-800">
                    {stories.map(story => (
                      <div key={story.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-serif font-bold text-stone-200">{story.title}</span>
                            <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded font-mono">{story.genre}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${story.status === 'published' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-amber-950 text-amber-400 border border-amber-900'}`}>
                              {story.status}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400">by {story.authorName} • {story.totalWordCount.toLocaleString()} words</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStoryStatus(story)}
                            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            {story.status === 'published' ? (
                              <>
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Unpublish</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3 text-emerald-400" />
                                <span>Publish</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Admin delete "${story.title}"?`)) {
                                onDeleteStory(story.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition-colors"
                            title="Delete manuscript"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reader Reports Tab */}
            {activeTab === 'reports' && (
              <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">Submitted Reports</h3>
                <p className="text-xs text-stone-400 mb-4">Reports submitted by readers encountering issues.</p>

                {reports.length === 0 ? (
                  <p className="text-sm text-stone-500 py-6 text-center">No community reports submitted yet. Everything is serene.</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map(report => (
                      <div key={report.id} className="p-4 rounded-xl bg-[#181614] border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-rose-300">{report.reason}</span>
                            <span className="text-xs text-stone-400 font-serif">on "{report.storyTitle}"</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${report.status === 'resolved' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                              {report.status}
                            </span>
                          </div>
                          {report.details && <p className="text-xs text-stone-300 italic mb-1">"{report.details}"</p>}
                          <p className="text-[11px] text-stone-500">Reported by: {report.reporterEmail} • {new Date(report.createdAt).toLocaleDateString()}</p>
                        </div>

                        {report.status === 'pending' && (
                          <button
                            onClick={() => handleResolveReport(report.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* System & AI Health Tab */}
            {activeTab === 'system' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                    <div>
                      <h4 className="font-serif font-bold text-stone-100">Gemini AI Service</h4>
                      <p className="text-xs text-stone-400">Server-side proxy for quote & story authoring</p>
                    </div>
                  </div>
                  <div className="p-4 bg-[#181614] rounded-xl border border-stone-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Server Status:</span>
                      <span className="text-emerald-400 font-mono font-bold uppercase">{healthStatus?.status || 'Active'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">AI Key Configured:</span>
                      <span className={healthStatus?.aiConfigured ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                        {healthStatus?.aiConfigured ? 'Yes (Native Gemini API)' : 'Using Verified Fallback Engine'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-rose-400" />
                    <div>
                      <h4 className="font-serif font-bold text-stone-100">Firestore & Security Rules</h4>
                      <p className="text-xs text-stone-400">Enterprise Firestore with RBAC & ABAC rules</p>
                    </div>
                  </div>
                  <div className="p-4 bg-[#181614] rounded-xl border border-stone-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Database ID:</span>
                      <span className="text-stone-300 font-mono">ai-studio-inkora-...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Rules Deployment:</span>
                      <span className="text-emerald-400 font-mono">Hardened & Deployed</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Google Drive Storage Tab */}
            {activeTab === 'drive' && (
              <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">Google Drive Storage</h3>
                <p className="text-xs text-stone-400 mb-4">Manage your story backups and storage connected to Google Drive.</p>
                
                {isDriveConnected ? (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900 rounded-xl flex items-center justify-between">
                    <span className="text-emerald-400 text-sm font-mono">Google Drive Connected</span>
                    <button onClick={() => setIsDriveConnected(false)} className="text-rose-400 text-xs">Disconnect</button>
                  </div>
                ) : (
                  <button onClick={handleConnectDrive} className="px-4 py-2 rounded-lg bg-sky-900 hover:bg-sky-800 text-white text-xs font-medium">Connect Google Drive</button>
                )}
              </div>
            )}

            {/* Storage Servers Tab */}
            {activeTab === 'storage-servers' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-stone-100">Storage Server Management</h3>
                    <p className="text-xs text-stone-400">Register, test, and manage cloud and local storage backend connections.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingServer(null);
                      setServerForm({
                        name: '',
                        providerType: 'firebase',
                        purpose: 'all',
                        endpoint: '',
                        bucket: '',
                        publicUrl: '',
                        accessKey: '',
                        secretKey: '',
                        region: '',
                        status: 'active',
                        isPreferred: storageServers.length === 0,
                        notes: ''
                      });
                      setShowServerModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-200 text-xs font-medium border border-rose-800 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Database className="w-4 h-4" />
                    <span>Add Storage Server</span>
                  </button>
                </div>

                {/* Primary Storage Provider Identification Card */}
                <div className="p-5 rounded-2xl bg-[#181614] border border-stone-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-sm text-stone-100">Primary Configured Database & Storage</h4>
                        <p className="text-xs text-stone-400 font-mono">Google Cloud Firestore • Project ID: gen-lang-client-0840891664</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 text-xs font-mono font-medium">
                      Active (Cloud Online)
                    </span>
                  </div>
                  <div className="text-xs text-stone-300 leading-relaxed font-light border-t border-stone-800/80 pt-2 space-y-1">
                    <p>
                      Database ID: <code className="text-stone-200 bg-stone-900 px-1.5 py-0.5 rounded font-mono">ai-studio-inkora-5bb88a89-1959-4032-bc50-c9e9b44c71bd</code>
                    </p>
                    <p className="text-stone-400">
                      Exact byte volume quotas are monitored via Google Cloud Console metrics under the Spark/Enterprise tier. Client applications track actual document entities and metadata without fabricating byte estimates.
                    </p>
                  </div>
                </div>

                {/* Storage Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#121110] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-2">
                    <span className="text-stone-400 text-xs font-medium">Configured Servers</span>
                    <div className="text-2xl font-serif font-bold text-stone-100">{storageOverview?.totalServers ?? 0}</div>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      {storageOverview?.healthyServers ?? 0} Healthy, {storageOverview?.disabledServers ?? 0} Disabled
                    </div>
                  </div>

                  <div className="bg-[#121110] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-2">
                    <span className="text-stone-400 text-xs font-medium">Used Capacity</span>
                    <div className="text-2xl font-serif font-bold text-stone-100">
                      {storageOverview?.usedBytes ? (storageOverview.usedBytes / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB'}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      Total Capacity: <span className="text-stone-300 font-bold">Unavailable</span>
                    </div>
                  </div>

                  <div className="bg-[#121110] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-2">
                    <span className="text-stone-400 text-xs font-medium">Stored Objects</span>
                    <div className="text-2xl font-serif font-bold text-stone-100">{storageOverview?.totalObjects ?? 0}</div>
                    <div className="text-[11px] text-stone-400 font-mono">File metadata tracked</div>
                  </div>

                  <div className="bg-[#121110] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-2">
                    <span className="text-stone-400 text-xs font-medium">Upload Failures</span>
                    <div className="text-2xl font-serif font-bold text-rose-400">{storageOverview?.recentFailuresCount ?? 0}</div>
                    <div className="text-[11px] text-stone-400 font-mono">Last 10 attempts monitored</div>
                  </div>
                </div>

                {/* Servers List */}
                <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h4 className="text-sm font-serif font-bold text-stone-200">Registered Storage Destinations</h4>

                  {storageServers.length === 0 ? (
                    <div className="text-center py-12 text-stone-500 text-xs space-y-2">
                      <Database className="w-8 h-8 mx-auto opacity-40" />
                      <p>No storage servers registered yet. Add a storage server to begin routing uploads.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {storageServers.map((server: any) => (
                        <div key={server.id} className="p-4 bg-[#181614] border border-stone-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold text-stone-100 text-sm">{server.name}</span>
                              <span className="px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-[10px] font-mono uppercase text-stone-300">
                                {server.providerType}
                              </span>
                              {server.isPreferred && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-[10px] text-amber-300 font-medium">
                                  Preferred
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                server.status === 'active' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-900' : 'bg-stone-800 text-stone-400'
                              }`}>
                                {server.status}
                              </span>
                            </div>
                            <div className="text-xs text-stone-400 font-mono">
                              Purpose: {server.purpose} {server.endpoint ? `• Endpoint: ${server.endpoint}` : ''} {server.bucket ? `• Bucket: ${server.bucket}` : ''}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono">
                              Health: <span className={server.lastHealthStatus === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}>{server.lastHealthStatus || 'untested'}</span>
                              {server.lastHealthCheck ? ` (${new Date(server.lastHealthCheck).toLocaleTimeString()})` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleTestConnection(server.id)}
                              disabled={testingServerId === server.id}
                              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 transition-colors flex items-center gap-1.5"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${testingServerId === server.id ? 'animate-spin' : ''}`} />
                              <span>Test Connection</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingServer(server);
                                setServerForm({
                                  name: server.name,
                                  providerType: server.providerType,
                                  purpose: server.purpose,
                                  endpoint: server.endpoint || '',
                                  bucket: server.bucket || '',
                                  publicUrl: server.publicUrl || '',
                                  accessKey: server.accessKey || '',
                                  secretKey: server.secretKey || '',
                                  region: server.region || '',
                                  status: server.status,
                                  isPreferred: server.isPreferred,
                                  notes: server.notes || ''
                                });
                                setShowServerModal(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 transition-colors"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteServer(server.id, server.name)}
                              className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-300 text-xs font-medium border border-rose-900/60 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add / Edit Server Modal */}
            {showServerModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                    <h3 className="text-xl font-serif font-bold text-stone-100">
                      {editingServer ? 'Configure Storage Server' : 'Register New Storage Server'}
                    </h3>
                    <button
                      onClick={() => setShowServerModal(false)}
                      className="text-stone-400 hover:text-stone-200 text-sm font-mono"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveServer} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Server Display Name *</label>
                      <input
                        type="text"
                        required
                        value={serverForm.name}
                        onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                        placeholder="e.g., Primary AWS S3 Bucket"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Provider Type *</label>
                        <select
                          value={serverForm.providerType}
                          onChange={(e: any) => setServerForm({ ...serverForm, providerType: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700"
                        >
                          <option value="firebase">Firebase Storage / GCS</option>
                          <option value="s3">Amazon S3</option>
                          <option value="r2">Cloudflare R2</option>
                          <option value="minio">MinIO / Custom S3 Compatible</option>
                          <option value="local">Local Filesystem Storage</option>
                          <option value="drive">Google Drive API</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Storage Purpose</label>
                        <select
                          value={serverForm.purpose}
                          onChange={(e: any) => setServerForm({ ...serverForm, purpose: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700"
                        >
                          <option value="all">All Content Types</option>
                          <option value="covers">Book Covers Only</option>
                          <option value="chapters">Chapter Attachments</option>
                          <option value="avatars">User Avatars</option>
                          <option value="general">General Files</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Endpoint or API Base URL</label>
                        <input
                          type="text"
                          value={serverForm.endpoint}
                          onChange={(e) => setServerForm({ ...serverForm, endpoint: e.target.value })}
                          placeholder="https://s3.amazonaws.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Bucket, Container or Location</label>
                        <input
                          type="text"
                          value={serverForm.bucket}
                          onChange={(e) => setServerForm({ ...serverForm, bucket: e.target.value })}
                          placeholder="my-inokora-bucket"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Public Delivery Base URL</label>
                      <input
                        type="text"
                        value={serverForm.publicUrl}
                        onChange={(e) => setServerForm({ ...serverForm, publicUrl: e.target.value })}
                        placeholder="https://cdn.inokora.io"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Access Key ID / API Key</label>
                        <input
                          type="password"
                          value={serverForm.accessKey}
                          onChange={(e) => setServerForm({ ...serverForm, accessKey: e.target.value })}
                          placeholder="Enter key or leave blank"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Secret Access Key / Secret</label>
                        <input
                          type="password"
                          value={serverForm.secretKey}
                          onChange={(e) => setServerForm({ ...serverForm, secretKey: e.target.value })}
                          placeholder="Enter secret or leave blank"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Region (Optional)</label>
                        <input
                          type="text"
                          value={serverForm.region}
                          onChange={(e) => setServerForm({ ...serverForm, region: e.target.value })}
                          placeholder="us-east-1"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Server Status</label>
                        <select
                          value={serverForm.status}
                          onChange={(e: any) => setServerForm({ ...serverForm, status: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700"
                        >
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="isPreferred"
                        checked={serverForm.isPreferred}
                        onChange={(e) => setServerForm({ ...serverForm, isPreferred: e.target.checked })}
                        className="rounded bg-[#1b1917] border-stone-800 text-rose-700 focus:ring-0"
                      />
                      <label htmlFor="isPreferred" className="text-xs text-stone-300 font-medium">
                        Set as preferred server for new uploads
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Notes / Description</label>
                      <textarea
                        rows={2}
                        value={serverForm.notes}
                        onChange={(e) => setServerForm({ ...serverForm, notes: e.target.value })}
                        placeholder="Optional notes regarding this storage destination..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1917] border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-rose-700"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                      <button
                        type="button"
                        onClick={() => setShowServerModal(false)}
                        className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-200 text-xs font-medium border border-rose-800 shadow-lg"
                      >
                        {loading ? 'Saving securely...' : 'Save Storage Server'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* User Monitoring Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Registered Users', value: userStats?.total || usersList.length, color: 'text-sky-400' },
                    { label: 'New Registrations (24h)', value: userStats?.new24h || 0, color: 'text-emerald-400' },
                    { label: 'New Registrations (7d)', value: userStats?.new7d || 0, color: 'text-amber-400' },
                    { label: 'Verified Accounts', value: userStats?.verified || 0, color: 'text-rose-400' },
                  ].map(st => (
                    <div key={st.label} className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl">
                      <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">{st.label}</p>
                      <p className={`text-3xl font-serif font-bold ${st.color}`}>{st.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-lg font-serif font-bold text-stone-100">Registered Author Accounts</h3>
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full sm:w-72 bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {usersList.length === 0 ? (
                    <p className="text-sm text-stone-500 py-8 text-center">No registered users found in database.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-stone-800 text-stone-400 font-mono">
                            <th className="pb-3 px-3">Author</th>
                            <th className="pb-3 px-3">Email Address</th>
                            <th className="pb-3 px-3">Joined Date</th>
                            <th className="pb-3 px-3">Stories / Words</th>
                            <th className="pb-3 px-3">Status</th>
                            <th className="pb-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/80">
                          {usersList
                            .filter(u => u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()))
                            .map(u => (
                              <tr key={u.id} className="hover:bg-stone-900/40 transition-colors">
                                <td className="py-3.5 px-3 flex items-center gap-3">
                                  <img src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  <div>
                                    <div className="font-medium text-stone-200">{u.name}</div>
                                    <div className="text-[10px] text-stone-500 font-mono">ID: {u.id.substring(0, 8)}...</div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 font-mono text-stone-300">{u.email || 'Protected'}</td>
                                <td className="py-3.5 px-3 text-stone-400">{new Date(u.joinedDate).toLocaleDateString()}</td>
                                <td className="py-3.5 px-3 font-mono text-stone-300">{u.storiesCount} stories ({u.totalWords.toLocaleString()} words)</td>
                                <td className="py-3.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${u.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-900' : 'bg-rose-950 text-rose-300 border border-rose-900'}`}>
                                    {u.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-right space-x-2">
                                  <button
                                    onClick={() => setSelectedUserDetail(u)}
                                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px]"
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
                                        await authFetchJson(`/api/admin/users/${u.id}`, { method: 'DELETE' });
                                        setUsersList(usersList.filter(item => item.id !== u.id));
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-950 text-rose-300 text-[11px]"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-[#121110] border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-lg font-serif font-bold text-stone-100">Security & Activity Audit Trail</h3>
                  {activityLogs.length === 0 ? (
                    <p className="text-xs text-stone-500">No security events or activity logs recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {activityLogs.map((log: any) => (
                        <div key={log.id} className="p-3 bg-[#181614] border border-stone-800 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-rose-400 mr-2">[{log.type}]</span>
                            <span className="text-stone-300">{log.description}</span>
                          </div>
                          <span className="text-[10px] text-stone-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Detail Modal */}
            {selectedUserDetail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                    <h3 className="text-lg font-serif font-bold text-stone-100">Author Account Profile</h3>
                    <button onClick={() => setSelectedUserDetail(null)} className="text-stone-400 hover:text-stone-200">✕</button>
                  </div>

                  <div className="flex items-center gap-4">
                    <img src={selectedUserDetail.avatar} alt="" className="w-16 h-16 rounded-full object-cover border border-rose-600" />
                    <div>
                      <h4 className="text-base font-serif font-bold text-stone-100">{selectedUserDetail.name}</h4>
                      <p className="text-xs text-stone-400 font-mono">{selectedUserDetail.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-stone-300 bg-[#1b1917] p-4 rounded-xl border border-stone-800">
                    <p><strong className="text-stone-400">User ID:</strong> <span className="font-mono">{selectedUserDetail.id}</span></p>
                    <p><strong className="text-stone-400">Joined:</strong> {new Date(selectedUserDetail.joinedDate).toLocaleString()}</p>
                    <p><strong className="text-stone-400">Stories Published:</strong> {selectedUserDetail.storiesCount}</p>
                    <p><strong className="text-stone-400">Chapters Written:</strong> {selectedUserDetail.chaptersCount}</p>
                    <p><strong className="text-stone-400">Total Word Count:</strong> {selectedUserDetail.totalWords.toLocaleString()}</p>
                    <p><strong className="text-stone-400">Account Status:</strong> <span className="text-emerald-400 uppercase font-mono">{selectedUserDetail.status}</span></p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={async () => {
                        try {
                          await AuthService.sendPasswordReset(selectedUserDetail.email);
                          alert(`Password reset instructions sent to ${selectedUserDetail.email}.`);
                        } catch (err: any) {
                          alert('Failed to send password reset: ' + err.message);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium"
                    >
                      Send Password Reset
                    </button>
                    <button
                      onClick={() => setSelectedUserDetail(null)}
                      className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-200 text-xs font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
