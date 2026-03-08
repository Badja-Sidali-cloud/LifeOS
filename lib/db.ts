import Dexie, { Table } from 'dexie';
import {
  ScheduleBlock,
  ScheduleVersion,
  Session,
  Module,
  DebtTask,
  Habit,
  GymWorkout,
  TypingEntry,
  QuranEntry,
  WeeklyReview,
  Settings,
} from './schemas';
import { SEED_SCHEDULE_BLOCKS, SEED_MODULES, SEED_HABITS } from './seed-data';

// ============= Dexie Database Definition =============
export class LifeOsDb extends Dexie {
  scheduleBlocks!: Table<ScheduleBlock>;
  scheduleVersions!: Table<ScheduleVersion>;
  sessions!: Table<Session>;
  modules!: Table<Module>;
  debtTasks!: Table<DebtTask>;
  habits!: Table<Habit>;
  gymWorkouts!: Table<GymWorkout>;
  typingEntries!: Table<TypingEntry>;
  quranEntries!: Table<QuranEntry>;
  weeklyReviews!: Table<WeeklyReview>;
  settings!: Table<Settings>;

  constructor() {
    super('LifeOS');
    this.version(1).stores({
      scheduleBlocks: 'id, dayOfWeek, category',
      scheduleVersions: 'id, isActive, createdAt',
      sessions: 'id, date, type, module',
      modules: 'id, code, isCritical',
      debtTasks: 'id, module, status, createdAt',
      habits: 'id, type, targetFrequency',
      gymWorkouts: 'id, date, intensity',
      typingEntries: 'id, date, wpm',
      quranEntries: 'id, date, entryType',
      weeklyReviews: 'id, weekStartDate',
      settings: 'userId',
    });
  }
}

// ============= Database Instance =============
export const db = new LifeOsDb();

// ============= Storage Service Interface =============
// Clean abstraction layer for swapping Supabase later
export interface QueryOptions {
  where?: Record<string, unknown>;
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
}

