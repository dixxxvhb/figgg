import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, firebaseConfigured } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const FALLBACK_LINES = [
  "oh hey, it's you again",
  "the app that does too much",
  "you built this instead of sleeping",
  "hello, literally just Dixon",
  "still not a real app",
];

function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('bowles.dixon@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [roast] = useState(() => {
    const cached = localStorage.getItem('figgg_login_roast');
    if (cached) return cached;
    return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setError('nope, try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] px-4 animate-[fade-in_0.4s_ease-out]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">figgg</h1>
          <p className="text-[var(--text-tertiary)] mt-3 text-sm italic leading-relaxed max-w-[280px] mx-auto">
            {roast}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface-card)] text-[var(--text-primary)]
                       placeholder-[var(--text-tertiary)] border border-[var(--border-subtle)]
                       focus:border-[var(--accent-primary)] focus:outline-none transition-colors text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            autoComplete="current-password"
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface-card)] text-[var(--text-primary)]
                       placeholder-[var(--text-tertiary)] border border-[var(--border-subtle)]
                       focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
          />

          {error && (
            <p className="text-[var(--status-danger)] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold
                       hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'one sec...' : 'let me in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">figgg</h1>
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Require login when Firebase is configured
  if (firebaseConfigured && !user) {
    return (
      <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
        <LoginScreen />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
