'use client';

import { useState, useMemo } from 'react';
import { useLifeOsStore } from '@/store/store';
import { getWeekStart, getWeekEnd, isSameDay } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, X, Timer, CheckCircle2, TrendingUp, Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';

const EXAM_DATE = new Date('2026-05-10');

export default function StudyPage() {
  const modules      = useLifeOsStore((s) => s.modules);
  const selectedDate = useLifeOsStore((s) => s.selectedDate);
  const sessions     = useLifeOsStore((s) => s.sessions);
  const logSession   = useLifeOsStore((s) => s.logSession);
  const isLoading    = useLifeOsStore((s) => s.isLoading);
  const router       = useRouter();

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [logDuration, setLogDuration]       = useState('');
  const [logNotes, setLogNotes]             = useState('');
  const [isLogging, setIsLogging]           = useState(false);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd   = getWeekEnd(selectedDate);

  // Days until exams
  const daysLeft = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const exam  = new Date(EXAM_DATE); exam.setHours(0,0,0,0);
    return Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / 86400000));
  }, []);

  // Per-module stats
  const moduleStats = useMemo(() =>
    [...modules]
      .filter(m => m.code !== 'TIC')
      .map(m => {
        const weekHours = sessions
          .filter(s => s.module === m.code && s.date >= weekStart && s.date <= weekEnd)
          .reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
        const todayMins = sessions
          .filter(s => s.module === m.code && isSameDay(s.date, selectedDate))
          .reduce((sum, s) => sum + s.durationMinutes, 0);
        const pct = Math.min((weekHours / (m.targetHoursPerWeek || 1)) * 100, 100);
        const gap = Math.max(0, (m.targetHoursPerWeek || 0) - weekHours);
        return { ...m, weekHours, todayMins, pct, gap };
      })
      .sort((a, b) => a.pct - b.pct || b.priorityScore - a.priorityScore),
  [modules, sessions, weekStart, weekEnd, selectedDate]);

  // #1 suggestion = first in sorted list (lowest % done, highest priority)
  const topSuggestion = moduleStats[0];

  const totalStudyToday = sessions
    .filter(s => isSameDay(s.date, selectedDate) && s.type === 'module_study')
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const handleLog = async () => {
    if (!selectedModule || !logDuration) return;
    setIsLogging(true);
    try {
      await logSession({
        type: 'module_study', module: selectedModule,
        durationMinutes: parseInt(logDuration),
        date: selectedDate, deepWork: true,
        distractionCount: 0, notesText: logNotes,
      });
      setLogDuration(''); setLogNotes(''); setSelectedModule(null);
    } finally { setIsLogging(false); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study</h1>
          <p className="text-sm text-muted-foreground">
            {totalStudyToday > 0
              ? `${(totalStudyToday / 60).toFixed(1)}h logged today`
              : 'Nothing logged today yet'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.push('/focus')}>
          <Timer className="w-4 h-4 mr-1" /> Focus Timer
        </Button>
      </div>

      {/* Smart suggestion banner */}
      {topSuggestion && (
        <Card className="p-4 mb-5 border-accent/40 bg-accent/5">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-accent" />
            <p className="text-xs font-semibold text-accent uppercase tracking-wide">Study this now</p>
            {daysLeft > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{daysLeft}d to exams</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-foreground">{topSuggestion.code}</p>
              <p className="text-xs text-muted-foreground">{topSuggestion.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {topSuggestion.weekHours.toFixed(1)}h done · {topSuggestion.gap.toFixed(1)}h remaining this week
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setSelectedModule(
                selectedModule === topSuggestion.code ? null : topSuggestion.code
              )}
              className="shrink-0"
            >
              <BookOpen className="w-4 h-4 mr-1" />
              Log Session
            </Button>
          </div>

          {/* Inline log form for suggestion */}
          {selectedModule === topSuggestion.code && (
            <div className="mt-3 space-y-2 pt-3 border-t border-accent/20">
              <div className="flex gap-2">
                <Input
                  type="number" placeholder="Minutes studied"
                  value={logDuration} onChange={e => setLogDuration(e.target.value)}
                  className="flex-1" autoFocus
                />
                <Button onClick={handleLog} disabled={!logDuration || isLogging} size="sm">
                  {isLogging ? '...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder="Notes (optional)"
                value={logNotes} onChange={e => setLogNotes(e.target.value)}
              />
            </div>
          )}
        </Card>
      )}

      {/* All modules */}
      <div className="space-y-2">
        {moduleStats.map((m, idx) => {
          const isSelected = selectedModule === m.code && m.code !== topSuggestion?.code;
          const barColor = m.pct >= 80 ? 'bg-green-500' : m.pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

          return (
            <div
              key={m.id}
              className={`rounded-xl border p-3 transition-all
                ${isSelected ? 'border-accent bg-accent/5' : 'border-border bg-card'}
                ${idx === 0 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 text-center">
                  {idx === 0 ? '🔥' : `#${idx + 1}`}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{m.code}</span>
                      {m.todayMins > 0 && (
                        <span className="text-[10px] text-green-400 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />{m.todayMins}m today
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {m.weekHours.toFixed(1)}h / {m.targetHoursPerWeek}h
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>

                {/* Log button */}
                {!isSelected ? (
                  <button
                    onClick={() => setSelectedModule(m.code)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-accent transition-colors px-2 py-1 rounded border border-border hover:border-accent"
                  >
                    Log
                  </button>
                ) : (
                  <button onClick={() => setSelectedModule(null)} className="shrink-0 text-muted-foreground p-1">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline log form */}
              {isSelected && (
                <div className="mt-3 space-y-2 pt-3 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      type="number" placeholder="Minutes"
                      value={logDuration} onChange={e => setLogDuration(e.target.value)}
                      className="flex-1" autoFocus
                    />
                    <Button onClick={handleLog} disabled={!logDuration || isLogging} size="sm">
                      {isLogging ? '...' : 'Save'}
                    </Button>
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={logNotes} onChange={e => setLogNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