export class StorageService {
  async initializeDb(): Promise<void> {
    // Run migrations first (before early return)
    const moduleCount = await db.modules.count();
    if (moduleCount !== 7) {
      console.log('[v0] Migrating modules (found', moduleCount, ', expected 7)...');
      await db.modules.clear();
      await db.modules.bulkAdd(SEED_MODULES);
    }
    
    const habitCount = await db.habits.count();
    if (habitCount < 6) {
      console.log('[v0] Migrating habits (found', habitCount, ', expected 6)...');
      await db.habits.clear();
      await db.habits.bulkAdd(SEED_HABITS);
    }
    
    const blockCount = await db.scheduleBlocks.count();
    if (blockCount < 50) {
      console.log('[v0] Migrating schedule blocks (found', blockCount, ', expected 50+)...');
      await db.scheduleBlocks.clear();
      await db.scheduleBlocks.bulkAdd(SEED_SCHEDULE_BLOCKS);
    }

    // Re-fetch fresh count after migrations (blockCount was stale)
    const freshBlockCount = await db.scheduleBlocks.count();
    if (freshBlockCount > 0) {
      console.log('[v0] Database initialized, blocks:', freshBlockCount);
      return;
    }

    console.log('[v0] Starting database initialization...');
    console.log('[v0] Seeding', SEED_SCHEDULE_BLOCKS.length, 'schedule blocks');
    console.log('[v0] Seeding', SEED_MODULES.length, 'modules');
    console.log('[v0] Seeding', SEED_HABITS.length, 'habits');

    try {
      // Create base schedule version
      const baseVersion: ScheduleVersion = {
        id: 'base-schedule',
        name: 'Base Schedule (USTHB Semester 2)',
        description: 'Default immutable schedule',
        blocks: SEED_SCHEDULE_BLOCKS,
        baseVersionId: null,
        changes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('[v0] Creating base schedule version...');

      // Insert remaining data (blocks, modules, habits already seeded above in migrations)
      await Promise.all([
        db.scheduleVersions.add(baseVersion),
        db.settings.add({
          userId: 'default-user',
          theme: 'dark',
          fajrTime: null,
          dhuhrTime: null,
          asrTime: null,
          maghrebTime: null,
          ishaTime: null,
          noZeroDayThresholdMinutes: 30,
          fallbackTypingMinutes: 10,
          fallbackQuranMinutes: 20,
          enableNotifications: true,
          notificationTime: '08:00' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);

      console.log('[v0] ✓ Database initialized successfully');
      console.log('[v0] ✓ Total blocks seeded:', blockCount + SEED_SCHEDULE_BLOCKS.length);
      console.log('[v0] Ready to load schedule for today');
    } catch (error) {
      console.error('[v0] ✗ Failed to initialize database:', error);
      throw error;
    }
  }

  // ============= Schedule Blocks =============
  async getScheduleBlocks(): Promise<ScheduleBlock[]> {
    const blocks = await db.scheduleBlocks.toArray();
    return blocks.map(rehydrateScheduleBlock);
  }

  async getScheduleBlock(id: string): Promise<ScheduleBlock | undefined> {
    const block = await db.scheduleBlocks.get(id);
    return block ? rehydrateScheduleBlock(block) : undefined;
  }

  async addScheduleBlock(block: ScheduleBlock): Promise<string> {
    return db.scheduleBlocks.add(block);
  }

  async updateScheduleBlock(block: ScheduleBlock): Promise<number> {
    block.updatedAt = new Date();
    return db.scheduleBlocks.put(block);
  }

  async deleteScheduleBlock(id: string): Promise<void> {
    await db.scheduleBlocks.delete(id);
  }

  // ============= Schedule Versions =============
  async getScheduleVersions(): Promise<ScheduleVersion[]> {
    const versions = await db.scheduleVersions.toArray();
    return versions.map(rehydrateScheduleVersion);
  }

  async getActiveScheduleVersion(): Promise<ScheduleVersion | undefined> {
    // Use toArray() and filter instead of where().equals() for better reliability
    const versions = await db.scheduleVersions.toArray();
    const active = versions.find((v) => v.isActive === true);
    return active ? rehydrateScheduleVersion(active) : undefined;
  }

  async getScheduleVersion(id: string): Promise<ScheduleVersion | undefined> {
    const version = await db.scheduleVersions.get(id);
    return version ? rehydrateScheduleVersion(version) : undefined;
  }

  async addScheduleVersion(version: ScheduleVersion): Promise<string> {
    return db.scheduleVersions.add(version);
  }

  async updateScheduleVersion(version: ScheduleVersion): Promise<number> {
    version.updatedAt = new Date();
    return db.scheduleVersions.put(version);
  }

  async setActiveScheduleVersion(versionId: string): Promise<void> {
    const allVersions = await db.scheduleVersions.toArray();
    await Promise.all(
      allVersions.map((v) => {
        v.isActive = v.id === versionId;
        return db.scheduleVersions.put(v);
      })
    );
  }

  // ============= Sessions =============
  async getSessions(filters?: { type?: string; module?: string; startDate?: Date; endDate?: Date }): Promise<Session[]> {
    let query = db.sessions.toCollection();

    if (filters?.type) {
      query = query.filter((s) => s.type === filters.type);
    }
    if (filters?.module) {
      query = query.filter((s) => s.module === filters.module);
    }
    if (filters?.startDate && filters?.endDate) {
      const startTime = filters.startDate.getTime();
      const endTime = filters.endDate.getTime();
      query = query.filter((s) => {
        const sTime = ensureDateField(s.date)?.getTime() || 0;
        return sTime >= startTime && sTime <= endTime;
      });
    }

    const sessions = await query.toArray();
    return sessions.map(rehydrateSession);
  }

  async getSession(id: string): Promise<Session | undefined> {
    const session = await db.sessions.get(id);
    return session ? rehydrateSession(session) : undefined;
  }

  async addSession(session: Session): Promise<string> {
    return db.sessions.add(session);
  }

  async updateSession(session: Session): Promise<number> {
    session.updatedAt = new Date();
    return db.sessions.put(session);
  }

  async deleteSession(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  // ============= Modules =============
  async getModules(): Promise<Module[]> {
    const modules = await db.modules.toArray();
    return modules.map(rehydrateModule);
  }

  async getCriticalModules(): Promise<Module[]> {
    const modules = await db.modules.where('isCritical').equals(true).toArray();
    return modules.map(rehydrateModule);
  }

  async getModule(id: string): Promise<Module | undefined> {
    const module = await db.modules.get(id);
    return module ? rehydrateModule(module) : undefined;
  }

  async getModuleByCode(code: string): Promise<Module | undefined> {
    const module = await db.modules.where('code').equals(code).first();
    return module ? rehydrateModule(module) : undefined;
  }

  async updateModule(module: Module): Promise<number> {
    return db.modules.put(module);
  }

  // ============= Debt Tasks =============
  async getDebtTasks(status?: string): Promise<DebtTask[]> {
    let tasks: DebtTask[];
    if (status) {
      tasks = await db.debtTasks.where('status').equals(status).toArray();
    } else {
      tasks = await db.debtTasks.toArray();
    }
    return tasks.map(rehydrateDebtTask);
  }

  async getDebtTask(id: string): Promise<DebtTask | undefined> {
    const task = await db.debtTasks.get(id);
    return task ? rehydrateDebtTask(task) : undefined;
  }

  async addDebtTask(task: DebtTask): Promise<string> {
    return db.debtTasks.add(task);
  }

  async updateDebtTask(task: DebtTask): Promise<number> {
    task.updatedAt = new Date();
    return db.debtTasks.put(task);
  }

  async deleteDebtTask(id: string): Promise<void> {
    await db.debtTasks.delete(id);
  }

  // ============= Habits =============
  async getHabits(): Promise<Habit[]> {
    const habits = await db.habits.toArray();
    return habits.map(rehydrateHabit);
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    const habit = await db.habits.get(id);
    return habit ? rehydrateHabit(habit) : undefined;
  }

  async addHabit(habit: Habit): Promise<string> {
    return db.habits.add(habit);
  }

  async updateHabit(habit: Habit): Promise<number> {
    habit.updatedAt = new Date();
    return db.habits.put(habit);
  }

  // ============= Gym Workouts =============
  async getGymWorkouts(startDate?: Date, endDate?: Date): Promise<GymWorkout[]> {
    if (startDate && endDate) {
      return db.gymWorkouts
        .where('date')
        .between(startDate, endDate)
        .toArray();
    }
    return db.gymWorkouts.toArray();
  }

  async addGymWorkout(workout: GymWorkout): Promise<string> {
    return db.gymWorkouts.add(workout);
  }

  // ============= Typing Entries =============
  async getTypingEntries(startDate?: Date, endDate?: Date): Promise<TypingEntry[]> {
    if (startDate && endDate) {
      return db.typingEntries
        .where('date')
        .between(startDate, endDate)
        .toArray();
    }
    return db.typingEntries.toArray();
  }

  async addTypingEntry(entry: TypingEntry): Promise<string> {
    return db.typingEntries.add(entry);
  }

  // ============= Quran Entries =============
  async getQuranEntries(startDate?: Date, endDate?: Date): Promise<QuranEntry[]> {
    if (startDate && endDate) {
      return db.quranEntries
        .where('date')
        .between(startDate, endDate)
        .toArray();
    }
    return db.quranEntries.toArray();
  }

  async addQuranEntry(entry: QuranEntry): Promise<string> {
    return db.quranEntries.add(entry);
  }

  // ============= Weekly Reviews =============
  async getWeeklyReviews(): Promise<WeeklyReview[]> {
    const reviews = await db.weeklyReviews.orderBy('weekStartDate').reverse().toArray();
    return reviews.map(rehydrateWeeklyReview);
  }

  async getWeeklyReview(weekStartDate: Date): Promise<WeeklyReview | undefined> {
    const review = await db.weeklyReviews.where('weekStartDate').equals(weekStartDate).first();
    return review ? rehydrateWeeklyReview(review) : undefined;
  }

  async addWeeklyReview(review: WeeklyReview): Promise<string> {
    return db.weeklyReviews.add(review);
  }

  async updateWeeklyReview(review: WeeklyReview): Promise<number> {
    review.updatedAt = new Date();
    return db.weeklyReviews.put(review);
  }

  // ============= Settings =============
  async getSettings(): Promise<Settings | undefined> {
    const settings = await db.settings.get('default-user');
    return settings ? rehydrateSettings(settings) : undefined;
  }

  async updateSettings(settings: Settings): Promise<number> {
    settings.updatedAt = new Date();
    return db.settings.put(settings);
  }
}

// ============= Date Rehydration Helpers =============
// Dexie serializes Dates as ISO strings; these helpers rehydrate them
function ensureDateField(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

function rehydrateSession(session: Session): Session {
  return {
    ...session,
    date: ensureDateField(session.date) || new Date(),
    startTime: ensureDateField(session.startTime) || new Date(),
    endTime: ensureDateField(session.endTime) || new Date(),
    createdAt: ensureDateField(session.createdAt) || new Date(),
    updatedAt: ensureDateField(session.updatedAt) || new Date(),
  };
}

function rehydrateHabit(habit: Habit): Habit {
  return {
    ...habit,
    lastCompletedDate: ensureDateField(habit.lastCompletedDate),
    completionDates: (habit.completionDates || []).map(d => ensureDateField(d) || new Date()),
    createdAt: ensureDateField(habit.createdAt) || new Date(),
    updatedAt: ensureDateField(habit.updatedAt) || new Date(),
  };
}

function rehydrateModule(module: Module): Module {
  return {
    ...module,
    createdAt: ensureDateField(module.createdAt) || new Date(),
  };
}

function rehydrateDebtTask(task: DebtTask): DebtTask {
  return {
    ...task,
    suggestedDate: ensureDateField(task.suggestedDate),
    createdAt: ensureDateField(task.createdAt) || new Date(),
    updatedAt: ensureDateField(task.updatedAt) || new Date(),
  };
}

function rehydrateScheduleBlock(block: ScheduleBlock): ScheduleBlock {
  return {
    ...block,
    createdAt: ensureDateField(block.createdAt) || new Date(),
    updatedAt: ensureDateField(block.updatedAt) || new Date(),
  };
}

function rehydrateWeeklyReview(review: WeeklyReview): WeeklyReview {
  return {
    ...review,
    weekStartDate: ensureDateField(review.weekStartDate) || new Date(),
    createdAt: ensureDateField(review.createdAt) || new Date(),
    updatedAt: ensureDateField(review.updatedAt) || new Date(),
  };
}

function rehydrateSettings(settings: Settings): Settings {
  return {
    ...settings,
    createdAt: ensureDateField(settings.createdAt) || new Date(),
    updatedAt: ensureDateField(settings.updatedAt) || new Date(),
  };
}

function rehydrateScheduleVersion(version: ScheduleVersion): ScheduleVersion {
  return {
    ...version,
    blocks: version.blocks.map(rehydrateScheduleBlock),
    createdAt: ensureDateField(version.createdAt) || new Date(),
    updatedAt: ensureDateField(version.updatedAt) || new Date(),
  };
}

// ============= Export Singleton =============
export const storage = new StorageService();
