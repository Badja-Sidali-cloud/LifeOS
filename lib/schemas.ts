import { z } from 'zod';

// ============= Time & Calendar =============
export const DayOfWeekSchema = z.union([
  z.literal(0), // Monday
  z.literal(1), // Tuesday
  z.literal(2), // Wednesday
  z.literal(3), // Thursday
  z.literal(4), // Friday
  z.literal(5), // Saturday
  z.literal(6), // Sunday
]);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const TimeStringSchema = z.string().regex(/^\d{2}:\d{2}$/);
export type TimeString = z.infer<typeof TimeStringSchema>;

// ============= Schedule Blocks =============
export const BlockCategorySchema = z.enum([
  'quran',
  'uni',
  'library',
  'study',
  'tdprep',
  'webdev',
  'typing',
  'gym',
  'masjid',
  'free',
  'sleep',
]);
export type BlockCategory = z.infer<typeof BlockCategorySchema>;

export const TimeKindSchema = z.enum(['fixed', 'label']);
export type TimeKind = z.infer<typeof TimeKindSchema>;

export const PrayerTimeSchema = z.enum(['Fajr', 'Choroq', 'Dhuhr', 'Asr', 'Maghreb', 'Isha']).nullable();
export type PrayerTime = z.infer<typeof PrayerTimeSchema>;

export const ScheduleBlockSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: DayOfWeekSchema,
  title: z.string(),
  details: z.string().optional(),
  category: BlockCategorySchema,
  weight: z.number().default(1),
  
  // Time model: fixed or relative
  timeKind: TimeKindSchema.default('fixed'),
  
  // Fixed time fields
  startTime: TimeStringSchema.optional(), // HH:MM
  endTime: TimeStringSchema.optional(),   // HH:MM
  
  // Relative prayer time fields
  labelTime: PrayerTimeSchema.default(null),
  durationMinutes: z.number().positive().optional(),
  
  // Versioning: if this is in a custom version, immutableBlockId = base block's ID
  immutableBlockId: z.string().uuid().nullable().default(null),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type ScheduleBlock = z.infer<typeof ScheduleBlockSchema>;

// ============= Sessions =============
export const SessionTypeSchema = z.enum([
  'focus',
  'module_study',
  'gym',
  'typing',
  'quran_memorization',
  'quran_review',
  'habit_checkin',
  'block_complete',
  'other',
]);
export type SessionType = z.infer<typeof SessionTypeSchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  date: z.date(),
  type: SessionTypeSchema,
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  durationMinutes: z.number().positive(),
  
  // Associated data
  module: z.string().optional(), // e.g., "ANALY2"
  deepWork: z.boolean().default(false),
  distractionCount: z.number().default(0),
  notesText: z.string().optional(),
  wpm: z.number().optional(), // For typing sessions
  
  // Fallback mode indicator
  isFallback: z.boolean().default(false),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Session = z.infer<typeof SessionSchema>;

// ============= Modules =============
export const ModuleSchema = z.object({
  id: z.string().uuid(),
  code: z.string(), // e.g., "ANALY2", "ALGO2"
  name: z.string(),
  coefficient: z.number(), // Weight in calculation
  weakness: z.number().min(0), // Raw weakness value (e.g., 35, 45)
  priorityScore: z.number().min(0), // coefficient × weakness
  isCritical: z.boolean().default(false), // ANALY2, ALGO2, STR M, STAT
  targetHoursPerWeek: z.number().default(10),
  createdAt: z.date().default(() => new Date()),
});
export type Module = z.infer<typeof ModuleSchema>;

// ============= Debt Tasks =============
export const DebtTaskStatusSchema = z.enum(['pending', 'scheduled', 'completed']);
export type DebtTaskStatus = z.infer<typeof DebtTaskStatusSchema>;

