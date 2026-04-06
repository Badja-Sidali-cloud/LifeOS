import { v4 as uuidv4 } from 'uuid';
import { Module, Habit, ScheduleBlock } from './schemas';

// ── Modules ──────────────────────────────────────────────────────────────────
export const SEED_MODULES: Module[] = [
  { id: uuidv4(), code: 'ANALY2', name: 'Mathematical Analysis 2', coefficient: 4, weakness: 35, priorityScore: 140, isCritical: true,  targetHoursPerWeek: 8, createdAt: new Date() },
  { id: uuidv4(), code: 'ALGO2',  name: 'Algorithms 2',            coefficient: 4, weakness: 45, priorityScore: 180, isCritical: true,  targetHoursPerWeek: 8, createdAt: new Date() },
  { id: uuidv4(), code: 'STR M',  name: 'Structures & Methods',    coefficient: 2, weakness: 15, priorityScore: 30,  isCritical: false, targetHoursPerWeek: 3, createdAt: new Date() },
  { id: uuidv4(), code: 'STAT',   name: 'Statistics',              coefficient: 2, weakness: 15, priorityScore: 30,  isCritical: false, targetHoursPerWeek: 3, createdAt: new Date() },
  { id: uuidv4(), code: 'ELEC',   name: 'Electronics',             coefficient: 2, weakness: 25, priorityScore: 50,  isCritical: false, targetHoursPerWeek: 3, createdAt: new Date() },
  { id: uuidv4(), code: 'ALG2',   name: 'Algebra 2',               coefficient: 2, weakness: 35, priorityScore: 70,  isCritical: false, targetHoursPerWeek: 3, createdAt: new Date() },
  { id: uuidv4(), code: 'OPM',    name: 'Operational Methods',     coefficient: 1, weakness: 25, priorityScore: 25,  isCritical: false, targetHoursPerWeek: 2, createdAt: new Date() },
  { id: uuidv4(), code: 'TIC',    name: 'IT & Communication',      coefficient: 1, weakness: 20, priorityScore: 20,  isCritical: false, targetHoursPerWeek: 1, createdAt: new Date() },
];

// ── Habits ───────────────────────────────────────────────────────────────────
export const SEED_HABITS: Habit[] = [
  {
    id: uuidv4(), name: 'Quran', description: "Hifz (Fajr) + Muraja'a (Maghreb–Isha)",
    type: 'quran', targetFrequency: 'daily',
    currentStreak: 0, longestStreak: 0, lastCompletedDate: null, completionDates: [],
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: uuidv4(), name: 'Web Dev', description: 'Daily coding practice',
    type: 'webdev', targetFrequency: 'daily',
    currentStreak: 0, longestStreak: 0, lastCompletedDate: null, completionDates: [],
    createdAt: new Date(), updatedAt: new Date(),
  },
];

// ── Helper ───────────────────────────────────────────────────────────────────
function block(
  day: 0|1|2|3|4|5|6,
  title: string,
  start: string,
  end: string,
  category: 'uni'|'study'|'quran'|'webdev'|'free'|'sleep'|'masjid',
  details?: string
): ScheduleBlock {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  // Duration: if end < start it crosses midnight, add 24h worth of minutes
  let dur = (eh * 60 + em) - (sh * 60 + sm);
  if (dur <= 0) dur += 24 * 60;
  return {
    id: uuidv4(), dayOfWeek: day, title, details,
    category, timeKind: 'fixed',
    startTime: start as any, endTime: end as any,
    durationMinutes: dur, weight: 1, labelTime: null,
    immutableBlockId: null, createdAt: new Date(), updatedAt: new Date(),
  };
}

// ── Schedule ─────────────────────────────────────────────────────────────────
// 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun

