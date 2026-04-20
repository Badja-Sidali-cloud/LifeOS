'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLifeOsStore } from '@/store/store';
import { ScheduleBlock } from '@/lib/schemas';
import {
  getDayOfWeek, getBlocksForDay, sortBlocksByTime,
  groupBlocksBySection, getCategoryColor,
  isSameDay, timeStringToMinutes,
} from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronLeft, ChevronRight, Plus, BookOpen, Code2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function TodayPage() {
  const selectedDate        = useLifeOsStore((s) => s.selectedDate);
  const setSelectedDate     = useLifeOsStore((s) => s.setSelectedDate);
  const baseScheduleBlocks  = useLifeOsStore((s) => s.baseScheduleBlocks);
  const sessions            = useLifeOsStore((s) => s.sessions);
  const modules             = useLifeOsStore((s) => s.modules);
  const habits              = useLifeOsStore((s) => s.habits);
  const isLoading           = useLifeOsStore((s) => s.isLoading);
  const logSession          = useLifeOsStore((s) => s.logSession);
  const deleteSession       = useLifeOsStore((s) => s.deleteSession);
  const checkInHabit        = useLifeOsStore((s) => s.checkInHabit);

  const [todayBlocks, setTodayBlocks]           = useState<ScheduleBlock[]>([]);
  const [completedBlockMap, setCompletedBlockMap] = useState<Map<string, string>>(new Map());
  const [now, setNow]                            = useState(new Date());

  // Tick every minute for NOW indicator
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Unplanned dialog
  const [unplannedOpen, setUnplannedOpen]         = useState(false);
  const [unplannedTitle, setUnplannedTitle]       = useState('');
  const [unplannedDuration, setUnplannedDuration] = useState('');
  const [isSavingUnplanned, setIsSavingUnplanned] = useState(false);

  useEffect(() => {
    const dow    = getDayOfWeek(selectedDate);
    const blocks = sortBlocksByTime(getBlocksForDay(baseScheduleBlocks, dow));
    setTodayBlocks(blocks);

    const completed = new Map<string, string>();
    for (const block of blocks) {
      const s = sessions.find(
        (s) => isSameDay(s.date, selectedDate) && s.module === block.id && s.type === 'block_complete'
      );
      if (s) completed.set(block.id, s.id);
    }
    setCompletedBlockMap(completed);
  }, [selectedDate, baseScheduleBlocks, sessions]);

  const isToday    = isSameDay(selectedDate, new Date());
  const nowMins    = isToday ? now.getHours() * 60 + now.getMinutes() : -1;
  const sections   = groupBlocksBySection(todayBlocks);

  // ── Exam countdown ───────────────────────────────────────────────────────
  const EXAM_DATE = new Date('2026-05-10');
  const daysToExam = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam  = new Date(EXAM_DATE);
    exam.setHours(0, 0, 0, 0);
    return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [now]);

  // ── Smart study suggestion ───────────────────────────────────────────────
  // Find the module you've studied the least this week relative to its target
  const studySuggestion = useMemo(() => {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const scored = modules
      .filter(m => m.code !== 'TIC') // TIC is online, skip
      .map(m => {
        const done = sessions
          .filter(s => s.module === m.code && s.date >= weekStart && s.date < weekEnd)
          .reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
        const pct = done / (m.targetHoursPerWeek || 1);
        return { code: m.code, name: m.name, pct, done, target: m.targetHoursPerWeek, priorityScore: m.priorityScore };
      })
      // Sort by: lowest % done, then by highest priority
      .sort((a, b) => a.pct - b.pct || b.priorityScore - a.priorityScore);

    return scored[0] || null;
  }, [modules, sessions, selectedDate]);

  function isCurrentBlock(b: ScheduleBlock) {
    if (!isToday || b.timeKind !== 'fixed' || !b.startTime || !b.endTime) return false;
    return nowMins >= timeStringToMinutes(b.startTime) && nowMins < timeStringToMinutes(b.endTime);
  }

  // ── Habits quick-log ─────────────────────────────────────────────────────
  const quranHabit  = habits.find(h => h.type === 'quran'  || h.name.toLowerCase().includes('quran'));
  const webdevHabit = habits.find(h => h.type === 'webdev' || h.name.toLowerCase().includes('web'));

  const quranDone  = quranHabit  && (quranHabit.completionDates  || []).some(d => isSameDay(new Date(d), selectedDate));
  const webdevDone = webdevHabit && (webdevHabit.completionDates || []).some(d => isSameDay(new Date(d), selectedDate));

  // ── Module progress (your 5 behind modules) ──────────────────────────────
  const PRIORITY_MODULES = ['ELEC', 'STAT', 'ANALY2', 'STR M', 'ALG2'];
  const moduleProgress = useMemo(() => {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return PRIORITY_MODULES.map(code => {
      const mod = modules.find(m => m.code === code);
      const hours = sessions
        .filter(s => s.module === code && s.date >= weekStart && s.date < weekEnd)
        .reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
      return { code, hours: parseFloat(hours.toFixed(1)), target: mod?.targetHoursPerWeek || 4 };
    });
  }, [modules, sessions, selectedDate]);

  // ── Unplanned sessions today ─────────────────────────────────────────────
  const unplannedToday = sessions.filter(
    s => s.module === 'unplanned' && isSameDay(s.date, selectedDate)
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  const completedCount = completedBlockMap.size;
  const totalCount     = todayBlocks.filter(b => b.timeKind === 'fixed').length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      {/* ── Date nav ── */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); }}
          className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">
            {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            {totalCount > 0 && ` · ${completedCount}/${totalCount} done`}
          </p>
        </div>
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); }}
          className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* ── Exam countdown ── */}
      {isToday && daysToExam > 0 && (
        <div className={`mb-4 px-4 py-3 rounded-xl flex items-center justify-between
          ${daysToExam <= 7 ? 'bg-red-500/10 border border-red-500/30' :
            daysToExam <= 14 ? 'bg-orange-500/10 border border-orange-500/30' :
            'bg-secondary border border-border'}`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide
              ${daysToExam <= 7 ? 'text-red-400' : daysToExam <= 14 ? 'text-orange-400' : 'text-muted-foreground'}`}>
              Exams start May 10
            </p>
            <p className={`text-2xl font-bold
              ${daysToExam <= 7 ? 'text-red-400' : daysToExam <= 14 ? 'text-orange-400' : 'text-foreground'}`}>
              {daysToExam} days left
            </p>
          </div>
          {studySuggestion && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Study now</p>
              <p className="text-sm font-bold text-accent">{studySuggestion.code}</p>
              <p className="text-xs text-muted-foreground">
                {studySuggestion.done.toFixed(1)}h / {studySuggestion.target}h this week
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Habit quick-log ── */}
      {(quranHabit || webdevHabit) && (
        <div className="flex gap-2 mb-5">
          {quranHabit && (
            <button
              onClick={() => { if (!quranDone) checkInHabit(quranHabit.id); }}
              disabled={!!quranDone}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                ${quranDone
                  ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                  : 'border-border text-muted-foreground hover:border-purple-500/50 hover:text-purple-400'}`}
            >
              <BookOpen className="w-4 h-4" />
              Quran {quranDone ? '✓' : ''}
            </button>
          )}
          {webdevHabit && (
            <button
              onClick={() => { if (!webdevDone) checkInHabit(webdevHabit.id); }}
              disabled={!!webdevDone}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                ${webdevDone
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/50 hover:text-accent'}`}
            >
              <Code2 className="w-4 h-4" />
              Web Dev {webdevDone ? '✓' : ''}
            </button>
          )}
        </div>
      )}

      {/* ── Module progress strip ── */}
      {moduleProgress.some(m => m.target > 0) && (
        <Card className="p-3 mb-5">
          <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Weekly Study Progress</p>
          <div className="space-y-1.5">
            {moduleProgress.map(m => {
              const pct = Math.min((m.hours / m.target) * 100, 100);
              const color = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={m.code} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground w-14 shrink-0">{m.code}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-14 text-right shrink-0">{m.hours}h/{m.target}h</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Schedule blocks ── */}
      {todayBlocks.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No blocks scheduled</p>
          <p className="text-sm text-muted-foreground mb-4">Add your schedule in Settings to get started.</p>
          <a href="/settings" className="text-sm text-accent underline">Go to Settings →</a>
        </Card>
      ) : (
        <div className="space-y-6">
          {['Morning', 'Midday', 'Evening', 'Flexible'].map(section => {
            const blocks = (sections[section] || []).filter(b => b.timeKind === 'fixed');
            if (blocks.length === 0) return null;
            return (
              <div key={section}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section}</p>
                <div className="space-y-2">
                  {blocks.map(block => {
                    const isCompleted = completedBlockMap.has(block.id);
                    const isCurrent   = isCurrentBlock(block);
                    const color       = getCategoryColor(block.category);
                    const duration    = block.startTime && block.endTime
                      ? `${block.startTime} – ${block.endTime}`
                      : block.durationMinutes ? `${block.durationMinutes}m` : '';

                    return (
                      <div
                        key={block.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                          ${isCurrent ? 'border-accent bg-accent/10 shadow-md' : 'border-border bg-card'}
                          ${isCompleted ? 'opacity-50' : ''}`}
                        style={{ borderLeftWidth: 3, borderLeftColor: color }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isCurrent && <span className="text-[10px] font-bold text-accent shrink-0">▶ NOW</span>}
                            <p className={`font-semibold text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {block.title}
                            </p>
                          </div>
                          {duration && <p className="text-xs text-muted-foreground mt-0.5">{duration}</p>}
                        </div>
                        {/* One-tap done */}
                        <button
                          onClick={async () => {
                            if (isCompleted) {
                              const sid = completedBlockMap.get(block.id);
                              if (sid) {
                                await deleteSession(sid);
                                setCompletedBlockMap(p => { const n = new Map(p); n.delete(block.id); return n; });
                                toast.info(`${block.title} — unmarked`);
                              }
                            } else {
                              const sid = await logSession({
                                type: 'block_complete', module: block.id,
                                durationMinutes: block.durationMinutes || 0,
                                date: selectedDate, deepWork: true, distractionCount: 0,
                                notesText: block.title,
                              });
                              setCompletedBlockMap(p => new Map(p).set(block.id, sid));
                              toast.success(`✓ ${block.title}`);
                            }
                          }}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                            ${isCompleted
                              ? 'bg-accent border-accent text-accent-foreground'
                              : 'border-muted-foreground/30 hover:border-accent'}`}
                        >
                          {isCompleted && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Unplanned ── */}
      {unplannedToday.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Unplanned</p>
          <div className="space-y-2">
            {unplannedToday.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.notesText || 'Unplanned activity'}</p>
                  <p className="text-xs text-muted-foreground">{s.durationMinutes}m</p>
                </div>
                <button onClick={() => deleteSession(s.id)} className="text-muted-foreground hover:text-destructive p-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add unplanned ── */}
      <button
        onClick={() => setUnplannedOpen(true)}
        className="w-full mt-5 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" /> Add Unplanned Activity
      </button>

      {/* ── Unplanned dialog ── */}
      <Dialog open={unplannedOpen} onOpenChange={setUnplannedOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Unplanned Activity</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>What did you do?</Label>
              <Input className="mt-1" placeholder="e.g., Helped a friend, read extra..." value={unplannedTitle} onChange={e => setUnplannedTitle(e.target.value)} />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input className="mt-1" type="number" placeholder="30" value={unplannedDuration} onChange={e => setUnplannedDuration(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnplannedOpen(false)}>Cancel</Button>
            <Button
              disabled={!unplannedTitle || !unplannedDuration || isSavingUnplanned}
              onClick={async () => {
                setIsSavingUnplanned(true);
                try {
                  await logSession({ type: 'block_complete', module: 'unplanned', durationMinutes: parseInt(unplannedDuration) || 0, date: selectedDate, deepWork: false, distractionCount: 0, notesText: unplannedTitle });
                  setUnplannedTitle(''); setUnplannedDuration(''); setUnplannedOpen(false);
                } finally { setIsSavingUnplanned(false); }
              }}
            >Log Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
