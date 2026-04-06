import { ScheduleBlock, DayOfWeek } from './schemas';

// ============= Date Utilities =============

/**
 * Get the day of week (0=Monday, 6=Sunday) for a given date
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  // JavaScript's getDay() returns 0=Sunday, convert to Monday-first (0=Monday)
  const jsDay = date.getDay();
  return ((jsDay + 6) % 7) as DayOfWeek;
}

/**
 * Get day name (e.g., "Monday")
 */
export function getDayName(dayOfWeek: DayOfWeek | number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayOfWeek] || 'Unknown';
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get the start of week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = getDayOfWeek(d);
  const diff = d.getDate() - dayOfWeek;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

/**
 * Get the end of week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ============= Schedule Block Utilities =============

/**
 * Filter blocks by day of week
 */
export function getBlocksForDay(blocks: ScheduleBlock[], dayOfWeek: DayOfWeek): ScheduleBlock[] {
  return blocks.filter((block) => block.dayOfWeek === dayOfWeek);
}

/**
 * Sort blocks chronologically by time
 */
export function sortBlocksByTime(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return [...blocks].sort((a, b) => {
    // Fixed blocks first
    if (a.timeKind === 'fixed' && b.timeKind === 'fixed') {
      return (a.startTime || '').localeCompare(b.startTime || '');
    }
    if (a.timeKind === 'fixed') return -1;
    if (b.timeKind === 'fixed') return 1;

    // Relative blocks sorted by label order (Fajr -> Dhuhr -> Asr -> Maghreb -> Isha)
    const prayerOrder: Record<string, number> = {
      Fajr: 0,
      Dhuhr: 1,
      Asr: 2,
      Maghreb: 3,
      Isha: 4,
    };
    const aOrder = prayerOrder[a.labelTime || ''] ?? 99;
    const bOrder = prayerOrder[b.labelTime || ''] ?? 99;
    return aOrder - bOrder;
  });
}

/**
 * Group blocks by section (Morning, Midday, Evening, Flexible)
 */
export function groupBlocksBySection(blocks: ScheduleBlock[]): Record<string, ScheduleBlock[]> {
  const sections: Record<string, ScheduleBlock[]> = {
    Morning: [],
    Midday: [],
    Evening: [],
    Flexible: [],
  };

  for (const block of blocks) {
    if (block.timeKind === 'relative') {
      sections.Flexible.push(block);
    } else if (block.startTime) {
      const hour = parseInt(block.startTime.split(':')[0]);
      if (hour < 12) {
        sections.Morning.push(block);
      } else if (hour < 17) {
        sections.Midday.push(block);
      } else {
        sections.Evening.push(block);
      }
    }
  }

  return sections;
}

/**
 * Get category display properties
 */
export const CATEGORY_CONFIG: Record<string, { color: string; label: string; bgColor: string }> = {
  quran: { color: '#c084fc', label: 'Quran', bgColor: 'bg-purple-900/30' },
  uni: { color: '#60a5fa', label: 'University', bgColor: 'bg-blue-900/30' },
  library: { color: '#22d3ee', label: 'Library', bgColor: 'bg-cyan-900/30' },
  study: { color: '#818cf8', label: 'Study', bgColor: 'bg-indigo-900/30' },
  tdprep: { color: '#fbbf24', label: 'TD Prep', bgColor: 'bg-amber-900/30' },
  webdev: { color: '#34d399', label: 'Web Dev', bgColor: 'bg-emerald-900/30' },
  typing: { color: '#f87171', label: 'Typing', bgColor: 'bg-red-900/30' },
  gym: { color: '#fb923c', label: 'Gym', bgColor: 'bg-orange-900/30' },
  masjid: { color: '#a78bfa', label: 'Masjid', bgColor: 'bg-violet-900/30' },
  free: { color: '#94a3b8', label: 'Free', bgColor: 'bg-slate-900/30' },
  sleep: { color: '#9333ea', label: 'Sleep', bgColor: 'bg-purple-900/30' },
};

export function getCategoryColor(category: string): string {
  return CATEGORY_CONFIG[category]?.color || '#6b7280';
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_CONFIG[category]?.label || category;
}

export function getCategoryBgColor(category: string): string {
  return CATEGORY_CONFIG[category]?.bgColor || 'bg-gray-900/30';
}

/**
 * Create a deterministic hash from a string (UUID) for consistent coloring
 * Returns a number that can be used to index into a color array
 */
export function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ============= Time Utilities =============

/**
 * Convert HH:MM to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to HH:MM
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Get duration between two time strings in minutes
 */
export function getBlockDuration(startTime: string, endTime: string): number {
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);
  return end - start;
}

/**
 * Format duration in minutes to readable format (e.g., "1h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