// MON — TD Algèbre 08:00, TD Electricity 09:40, COURS OPM 11:20, COURS Algèbre 13:00, COURS Electricity 14:40
const monBlocks: ScheduleBlock[] = [
  block(0, 'Fajr + Quran Hifz',   '05:30', '06:45', 'quran',  'Masjid — Hifz after Fajr'),
  block(0, 'Commute to Uni',       '06:47', '07:40', 'free',   'Train 07:00 → arrive uni ~07:30'),
  block(0, 'TD Algèbre',           '08:00', '09:30', 'uni'),
  block(0, 'TD Electricity',       '09:40', '11:10', 'uni'),
  block(0, 'COURS OPM',            '11:20', '12:50', 'uni'),
  block(0, 'COURS Algèbre',        '13:00', '14:30', 'uni'),
  block(0, 'COURS Electricity',    '14:40', '16:10', 'uni'),
  block(0, 'Library Study',        '16:15', '16:55', 'study',  'Self-study before train'),
  block(0, 'Commute Home',         '17:00', '17:45', 'free',   'Train 17:00 → home'),
  block(0, 'Rest / Dinner',        '17:45', '19:45', 'free'),
  block(0, "Maghreb + Masjid + Muraja'a", '19:45', '21:30', 'quran', 'Masjid — Muraja\'a until Isha'),
  block(0, 'Web Dev / Study',      '21:30', '23:00', 'webdev', 'Coding or revision'),
  block(0, 'Sleep',                '23:30', '05:30', 'sleep'),
];

// TUE — TD Statistique 08:00, TD ALGO2 09:40, COURS STR M 11:20, COURS ANALY2 13:00, COURS Statistique 14:40
const tueBlocks: ScheduleBlock[] = [
  block(1, 'Fajr + Quran Hifz',   '05:30', '06:45', 'quran'),
  block(1, 'Commute to Uni',       '06:47', '07:40', 'free',   'Train 07:00'),
  block(1, 'TD Statistique',       '08:00', '09:30', 'uni'),
  block(1, 'TD ALGO2',             '09:40', '11:10', 'uni'),
  block(1, 'COURS STR M',          '11:20', '12:50', 'uni'),
  block(1, 'COURS ANALY2',         '13:00', '14:30', 'uni'),
  block(1, 'COURS Statistique',    '14:40', '16:10', 'uni'),
  block(1, 'Library Study',        '16:15', '16:55', 'study',  'Self-study before train'),
  block(1, 'Commute Home',         '17:00', '17:45', 'free'),
  block(1, 'Rest / Dinner',        '17:45', '19:45', 'free'),
  block(1, "Maghreb + Masjid + Muraja'a", '19:45', '21:30', 'quran'),
  block(1, 'Web Dev / Study',      '21:30', '23:00', 'webdev'),
  block(1, 'Sleep',                '23:30', '05:30', 'sleep'),
];

// WED — COURS/TD ANALY2 09:40, TP ALGO2 11:20, TP OPM 13:00 → free from 14:30
const wedBlocks: ScheduleBlock[] = [
  block(2, 'Fajr + Quran Hifz',   '05:30', '06:45', 'quran'),
  block(2, 'Commute to Uni',       '06:47', '07:40', 'free'),
  block(2, 'Study at Uni',         '07:45', '09:30', 'study',  'Arrive early — self-study before class'),
  block(2, 'COURS/TD ANALY2',      '09:40', '11:10', 'uni'),
  block(2, 'TP ALGO2',             '11:20', '12:50', 'uni'),
  block(2, 'TP OPM',               '13:00', '14:30', 'uni'),
  block(2, 'Library Study',        '14:35', '16:55', 'study',  'Long block — priority: ANALY2, ALGO2'),
  block(2, 'Commute Home',         '17:00', '17:45', 'free'),
  block(2, 'Rest / Dinner',        '17:45', '19:45', 'free'),
  block(2, "Maghreb + Masjid + Muraja'a", '19:45', '21:30', 'quran'),
  block(2, 'Web Dev / Study',      '21:30', '23:00', 'webdev'),
  block(2, 'Sleep',                '23:30', '05:30', 'sleep'),
];

// THU — TD ANALY2 08:00, TD STR M 09:40, COURS ANALY2 11:20, COURS ALGO2 13:00 → free from 14:30
const thuBlocks: ScheduleBlock[] = [
  block(3, 'Fajr + Quran Hifz',   '05:30', '06:45', 'quran'),
  block(3, 'Commute to Uni',       '06:47', '07:40', 'free'),
  block(3, 'TD ANALY2',            '08:00', '09:30', 'uni'),
  block(3, 'TD STR M',             '09:40', '11:10', 'uni'),
  block(3, 'COURS ANALY2',         '11:20', '12:50', 'uni'),
  block(3, 'COURS ALGO2',          '13:00', '14:30', 'uni'),
  block(3, 'Library Study',        '14:35', '16:55', 'study',  'Long block — priority: ELEC, STAT, ALG2'),
  block(3, 'Commute Home',         '17:00', '17:45', 'free'),
  block(3, 'Rest / Dinner',        '17:45', '19:45', 'free'),
  block(3, "Maghreb + Masjid + Muraja'a", '19:45', '21:30', 'quran'),
  block(3, 'Web Dev / Study',      '21:30', '23:00', 'webdev'),
  block(3, 'Sleep',                '23:30', '05:30', 'sleep'),
];

