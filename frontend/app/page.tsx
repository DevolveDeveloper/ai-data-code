 // frontend/app/page.tsx
'use client';

import AuthGuard from '@/components/AuthGuard';

export default function Home() {
  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to the Canadian AI Platform 🇨🇦</h1>
        <p className="text-gray-600 mb-8">
          You are signed in. Protected pages will use this same guard.
        </p>
      </main>
    </AuthGuard>
  );
}
