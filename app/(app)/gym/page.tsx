'use client';

import { useState, useMemo } from 'react';
import { useLifeOsStore } from '@/store/store';
import { isSameDay, getWeekStart, getWeekEnd } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dumbbell, ChevronDown, ChevronUp, Check, RotateCcw } from 'lucide-react';

// ─── Full Body 3×/week Program (StrongLifts A/B style) ───────────────────────
const PROGRAM = {
  A: {
    label: 'Workout A',
    focus: 'Squat · Bench · Row',
    exercises: [
      { id: 'squat',       name: 'Barbell Squat',        sets: 3, reps: 5,  startWeight: 40 },
      { id: 'bench',       name: 'Bench Press',          sets: 3, reps: 5,  startWeight: 30 },
      { id: 'row',         name: 'Barbell Row',          sets: 3, reps: 5,  startWeight: 30 },
      { id: 'plank',       name: 'Plank',                sets: 3, reps: 60, startWeight: 0, isTime: true },
    ],
  },
  B: {
    label: 'Workout B',
    focus: 'Squat · OHP · Deadlift',
    exercises: [
      { id: 'squat',       name: 'Barbell Squat',        sets: 3, reps: 5,  startWeight: 40 },
      { id: 'ohp',         name: 'Overhead Press (OHP)', sets: 3, reps: 5,  startWeight: 20 },
      { id: 'deadlift',    name: 'Deadlift',             sets: 1, reps: 5,  startWeight: 50 },
      { id: 'pullup',      name: 'Pull-ups / Lat Pull',  sets: 3, reps: 8,  startWeight: 0  },
    ],
  },
} as const;

type WorkoutKey = 'A' | 'B';

interface SetLog { reps: number; weight: number; done: boolean; }
interface ExerciseLog { [exerciseId: string]: SetLog[]; }

function buildDefaultSets(exercises: typeof PROGRAM.A.exercises, previousWeights: Record<string, number>): ExerciseLog {
  const log: ExerciseLog = {};
  for (const ex of exercises) {
    const w = previousWeights[ex.id] ?? ex.startWeight;
    log[ex.id] = Array.from({ length: ex.sets }, () => ({ reps: ex.reps, weight: w, done: false }));
  }
  return log;
}

