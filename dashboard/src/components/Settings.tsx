import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

export default function Settings() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [hostDevice, setHostDevice] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) { setCheckingAuth(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;

    supabase
      .from('server_status')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setTunnelUrl(data.tunnel_url || '');
          setAuthToken(data.auth_token || '');
          setHostDevice(data.host_device || '');
        }
      });
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage('Supabase not configured.'); return; }
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('server_status')
      .update({
        tunnel_url: tunnelUrl,
        auth_token: authToken,
        host_device: hostDevice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    setSaving(false);

    if (error) {
      setMessage('Error saving: ' + error.message);
    } else {
      setMessage('Settings saved.');
    }
  }

  if (checkingAuth) return null;
  if (!session) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Settings</h1>
        <a href="/" style={{ color: '#1976d2' }}>Dashboard</a>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <div>
          <label>Tunnel URL</label>
          <input
            type="url"
            value={tunnelUrl}
            onChange={(e) => setTunnelUrl(e.target.value)}
            placeholder="https://your-tunnel-url.example.com"
            style={{ width: '100%', padding: 10, fontSize: 16, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label>API Auth Token</label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="The API_AUTH_TOKEN from your local API"
            style={{ width: '100%', padding: 10, fontSize: 16, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label>Host Device Label</label>
          <input
            type="text"
            value={hostDevice}
            onChange={(e) => setHostDevice(e.target.value)}
            placeholder="e.g. Android (Termux)"
            style={{ width: '100%', padding: 10, fontSize: 16, boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{ padding: '10px 16px', fontSize: 16, cursor: 'pointer' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 12, color: message.startsWith('Error') ? '#d32f2f' : '#2e7d32' }}>
          {message}
        </p>
      )}
    </div>
  );
}
