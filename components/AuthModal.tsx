'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    const action =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error: authError } = await action;

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    onClose();
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="badge" style={{ marginBottom: 12 }}>Sign in to continue</div>
            <h2 style={{ margin: 0, fontSize: 28 }}>
              {mode === 'login' ? 'Welcome back to MealMagic' : 'Create your MealMagic account'}
            </h2>
            <p className="small" style={{ marginTop: 8 }}>
              Save your household, build personalised weekly plans, and keep your recipes and shopping lists together.
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose} aria-label="Close sign in dialog">
            <X size={18} />
          </button>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Create account
          </button>
        </div>

        <div className="list">
          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="btn btn-primary" type="button" onClick={submit} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
