'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { isSameDay } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { AddHabitDialog } from '@/components/dialogs/add-habit-dialog';
import { Check, Plus } from 'lucide-react';

export default function HabitsPage() {
  const habits = useLifeOsStore((state) => state.habits);
  const checkInHabit = useLifeOsStore((state) => state.checkInHabit);
  const isLoading = useLifeOsStore((state) => state.isLoading);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading habits...</p>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="p-6 max-w-2xl">
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

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Habits</h1>
          <p className="text-muted-foreground">Build and maintain streaks</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Habit
        </Button>
      </div>

      <div className="space-y-6">
        {habits.map((habit) => {
          const today = new Date();
          const doneToday = (habit.completionDates || []).some(d => isSameDay(new Date(d), today));
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Calculate 7-day history
          const history = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayLabel = days[date.getDay()];
            history.push({ date, dayLabel });
          }

          return (
            <Card key={habit.id} className="p-6">
              <div className="mb-4">
                <h3 className="font-bold text-lg text-foreground">{habit.name}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-sm">
                    <span className="text-2xl font-bold text-accent">🔥 {habit.currentStreak}</span>
                    <span className="text-muted-foreground ml-2">day streak</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Best: {habit.longestStreak} days
                  </div>
                  <span className="text-xs px-2 py-1 bg-secondary/50 text-secondary-foreground rounded">
                    {habit.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* 7-Day History Grid */}
              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-3">Last 7 days</p>
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {history.map(({ date }) => {
                      const isCompleted = (habit.completionDates || []).some(d => isSameDay(new Date(d), date));
                      const isToday = isSameDay(date, today);
                      return (
                        <div key={date.toISOString()} className="text-center">
                          <div className={`w-10 h-10 rounded flex items-center justify-center text-xs font-semibold transition-colors ${
                            isCompleted 
                              ? 'bg-accent text-accent-foreground' 
                              : 'bg-muted text-muted-foreground'
                          } ${isToday ? 'ring-2 ring-accent' : ''}`}>
                            {isCompleted ? <Check className="w-4 h-4" /> : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1">
                    {history.map(({ date, dayLabel }) => (
                      <div key={`${date.toISOString()}-label`} className="w-10 text-center">
                        <p className="text-xs text-muted-foreground">{dayLabel}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Check-in Button */}
              <Button
                className="w-full"
                variant={doneToday ? 'default' : 'outline'}
                disabled={doneToday}
                onClick={() => checkInHabit(habit.id)}
              >
                {doneToday ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Done Today
                  </>
                ) : (
                  'Check In Today'
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      <AddHabitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
