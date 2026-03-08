'use client';

import { useState, useEffect } from 'react';
import { useLifeOsStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const settings = useLifeOsStore((state) => state.settings);
  const updateSettings = useLifeOsStore((state) => state.updateSettings);
  const isLoading = useLifeOsStore((state) => state.isLoading);

  // State for form fields
  const [fajrTime, setFajrTime] = useState('');
  const [dhuhrTime, setDhuhrTime] = useState('');
  const [asrTime, setAsrTime] = useState('');
  const [maghrebTime, setMaghrebTime] = useState('');
  const [ishaTime, setIshaTime] = useState('');
  const [nzdThreshold, setNzdThreshold] = useState('30');
  const [fallbackTyping, setFallbackTyping] = useState('10');
  const [fallbackQuran, setFallbackQuran] = useState('20');
  const [theme, setTheme] = useState('dark');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      setFajrTime(settings.fajrTime || '');
      setDhuhrTime(settings.dhuhrTime || '');
      setAsrTime(settings.asrTime || '');
      setMaghrebTime(settings.maghrebTime || '');
      setIshaTime(settings.ishaTime || '');
      setNzdThreshold(String(settings.noZeroDayThresholdMinutes || 30));
      setFallbackTyping(String(settings.fallbackTypingMinutes || 10));
      setFallbackQuran(String(settings.fallbackQuranMinutes || 20));
      setTheme(settings.theme || 'dark');
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        userId: settings?.userId || 'default-user',
        theme,
        fajrTime: fajrTime || null,
        dhuhrTime: dhuhrTime || null,
        asrTime: asrTime || null,
        maghrebTime: maghrebTime || null,
        ishaTime: ishaTime || null,
        noZeroDayThresholdMinutes: parseInt(nzdThreshold) || 30,
        fallbackTypingMinutes: parseInt(fallbackTyping) || 10,
        fallbackQuranMinutes: parseInt(fallbackQuran) || 20,
        enableNotifications: settings?.enableNotifications || true,
        notificationTime: settings?.notificationTime || '08:00',
        createdAt: settings?.createdAt || new Date(),
        updatedAt: new Date(),
      });
      console.log('[v0] Settings saved successfully');
    } catch (error) {
      console.error('[v0] Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  // Error state - settings failed to load
  if (!settings) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Customize your LifeOS experience</p>
        </div>
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <h3 className="font-bold text-destructive mb-2">Settings Error</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Failed to load settings. This may indicate a database issue.
          </p>
          <Button
            variant="outline"
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
            onClick={async () => {
              if (confirm('Are you sure? This will delete all data and reset to base schedule.')) {
                const DBDeleteRequest = window.indexedDB.deleteDatabase('LifeOS');
                DBDeleteRequest.onsuccess = () => {
                  console.log('[v0] Database deleted successfully');
                  window.location.reload();
                };
                DBDeleteRequest.onerror = () => {
                  console.error('[v0] Failed to delete database');
                };
              }
            }}
          >
            Reset Database & Re-seed
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Customize your LifeOS experience</p>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Appearance</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Theme</label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="flex-1"
                >
                  Dark
                </Button>
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="flex-1"
                >
                  Light
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Prayer Times */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Prayer Times</h3>
          <p className="text-sm text-muted-foreground mb-4">Configure your local prayer times for relative schedule blocks</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Fajr</label>
              <input
                type="time"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={fajrTime}
                onChange={(e) => setFajrTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Dhuhr</label>
              <input
                type="time"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={dhuhrTime}
                onChange={(e) => setDhuhrTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Asr</label>
              <input
                type="time"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={asrTime}
                onChange={(e) => setAsrTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Maghreb</label>
              <input
                type="time"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={maghrebTime}
                onChange={(e) => setMaghrebTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Isha</label>
              <input
                type="time"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={ishaTime}
                onChange={(e) => setIshaTime(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Thresholds */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">No-Zero-Day Thresholds</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Minimum critical module minutes per day</label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={nzdThreshold}
                onChange={(e) => setNzdThreshold(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Fallback typing minutes</label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={fallbackTyping}
                onChange={(e) => setFallbackTyping(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Fallback quran review minutes</label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground"
                value={fallbackQuran}
                onChange={(e) => setFallbackQuran(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Developer Section */}
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <h3 className="font-bold text-foreground mb-4">Developer Tools (Experimental)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use these tools for testing and development only. Resetting the database will delete all your data and re-seed the base schedule.
          </p>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={async () => {
                if (confirm('Are you sure? This will delete all data and reset to base schedule.')) {
                  // Delete Dexie database
                  const DBDeleteRequest = window.indexedDB.deleteDatabase('LifeOS');
                  DBDeleteRequest.onsuccess = () => {
                    console.log('[v0] Database deleted successfully');
                    window.location.reload();
                  };
                  DBDeleteRequest.onerror = () => {
                    console.error('[v0] Failed to delete database');
                  };
                }
              }}
            >
              Reset Database & Re-seed
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                // Export current data as JSON
                const { db } = await import('@/lib/db');
                const [blocks, versions, modules, sessions] = await Promise.all([
                  db.scheduleBlocks.toArray(),
                  db.scheduleVersions.toArray(),
                  db.modules.toArray(),
                  db.sessions.toArray(),
                ]);
                
                const exportData = {
                  scheduleBlocks: blocks,
                  scheduleVersions: versions,
                  modules,
                  sessions,
                  exportedAt: new Date().toISOString(),
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
            >
              Export Data (JSON)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
