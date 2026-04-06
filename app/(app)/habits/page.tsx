'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { isSameDay } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { AddHabitDialog } from '@/components/dialogs/add-habit-dialog';
import { Check, Plus, Trash2 } from 'lucide-react';

export default function HabitsPage() {
  const habits = useLifeOsStore((state) => state.habits);
  const checkInHabit = useLifeOsStore((state) => state.checkInHabit);
  const deleteHabit = useLifeOsStore((state) => state.deleteHabit);
  const isLoading = useLifeOsStore((state) => state.isLoading);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading habits...</p>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Habits</h1>
          <p className="text-muted-foreground">Build and maintain streaks</p>
        </div>
        <EmptyState
          icon="🎯"
          title="No habits yet"
          description="Create your first habit to start building streaks and tracking progress."
          actionLabel="Create Habit"
          onAction={() => setDialogOpen(true)}
        />
        <AddHabitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    );
  }

  const today = new Date();
  const totalDoneToday = habits.filter((h) =>
    (h.completionDates || []).some((d) => isSameDay(new Date(d), today))
  ).length;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-1">Habits</h1>
          <p className="text-muted-foreground">
            {totalDoneToday}/{habits.length} done today
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Habit
        </Button>
      </div>

      <div className="space-y-4">
        {habits.map((habit) => {
          const doneToday = (habit.completionDates || []).some((d) =>
            isSameDay(new Date(d), today)
          );

          // 7-day history
          const history = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - i));
            const isCompleted = (habit.completionDates || []).some((d) =>
              isSameDay(new Date(d), date)
            );
            const isToday = isSameDay(date, today);
            const label = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
            return { date, isCompleted, isToday, label };
          });

          const isDeleting = confirmDelete === habit.id;

          return (
            <Card key={habit.id} className={`p-5 transition-all ${doneToday ? 'border-accent/30 bg-accent/5' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">{habit.name}</h3>
                    {doneToday && <span className="text-xs text-accent font-semibold">✓ Done</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-orange-400">🔥 {habit.currentStreak} day streak</span>
                    <span className="text-xs text-muted-foreground">Best: {habit.longestStreak}d</span>
                    <span className="text-xs px-2 py-0.5 bg-secondary/50 text-muted-foreground rounded">
                      {String(habit.type).replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                {!isDeleting ? (
                  <button
                    onClick={() => setConfirmDelete(habit.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Delete?</span>
                    <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                      onClick={() => { deleteHabit(habit.id); setConfirmDelete(null); }}>
                      Yes
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                      onClick={() => setConfirmDelete(null)}>
                      No
                    </Button>
                  </div>
                )}
              </div>

              {/* 7-day grid */}
              <div className="flex gap-1.5 mb-4">
                {history.map(({ date, isCompleted, isToday, label }) => (
                  <div key={date.toISOString()} className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                      ${isCompleted ? 'bg-accent text-accent-foreground' : 'bg-muted/50 text-muted-foreground'}
                      ${isToday ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''}`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : null}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              {/* Check-in */}
              <Button
                className="w-full"
                variant={doneToday ? 'default' : 'outline'}
                disabled={doneToday}
                onClick={() => checkInHabit(habit.id)}
              >
                {doneToday ? <><Check className="w-4 h-4 mr-2" />Done Today</> : 'Check In Today'}
              </Button>
            </Card>
          );
        })}
      </div>

      <AddHabitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
