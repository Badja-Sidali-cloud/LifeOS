'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { getWeekStart, getWeekEnd } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, X } from 'lucide-react';

export default function StudyPage() {
  const modules = useLifeOsStore((state) => state.modules);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const sessions = useLifeOsStore((state) => state.sessions);
  const logSession = useLifeOsStore((state) => state.logSession);
  const isLoading = useLifeOsStore((state) => state.isLoading);

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [logDuration, setLogDuration] = useState<string>('');
  const [logNotes, setLogNotes] = useState<string>('');
  const [isLoggingSession, setIsLoggingSession] = useState(false);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);

  const getModuleHours = (moduleCode: string) => {
    const weekSessions = sessions.filter(
      (s) =>
        s.module === moduleCode &&
        s.date.getTime() >= weekStart.getTime() &&
        s.date.getTime() <= weekEnd.getTime()
    );
    return weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
  };

  const handleLogSession = async () => {
    if (!selectedModule || !logDuration) return;

    setIsLoggingSession(true);
    try {
      await logSession({
        type: 'module_study',
        module: selectedModule,
        durationMinutes: parseInt(logDuration),
        date: selectedDate,
        deepWork: true,
        distractionCount: 0,
        notesText: logNotes,
      });
      setLogDuration('');
      setLogNotes('');
      setSelectedModule(null);
    } catch (error) {
      console.error('[v0] Failed to log session:', error);
    } finally {
      setIsLoggingSession(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading modules...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Study Modules</h1>
        <p className="text-muted-foreground">Track your progress across all courses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...modules]
          .sort((a, b) => b.priorityScore - a.priorityScore)
          .map((module) => {
            const hoursThisWeek = getModuleHours(module.code);
            const progressPercent = Math.min((hoursThisWeek / module.targetHoursPerWeek) * 100, 100);
            const isSelected = selectedModule === module.code;

            // Priority badge logic
            let priorityLabel = 'LOW';
            let priorityColor = 'bg-gray-900/30 text-gray-400';
            
            if (module.priorityScore >= 7.0) {
              priorityLabel = 'CRITICAL';
              priorityColor = 'bg-destructive/30 text-destructive';
            } else if (module.priorityScore >= 5.5) {
              priorityLabel = 'HIGH';
              priorityColor = 'bg-yellow-900/30 text-yellow-400';
            } else if (module.priorityScore >= 4.0) {
              priorityLabel = 'MEDIUM';
              priorityColor = 'bg-green-900/30 text-green-400';
            }

            return (
              <Card
                key={module.id}
                className={`p-6 transition-all ${isSelected ? 'ring-2 ring-accent border-accent' : ''}`}
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{module.code}</h3>
                      <p className="text-sm text-muted-foreground">{module.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded whitespace-nowrap font-semibold ${priorityColor}`}>
                      {priorityLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-secondary/50 rounded p-2">
                      <p className="text-muted-foreground">Coeff</p>
                      <p className="font-bold text-foreground">{module.coefficient}</p>
                    </div>
                    <div className="bg-secondary/50 rounded p-2">
                      <p className="text-muted-foreground">Weakness</p>
                      <p className="font-bold text-foreground">{module.weakness}</p>
                    </div>
                    <div className="bg-secondary/50 rounded p-2">
                      <p className="text-muted-foreground">Priority</p>
                      <p className="font-bold text-foreground">{module.priorityScore.toFixed(1)}</p>
                    </div>
                  </div>
                </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {hoursThisWeek.toFixed(1)}h / {module.targetHoursPerWeek}h
                  </span>
                  <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Log Button / Form */}
              {!isSelected ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setSelectedModule(module.code)}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Log Session
                </Button>
              ) : (
                <div className="space-y-3 p-4 bg-secondary/50 rounded-md border border-secondary">
                  <div>
                    <Label htmlFor={`duration-${module.code}`} className="text-xs">
                      Duration (minutes)
                    </Label>
                    <Input
                      id={`duration-${module.code}`}
                      type="number"
                      placeholder="45"
                      value={logDuration}
                      onChange={(e) => setLogDuration(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`notes-${module.code}`} className="text-xs">
                      Notes (optional)
                    </Label>
                    <Input
                      id={`notes-${module.code}`}
                      placeholder="What did you study?"
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleLogSession}
                      disabled={!logDuration || isLoggingSession}
                    >
                      Save Session
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedModule(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
