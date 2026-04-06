'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLifeOsStore } from '@/store/store';
import { getWeekStart, getWeekEnd, isSameDay } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Save, TrendingUp } from 'lucide-react';

export default function ReviewsPage() {
  const sessions        = useLifeOsStore((s) => s.sessions);
  const modules         = useLifeOsStore((s) => s.modules);
  const habits          = useLifeOsStore((s) => s.habits);
  const debtTasks       = useLifeOsStore((s) => s.debtTasks);
  const weeklyReviews   = useLifeOsStore((s) => s.weeklyReviews);
  const baseScheduleBlocks = useLifeOsStore((s) => s.baseScheduleBlocks);
  const calculateExecutionScore  = useLifeOsStore((s) => s.calculateExecutionScore);
  const getOrCreateWeeklyReview  = useLifeOsStore((s) => s.getOrCreateWeeklyReview);
  const updateWeeklyReview       = useLifeOsStore((s) => s.updateWeeklyReview);

  // Week navigation — start on current week
  const [viewingDate, setViewingDate] = useState(new Date());
  const weekStart = useMemo(() => getWeekStart(viewingDate), [viewingDate]);
  const weekEnd   = useMemo(() => getWeekEnd(viewingDate),   [viewingDate]);

  const isCurrentWeek = useMemo(() => {
    const now = getWeekStart(new Date());
    return weekStart.getTime() === now.getTime();
  }, [weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const prevWeek = () => setViewingDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setViewingDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  // ── Metrics for the viewed week ─────────────────────────────────────────
  const weekSessions = useMemo(
    () => sessions.filter(s => s.date >= weekStart && s.date <= weekEnd),
    [sessions, weekStart, weekEnd]
  );

  const executionScore = useMemo(
    () => calculateExecutionScore(weekStart, weekEnd),
    [calculateExecutionScore, weekStart, weekEnd]
  );

  const totalStudyHours = useMemo(
    () => weekSessions
      .filter(s => s.type === 'module_study' || s.type === 'focus')
      .reduce((sum, s) => sum + s.durationMinutes, 0) / 60,
    [weekSessions]
  );

  const gymCount = useMemo(
    () => weekSessions.filter(s => s.type === 'gym').length,
    [weekSessions]
  );

  const blocksCompleted = useMemo(
    () => weekSessions.filter(s => s.type === 'block_complete').length,
    [weekSessions]
  );

  const totalScheduledBlocks = useMemo(() => {
    let count = 0;
    const cursor = new Date(weekStart);
    while (cursor <= weekEnd) {
      const dow = (cursor.getDay() + 6) % 7;
      count += baseScheduleBlocks.filter(b => b.dayOfWeek === dow && b.timeKind === 'fixed').length;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }, [baseScheduleBlocks, weekStart, weekEnd]);

  const habitsDoneThisWeek = useMemo(
    () => habits.reduce((sum, h) =>
      sum + (h.completionDates || []).filter(d => new Date(d) >= weekStart && new Date(d) <= weekEnd).length, 0),
    [habits, weekStart, weekEnd]
  );

  const pendingDebt = useMemo(
    () => debtTasks.filter(t => t.status === 'pending').length,
    [debtTasks]
  );

  // Find existing saved review for this week
  const savedReview = useMemo(
    () => weeklyReviews.find(r => {
      const rStart = new Date(r.weekStartDate);
      return rStart.getFullYear() === weekStart.getFullYear() &&
             rStart.getMonth() === weekStart.getMonth() &&
             rStart.getDate() === weekStart.getDate();
    }),
    [weeklyReviews, weekStart]
  );

  // Reflection form — pre-fill if review exists
  const [wins,        setWins]        = useState('');
  const [failures,    setFailures]    = useState('');
  const [commitments, setCommitments] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);

  useEffect(() => {
    setWins(savedReview?.wins || '');
    setFailures(savedReview?.failures || '');
    setCommitments(savedReview?.commitments || '');
  }, [savedReview]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const review = await getOrCreateWeeklyReview(weekStart);
      await updateWeeklyReview({
        ...review,
        wins,
        failures,
        commitments,
        executionScore,
        totalStudyHours: parseFloat(totalStudyHours.toFixed(1)),
        gymSessions: gymCount,
        updatedAt: new Date(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Past reviews (sorted newest first, excluding current week) ──────────
  const pastReviews = useMemo(
    () => [...weeklyReviews]
      .filter(r => new Date(r.weekStartDate).getTime() !== weekStart.getTime())
      .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()),
    [weeklyReviews, weekStart]
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scoreColor = (s: number) =>
    s >= 70 ? 'text-green-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = (s: number) =>
    s >= 70 ? 'bg-green-900/30' : s >= 40 ? 'bg-yellow-900/30' : 'bg-red-900/30';

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-8">

      {/* Header + week nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-1">Weekly Review</h1>
          <p className="text-muted-foreground text-sm">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevWeek} className="p-1.5 rounded hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setViewingDate(new Date())}
            disabled={isCurrentWeek}
            className="px-3 py-1.5 text-xs rounded border border-border hover:bg-secondary transition-colors disabled:opacity-40 text-foreground"
          >
            This week
          </button>
          <button onClick={nextWeek} disabled={isCurrentWeek} className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-40">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Execution</p>
          <p className={`text-2xl font-bold ${scoreColor(executionScore)}`}>{executionScore}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">{blocksCompleted}/{totalScheduledBlocks} blocks</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Study Hours</p>
          <p className="text-2xl font-bold text-foreground">{totalStudyHours.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Gym</p>
          <p className={`text-2xl font-bold ${gymCount >= 3 ? 'text-green-400' : gymCount > 0 ? 'text-yellow-400' : 'text-foreground'}`}>
            {gymCount}/3
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Habits</p>
          <p className="text-2xl font-bold text-foreground">{habitsDoneThisWeek}</p>
          <p className="text-[10px] text-muted-foreground mt-1">check-ins</p>
        </Card>
      </div>

      {/* Debt alert */}
      {pendingDebt > 0 && (
        <Card className="p-4 border-orange-500/40 bg-orange-500/5">
          <p className="text-sm text-orange-400 font-semibold">
            ⚠️ {pendingDebt} pending debt task{pendingDebt > 1 ? 's' : ''} — don't let them pile up.
          </p>
        </Card>
      )}

      {/* ── Reflection form ── */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Reflection</h2>
          {savedReview && (
            <span className="text-xs text-green-400 font-medium">✓ Saved</span>
          )}
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">✅ Wins this week</Label>
          <Textarea
            placeholder="What went well? Blocks completed, habits kept, goals hit..."
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            className="min-h-[90px] text-sm"
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">❌ What failed</Label>
          <Textarea
            placeholder="What didn't happen? Why? Be specific."
            value={failures}
            onChange={(e) => setFailures(e.target.value)}
            className="min-h-[90px] text-sm"
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">🎯 Commitments for next week</Label>
          <Textarea
            placeholder="3 concrete things you will do differently or maintain..."
            value={commitments}
            onChange={(e) => setCommitments(e.target.value)}
            className="min-h-[90px] text-sm"
          />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : savedReview ? 'Update Review' : 'Save Review'}
        </Button>
      </Card>

      {/* ── Past reviews ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">Past Reviews</h2>
          <span className="text-xs text-muted-foreground ml-1">({pastReviews.length})</span>
        </div>

        {pastReviews.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground text-sm">No past reviews yet. Save this week's review to start tracking your history.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pastReviews.map((review) => {
              const isExpanded = expandedId === review.id;
              const score = review.executionScore ?? 0;
              const wStart = new Date(review.weekStartDate);
              const wEnd = new Date(wStart);
              wEnd.setDate(wStart.getDate() + 6);
              const label = `${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${wEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

              return (
                <Card key={review.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className={`text-sm font-bold px-2.5 py-1 rounded shrink-0 ${scoreBg(score)} ${scoreColor(score)}`}>
                        {score}%
                      </span>
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-foreground text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {(review.totalStudyHours ?? 0).toFixed(1)}h study
                          {review.gymSessions ? ` • ${review.gymSessions} gym` : ''}
                          {review.wins ? ' • has notes' : ''}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                      {review.wins && (
                        <div>
                          <p className="text-xs font-semibold text-green-400 mb-1">✅ Wins</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{review.wins}</p>
                        </div>
                      )}
                      {review.failures && (
                        <div>
                          <p className="text-xs font-semibold text-red-400 mb-1">❌ Failed</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{review.failures}</p>
                        </div>
                      )}
                      {review.commitments && (
                        <div>
                          <p className="text-xs font-semibold text-accent mb-1">🎯 Commitments</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{review.commitments}</p>
                        </div>
                      )}
                      {!review.wins && !review.failures && !review.commitments && (
                        <p className="text-sm text-muted-foreground">(No notes were written for this week)</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
