'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { isSameDay, getWeekStart, getWeekEnd } from '@/lib/utils-schedule';
import { ensureDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { Dumbbell, Plus, X } from 'lucide-react';

const WORKOUT_TYPES = [
  { value: 'strength', label: 'Strength Training' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility/Stretching' },
  { value: 'sport', label: 'Sport' },
];

export default function GymPage() {
  const sessions = useLifeOsStore((state) => state.sessions);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const logSession = useLifeOsStore((state) => state.logSession);

  const [showForm, setShowForm] = useState(false);
  const [workoutType, setWorkoutType] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const todayGymSessions = sessions.filter(
    (s) => isSameDay(s.date, selectedDate) && s.type === 'gym'
  );
  
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekGymSessions = sessions.filter(s =>
    s.type === 'gym' &&
    s.date.getTime() >= weekStart.getTime() &&
    s.date.getTime() <= weekEnd.getTime()
  );

  const handleSubmit = async () => {
    if (!workoutType || !duration) return;

    setIsLoading(true);
    try {
      await logSession({
        type: 'gym',
        module: workoutType,
        durationMinutes: parseInt(duration),
        date: selectedDate,
        notesText: notes,
        deepWork: false,
        distractionCount: 0,
      });
      setWorkoutType('');
      setDuration('');
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error('[v0] Failed to log workout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Gym Tracking</h1>
          <p className="text-muted-foreground">Log your workouts and track fitness progress</p>
        </div>
        <Dumbbell className="w-8 h-8 text-accent" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-2xl font-bold text-foreground">
            {todayGymSessions.length} session{todayGymSessions.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {todayGymSessions.reduce((sum, s) => sum + s.durationMinutes, 0)}m total
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold text-foreground">{weekGymSessions.length}</p>
          <p className="text-xs text-muted-foreground">
            {weekGymSessions.reduce((sum, s) => sum + s.durationMinutes, 0)}m logged
          </p>
        </Card>
      </div>

      {/* Template Buttons */}
      {!showForm && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setWorkoutType('strength');
              setDuration('60');
              setShowForm(true);
            }}
          >
            Day 1 (Wed)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setWorkoutType('strength');
              setDuration('50');
              setShowForm(true);
            }}
          >
            Day 2 (Sat)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setWorkoutType('cardio');
              setDuration('30');
              setShowForm(true);
            }}
          >
            Day 3 (Sun)
          </Button>
        </div>
      )}

      {/* Log Workout Form */}
      {!showForm ? (
        <Button className="w-full gap-2 mb-8" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Log Workout
        </Button>
      ) : (
        <Card className="p-6 mb-8 border-accent/50">
          <div className="space-y-4">
            <div>
              <Label htmlFor="workout-type">Type</Label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger id="workout-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g., Felt strong, PR on bench"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={!workoutType || !duration || isLoading}
              >
                Log Workout
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowForm(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Sessions List */}
      {todayGymSessions.length === 0 && !showForm ? (
        <EmptyState
          icon="🏋️"
          title="No workouts today"
          description="Start by logging your first workout of the day."
          actionLabel="Log Workout"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Today's Workouts</h3>
          <div className="space-y-3">
            {todayGymSessions.map((session) => (
              <Card key={session.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground capitalize">
                      {session.module.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.durationMinutes}m {session.notes && `• ${session.notes}`}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-accent">
                    {ensureDate(session.startTime)?.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    }) ?? 'Unknown time'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Overload Rule Card */}
      <Card className="mt-12 p-6 border-accent/50 bg-accent/5">
        <h4 className="font-bold text-foreground mb-2">Progressive Overload Rule</h4>
        <p className="text-sm text-muted-foreground">
          <strong>+2.5kg or +1 rep per week.</strong> Log your progress in session notes to track overload over time.
        </p>
      </Card>
    </div>
  );
}
