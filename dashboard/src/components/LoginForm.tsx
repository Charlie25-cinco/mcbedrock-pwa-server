import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

export default function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/';
    });
  }, []);

  async function handleFacebookSignIn() {
    if (!supabase) { setError('Supabase not configured.'); return; }
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (!supabase) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1>MC Bedrock Dashboard</h1>
        <p style={{ color: '#d32f2f' }}>Supabase not configured.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ marginBottom: 24 }}>MC Bedrock Dashboard</h1>
      <button
        onClick={handleFacebookSignIn}
        disabled={loading}
        style={{
          padding: '12px 32px', fontSize: 16, cursor: 'pointer',
          background: '#fff', border: '1px solid #ccc', borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
          {loading ? 'Redirecting...' : 'Sign in with Facebook'}
      </button>
      {error && <p style={{ color: '#d32f2f', marginTop: 16 }}>{error}</p>}
    </div>
  );
}
