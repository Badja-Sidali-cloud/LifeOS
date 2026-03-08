'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  ScheduleBlock,
  ScheduleVersion,
  Session,
  SessionType,
  Module,
  DebtTask,
  Habit,
  WeeklyReview,
  Settings,
} from '@/lib/schemas';
import { storage } from '@/lib/db';

// ============= Store State & Actions =============
interface LifeOsStore {
  // ===== Data State =====
  baseScheduleBlocks: ScheduleBlock[];
  currentScheduleVersion: ScheduleVersion | null;
  sessions: Session[];
  modules: Module[];
  debtTasks: DebtTask[];
  habits: Habit[];
  weeklyReviews: WeeklyReview[];
  settings: Settings | null;

  // ===== UI State =====
  isLoading: boolean;
  selectedDate: Date;
  selectedDayOfWeek: number; // 0-6
  currentView: 'today' | 'week' | 'focus' | 'study' | 'habits' | 'gym' | 'reviews' | 'settings';

  // ===== Action Handlers =====

  // Initialization
  hydrate: () => Promise<void>;

  // Schedule Block Management
  addScheduleBlock: (block: ScheduleBlock) => Promise<void>;
  updateScheduleBlock: (block: ScheduleBlock) => Promise<void>;
  deleteScheduleBlock: (id: string) => Promise<void>;

  // Schedule Version Management
  createScheduleVersion: (name: string, description?: string) => Promise<void>;
  setActiveScheduleVersion: (versionId: string) => Promise<void>;
  getVersionBlocks: (versionId: string) => Promise<ScheduleBlock[]>;

  // Session Logging
  logSession: (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getSessions: (filters?: { type?: string; module?: string; startDate?: Date; endDate?: Date }) => Promise<Session[]>;

  // Debt Task Management
  createDebtTask: (module: string, missedBlockId: string) => Promise<void>;
  updateDebtTask: (task: DebtTask) => Promise<void>;
  deleteDebtTask: (id: string) => Promise<void>;
  getDebtTasksForModule: (module: string) => DebtTask[];

  // Habit Management
  updateHabit: (habit: Habit) => Promise<void>;
  checkInHabit: (habitId: string) => Promise<void>;

  // Weekly Review
  getOrCreateWeeklyReview: (weekStartDate: Date) => Promise<WeeklyReview>;
  updateWeeklyReview: (review: WeeklyReview) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<Settings>) => Promise<void>;

  // Analytics & Calculations
  calculateExecutionScore: (startDate: Date, endDate: Date) => number;
  getModuleStudyHours: (moduleCode: string, startDate: Date, endDate: Date) => number;
  getWeeklySummary: (weekStartDate: Date) => Promise<any>;

  // Fallback & No-Zero-Day
  checkNeedsDebtRecovery: (date: Date) => boolean;
  logFallbackSession: (types: SessionType[], notes?: string) => Promise<void>;

  // UI Navigation
  setSelectedDate: (date: Date) => void;
  setSelectedDayOfWeek: (day: number) => void;
  setCurrentView: (view: string) => void;
}

