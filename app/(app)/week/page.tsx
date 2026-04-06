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

// ── Config ──────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 80;   // px per hour — bigger = more readable
const START_HOUR  = 6;    // 06:00
const END_HOUR    = 24;   // midnight
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SHORT_DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatRange(ws: Date) {
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  const opts = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${opts(ws)} – ${opts(we)}, ${we.getFullYear()}`;
}

export default function WeekPage() {
  const baseScheduleBlocks = useLifeOsStore((s) => s.baseScheduleBlocks);
  const isLoading           = useLifeOsStore((s) => s.isLoading);
  const selectedDate        = useLifeOsStore((s) => s.selectedDate);
  const setSelectedDate     = useLifeOsStore((s) => s.setSelectedDate);
  const router              = useRouter();
  const today               = new Date();

  const [weekStart, setWeekStart] = useState(() => getWeekStart(selectedDate));
  const [now, setNow]             = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday  = () => setWeekStart(getWeekStart(today));

  const nowTop = ((now.getHours() + now.getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT;
  const hours  = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  // Only fixed-time blocks — skip prayer-relative ones
  function colBlocks(dayIdx: number) {
    return sortBlocksByTime(
      getBlocksForDay(baseScheduleBlocks, dayIdx as any).filter(
        (b) => b.timeKind === 'fixed' && b.startTime
      )
    );
  }

  function renderBlock(block: typeof baseScheduleBlocks[0]) {
    if (!block.startTime) return null;
    const startMins = timeStringToMinutes(block.startTime);
    const startH    = startMins / 60;
    if (startH < START_HOUR || startH >= END_HOUR) return null;

    const top    = (startH - START_HOUR) * HOUR_HEIGHT;
    const durMin = block.durationMinutes ?? 60;
    const height = Math.max((durMin / 60) * HOUR_HEIGHT, 24);
    const color  = getCategoryColor(block.category);

    return (
      <div
        key={block.id}
        className="absolute left-0.5 right-0.5 rounded overflow-hidden cursor-default group"
        style={{
          top,
          height,
          borderLeft: `3px solid ${color}`,
          backgroundColor: `${color}25`,
        }}
      >
        <div className="px-1.5 py-0.5 h-full overflow-hidden">
          <p className="font-semibold text-foreground leading-tight"
            style={{ fontSize: height >= 36 ? '12px' : '10px' }}>
            {block.title}
          </p>
          {height >= 40 && block.startTime && (
            <p className="text-muted-foreground leading-tight mt-0.5" style={{ fontSize: '10px' }}>
              {block.startTime}{block.endTime ? `–${block.endTime}` : ''}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Schedule</h1>
          <p className="text-sm text-muted-foreground">{formatRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevWeek} className="p-1.5 rounded hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary transition-colors text-foreground">
            Today
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded hover:bg-secondary transition-colors">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Day headers ── */}
      <div className="flex pl-12 pr-2 shrink-0 border-b border-border">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <button
              key={i}
              onClick={() => { setSelectedDate(day); router.push('/today'); }}
              className={`flex-1 flex flex-col items-center py-2 rounded-t hover:bg-secondary/40 transition-colors ${isToday ? 'text-accent' : 'text-muted-foreground'}`}
            >
              <span className="text-xs font-medium">{SHORT_DAYS[i]}</span>
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mt-0.5 ${isToday ? 'bg-accent text-accent-foreground' : 'text-foreground'}`}>
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-1 overflow-y-auto">

        {/* Time axis */}
        <div className="w-12 shrink-0 relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 text-[10px] text-muted-foreground"
              style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 7 }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1 pr-2">
          {weekDays.map((day, colIdx) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={colIdx}
                className={`flex-1 relative border-l border-border min-w-0 ${isToday ? 'bg-accent/5' : ''}`}
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {/* Hour lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/30"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Blocks */}
                {colBlocks(colIdx).map((b) => renderBlock(b))}

                {/* Current time red line */}
                {isToday && nowTop >= 0 && nowTop <= TOTAL_HOURS * HOUR_HEIGHT && (
                  <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: nowTop }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                    <div className="flex-1 border-t-2 border-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
