 'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';

type Project = {
  id: string;
  name: string;
  pii_level: 'none' | 'low' | 'medium' | 'high';
  status: 'active' | 'archived';
  created_at: string;
};

function ProjectsPageContent() {
  const params = useSearchParams();
  const orgId = useMemo(() => params.get('org') || '', [params]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [pii, setPii] = useState<Project['pii_level']>('low');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadProjects = async () => {
    setErr(null);
    if (!orgId) return;
    const { data, error } = await supabase
      .from('projects')
      .select('id,name,pii_level,status,created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) setErr(error.message);
    else setProjects((data || []) as Project[]);
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const createProject = async () => {
    setErr(null);
    setMsg(null);
    if (!orgId) {
      setErr('Missing org id. Open this page via the Organizations screen.');
      return;
    }
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        setErr('Not signed in.');
        return;
      }

      const { error } = await supabase.from('projects').insert([
        {
          org_id: orgId,
          name: name.trim(),
          pii_level: pii,
          status: 'active',
          created_by: userId,
        },
      ]);

      if (error) {
        setErr(error.message);
      } else {
        setName('');
        setPii('low');
        setMsg('Project created.');
        await loadProjects();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Projects</h1>

      {!orgId ? (
        <div className="rounded-xl border bg-white p-4 shadow">
          <p className="text-sm text-red-600 mb-2">No organization selected.</p>
          <a href="/orgs" className="text-sm underline">
            Go back to Organizations →
          </a>
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-white p-4 shadow mb-6">
            <h2 className="text-lg font-medium mb-3">Create a project</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Project name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Clinical Text Labeling"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </label>

              <label className="block text-sm font-medium">
                PII level
                <select
                  value={pii}
                  onChange={(e) =>
                    setPii(e.target.value as Project['pii_level'])
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                >
                  <option value="none">none</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
            </div>

            <button
              onClick={createProject}
              disabled={loading || !name.trim()}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>

            {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          </div>

          <h2 className="text-lg font-medium mb-2">Projects in this org</h2>
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="text-sm text-gray-600">None yet.</p>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border bg-white p-3 text-sm flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-gray-500 text-xs">
                      {p.pii_level} • {p.status} • {p.id}
                    </div>
                  </div>
                  <a
                    href={`/upload?project=${p.id}`}
                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                  >
                    Open →
                  </a>
                </div>
              ))
            )}
          </div>

          <div className="pt-6">
            <a href="/orgs" className="text-xs text-gray-500 hover:underline">
              ← Back to Organizations
            </a>
          </div>
        </>
      )}
    </main>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading projects...</div>}>
        <ProjectsPageContent />
      </Suspense>
    </AuthGuard>
  );
}
