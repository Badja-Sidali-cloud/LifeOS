'use client';

import { useState, useEffect } from 'react';
import { useLifeOsStore } from '@/store/store';
import { getWeekStart, getWeekEnd, isSameDay } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';

export default function ReviewsPage() {
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const modules = useLifeOsStore((state) => state.modules);
  const sessions = useLifeOsStore((state) => state.sessions);
  const weeklyReviews = useLifeOsStore((state) => state.weeklyReviews);
  const calculateExecutionScore = useLifeOsStore((state) => state.calculateExecutionScore);
  const debtTasks = useLifeOsStore((state) => state.debtTasks);
  const getOrCreateWeeklyReview = useLifeOsStore((state) => state.getOrCreateWeeklyReview);
  const updateWeeklyReview = useLifeOsStore((state) => state.updateWeeklyReview);

  const [wins, setWins] = useState('');
  const [failures, setFailures] = useState('');
  const [commitments, setCommitments] = useState('');
  const [fixes, setFixes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Calculate metrics
  const executionScore = calculateExecutionScore(weekStart, weekEnd);
  const weekSessions = sessions.filter((s) => s.date.getTime() >= weekStart.getTime() && s.date.getTime() <= weekEnd.getTime());

  // Study hours per module
  const moduleHours = modules.map((m) => {
    const hours = weekSessions
      .filter((s) => s.module === m.code)
      .reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
    return { code: m.code, hours: parseFloat(hours.toFixed(1)), target: m.targetHoursPerWeek };
  }).sort((a, b) => b.hours - a.hours);

  // Gym count
  const gymCount = weekSessions.filter((s) => s.type === 'gym').length;
  
  // Typing WPM average (simplified - not in current schema but can show count)
  const typingSessions = weekSessions.filter((s) => s.type === 'typing').length;

  // Pending debt
  const pendingDebt = debtTasks.filter((t) => t.status === 'pending').length;

  // No-Zero-Day check
  const dayRange = new Array(7).fill(0).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const zeroDays: string[] = [];
  for (const day of dayRange) {
    const daySessions = weekSessions.filter((s) => isSameDay(s.date, day) && modules.find((m) => m.code === s.module && m.isCritical));
    if (daySessions.length === 0) {
      zeroDays.push(day.toLocaleDateString('en-US', { weekday: 'short' }));
    }
  }

  // Auto-suggest fixes
  useEffect(() => {
    const suggestions: string[] = [];
    
    // Generic logic: flag any module where hours < target * 0.5
    moduleHours.forEach((m) => {
      if (m.hours < (m.target * 0.5)) {
        suggestions.push(`${m.code}: increase study focus this week`);
      }
    });
    
    if (gymCount === 0) {
      suggestions.push('Gym: schedule at least 3 sessions');
    }
    
    if (zeroDays.length > 0) {
      suggestions.push(`No-Zero-Day: missed critical work on ${zeroDays.join(', ')}`);
    }
    
    setFixes(suggestions);
  }, [moduleHours, gymCount, zeroDays]);

  const handleSaveReview = async () => {
    setIsSaving(true);
    try {
      const review = await getOrCreateWeeklyReview(weekStart);
      await updateWeeklyReview({
        ...review,
        wins,
        failures,
        commitments,
        executionScore,
        totalStudyHours: moduleHours.reduce((sum, m) => sum + m.hours, 0),
        gymSessions: gymCount,
        updatedAt: new Date(),
      });
      setWins('');
      setFailures('');
      setCommitments('');
      setFixes([]);
    } catch (error) {
      console.error('[v0] Failed to save review:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Weekly Reviews</h1>
        <p className="text-muted-foreground">Analyze your weekly metrics and progress</p>
      </div>

      {/* THIS WEEK SECTION */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">This Week ({weekLabel})</h2>
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Execution Score</p>
            <p className="text-2xl font-bold text-accent">{executionScore}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Gym Sessions</p>
            <p className="text-2xl font-bold text-foreground">{gymCount}/3</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Study</p>
            <p className="text-2xl font-bold text-foreground">{(moduleHours.reduce((sum, m) => sum + m.hours, 0)).toFixed(1)}h</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Debt Tasks</p>
            <p className={`text-2xl font-bold ${pendingDebt > 0 ? 'text-destructive' : 'text-green-500'}`}>{pendingDebt}</p>
          </Card>
        </div>

        {/* No-Zero-Day Status */}
        <Card className="p-4 mb-6">
          <p className="text-sm font-semibold mb-2">No-Zero-Day Status</p>
          {zeroDays.length === 0 ? (
            <p className="text-sm text-green-500 font-medium">✓ No Zero Days — Great week!</p>
          ) : (
            <p className="text-sm text-destructive">✗ Zero Days: {zeroDays.join(', ')}</p>
          )}
        </Card>

        {/* Study Hours Chart */}
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-foreground mb-4">Study Hours by Module</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moduleHours.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="code" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Legend />
              <Bar dataKey="hours" fill="var(--accent)" name="Hours" />
              <Bar dataKey="target" fill="var(--muted)" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* REFLECTION FORM */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Reflection</h2>
        
        <Card className="p-6 space-y-6">
          <div>
            <Label htmlFor="wins" className="text-sm font-semibold mb-2 block">Wins This Week</Label>
            <Textarea
              id="wins"
              placeholder="What went well? What did you accomplish?"
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="failures" className="text-sm font-semibold mb-2 block">What Failed</Label>
            <Textarea
              id="failures"
              placeholder="What didn't go as planned? Why?"
              value={failures}
              onChange={(e) => setFailures(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-3 block">Top 3 Fixes for Next Week</Label>
            <div className="space-y-2 mb-4 p-4 bg-secondary/50 rounded-lg border border-secondary">
              {fixes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suggestions based on this week's data</p>
              ) : (
                fixes.map((fix, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded"
                    />
                    <p className="text-sm text-foreground">{fix}</p>
                  </div>
                ))
              )}
            </div>
            {fixes.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">Edit above suggestions or add your own</p>
            )}
            <Textarea
              placeholder="Add custom fixes (one per line)"
              defaultValue={fixes.join('\n')}
              className="min-h-[80px] text-sm"
            />
          </div>

          <div>
            <Label htmlFor="commitments" className="text-sm font-semibold mb-2 block">Commitments for Next 7 Days</Label>
            <Textarea
              id="commitments"
              placeholder="What will you commit to achieving next week?"
              value={commitments}
              onChange={(e) => setCommitments(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSaveReview}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Review'}
          </Button>
        </Card>
      </div>

      {/* PAST REVIEWS */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Past Reviews</h2>
        
        {weeklyReviews.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No reviews yet"
            description="Complete your first week and save a review to track your progress over time."
          />
        ) : (
          <div className="space-y-3">
            {weeklyReviews.slice(0, 4).map((review) => {
              const isExpanded = expandedWeek === review.id;
              const scoreColor = review.executionScore >= 70 ? 'bg-green-900/30 text-green-400' : 
                               review.executionScore >= 40 ? 'bg-yellow-900/30 text-yellow-400' : 
                               'bg-destructive/30 text-destructive';
              
              return (
                <Card key={review.id} className="p-4">
                  <button
                    onClick={() => setExpandedWeek(isExpanded ? null : review.id)}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <p className="font-semibold text-foreground">
                          Week of {new Date(review.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {review.totalStudyHours.toFixed(1)}h study • {review.gymSessions} gym sessions
                        </p>
                      </div>
                      <span className={`text-sm font-bold px-3 py-1 rounded ${scoreColor}`}>
                        {review.executionScore}%
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">Wins</p>
                        <p className="text-sm text-muted-foreground">{review.wins || '(no notes)'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">Failures</p>
                        <p className="text-sm text-muted-foreground">{review.failures || '(no notes)'}</p>
                      </div>
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
