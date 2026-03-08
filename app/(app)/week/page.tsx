'use client';

import { useEffect, useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import {
  getDayName,
  getWeekStart,
  getBlocksForDay,
  sortBlocksByTime,
  getCategoryColor,
  timeStringToMinutes,
} from '@/lib/utils-schedule';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const HOUR_HEIGHT = 64;
const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDateRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const sm = MONTH_NAMES[weekStart.getMonth()];
  const em = MONTH_NAMES[weekEnd.getMonth()];
  if (sm === em) {
    return `${sm} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }
  return `${sm} ${weekStart.getDate()} – ${em} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
}

function isSameDayLocal(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function WeekPage() {
  const baseScheduleBlocks = useLifeOsStore((state) => state.baseScheduleBlocks);
  const isLoading = useLifeOsStore((state) => state.isLoading);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const setSelectedDate = useLifeOsStore((state) => state.setSelectedDate);
  const router = useRouter();

  const today = new Date();

  // Week navigation state
  const [baseDate, setBaseDate] = useState<Date>(() => getWeekStart(selectedDate));

  // Mobile: single day offset within current week (0=Mon … 6=Sun)
  const [mobileDayIdx, setMobileDayIdx] = useState<number>(() => {
    const ws = getWeekStart(selectedDate);
    // find index of today in this week
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      if (isSameDayLocal(d, today)) return i;
    }
    return 0;
  });

  // Current time for the red line
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const weekStart = baseDate;

  // Build array of 7 Dates for this week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const handlePrevWeek = () => {
    setBaseDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setBaseDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    setBaseDate(getWeekStart(today));
    const jsDay = today.getDay(); // 0=Sun
    const monIdx = (jsDay + 6) % 7;
    setMobileDayIdx(monIdx);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    router.push('/today');
  };

  // Current time top offset in px (relative to START_HOUR)
  const currentTimeTop =
    ((currentTime.getHours() + currentTime.getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading week view…</p>
      </div>
    );
  }

  const hours = Array.from({ length: TOTAL_HOURS - 1 }, (_, i) => START_HOUR + i);

  // All label-time blocks for the "Prayer-Relative" section
  const labelBlocks = baseScheduleBlocks.filter((b) => b.timeKind === 'label');

  // Helper to get column blocks for a day index (0=Mon … 6=Sun)
  function getColumnBlocks(dayIdx: number) {
    return sortBlocksByTime(getBlocksForDay(baseScheduleBlocks, dayIdx as any));
  }

  function renderBlock(block: (typeof baseScheduleBlocks)[0], key: string) {
    if (block.timeKind !== 'fixed' || !block.startTime) return null;
    const startMins = timeStringToMinutes(block.startTime);
    const startHourFrac = startMins / 60;
    if (startHourFrac < START_HOUR || startHourFrac >= END_HOUR) return null;

    const top = (startHourFrac - START_HOUR) * HOUR_HEIGHT;
    const heightPx = Math.max(
      ((block.durationMinutes ?? 60) / 60) * HOUR_HEIGHT,
      20
    );
    const color = getCategoryColor(block.category);

    return (
      <div
        key={key}
        className="absolute left-1 right-1 rounded overflow-hidden px-1 py-0.5 text-xs z-10 cursor-default"
        style={{
          top,
          height: heightPx,
          borderLeft: `3px solid ${color}`,
          backgroundColor: `${color}33`,
        }}
      >
        <p className="font-medium truncate leading-none text-foreground">
          {block.title}
        </p>
        {heightPx > 30 && (
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            {block.startTime}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Schedule</h1>
          <p className="text-sm text-muted-foreground">{formatDateRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary transition-colors text-foreground"
          >
            Today
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ─── DESKTOP layout ─── */}
      <div className="hidden md:flex flex-col flex-1 overflow-auto">
        {/* Day headers */}
        <div className="flex">
          {/* Time axis gutter */}
          <div className="w-14 flex-shrink-0" />
          {weekDays.map((day, idx) => {
            const isToday = isSameDayLocal(day, today);
            return (
              <button
                key={idx}
                onClick={() => handleDayClick(day)}
                className={`flex-1 flex flex-col items-center py-2 text-sm font-medium transition-colors hover:bg-secondary/50 rounded-t-md ${
                  isToday ? 'text-accent' : 'text-muted-foreground'
                }`}
              >
                <span>{SHORT_DAYS[idx]}</span>
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mt-0.5 ${
                    isToday
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex overflow-y-auto flex-1 border-t border-border">
          {/* Time axis */}
          <div className="w-14 flex-shrink-0 relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8, height: HOUR_HEIGHT }}
              >
                <span className="text-[10px] text-muted-foreground">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
            <div style={{ height: TOTAL_HOURS * HOUR_HEIGHT }} />
          </div>

          {/* Day columns */}
          {weekDays.map((day, colIdx) => {
            const isToday = isSameDayLocal(day, today);
            const blocks = getColumnBlocks(colIdx);

            return (
              <div
                key={colIdx}
                className={`flex-1 relative border-l border-border ${
                  isToday ? 'bg-accent/5' : ''
                }`}
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {/* Hourly lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/40"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Schedule blocks */}
                {blocks.map((block) => renderBlock(block, block.id))}

                {/* Current time line */}
                {isToday && currentTimeTop >= 0 && currentTimeTop <= TOTAL_HOURS * HOUR_HEIGHT && (
                  <div
                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 border-t-2 border-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MOBILE layout ─── */}
      <div className="md:hidden flex flex-col flex-1">
        {/* Single day navigator */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMobileDayIdx((i) => Math.max(0, i - 1))}
            disabled={mobileDayIdx === 0}
            className="p-2 rounded-md hover:bg-secondary disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {getDayName(mobileDayIdx as 0|1|2|3|4|5|6)}
            </p>
            <p className="text-sm text-muted-foreground">
              {weekDays[mobileDayIdx]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setMobileDayIdx((i) => Math.min(6, i + 1))}
            disabled={mobileDayIdx === 6}
            className="p-2 rounded-md hover:bg-secondary disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile time column */}
        <div className="flex overflow-y-auto flex-1 border-t border-border">
          {/* Time axis */}
          <div className="w-12 flex-shrink-0 relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full flex items-start justify-end pr-1"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}
              >
                <span className="text-[10px] text-muted-foreground">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
            <div style={{ height: TOTAL_HOURS * HOUR_HEIGHT }} />
          </div>

          {/* Single day column */}
          <div
            className={`flex-1 relative border-l border-border ${
              isSameDayLocal(weekDays[mobileDayIdx] ?? today, today) ? 'bg-accent/5' : ''
            }`}
            style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-border/40"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
              />
            ))}
            {getColumnBlocks(mobileDayIdx).map((block) => renderBlock(block, block.id))}
            {isSameDayLocal(weekDays[mobileDayIdx] ?? today, today) &&
              currentTimeTop >= 0 &&
              currentTimeTop <= TOTAL_HOURS * HOUR_HEIGHT && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: currentTimeTop }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                  <div className="flex-1 border-t-2 border-red-500" />
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Prayer-Relative Blocks */}
      {labelBlocks.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Prayer-Relative Blocks
          </h2>
          <div className="flex flex-wrap gap-2">
            {labelBlocks.map((block) => {
              const color = getCategoryColor(block.category);
              return (
                <span
                  key={block.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${color}22`,
                    border: `1px solid ${color}66`,
                    color,
                  }}
                >
                  <span className="text-muted-foreground/80">
                    {getDayName(block.dayOfWeek as 0|1|2|3|4|5|6).slice(0, 3)}
                  </span>
                  {block.title}
                  {block.labelTime && (
                    <span className="opacity-70">@ {block.labelTime}</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
