'use client';

import { useState } from 'react';
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
  Moon,
  Sun,
  BookOpen,
  Keyboard,
  AlertCircle,
  LayoutDashboard,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { getWeekStart, getWeekEnd } from '@/lib/utils-schedule';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

// ── All nav items ────────────────────────────────────────────────────────────
const ALL_NAV = [
  { id: 'today',     label: 'Today',    icon: Calendar,        href: '/today'     },
  { id: 'study',     label: 'Study',    icon: Book,            href: '/study'     },
  { id: 'quran',     label: 'Quran',    icon: BookOpen,        href: '/quran'     },
  { id: 'gym',       label: 'Gym',      icon: Dumbbell,        href: '/gym'       },
  { id: 'focus',     label: 'Focus',    icon: Target,          href: '/focus'     },
  { id: 'week',      label: 'Week',     icon: BarChart3,       href: '/week'      },
  { id: 'habits',    label: 'Habits',   icon: CheckSquare,     href: '/habits'    },
  { id: 'reviews',   label: 'Reviews',  icon: TrendingUp,      href: '/reviews'   },
  { id: 'dashboard', label: 'Dashboard',icon: LayoutDashboard, href: '/dashboard' },
  { id: 'typing',    label: 'Typing',   icon: Keyboard,        href: '/typing'    },
  { id: 'debt',      label: 'Debt',     icon: AlertCircle,     href: '/debt'      },
  { id: 'settings',  label: 'Settings', icon: Settings,        href: '/settings'  },
];

// Bottom bar shows these 5 — rest go in "More"
const BOTTOM_MAIN = ['today', 'study', 'quran', 'gym', 'focus'];
const bottomMain  = ALL_NAV.filter(i => BOTTOM_MAIN.includes(i.id));
const moreItems   = ALL_NAV.filter(i => !BOTTOM_MAIN.includes(i.id));

// ── Desktop Sidebar ──────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const setCurrentView = useLifeOsStore((s) => s.setCurrentView);
  const calculateExecutionScore = useLifeOsStore((s) => s.calculateExecutionScore);
  const debtTasks = useLifeOsStore((s) => s.debtTasks);
  const selectedDate = useLifeOsStore((s) => s.selectedDate);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd   = getWeekEnd(selectedDate);
  const executionScore   = calculateExecutionScore(weekStart, weekEnd);
  const pendingDebtCount = debtTasks.filter(t => t.status === 'pending').length;

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary">LifeOS</h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Personal Operating System</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        {ALL_NAV.map((item) => {
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
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
              {item.id === 'debt' && pendingDebtCount > 0 && (
                <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-bold">
                  {pendingDebtCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Stats */}
      <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
        <div>
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Week Execution</p>
          <p className="text-xl font-bold text-sidebar-primary mt-1">{executionScore}%</p>
        </div>
        {pendingDebtCount > 0 && (
          <div>
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Debt Tasks</p>
            <p className="text-xl font-bold text-destructive mt-1">{pendingDebtCount}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Mobile Bottom Nav ────────────────────────────────────────────────────────
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const debtTasks = useLifeOsStore((s) => s.debtTasks);
  const pendingDebtCount = debtTasks.filter(t => t.status === 'pending').length;

  return (
    <>
      {/* More drawer backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl p-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">More</p>
            <button onClick={() => setMoreOpen(false)} className="p-1 rounded hover:bg-secondary">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors',
                    isActive ? 'bg-accent/20 text-accent' : 'text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border flex items-stretch h-16 safe-bottom">
        {bottomMain.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative',
            moreOpen ? 'text-accent' : 'text-muted-foreground'
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
          {pendingDebtCount > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {pendingDebtCount}
            </span>
          )}
        </button>
      </nav>
    </>
  );
}

// ── Top Bar ──────────────────────────────────────────────────────────────────
export function TopBar() {
  const selectedDate = useLifeOsStore((s) => s.selectedDate);
  const calculateExecutionScore = useLifeOsStore((s) => s.calculateExecutionScore);
  const { theme, setTheme } = useTheme();
  const weekStart = getWeekStart(selectedDate);
  const weekEnd   = getWeekEnd(selectedDate);
  const executionScore = calculateExecutionScore(weekStart, weekEnd);

  return (
    <header className="border-b border-border bg-background px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
      {/* Mobile: show app name. Desktop: show date */}
      <div>
        <h2 className="hidden md:block text-base font-semibold text-foreground">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>
        <h2 className="md:hidden text-base font-bold text-foreground">LifeOS</h2>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent/20 text-accent">
          {executionScore}%
        </span>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 text-muted-foreground" />
            : <Moon className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>
    </header>
  );
}
