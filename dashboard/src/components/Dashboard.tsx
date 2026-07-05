import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import { callLocalApi } from '../lib/api';

interface ServerStatus {
  tunnel_url: string;
  auth_token: string;
  host_device: string;
  status: string;
  player_count: number;
  recent_logs: string;
  updated_at: string;
}

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [actioning, setActioning] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) { setCheckingAuth(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
      setCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as any);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;

    fetchStatus();
    const sub = supabase
      .channel('server_status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'server_status' },
        (payload) => setStatus(payload.new as ServerStatus)
      )
      .subscribe();

    const poll = setInterval(fetchStatus, 15000);

    return () => {
      sub.unsubscribe();
      clearInterval(poll);
    };
  }, [session]);

  async function fetchStatus() {
    if (!supabase) return;
    const { data } = await supabase
      .from('server_status')
      .select('*')
      .eq('id', 1)
      .single();
    if (data) setStatus(data as ServerStatus);
  }

  const doAction = useCallback(async (action: string) => {
    if (!status?.tunnel_url || !status?.auth_token) {
      setActionMsg('Set tunnel URL and auth token in Settings first.');
      return;
    }

    let endpoint = '';
    if (action === 'start') endpoint = '/start';
    else if (action === 'stop') endpoint = '/stop';
    else if (action === 'restart') endpoint = '/restart';

    setActioning(action);
    setActionMsg('');

    try {
      const result = await callLocalApi(endpoint, 'POST', status.tunnel_url, status.auth_token);
      setActionMsg(result.message || action + ' command sent');
    } catch (err: any) {
      setActionMsg('Error: ' + (err.message || 'Could not reach the host device'));
    } finally {
      setActioning('');
    }
  }, [status]);

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  if (checkingAuth) return null;
  if (!session) {
    window.location.href = '/login';
    return null;
  }

  const logs = status?.recent_logs
    ? status.recent_logs.split('\n').filter(Boolean)
    : [];

  const isRunning = status?.status === 'on';
  const lastUpdated = status?.updated_at
    ? new Date(status.updated_at + 'Z').toLocaleTimeString()
    : '--';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>MC Bedrock Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/settings" style={{ color: '#1976d2' }}>Settings</a>
          <button onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{
        border: '1px solid #ccc', borderRadius: 8, padding: 16, marginTop: 16,
        backgroundColor: isRunning ? '#e8f5e9' : '#fafafa',
      }}>
        <h2 style={{ margin: 0 }}>
          Server: <span style={{ color: isRunning ? '#2e7d32' : '#c62828' }}>
            {status?.status || 'unknown'}
          </span>
        </h2>
        <p style={{ margin: '8px 0' }}>
          Host: {status?.host_device || '--'} &nbsp;|&nbsp;
          Players: {status?.player_count ?? '--'} &nbsp;|&nbsp;
          Last updated: {lastUpdated}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        {['start', 'stop', 'restart'].map((action) => (
          <button
            key={action}
            onClick={() => doAction(action)}
            disabled={actioning === action}
            style={{
              padding: '10px 24px', fontSize: 16, cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {actioning === action ? '...' : action}
          </button>
        ))}
      </div>
      {actionMsg && (
        <p style={{ marginTop: 8, color: actionMsg.startsWith('Error') ? '#d32f2f' : '#1976d2' }}>
          {actionMsg}
        </p>
      )}

      {status?.tunnel_url && (
        <p style={{ marginTop: 12 }}>
          Tunnel: <code>{status.tunnel_url}</code>
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <h3>Recent Logs</h3>
        <div
          style={{
            background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 6,
            fontFamily: 'monospace', fontSize: 13, maxHeight: 400, overflowY: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: '#888' }}>No logs yet.</span>
          ) : (
            logs.map((line, i) => <div key={i}>{line}</div>)
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
