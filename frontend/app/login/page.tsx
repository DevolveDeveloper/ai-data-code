 'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check current session on load
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const currentEmail = data.session?.user?.email ?? null;
      setUserEmail(currentEmail);

      // Listen for auth state changes (e.g., after magic link)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      });

      return () => subscription.unsubscribe();
    })();
  }, []);

  const sendMagicLink = async () => {
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setStatus('Check your email for a magic login link.');
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    await supabase.auth.signOut();
    setUserEmail(null);
    setLoading(false);
  };

  // Simple UI with Tailwind
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

        {userEmail ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              You are signed in as <span className="font-medium">{userEmail}</span>.
            </p>
            <div className="flex gap-2">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Go to Home
              </a>
              <button
                onClick={signOut}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {loading ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </label>

            <button
              onClick={sendMagicLink}
              disabled={loading || !email}
              className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>

            {status && <p className="text-sm text-green-700">{status}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <div className="pt-6">
          <a href="/" className="text-xs text-gray-500 hover:underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