export default function GymPage() {
  const sessions = useLifeOsStore((state) => state.sessions);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const logSession = useLifeOsStore((state) => state.logSession);

  // Derive which workout is next (A/B alternating based on past gym sessions)
  const gymSessions = useMemo(() =>
    sessions.filter((s) => s.type === 'gym').sort((a, b) => b.date.getTime() - a.date.getTime()),
    [sessions]
  );

  const nextWorkout: WorkoutKey = useMemo(() => {
    const last = gymSessions[0];
    if (!last) return 'A';
    try {
      const parsed = JSON.parse(last.notesText || '{}');
      return parsed.workout === 'A' ? 'B' : 'A';
    } catch { return 'A'; }
  }, [gymSessions]);

  // Extract previous weights from sessions
  const previousWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    for (const s of gymSessions) {
      try {
        const parsed = JSON.parse(s.notesText || '{}');
        if (parsed.weights) Object.assign(weights, parsed.weights);
      } catch {}
    }
    return weights;
  }, [gymSessions]);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekGymCount = gymSessions.filter(
    (s) => s.date >= weekStart && s.date <= weekEnd
  ).length;
  const todayDone = gymSessions.some((s) => isSameDay(s.date, selectedDate));

  // Active workout state
  const [activeWorkout, setActiveWorkout] = useState<WorkoutKey | null>(null);
  const [setLogs, setSetLogs] = useState<ExerciseLog>({});
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const workout = activeWorkout ? PROGRAM[activeWorkout] : null;

  function startWorkout(key: WorkoutKey) {
    setActiveWorkout(key);
    setSetLogs(buildDefaultSets(PROGRAM[key].exercises as any, previousWeights));
    setExpandedEx(PROGRAM[key].exercises[0].id);
  }

  function toggleSet(exId: string, setIdx: number) {
    setSetLogs((prev) => {
      const ex = [...prev[exId]];
      ex[setIdx] = { ...ex[setIdx], done: !ex[setIdx].done };
      return { ...prev, [exId]: ex };
    });
  }

  function updateSet(exId: string, setIdx: number, field: 'reps' | 'weight', val: string) {
    setSetLogs((prev) => {
      const ex = [...prev[exId]];
      ex[setIdx] = { ...ex[setIdx], [field]: parseFloat(val) || 0 };
      return { ...prev, [exId]: ex };
    });
  }

  const totalSets = workout ? workout.exercises.reduce((s, e) => s + e.sets, 0) : 0;
  const doneSets = Object.values(setLogs).flat().filter((s) => s.done).length;

  async function finishWorkout() {
    if (!activeWorkout) return;
    setIsSaving(true);
    try {
      // Build best weights per exercise
      const weights: Record<string, number> = {};
      for (const [exId, sets] of Object.entries(setLogs)) {
        const maxW = Math.max(...sets.map((s) => s.weight));
        if (maxW > 0) weights[exId] = maxW;
      }
      await logSession({
        type: 'gym',
        module: `workout_${activeWorkout}`,
        durationMinutes: 60,
        date: selectedDate,
        deepWork: false,
        distractionCount: 0,
        notesText: JSON.stringify({ workout: activeWorkout, weights, sets: setLogs }),
      });
      setActiveWorkout(null);
      setSetLogs({});
    } finally {
      setIsSaving(false);
    }
  }

  // ── ACTIVE WORKOUT VIEW ──────────────────────────────────────────────────────
  if (activeWorkout && workout) {
    return (
      <div className="p-4 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{workout.label}</h1>
            <p className="text-sm text-muted-foreground">{workout.focus}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-accent">{doneSets}/{totalSets}</p>
            <p className="text-xs text-muted-foreground">sets done</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%` }}
          />
        </div>

        <div className="space-y-3 mb-6">
          {workout.exercises.map((ex) => {
            const exLog = setLogs[ex.id] || [];
            const allDone = exLog.every((s) => s.done);
            const isExpanded = expandedEx === ex.id;

            return (
              <Card key={ex.id} className={`overflow-hidden transition-all ${allDone ? 'opacity-70' : ''}`}>
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedEx(isExpanded ? null : ex.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${allDone ? 'bg-accent border-accent' : 'border-muted-foreground/40'}`}>
                      {allDone && <Check className="w-3 h-3 text-accent-foreground" />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-sm">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.sets} × {ex.reps}{(ex as any).isTime ? 's' : ' reps'}
                        {exLog[0]?.weight > 0 ? ` @ ${exLog[0].weight}kg` : ''}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border">
                    {/* Weight row (shared for all sets) */}
                    {ex.startWeight > 0 && (
                      <div className="flex items-center gap-2 pt-3">
                        <span className="text-xs text-muted-foreground w-16">Weight (kg)</span>
                        <Input
                          type="number"
                          className="h-8 w-24 text-sm"
                          value={exLog[0]?.weight ?? ex.startWeight}
                          onChange={(e) => {
                            exLog.forEach((_, i) => updateSet(ex.id, i, 'weight', e.target.value));
                          }}
                        />
                      </div>
                    )}

                    {/* Sets */}
                    <div className="space-y-2 pt-2">
                      {exLog.map((set, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-12">Set {i + 1}</span>
                          <Input
                            type="number"
                            className="h-8 w-20 text-sm"
                            value={set.reps}
                            onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)}
                          />
                          <span className="text-xs text-muted-foreground">{(ex as any).isTime ? 'sec' : 'reps'}</span>
                          <button
                            onClick={() => toggleSet(ex.id, i)}
                            className={`ml-auto w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                              set.done ? 'bg-accent border-accent' : 'border-muted-foreground/40 hover:border-accent'
                            }`}
                          >
                            {set.done && <Check className="w-3 h-3 text-accent-foreground" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={finishWorkout}
            disabled={isSaving || doneSets === 0}
          >
            {isSaving ? 'Saving...' : `✓ Finish Workout (${doneSets}/${totalSets} sets)`}
          </Button>
          <Button variant="outline" onClick={() => setActiveWorkout(null)}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── HOME VIEW ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Gym</h1>
        <p className="text-muted-foreground">Full Body 3×/week — StrongLifts A/B</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{weekGymCount}/3</p>
          <p className="text-xs text-muted-foreground mt-1">Sessions this week</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-accent">{nextWorkout}</p>
          <p className="text-xs text-muted-foreground mt-1">Next workout</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{gymSessions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
        </Card>
      </div>

      {/* Next workout card */}
      <Card className="p-6 mb-4 border-accent/30 bg-accent/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Up next</p>
            <h2 className="text-xl font-bold text-foreground">{PROGRAM[nextWorkout].label}</h2>
            <p className="text-sm text-muted-foreground">{PROGRAM[nextWorkout].focus}</p>
          </div>
          <Dumbbell className="w-8 h-8 text-accent" />
        </div>

        <div className="space-y-2 mb-5">
          {PROGRAM[nextWorkout].exercises.map((ex) => {
            const prevW = previousWeights[ex.id];
            return (
              <div key={ex.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{ex.name}</span>
                <span className="text-muted-foreground">
                  {ex.sets}×{ex.reps}{(ex as any).isTime ? 's' : ''}
                  {prevW ? ` @ ${prevW}kg` : ex.startWeight > 0 ? ` @ ${ex.startWeight}kg` : ''}
                </span>
              </div>
            );
          })}
        </div>

        <Button
          className="w-full"
          onClick={() => startWorkout(nextWorkout)}
          disabled={todayDone}
        >
          {todayDone ? '✓ Already logged today' : `Start ${PROGRAM[nextWorkout].label}`}
        </Button>
      </Card>

      {/* Alternate workout */}
      {!todayDone && (
        <button
          onClick={() => startWorkout(nextWorkout === 'A' ? 'B' : 'A')}
          className="text-sm text-muted-foreground hover:text-foreground underline w-full text-center"
        >
          Or start {PROGRAM[nextWorkout === 'A' ? 'B' : 'A'].label} instead
        </button>
      )}

      {/* Progressive overload reminder */}
      <Card className="mt-8 p-4 border-muted">
        <p className="text-sm font-semibold text-foreground mb-1">📈 Progressive Overload Rule</p>
        <p className="text-xs text-muted-foreground">
          If you complete all reps cleanly → add <strong className="text-foreground">+2.5kg</strong> next session.
          If you fail → repeat the same weight. Never skip the squat.
        </p>
      </Card>

      {/* Recent sessions */}
      {gymSessions.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold text-foreground mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {gymSessions.slice(0, 5).map((s) => {
              let parsed: any = {};
              try { parsed = JSON.parse(s.notesText || '{}'); } catch {}
              return (
                <Card key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Workout {parsed.workout || '?'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs text-accent font-semibold">{s.durationMinutes}m</span>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