export const DebtTaskSchema = z.object({
  id: z.string().uuid(),
  module: z.string(), // Module code (e.g., "ANALY2")
  missedBlockId: z.string().uuid(), // Reference to the missed ScheduleBlock
  suggestedDate: z.date().nullable().default(null), // Suggested reschedule date
  status: DebtTaskStatusSchema.default('pending'),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type DebtTask = z.infer<typeof DebtTaskSchema>;

// ============= Habits =============
export const HabitTypeSchema = z.string().min(1);
export type HabitType = string;

export const HabitSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  type: HabitTypeSchema,
  targetFrequency: z.enum(['daily', 'weekly']).default('daily'),
  currentStreak: z.number().default(0),
  longestStreak: z.number().default(0),
  lastCompletedDate: z.date().nullable().default(null),
  completionDates: z.array(z.date()).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Habit = z.infer<typeof HabitSchema>;

// ============= Gym Workouts =============
export const GymWorkoutSchema = z.object({
  id: z.string().uuid(),
  date: z.date(),
  exerciseType: z.string(), // e.g., "Push-ups", "Running"
  duration: z.number().positive(), // Minutes
  intensity: z.enum(['light', 'moderate', 'intense']).default('moderate'),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});
export type GymWorkout = z.infer<typeof GymWorkoutSchema>;

// ============= Typing Practice =============
export const TypingEntrySchema = z.object({
  id: z.string().uuid(),
  date: z.date(),
  durationMinutes: z.number().positive(),
  wpm: z.number().positive(), // Words per minute
  accuracy: z.number().min(0).max(100), // Percentage
  createdAt: z.date().default(() => new Date()),
});
export type TypingEntry = z.infer<typeof TypingEntrySchema>;

// ============= Quran Entries =============
export const QuranEntrySchema = z.object({
  id: z.string().uuid(),
  date: z.date(),
  entryType: z.enum(['memorization', 'review']),
  pageNumber: z.number().positive().optional(),
  verseRange: z.string().optional(), // e.g., "Surah Al-Baqarah 1-10"
  durationMinutes: z.number().positive(),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});
export type QuranEntry = z.infer<typeof QuranEntrySchema>;

// ============= Weekly Reviews =============
export const WeeklyReviewSchema = z.object({
  id: z.string().uuid(),
  weekStartDate: z.date(), // Monday of the week
  
  // Metrics
  totalStudyHours: z.number().default(0),
  moduleHours: z.record(z.string(), z.number()).default({}), // e.g., { "ANALY2": 10, "ALGO2": 8 }
  gymSessions: z.number().default(0),
  quranEntries: z.number().default(0),
  typingWpmAverage: z.number().optional(),
  debtTasksCompleted: z.number().default(0),
  executionScore: z.number().min(0).max(100).default(0),
  
  // Flags
  hadFallbackDays: z.array(z.date()).default([]), // Which days needed fallback
  notes: z.string().optional(),
  
  // Reflection
  wins: z.string().optional(),
  failures: z.string().optional(),
  commitments: z.string().optional(),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;

// ============= Schedule Versions =============
export const ScheduleVersionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  blocks: z.array(ScheduleBlockSchema),
  
  // References
  baseVersionId: z.string().uuid().nullable().default(null), // If null, this is the base schedule
  
  // Diff tracking
  changes: z.array(z.object({
    type: z.enum(['added', 'modified', 'removed']),
    blockId: z.string().uuid(),
    details: z.string().optional(),
  })).default([]),
  
  isActive: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type ScheduleVersion = z.infer<typeof ScheduleVersionSchema>;

// ============= Global Settings =============
export const SettingsSchema = z.object({
  userId: z.string().default('default-user'),
  theme: z.enum(['light', 'dark']).default('dark'),
  
  // Prayer times (optional, for relative block rendering)
  fajrTime: TimeStringSchema.nullable().default(null),
  dhuhrTime: TimeStringSchema.nullable().default(null),
  asrTime: TimeStringSchema.nullable().default(null),
  maghrebTime: TimeStringSchema.nullable().default(null),
  ishaTime: TimeStringSchema.nullable().default(null),
  
  // Thresholds
  noZeroDayThresholdMinutes: z.number().default(30), // Must have at least this many minutes of critical module work
  fallbackTypingMinutes: z.number().default(10),
  fallbackQuranMinutes: z.number().default(20),
  
  // Notifications
  enableNotifications: z.boolean().default(true),
  notificationTime: TimeStringSchema.default('08:00'),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Settings = z.infer<typeof SettingsSchema>;
