'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWeekStart, getWeekEnd } from '@/lib/utils-schedule';

export default function TypingPage() {
  const sessions = useLifeOsStore((state) => state.sessions);
  const logSession = useLifeOsStore((state) => state.logSession);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const isLoading = useLifeOsStore((state) => state.isLoading);

  const [wpmInput, setWpmInput] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [duration, setDuration] = useState('15');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const typingSessions = sessions.filter((s) => s.type === 'typing');

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekSessions = typingSessions.filter(
    (s) => s.date >= weekStart && s.date <= weekEnd
  );

  const bestWpm = typingSessions.reduce((max, s) => Math.max(max, s.wpm ?? 0), 0);
  const avgWpmThisWeek =
    weekSessions.length > 0
      ? Math.round(weekSessions.reduce((sum, s) => sum + (s.wpm ?? 0), 0) / weekSessions.length)
      : 0;

  const handleLog = async () => {
    const wpm = parseInt(wpmInput);
    const acc = parseInt(accuracy);
    const dur = parseInt(duration);
    if (!wpm || !dur) return;
    setIsLogging(true);
    try {
      const notesText = `${wpm} WPM, ${acc || '?'}% accuracy${notes ? ' | ' + notes : ''}`;
      await logSession({
        type: 'typing',
        durationMinutes: dur,
        wpm,
        notesText,
        date: selectedDate,
        deepWork: false,
        distractionCount: 0,
      });
      setWpmInput('');
      setAccuracy('');
      setDuration('15');
      setNotes('');
    } finally {
      setIsLogging(false);
    }
  };

  // Last 7 sessions for progress bars
  const last7 = [...typingSessions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 7)
    .reverse();

  // Last 10 for session list
  const recentSessions = [...typingSessions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  function barColor(wpm: number) {
    if (wpm >= 60) return 'bg-green-500';
    if (wpm >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Typing Practice</h1>
        <p className="text-muted-foreground">15 minutes daily — build to 80 WPM</p>
      </div>

      {/* Log form */}
      <Card className="p-6 mb-6 border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent">
        <h2 className="text-lg font-semibold text-foreground mb-4">Log Session</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">WPM</label>
              <input
                type="number"
                min={1}
                value={wpmInput}
                onChange={(e) => setWpmInput(e.target.value)}
                placeholder="65"
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Accuracy (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={accuracy}
                onChange={(e) => setAccuracy(e.target.value)}
                placeholder="95"
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Duration (minutes)</label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes…"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <Button
            onClick={handleLog}
            disabled={!wpmInput || !duration || isLogging}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {isLogging ? 'Logging…' : 'Log Session'}
          </Button>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Best WPM', value: bestWpm },
          { label: 'Avg WPM this week', value: avgWpmThisWeek },
          { label: 'Sessions this week', value: weekSessions.length },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* WPM Progress bars */}
      {last7.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            WPM Progress (last 7)
          </h2>
          <div className="space-y-3">
            {last7.map((s, i) => {
              const wpm = s.wpm ?? 0;
              const widthPct = Math.min((wpm / 150) * 100, 100);
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      {s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="font-semibold text-foreground">{wpm} WPM</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={`h-2 rounded-full transition-all ${barColor(wpm)}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Session list */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No typing sessions logged yet.</Card>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <Card
                key={s.id}
                className="p-4 border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent"
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
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-red-400">{s.wpm ?? 0} WPM</p>
                    <p className="text-xs text-muted-foreground">{s.durationMinutes}m</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
