import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

type AuthTab = 'login' | 'register' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const mapAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication > Sign-in method > Email/Password). Use "Continue with Google" below for instant login, or enable Email/Password in your Firebase Console.';
    }
    if (code === 'auth/popup-closed-by-user') return 'Sign-in popup was closed before completing.';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Invalid email or password.';
    if (code === 'auth/email-already-in-use') return 'An account with this email already exists.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    return err instanceof Error ? err.message : 'Authentication failed.';
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess('Signed in with Google.');
      onClose();
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (tab === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setInfoMsg('Verification email sent. Please verify your email address before saving profiles.');
        } else {
          onSuccess('Logged in successfully.');
          onClose();
        }
      } else if (tab === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 60) });
        }
        await sendEmailVerification(cred.user);
        setInfoMsg('Account created. A verification link has been sent to your email address.');
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setInfoMsg('Password reset instructions have been sent to your email.');
      }
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md surface-panel rounded-2xl p-6 space-y-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">HEADSHOT LAB Account</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Save sensitivity profiles, track calibration iterations, and sync across devices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <div className="flex-1 h-px bg-white/10" />
          <span>or email credentials</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/50 border border-white/10">
          {(['login', 'register', 'reset'] as AuthTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors capitalize cursor-pointer ${
                tab === t ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t === 'reset' ? 'Reset' : t === 'register' ? 'Register' : 'Log In'}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-lg bg-violet-950/60 border border-violet-500/40 text-xs text-violet-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Player Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="In-game tag or name"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading
              ? 'Processing...'
              : tab === 'login'
              ? 'Log In'
              : tab === 'register'
              ? 'Create Account'
              : 'Send Reset Email'}
          </button>
        </form>
      </div>
    </div>
  );
};
