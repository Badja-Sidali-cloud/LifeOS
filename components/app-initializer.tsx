'use client';

import { useEffect, useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { startAlarmWatcher, rescheduleAll, pingServiceWorker } from '@/lib/alarms';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const hydrate = useLifeOsStore((state) => state.hydrate);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await hydrate();
      } catch (error) {
        console.error('[v0] Failed to hydrate store:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [hydrate]);

  // Start alarm watcher once app is initialized
  useEffect(() => {
    if (!isInitialized) return;
    rescheduleAll().catch(() => {});
    startAlarmWatcher();
    pingServiceWorker();
  }, [isInitialized]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="mb-4 text-foreground text-lg font-medium">Initializing LifeOS...</div>
          <div className="flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
