 'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';

type Org = {
  id: string;
  name: string;
  created_at: string;
};

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadOrgs = async () => {
    setErr(null);
    const { data, error } = await supabase
      .from('organizations')
      .select('id,name,created_at')
      .order('created_at', { ascending: false });

    if (error) setErr(error.message);
    else setOrgs(data || []);
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const createOrg = async () => {
    setErr(null);
    setMsg(null);
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        setErr('Not signed in.');
        return;
      }

      const { error } = await supabase
        .from('organizations')
        .insert([{ name: name.trim(), created_by: userId }]);

      if (error) setErr(error.message);
      else {
        setName('');
        setMsg('Organization created.');
        await loadOrgs();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Organizations</h1>

        <div className="rounded-xl border bg-white p-4 shadow mb-6">
          <label className="block text-sm font-medium">
            Organization name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maple Health"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </label>
          <button
            onClick={createOrg}
            disabled={loading || !name.trim()}
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create organization'}
          </button>

          {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </div>

        <h2 className="text-lg font-medium mb-2">Your organizations</h2>
        <div className="space-y-2">
          {orgs.length === 0 ? (
            <p className="text-sm text-gray-600">None yet.</p>
          ) : (
            orgs.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border bg-white p-3 text-sm flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{o.name}</div>
                  <div className="text-gray-500 text-xs">{o.id}</div>
                </div>
                <a
                  href={`/projects?org=${o.id}`}
                  className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                >
                  Open projects →
                </a>
              </div>
            ))
          )}
        </div>

        <div className="pt-6">
          <a href="/" className="text-xs text-gray-500 hover:underline">
            ← Back to Home
          </a>
        </div>
      </main>
    </AuthGuard>
  );
}