// ============= Zustand Store =============
export const useLifeOsStore = create<LifeOsStore>((set, get) => ({
  // ===== Initial State =====
  baseScheduleBlocks: [],
  currentScheduleVersion: null,
  sessions: [],
  modules: [],
  debtTasks: [],
  habits: [],
  weeklyReviews: [],
  settings: null,

  isLoading: true,
  selectedDate: new Date(),
  selectedDayOfWeek: 0,
  currentView: 'today',

  // ===== Hydration =====
  hydrate: async () => {
    set({ isLoading: true });
    try {
      // Initialize database
      await storage.initializeDb();

      // Load all data from storage
      const [blocks, modules, habits, sessions, debtTasks, reviews, settings, activeVersion] =
        await Promise.all([
          storage.getScheduleBlocks(),
          storage.getModules(),
          storage.getHabits(),
          storage.getSessions(),
          storage.getDebtTasks(),
          storage.getWeeklyReviews(),
          storage.getSettings(),
          storage.getActiveScheduleVersion(),
        ]);

      set({
        baseScheduleBlocks: blocks,
        modules,
        habits,
        sessions,
        debtTasks,
        weeklyReviews: reviews,
        settings: settings || null,
        currentScheduleVersion: activeVersion || null,
        isLoading: false,
      });

      console.log('[v0] Store hydrated successfully');
    } catch (error) {
      console.error('[v0] Failed to hydrate store:', error);
      set({ isLoading: false });
    }
  },

  // ===== Schedule Blocks =====
  addScheduleBlock: async (block: ScheduleBlock) => {
    await storage.addScheduleBlock(block);
    const blocks = await storage.getScheduleBlocks();
    set({ baseScheduleBlocks: blocks });
  },

  updateScheduleBlock: async (block: ScheduleBlock) => {
    await storage.updateScheduleBlock(block);
    const blocks = await storage.getScheduleBlocks();
    set({ baseScheduleBlocks: blocks });
  },

  deleteScheduleBlock: async (id: string) => {
    await storage.deleteScheduleBlock(id);
    const blocks = await storage.getScheduleBlocks();
    set({ baseScheduleBlocks: blocks });
  },

  // ===== Schedule Versions =====
  createScheduleVersion: async (name: string, description?: string) => {
    const baseVersion = get().currentScheduleVersion;
    if (!baseVersion) throw new Error('No base version found');

    // Create new version from base
    const newVersion: ScheduleVersion = {
      id: uuidv4(),
      name,
      description,
      blocks: JSON.parse(JSON.stringify(baseVersion.blocks)), // Deep copy
      baseVersionId: baseVersion.id,
      changes: [],
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const versionId = await storage.addScheduleVersion(newVersion);
    console.log('[v0] Created schedule version:', versionId);
  },

  setActiveScheduleVersion: async (versionId: string) => {
    await storage.setActiveScheduleVersion(versionId);
    const activeVersion = await storage.getActiveScheduleVersion();
    set({ currentScheduleVersion: activeVersion || null });
  },

  getVersionBlocks: async (versionId: string) => {
    const version = await storage.getScheduleVersion(versionId);
    return version?.blocks || [];
  },

  // ===== Sessions =====
  logSession: async (sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const session: Session = {
      ...sessionData,
      startTime: sessionData.startTime ?? now,
      endTime: sessionData.endTime ?? new Date(now.getTime() + sessionData.durationMinutes * 60000),
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await storage.addSession(session);
    const sessions = await storage.getSessions();
    set({ sessions });
    return session.id;
  },

  updateSession: async (session: Session) => {
    await storage.updateSession(session);
    const sessions = await storage.getSessions();
    set({ sessions });
  },

  deleteSession: async (id: string) => {
    await storage.deleteSession(id);
    const sessions = await storage.getSessions();
    set({ sessions });
  },

  getSessions: async (filters?: {
    type?: string;
    module?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    return storage.getSessions(filters);
  },

  // ===== Debt Tasks =====
  createDebtTask: async (module: string, missedBlockId: string) => {
    // Find suggested date (earliest free block)
    const freeBlocks = get().baseScheduleBlocks.filter((b) => b.category === 'free');
    const suggestedDate = freeBlocks.length > 0 ? new Date() : null;

    const task: DebtTask = {
      id: uuidv4(),
      module,
      missedBlockId,
      suggestedDate,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.addDebtTask(task);
    const debtTasks = await storage.getDebtTasks();
    set({ debtTasks });
  },

  updateDebtTask: async (task: DebtTask) => {
    await storage.updateDebtTask(task);
    const debtTasks = await storage.getDebtTasks();
    set({ debtTasks });
  },

  deleteDebtTask: async (id: string) => {
    await storage.deleteDebtTask(id);
    const debtTasks = await storage.getDebtTasks();
    set({ debtTasks });
  },

  getDebtTasksForModule: (module: string) => {
    return get().debtTasks.filter((t) => t.module === module);
  },

  // ===== Habits =====
  updateHabit: async (habit: Habit) => {
    await storage.updateHabit(habit);
    const habits = await storage.getHabits();
    set({ habits });
  },

  checkInHabit: async (habitId: string) => {
    const habit = get().habits.find((h) => h.id === habitId);
    if (!habit) throw new Error('Habit not found');

    const now = new Date();
    const lastCheckin = habit.lastCompletedDate
      ? new Date(habit.lastCompletedDate)
      : null;
    const isConsecutiveDay = lastCheckin && now.getTime() - lastCheckin.getTime() < 48 * 60 * 60 * 1000;

    // Use object spread to avoid mutation
    const updatedHabit = {
      ...habit,
      lastCompletedDate: now,
      completionDates: [...(habit.completionDates || []), now],
      currentStreak: isConsecutiveDay ? habit.currentStreak + 1 : 1,
      longestStreak: Math.max(habit.longestStreak, isConsecutiveDay ? habit.currentStreak + 1 : 1),
    };

    await storage.updateHabit(updatedHabit);
    const habits = await storage.getHabits();
    set({ habits });
  },

  // ===== Weekly Review =====
  getOrCreateWeeklyReview: async (weekStartDate: Date) => {
    let review = await storage.getWeeklyReview(weekStartDate);
    if (!review) {
      review = {
        id: uuidv4(),
        weekStartDate,
        totalStudyHours: 0,
        moduleHours: {},
        gymSessions: 0,
        quranEntries: 0,
        debtTasksCompleted: 0,
        executionScore: 0,
        hadFallbackDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await storage.addWeeklyReview(review);
    }
    return review;
  },

  updateWeeklyReview: async (review: WeeklyReview) => {
    await storage.updateWeeklyReview(review);
  },

  // ===== Settings =====
  updateSettings: async (updates: Partial<Settings>) => {
    const current = get().settings || {
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
      notificationTime: '08:00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = { ...current, ...updates };
    await storage.updateSettings(updated);
    set({ settings: updated });
  },

  // ===== Analytics =====
  calculateExecutionScore: (startDate: Date, endDate: Date) => {
    const store = get();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    const sessionsInRange = store.sessions.filter(
      (s) => s.date.getTime() >= startTime && s.date.getTime() <= endTime
    );

    const criticalModules = store.modules.filter((m) => m.isCritical);
    if (criticalModules.length === 0) return 0;
    
    let score = 0;

    for (const module of criticalModules) {
      const moduleSessions = sessionsInRange.filter((s) => s.module === module.code);
      const hours = moduleSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
      const targetHours = module.targetHoursPerWeek || 1;
      const moduleScore = Math.min((hours / targetHours) * 100, 100);
      score += moduleScore * module.coefficient;
    }

    const totalCoeff = criticalModules.reduce((sum, m) => sum + m.coefficient, 0);
    return totalCoeff > 0 ? Math.round(score / totalCoeff) : 0;
  },

  getModuleStudyHours: (moduleCode: string, startDate: Date, endDate: Date) => {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const sessionsInRange = get()
      .sessions.filter((s) => s.module === moduleCode && s.date.getTime() >= startTime && s.date.getTime() <= endTime);

    return sessionsInRange.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
  },

  getWeeklySummary: async (weekStartDate: Date) => {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const startTime = weekStartDate.getTime();
    const endTime = weekEndDate.getTime();
    const sessionsInWeek = get().sessions.filter(
      (s) => s.date.getTime() >= startTime && s.date.getTime() <= endTime
    );

    return {
      totalStudyHours: sessionsInWeek
        .filter((s) => ['focus', 'module_study'].includes(s.type))
        .reduce((sum, s) => sum + s.durationMinutes, 0) / 60,
      gymSessions: sessionsInWeek.filter((s) => s.type === 'gym').length,
      typingAvgWpm: sessionsInWeek
        .filter((s) => s.type === 'typing')
        .reduce((sum, s) => sum + (s.wpm || 0), 0) / Math.max(1, sessionsInWeek.filter((s) => s.type === 'typing').length),
      executionScore: get().calculateExecutionScore(weekStartDate, weekEndDate),
    };
  },

  // ===== Fallback & No-Zero-Day =====
  checkNeedsDebtRecovery: (date: Date) => {
    const store = get();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const startTime = dayStart.getTime();
    const endTime = dayEnd.getTime();

    const daySessionsMinutes = store.sessions
      .filter((s) => {
        const sTime = s.date.getTime();
        return sTime >= startTime && sTime <= endTime && store.modules.find((m) => m.code === s.module && m.isCritical);
      })
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    return daySessionsMinutes < (store.settings?.noZeroDayThresholdMinutes || 30);
  },

  logFallbackSession: async (types: SessionType[], notes?: string) => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    for (const type of types) {
      let duration = 10;
      if (type === 'quran_review') {
        duration = get().settings?.fallbackQuranMinutes || 20;
      }

      const session: Session = {
        id: uuidv4(),
        date: now,
        type,
        startTime: now,
        endTime: new Date(now.getTime() + duration * 60 * 1000),
        durationMinutes: duration,
        deepWork: false,
        distractionCount: 0,
        isFallback: true,
        notesText: notes || 'Fallback mode activation',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await get().logSession(session);
    }
  },

  // ===== UI Navigation =====
  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  setSelectedDayOfWeek: (day: number) => {
    set({ selectedDayOfWeek: day });
  },

  setCurrentView: (view: string) => {
    set({ currentView: view as any });
  },
}));
