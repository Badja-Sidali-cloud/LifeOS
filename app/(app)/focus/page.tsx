'use client';

import { useEffect, useState, useRef } from 'react';
import { useLifeOsStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus, RotateCcw, Coffee } from 'lucide-react';

type TimerMode = 'focus' | 'short_break' | 'long_break';

interface CompletedEntry {
  mode: TimerMode;
  duration: number;
  distractions: number;
  time: string;
  module?: string;
}

function playBeep(mode: TimerMode) {
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = mode === 'focus' ? 880 : 440;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {}
}

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'FOCUS',
  short_break: 'SHORT BREAK',
  long_break: 'LONG BREAK',
};

const BREAK_DURATIONS: Record<'short_break' | 'long_break', number> = {
  short_break: 5,
  long_break: 15,
};

export default function FocusPage() {
  const modules = useLifeOsStore((state) => state.modules);
  const logSession = useLifeOsStore((state) => state.logSession);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);

  const [timerDuration, setTimerDuration] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [distractionCount, setDistractionCount] = useState(0);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [completedSessions, setCompletedSessions] = useState<CompletedEntry[]>([]);

  // Refs to avoid stale closures inside interval
  const selectedModuleRef = useRef(selectedModule);
  const distractionCountRef = useRef(distractionCount);
  const timerDurationRef = useRef(timerDuration);
  const timerModeRef = useRef(timerMode);

  useEffect(() => { selectedModuleRef.current = selectedModule; }, [selectedModule]);
  useEffect(() => { distractionCountRef.current = distractionCount; }, [distractionCount]);
  useEffect(() => { timerDurationRef.current = timerDuration; }, [timerDuration]);
  useEffect(() => { timerModeRef.current = timerMode; }, [timerMode]);

  const logSessionRef = useRef(logSession);
  useEffect(() => { logSessionRef.current = logSession; }, [logSession]);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  // Timer useEffect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          const mode = timerModeRef.current;
          const dur = timerDurationRef.current;
          const mod = selectedModuleRef.current;
          const dist = distractionCountRef.current;

          playBeep(mode);

          if (mode === 'focus') {
            // Log session if module selected
            if (mod) {
              logSessionRef.current({
                type: 'focus',
                module: mod,
                durationMinutes: dur,
                deepWork: true,
                distractionCount: dist,
                notesText: `Pomodoro – ${dur}m`,
                date: selectedDateRef.current,
              });
            }
            // Add to completed sessions
            setCompletedSessions((prev) => [
              ...prev,
              {
                mode: 'focus',
                duration: dur,
                distractions: dist,
                time: new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                }),
                module: mod || undefined,
              },
            ]);
            setIsRunning(false);
            setShowBreakPrompt(true);
            return 0;
          } else {
            // Break finished
            setCompletedSessions((prev) => [
              ...prev,
              {
                mode,
                duration: BREAK_DURATIONS[mode as 'short_break' | 'long_break'],
                distractions: 0,
                time: new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                }),
              },
            ]);
            setTimerMode('focus');
            setTimeRemaining(timerDurationRef.current * 60);
            setIsRunning(false);
            return timerDurationRef.current * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, selectedDate]);

  const startBreak = (mode: 'short_break' | 'long_break') => {
    const breakDur = BREAK_DURATIONS[mode];
    setTimerMode(mode);
    setTimeRemaining(breakDur * 60);
    setShowBreakPrompt(false);
    setIsRunning(true);
  };

  const skipBreak = () => {
    setTimerMode('focus');
    setTimeRemaining(timerDuration * 60);
    setShowBreakPrompt(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimerMode('focus');
    setTimeRemaining(timerDuration * 60);
    setDistractionCount(0);
    setShowBreakPrompt(false);
  };

  const handleDurationPreset = (val: number) => {
    if (isRunning) return;
    setTimerDuration(val);
    setTimeRemaining(val * 60);
    setCustomDuration('');
  };

  const handleCustomDuration = (val: string) => {
    setCustomDuration(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed > 0) {
      setTimerDuration(parsed);
      setTimeRemaining(parsed * 60);
    }
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const isFocus = timerMode === 'focus';
  const isBreak = !isFocus;

  // Card gradient based on mode
  const cardClass = isFocus
    ? 'bg-gradient-to-br from-accent/10 to-transparent border-accent/50'
    : 'bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/50';

  const modeColor = isFocus ? 'text-accent' : 'text-blue-400';

  if (showBreakPrompt) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Focus Mode</h1>
          <p className="text-muted-foreground">Deep work sessions with distraction tracking</p>
        </div>

        <Card className="p-8 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/50 text-center">
          <Coffee className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-1">Session complete! 🎉</h2>
          <p className="text-muted-foreground mb-8">Take a break?</p>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
              onClick={() => startBreak('short_break')}
            >
              5 min break
            </Button>
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              size="lg"
              onClick={() => startBreak('long_break')}
            >
              15 min break
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={skipBreak}
            >
              Skip
            </Button>
          </div>
        </Card>

        {/* Session history */}
        {completedSessions.length > 0 && (
          <SessionHistory sessions={completedSessions} />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Focus Mode</h1>
        <p className="text-muted-foreground">Deep work sessions with distraction tracking</p>
      </div>

      <Card className={`p-8 ${cardClass}`}>
        {/* Mode label */}
        <p className={`text-center text-xs font-bold uppercase tracking-widest mb-4 ${modeColor}`}>
          {MODE_LABELS[timerMode]}
        </p>

        {/* Clock */}
        <div className="text-center mb-8">
          <div className={`text-8xl font-bold font-mono ${modeColor} tabular-nums`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {/* Focus-only controls */}
        {isFocus && (
          <>
            {/* Module selector */}
            <div className="mb-5">
              <label className="text-sm font-medium text-foreground mb-2 block">Study Module</label>
              <Select value={selectedModule} onValueChange={setSelectedModule} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module…" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.code}>
                      {m.code} — {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration presets */}
            <div className="mb-5">
              <label className="text-sm font-medium text-foreground mb-2 block">Duration</label>
              <div className="flex gap-2 flex-wrap">
                {[25, 50, 60].map((d) => (
                  <Button
                    key={d}
                    variant={timerDuration === d && !customDuration ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDurationPreset(d)}
                    disabled={isRunning}
                  >
                    {d}m
                  </Button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={240}
                  placeholder="Custom"
                  value={customDuration}
                  onChange={(e) => handleCustomDuration(e.target.value)}
                  disabled={isRunning}
                  className="w-20 px-2 py-1 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                />
              </div>
            </div>

            {/* Distraction counter */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-2 block">Distractions</label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDistractionCount((c) => Math.max(0, c - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-bold text-destructive w-10 text-center">{distractionCount}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDistractionCount((c) => c + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Control buttons */}
        <div className="flex gap-4">
          <Button
            className="flex-1"
            size="lg"
            onClick={() => setIsRunning((r) => !r)}
            disabled={isFocus && !selectedModule}
            variant={isRunning ? 'destructive' : 'default'}
          >
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button variant="outline" size="lg" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </Card>

      {/* Session history */}
      {completedSessions.length > 0 && (
        <SessionHistory sessions={completedSessions} />
      )}
    </div>
  );
}

function SessionHistory({ sessions }: { sessions: CompletedEntry[] }) {
  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold text-foreground mb-4">Session History</h3>
      <div className="space-y-2">
        {sessions.map((s, idx) => (
          <Card key={idx} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">
                {MODE_LABELS[s.mode]} — {s.duration}m
                {s.module && <span className="text-muted-foreground ml-1">({s.module})</span>}
              </p>
              <p className="text-xs text-muted-foreground">{s.time}</p>
            </div>
            <div className="text-right">
              {s.mode === 'focus' && (
                s.distractions > 0 ? (
                  <p className="text-sm text-destructive">{s.distractions} distractions</p>
                ) : (
                  <p className="text-sm text-accent">Perfect focus!</p>
                )
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
