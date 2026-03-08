'use client';

import { useLifeOsStore } from '@/store/store';
import { cn } from '@/lib/utils';
import {
  Calendar,
  BarChart3,
  Target,
  Book,
  CheckSquare,
  Dumbbell,
  TrendingUp,
  Settings,
  Search,
  Moon,
  Sun,
  BookOpen,
  Keyboard,
  AlertCircle,
} from 'lucide-react';
import { getWeekStart, getWeekEnd } from '@/lib/utils-schedule';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAVIGATION_ITEMS = [
  { id: 'today', label: 'Today', icon: Calendar, href: '/today' },
  { id: 'week', label: 'Week', icon: BarChart3, href: '/week' },
  { id: 'focus', label: 'Focus', icon: Target, href: '/focus' },
  { id: 'study', label: 'Study', icon: Book, href: '/study' },
  { id: 'habits', label: 'Habits', icon: CheckSquare, href: '/habits' },
  { id: 'gym', label: 'Gym', icon: Dumbbell, href: '/gym' },
  { id: 'reviews', label: 'Reviews', icon: TrendingUp, href: '/reviews' },
  { id: 'quran', label: 'Quran', icon: BookOpen, href: '/quran' },
  { id: 'typing', label: 'Typing', icon: Keyboard, href: '/typing' },
  { id: 'debt', label: 'Debt Tasks', icon: AlertCircle, href: '/debt' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const setCurrentView = useLifeOsStore((state) => state.setCurrentView);
  const calculateExecutionScore = useLifeOsStore((state) => state.calculateExecutionScore);
  const debtTasks = useLifeOsStore((state) => state.debtTasks);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);

  // Calculate week execution score
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const executionScore = calculateExecutionScore(weekStart, weekEnd);
  const pendingDebtCount = debtTasks.filter((t) => t.status === 'pending').length;

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary">LifeOS</h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Personal Operating System</p>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search or press Ctrl+K"
            className="w-full px-3 py-2 bg-sidebar-accent border border-sidebar-border rounded-md text-sm text-sidebar-foreground placeholder-sidebar-foreground/40 focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/40" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Stats */}
      <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
        <div>
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Week Execution</p>
          <p className="text-xl font-bold text-sidebar-primary mt-1">{executionScore}%</p>
        </div>
        <div>
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Debt Tasks</p>
          <p className="text-xl font-bold text-sidebar-primary mt-1">{pendingDebtCount}</p>
        </div>
      </div>
    </aside>
  );
}

export function TopBar() {
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const settings = useLifeOsStore((state) => state.settings);
  const updateSettings = useLifeOsStore((state) => state.updateSettings);
  const calculateExecutionScore = useLifeOsStore((state) => state.calculateExecutionScore);


  // Calculate week execution score
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const executionScore = calculateExecutionScore(weekStart, weekEnd);

  // Handle theme toggle
  const handleThemeToggle = async () => {
    const newTheme = settings?.theme === 'dark' ? 'light' : 'dark';
    try {
      await updateSettings({
        userId: settings?.userId || 'default-user',
        theme: newTheme,
        fajrTime: settings?.fajrTime || null,
        dhuhrTime: settings?.dhuhrTime || null,
        asrTime: settings?.asrTime || null,
        maghrebTime: settings?.maghrebTime || null,
        ishaTime: settings?.ishaTime || null,
        noZeroDayThresholdMinutes: settings?.noZeroDayThresholdMinutes || 30,
        fallbackTypingMinutes: settings?.fallbackTypingMinutes || 10,
        fallbackQuranMinutes: settings?.fallbackQuranMinutes || 20,
        enableNotifications: settings?.enableNotifications || true,
        notificationTime: settings?.notificationTime || '08:00',
        createdAt: settings?.createdAt || new Date(),
        updatedAt: new Date(),
      });
      
      // Apply theme to html element
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('[v0] Failed to update theme:', error);
    }
  };

  return (
    <header className="border-b border-border bg-background px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Week execution score badge */}
        <span className="text-sm font-bold px-3 py-1 rounded-full bg-accent/20 text-accent">
          {executionScore}% this week
        </span>
        
        {/* Theme toggle button */}
        <button
          onClick={handleThemeToggle}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          title={`Switch to ${settings?.theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {settings?.theme === 'dark' ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </header>
  );
}
