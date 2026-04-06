"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLifeOsStore } from "@/store/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getWeekStart,
  getWeekEnd,
  getBlocksForDay,
  getDayOfWeek,
  isSameDay,
  sortBlocksByTime,
  getCategoryColor,
  timeStringToMinutes,
} from "@/lib/utils-schedule";
import {
  Zap,
  Target,
  Flame,
  BookOpen,
  Dumbbell,
  Keyboard,
  Focus,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const sessions = useLifeOsStore((s) => s.sessions);
  const modules = useLifeOsStore((s) => s.modules);
  const habits = useLifeOsStore((s) => s.habits);
  const debtTasks = useLifeOsStore((s) => s.debtTasks);
  const baseScheduleBlocks = useLifeOsStore((s) => s.baseScheduleBlocks);
  const selectedDate = useLifeOsStore((s) => s.selectedDate);
  const calculateExecutionScore = useLifeOsStore(
    (s) => s.calculateExecutionScore,
  );
  const checkInHabit = useLifeOsStore((s) => s.checkInHabit);

  const now = new Date();
  const hour = now.getHours();

  const [userName, setUserName] = React.useState('Sidali');
  React.useEffect(() => {
    const saved = localStorage.getItem('lifeos_username');
    if (saved) setUserName(saved);
  }, []);

  const greeting = useMemo(() => {
    if (hour < 12) return `Good morning, ${userName} 🌅`;
    if (hour < 17) return `Good afternoon, ${userName} ☀️`;
    if (hour < 21) return `Good evening, ${userName} 🌆`;
    return `Still grinding, ${userName} 🌙`;
  }, [hour, userName]);

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => getWeekEnd(selectedDate), [selectedDate]);
  const executionScore = calculateExecutionScore(weekStart, weekEnd);

  const scoreColor =
    executionScore >= 70
      ? "text-green-400"
      : executionScore >= 40
        ? "text-yellow-400"
        : "text-red-400";
  const scoreBg =
    executionScore >= 70
      ? "from-green-500/10"
      : executionScore >= 40
        ? "from-yellow-500/10"
        : "from-red-500/10";

  // Today's blocks
  const todayDayOfWeek = getDayOfWeek(now);
  const todayBlocks = useMemo(
    () => sortBlocksByTime(getBlocksForDay(baseScheduleBlocks, todayDayOfWeek)),
    [baseScheduleBlocks, todayDayOfWeek],
  );

  // Completed blocks today
  const completedBlockIds = useMemo(() => {
    return new Set(
      sessions
        .filter((s) => s.type === "block_complete" && isSameDay(s.date, now))
        .map((s) => s.module),
    );
  }, [sessions, now]);

  const completedCount = useMemo(() => {
    // Week-level: total block_complete sessions this week
    return sessions.filter(
      (s) =>
        s.type === "block_complete" &&
        s.date >= weekStart &&
        s.date <= weekEnd,
    ).length;
  }, [sessions, weekStart, weekEnd]);

  const totalBlocks = useMemo(() => {
    // Week-level: total fixed blocks scheduled across all 7 days
    let count = 0;
    const cursor = new Date(weekStart);
    while (cursor <= weekEnd) {
      const jsDay = cursor.getDay();
      const dayOfWeek = (jsDay + 6) % 7;
      count += baseScheduleBlocks.filter(
        (b) => b.dayOfWeek === dayOfWeek && b.timeKind === "fixed",
      ).length;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }, [baseScheduleBlocks, weekStart, weekEnd]);

  const todayCompletedCount = completedBlockIds.size;
  const todayTotalBlocks = todayBlocks.length;
  const progressPct =
    todayTotalBlocks > 0
      ? Math.round((todayCompletedCount / todayTotalBlocks) * 100)
      : 0;

  // Circular progress SVG
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference - (progressPct / 100) * circumference;

  // Next upcoming blocks (fixed time, after now, not completed)
  const currentMins = hour * 60 + now.getMinutes();
  const upcomingBlocks = useMemo(
    () =>
      todayBlocks
        .filter((b) => {
          if (b.timeKind !== "fixed" || !b.startTime) return false;
          const blockMins = timeStringToMinutes(b.startTime);
          return blockMins > currentMins && !completedBlockIds.has(b.id);
        })
        .slice(0, 3),
    [todayBlocks, currentMins, completedBlockIds],
  );

  // Best habit streak
  const bestStreak = useMemo(() => {
    let best = { name: "", streak: 0 };
    for (const h of habits) {
      if ((h.currentStreak ?? 0) > best.streak) {
        best = { name: h.name, streak: h.currentStreak ?? 0 };
      }
    }
    return best;
  }, [habits]);

  // Habits done today
  const habitsDoneToday = useMemo(
    () =>
      habits.filter((h) =>
        h.completionDates?.some((d) => isSameDay(new Date(d), now)),
      ).length,
    [habits, now],
  );

  // This week stats
  const weekSessions = useMemo(
    () => sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd),
    [sessions, weekStart, weekEnd],
  );

  const studyHours = useMemo(
    () =>
      Math.round(
        (weekSessions
          .filter((s) => ["focus", "study", "block_complete"].includes(s.type))
          .reduce((sum, s) => sum + s.durationMinutes, 0) /
          60) *
          10,
      ) / 10,
    [weekSessions],
  );

  const gymCount = useMemo(
    () => weekSessions.filter((s) => s.type === "gym").length,
    [weekSessions],
  );

  const pendingDebt = useMemo(
    () => debtTasks.filter((t) => t.status === "pending"),
    [debtTasks],
  );

  // Module progress
  const topModules = useMemo(
    () =>
      [...modules]
        .sort((a, b) => (b.isCritical ? 1 : 0) - (a.isCritical ? 1 : 0))
        .slice(0, 4)
        .map((m) => {
          const hours =
            Math.round(
              (weekSessions
                .filter((s) => s.module === m.code)
                .reduce((sum, s) => sum + s.durationMinutes, 0) /
                60) *
                10,
            ) / 10;
          const target = m.targetHoursPerWeek ?? 10;
          const pct = Math.min(Math.round((hours / target) * 100), 100);
          const color =
            pct >= 70
              ? "bg-green-500"
              : pct >= 30
                ? "bg-yellow-500"
                : "bg-red-500";
          return { ...m, hours, target, pct, color };
        }),
    [modules, weekSessions],
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-1">{greeting}</h1>
        <p className="text-muted-foreground">
          {now.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ROW 1 — Hero stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Execution Score */}
        <Card className={`p-6 bg-gradient-to-br ${scoreBg} to-transparent`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              Execution Score
            </span>
          </div>
          <div className={`text-6xl font-bold mb-1 ${scoreColor}`}>
            {executionScore}%
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {completedCount} of {totalBlocks} blocks done this week
          </p>
          {/* Progress bar */}
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                executionScore >= 70 ? 'bg-green-400' : executionScore >= 40 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${executionScore}%` }}
            />
          </div>
        </Card>

        {/* Today's Progress */}
        <Card className="p-6 flex items-center gap-6">
          <svg width="100" height="100" className="flex-shrink-0">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dy="0.35em"
              className="fill-foreground text-sm font-bold"
              fontSize="16"
            >
              {progressPct}%
            </text>
          </svg>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">
                Today's Progress
              </span>
            </div>
            <div className={`text-3xl font-bold text-foreground`}>
              {todayCompletedCount} / {todayTotalBlocks}
            </div>
            <p className="text-sm text-muted-foreground">blocks done</p>
          </div>
        </Card>

        {/* Best Streak */}
        <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-muted-foreground font-medium">
              Best Streak
            </span>
          </div>
          <div className="text-6xl font-bold text-orange-400 mb-1">
            {bestStreak.streak} 🔥
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {bestStreak.name || "No habits yet"}
          </p>
        </Card>
      </div>

      {/* ROW 2 — Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Next blocks */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Next Blocks</h3>
              <button
                onClick={() => router.push("/today")}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {upcomingBlocks.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  All done for today! 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingBlocks.map((block) => {
                  const color = getCategoryColor(block.category);
                  return (
                    <div
                      key={block.id}
                      style={{
                        borderLeft: `4px solid ${color}`,
                        backgroundColor: color + "15",
                      }}
                      className="px-3 py-2 rounded-r"
                    >
                      <p className="font-medium text-sm text-foreground">
                        {block.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {block.startTime}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Habits today */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Habits Today</h3>
              <span className="text-xs text-muted-foreground">
                {habitsDoneToday}/{habits.length} done
              </span>
            </div>
            {habits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No habits configured
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {habits.map((habit) => {
                  const done = habit.completionDates?.some((d) =>
                    isSameDay(new Date(d), now),
                  );
                  return (
                    <button
                      key={habit.id}
                      onClick={() => !done && checkInHabit(habit.id)}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all
                        ${done ? "bg-accent border-accent text-accent-foreground" : "border-muted-foreground/30 hover:border-accent"}`}
                      >
                        {done ? "✓" : ""}
                      </div>
                      <span className="text-[10px] text-muted-foreground max-w-[48px] text-center truncate">
                        {habit.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* This week stats */}
          <Card className="p-5">
            <h3 className="font-semibold text-foreground mb-4">This Week</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-foreground">
                  {studyHours}h
                </p>
                <p className="text-xs text-muted-foreground">Study Hours</p>
              </div>
              <div
                className={`rounded-lg p-3 ${gymCount < 3 ? "bg-orange-500/10" : "bg-secondary/50"}`}
              >
                <p
                  className={`text-2xl font-bold ${gymCount < 3 ? "text-orange-400" : "text-foreground"}`}
                >
                  {gymCount}
                </p>
                <p className="text-xs text-muted-foreground">Gym Sessions</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-foreground">
                  {habitsDoneToday}
                </p>
                <p className="text-xs text-muted-foreground">Habits Done</p>
              </div>
              <div
                className={`rounded-lg p-3 ${pendingDebt.length > 0 ? "bg-red-500/10" : "bg-secondary/50"}`}
              >
                <p
                  className={`text-2xl font-bold ${pendingDebt.length > 0 ? "text-red-400" : "text-foreground"}`}
                >
                  {pendingDebt.length}
                </p>
                <p className="text-xs text-muted-foreground">Debt Tasks</p>
              </div>
            </div>
          </Card>

          {/* Module progress */}
          <Card className="p-5">
            <h3 className="font-semibold text-foreground mb-4">
              Module Progress
            </h3>
            <div className="space-y-3">
              {topModules.map((m) => (
                <div key={m.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      {m.code}
                      {m.isCritical && (
                        <span className="text-[10px] text-red-400 font-bold">
                          CRIT
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {m.hours}h / {m.target}h
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.color} rounded-full transition-all`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
              {modules.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No modules configured
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ROW 3 — Bottom */}
      <div className="space-y-4">
        {/* Debt alert */}
        {pendingDebt.length > 0 ? (
          <Card className="p-5 border-orange-500/50 bg-orange-500/5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-400 mb-1">
                    ⚠️ {pendingDebt.length} Pending Debt Tasks
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {pendingDebt.slice(0, 5).map((t) => (
                      <span
                        key={t.id}
                        className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded"
                      >
                        {t.module}
                      </span>
                    ))}
                    {pendingDebt.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{pendingDebt.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/debt")}
                className="border-orange-500/50 text-orange-400"
              >
                View all →
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="text-green-400 font-medium">
                No debt — you're clean! ✅
              </p>
            </div>
          </Card>
        )}

        {/* Quick actions */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 border-accent/30 hover:bg-accent/10"
              onClick={() => router.push("/focus")}
            >
              <Focus className="w-5 h-5 text-accent" />
              <span className="text-xs">Focus Session</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 border-orange-500/30 hover:bg-orange-500/10"
              onClick={() => router.push("/gym")}
            >
              <Dumbbell className="w-5 h-5 text-orange-400" />
              <span className="text-xs">Log Workout</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 border-purple-500/30 hover:bg-purple-500/10"
              onClick={() => router.push("/quran")}
            >
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span className="text-xs">Quran</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 border-red-500/30 hover:bg-red-500/10"
              onClick={() => router.push("/typing")}
            >
              <Keyboard className="w-5 h-5 text-red-400" />
              <span className="text-xs">Typing</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
