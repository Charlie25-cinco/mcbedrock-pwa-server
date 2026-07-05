import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/config';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/';
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Supabase not configured.'); return; }
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

  async function handleSignUp() {
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      setLoading(false);

      if (!res.ok) {
        setError(data.msg || data.error_description || data.error || 'Sign up failed');
      } else {
        setError('Check your email for the confirmation link, then log in.');
      }
    } catch {
      setLoading(false);
      setError('Network error: could not reach Supabase');
    }
  }

  if (!supabase) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1>MC Bedrock Dashboard</h1>
        <p style={{ color: '#d32f2f' }}>Supabase not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>MC Bedrock Dashboard</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10, fontSize: 16 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 16px', fontSize: 16, cursor: 'pointer' }}
        >
          {loading ? 'Loading...' : 'Log In'}
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          style={{ padding: '10px 16px', fontSize: 16, cursor: 'pointer' }}
        >
          Sign Up
        </button>
      </form>
      {error && <p style={{ color: '#d32f2f', marginTop: 16 }}>{error}</p>}
    </div>
  );
}