// FRI — fully free, no uni, Jumu'a
const friBlocks: ScheduleBlock[] = [
  block(4, 'Fajr + Quran Hifz',   '05:30', '07:30', 'quran',  'Longer session — free day'),
  block(4, 'Study Block 1',        '08:00', '10:00', 'study',  'Priority: ALGO2 or ANALY2'),
  block(4, 'Break',                '10:00', '10:30', 'free'),
  block(4, 'Study Block 2',        '10:30', '12:00', 'study',  'Priority: ELEC or STAT'),
  block(4, "Jumu'a Prayer",        '12:00', '13:30', 'masjid'),
  block(4, 'Rest / Lunch',         '13:30', '15:00', 'free'),
  block(4, 'Study Block 3',        '15:00', '17:00', 'study',  'Priority: ALG2 or STR M'),
  block(4, 'Web Dev',              '17:00', '19:30', 'webdev', 'Best day for focused coding'),
  block(4, "Maghreb + Masjid + Muraja'a", '19:45', '21:30', 'quran'),
  block(4, 'Free / Family',        '21:30', '23:00', 'free'),
  block(4, 'Sleep',                '23:30', '05:30', 'sleep'),
];

// SAT — online TIC 09:40-11:10 at home, rest free
const satBlocks: ScheduleBlock[] = [
  block(5, 'Fajr + Quran Hifz',   '05:30', '07:30', 'quran',  'Stay home — longer Hifz session'),
  block(5, 'Study Block 1',        '08:00', '09:30', 'study',  'Priority module before online class'),
  block(5, 'COURS TIC (online)',   '09:40', '11:10', 'uni',    'Online — attend from home'),
  block(5, 'Study Block 2',        '11:20', '13:30', 'study',  'Priority: ANALY2 or ALGO2'),
  block(5, 'Lunch / Rest',         '13:30', '15:00', 'free'),
  block(5, 'Study Block 3',        '15:00', '17:30', 'study',  'Priority: ELEC, STAT, or ALG2'),
  block(5, 'Web Dev',              '17:30', '19:30', 'webdev'),
  block(5, "Maghreb + Masjid + Muraja'a", '19:45', '21:30', 'quran'),
  block(5, 'Free / Rest',          '21:30', '23:00', 'free'),
  block(5, 'Sleep',                '23:30', '05:30', 'sleep'),
];

// SUN — fully free
const sunBlocks: ScheduleBlock[] = [
  block(6, 'Fajr + Quran Hifz',   '05:30', '07:30', 'quran',  'Free day — longer session'),
  block(6, 'Study Block 1',        '08:00', '10:30', 'study',  'Hardest module this week'),
  block(6, 'Break',                '10:30', '11:00', 'free'),
  block(6, 'Study Block 2',        '11:00', '13:00', 'study',  'Second priority module'),
  block(6, 'Lunch / Rest',         '13:00', '15:00', 'free'),
  block(6, 'Study Block 3',        '15:00', '17:00', 'study',  'Review + exercises'),
  block(6, 'Web Dev',              '17:00', '19:30', 'webdev'),
  block(6, "Maghreb + Masjid + Muraja'a", '19:45', '21:30', 'quran'),
  block(6, 'Weekly Review',        '21:30', '22:30', 'free',   'Review week, plan next week'),
  block(6, 'Sleep',                '23:00', '05:30', 'sleep'),
];

export const SEED_SCHEDULE_BLOCKS: ScheduleBlock[] = [
  ...monBlocks,
  ...tueBlocks,
  ...wedBlocks,
  ...thuBlocks,
  ...friBlocks,
  ...satBlocks,
  ...sunBlocks,
];
