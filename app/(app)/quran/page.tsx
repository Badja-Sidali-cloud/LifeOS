'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWeekStart, getWeekEnd, isSameDay } from '@/lib/utils-schedule';

type Tab = 'Memorization' | 'Review';

export default function QuranPage() {
  const sessions = useLifeOsStore((state) => state.sessions);
  const logSession = useLifeOsStore((state) => state.logSession);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const isLoading = useLifeOsStore((state) => state.isLoading);

  const [activeTab, setActiveTab] = useState<Tab>('Memorization');
  const [verseRange, setVerseRange] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    const dur = parseInt(duration);
    if (!dur || dur <= 0) return;
    setIsLogging(true);
    try {
      const notesText = [verseRange, notes].filter(Boolean).join(' | ');
      await logSession({
        type: activeTab === 'Memorization' ? 'quran_memorization' : 'quran_review',
        durationMinutes: dur,
        notesText: notesText || undefined,
        date: selectedDate,
        deepWork: false,
        distractionCount: 0,
      });
      setVerseRange('');
      setDuration('');
      setNotes('');
    } finally {
      setIsLogging(false);
    }
  };

  const sessionType = activeTab === 'Memorization' ? 'quran_memorization' : 'quran_review';
  const quranSessions = sessions.filter(
    (s) => s.type === 'quran_memorization' || s.type === 'quran_review'
  );
  const filteredSessions = sessions.filter((s) => s.type === sessionType);

  const todaySessions = quranSessions.filter((s) => isSameDay(s.date, selectedDate));
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekSessions = quranSessions.filter(
    (s) => s.date >= weekStart && s.date <= weekEnd
  );
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const recentSessions = [...filteredSessions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Quran Tracker</h1>
        <p className="text-muted-foreground">Track memorization and review</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-6">
        {(['Memorization', 'Review'] as Tab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' : ''}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Log form */}
      <Card className="p-6 mb-6 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
        <h2 className="text-lg font-semibold text-foreground mb-4">Log Session</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Page / Verse Range{' '}
              <span className="text-muted-foreground font-normal">(optional, e.g. "Al-Baqarah 1-5")</span>
            </label>
            <input
              type="text"
              value={verseRange}
              onChange={(e) => setVerseRange(e.target.value)}
              placeholder="Al-Baqarah 1-5"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Duration (minutes) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes…"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <Button
            onClick={handleLog}
            disabled={!duration || isLogging}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLogging ? 'Logging…' : 'Log Session'}
          </Button>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Today', value: todaySessions.length },
          { label: 'This Week', value: weekSessions.length },
          { label: 'Today Minutes', value: todayMinutes },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Session list */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No {activeTab.toLowerCase()} sessions logged yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <Card
                key={s.id}
                className="p-4 border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-transparent"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {s.notesText && (
                      <p className="text-xs text-muted-foreground mt-0.5">{s.notesText}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-purple-400 whitespace-nowrap ml-4">
                    {s.durationMinutes}m
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
