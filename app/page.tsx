'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, TopBar } from '@/components/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to today page
    router.push('/today');
  }, [router]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto bg-background">
          {/* Loading state */}
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">Loading LifeOS...</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
