 'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = { children: React.ReactNode };

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth session error:', error.message);
      }
      const hasSession = Boolean(data.session);
      if (!hasSession) {
        router.replace('/login');
      } else {
        setAuthed(true);
      }
      if (mounted) setChecking(false);
    })();

    // React to auth state changes (sign-in/out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const signedIn = Boolean(session);
      setAuthed(signedIn);
      if (!signedIn) router.replace('/login');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Checking session…
      </div>
    );
  }

  if (!authed) {
    // We’re redirecting; render nothing to avoid flicker
    return null;
  }

  return <>{children}</>;
}
