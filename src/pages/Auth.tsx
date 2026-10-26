import React, { useState } from 'react';
import { BookOpen, ArrowRight, Shield, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { AuthService } from '../services/firebase';
import { Logo } from '../components/Logo';

interface AuthProps {
  onSuccess: (user: User) => void;
  onCancel?: () => void;
  currentUser: User;
  intentMessage?: string;
  initialMode?: 'signin' | 'signup';
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, onCancel, currentUser, intentMessage, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email or password. Please double check and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account already exists with this email address. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was cancelled.';
    }
    return err?.message || 'Authentication failed. Please check your credentials.';
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const { profile } = await AuthService.signInWithGoogle();
      onSuccess(profile);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return;
      }
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your account email address.');
        return;
      }
      setLoading(true);
      try {
        await AuthService.sendPasswordReset(email.trim());
        setSuccessMsg(`Password reset instructions have been sent to ${email.trim()}.`);
      } catch (err: any) {
        setError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please provide an author name or pseudonym.');
        return;
      }
      if (password.length < 6) {
        setError('Password must contain at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agreeTerms) {
        setError('Please agree to the Community Guidelines and Terms.');
        return;
      }

      setLoading(true);
      try {
        const { profile } = await AuthService.signUpWithEmail(email.trim(), password, name.trim());
        onSuccess(profile);
      } catch (err: any) {
        setError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // mode === 'signin'
    if (!email.trim() || !password) {
      setError('Please provide your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const { profile } = await AuthService.signInWithEmail(email.trim(), password);
      onSuccess(profile);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md bg-[#121110] border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-rose-950/30 rounded-full blur-3xl pointer-events-none" />

        {/* Back link */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sanctuary</span>
          </button>
        )}

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showTagline={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
            {mode === 'signup' && 'Join INOKORA'}
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">
            {mode === 'signup' && 'Create your author identity and publish stories to the world.'}
            {mode === 'signin' && 'Access your manuscripts, bookshelf, and drafts.'}
            {mode === 'forgot' && 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {/* Intent Callout Banner */}
        {intentMessage && (
          <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-rose-200 text-xs flex items-center gap-2.5 shadow-lg">
            <BookOpen className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="leading-relaxed">{intentMessage}</span>
          </div>
        )}

        {/* Status Banners */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode !== 'forgot' && (
          <div className="space-y-4 mb-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#1c1917] hover:bg-stone-800 text-stone-200 font-medium text-xs sm:text-sm border border-stone-800 flex items-center justify-center gap-2.5 transition-all shadow-md disabled:opacity-50"
            >
              <Shield className="w-4 h-4 text-rose-400" />
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-800"></div>
              <span className="flex-shrink mx-4 text-stone-500 text-[11px] uppercase tracking-wider font-mono">or with email</span>
              <div className="flex-grow border-t border-stone-800"></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                Author Display Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Julian Hayes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="author@inokora.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 rounded bg-[#1c1917] border-stone-800 text-rose-600 focus:ring-0"
              />
              <label htmlFor="terms" className="text-xs text-stone-400 cursor-pointer">
                I agree to the INOKORA Author Code of Conduct and original content policy.
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'signup' ? (
              <>
                <span>Create Author Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In to INOKORA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-800 text-center text-xs text-stone-400">
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
                className="text-rose-400 font-medium hover:underline"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'signin' && (
            <p>
              New storyteller?{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                className="text-rose-400 font-medium hover:underline"
              >
                Join INOKORA
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p>
              Remembered your credentials?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
                className="text-rose-400 font-medium hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
