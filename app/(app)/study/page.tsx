'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { getWeekStart, getWeekEnd, isSameDay } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, X, Timer, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudyPage() {
  const modules = useLifeOsStore((state) => state.modules);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const sessions = useLifeOsStore((state) => state.sessions);
  const logSession = useLifeOsStore((state) => state.logSession);
  const isLoading = useLifeOsStore((state) => state.isLoading);
  const router = useRouter();

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [logDuration, setLogDuration] = useState<string>('');
  const [logNotes, setLogNotes] = useState<string>('');
  const [isLoggingSession, setIsLoggingSession] = useState(false);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);

  const getModuleHours = (moduleCode: string) =>
    sessions
      .filter((s) => s.module === moduleCode && s.date >= weekStart && s.date <= weekEnd)
      .reduce((sum, s) => sum + s.durationMinutes, 0) / 60;

  const getTodayMinutes = (moduleCode: string) =>
    sessions
      .filter((s) => s.module === moduleCode && isSameDay(s.date, selectedDate))
      .reduce((sum, s) => sum + s.durationMinutes, 0);

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
    } catch (e) {
      console.error(e);
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

  const totalStudyMinsToday = sessions
    .filter((s) => isSameDay(s.date, selectedDate) && s.type === 'module_study')
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Study Modules</h1>
          <p className="text-muted-foreground">
            {totalStudyMinsToday > 0
              ? `${(totalStudyMinsToday / 60).toFixed(1)}h logged today`
              : 'No sessions logged today yet'}
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => router.push('/focus')}>
          <Timer className="w-4 h-4" />
          Start Focus Timer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...modules]
          .sort((a, b) => b.priorityScore - a.priorityScore)
          .map((module) => {
            const hoursThisWeek = getModuleHours(module.code);
            const todayMinutes = getTodayMinutes(module.code);
            const progressPercent = Math.min((hoursThisWeek / (module.targetHoursPerWeek || 1)) * 100, 100);
            const isSelected = selectedModule === module.code;

            let priorityLabel = 'LOW';
            let priorityColor = 'bg-gray-900/30 text-gray-400';
            if (module.priorityScore >= 150) { priorityLabel = 'CRITICAL'; priorityColor = 'bg-destructive/30 text-destructive'; }
            else if (module.priorityScore >= 60) { priorityLabel = 'HIGH'; priorityColor = 'bg-yellow-900/30 text-yellow-400'; }
            else if (module.priorityScore >= 30) { priorityLabel = 'MEDIUM'; priorityColor = 'bg-green-900/30 text-green-400'; }

            return (
              <Card key={module.id} className={`p-5 transition-all ${isSelected ? 'ring-2 ring-accent border-accent' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{module.code}</h3>
                    <p className="text-xs text-muted-foreground">{module.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${priorityColor}`}>
                    {priorityLabel}
                  </span>
                </div>

                {/* Today badge */}
                {todayMinutes > 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">{todayMinutes}m logged today</span>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-secondary/50 rounded p-2">
                    <p className="text-muted-foreground">Coeff</p>
                    <p className="font-bold text-foreground">{module.coefficient}</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-2">
                    <p className="text-muted-foreground">Weakness</p>
                    <p className="font-bold text-foreground">{module.weakness}%</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-2">
                    <p className="text-muted-foreground">Priority</p>
                    <p className="font-bold text-foreground">{module.priorityScore}</p>
                  </div>
                </div>

                {/* Weekly progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">This week</span>
                    <span className="text-xs font-medium text-foreground">
                      {hoursThisWeek.toFixed(1)}h / {module.targetHoursPerWeek}h
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5" />
                </div>

                {/* Action */}
                {!isSelected ? (
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={() => setSelectedModule(module.code)}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Log Session
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => router.push('/focus')} title="Open focus timer">
                      <Timer className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-secondary/50 rounded-md border border-secondary">
                    <div>
                      <Label className="text-xs">Duration (minutes)</Label>
                      <Input
                        type="number" placeholder="45"
                        value={logDuration}
                        onChange={(e) => setLogDuration(e.target.value)}
                        className="mt-1" autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Notes (optional)</Label>
                      <Input
                        placeholder="What did you study?"
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={handleLogSession} disabled={!logDuration || isLoggingSession}>
                        {isLoggingSession ? 'Saving...' : 'Save Session'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedModule(null)}>
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
