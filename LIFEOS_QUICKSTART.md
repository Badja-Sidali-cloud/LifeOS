# LifeOS - Quick Start Guide

## What Was Fixed

This complete rebuild implements the exact "Sidali Master Execution System" schedule with proper seeding, immutable base schedule, and accountability features.

### Critical Changes Made

1. **Exact Seed Data (100+ schedule blocks)**
   - ✅ All 8 modules with exact coefficients and weakness scores (ANALY2: 4×35, ALGO2: 4×45, STR M: 2×15, STAT: 2×15, ELEC: 2×25, ALG2: 2×35, OPM: 1×25, TIC)
   - ✅ Complete weekly schedule (Monday-Sunday) with exact times, titles, categories, and notes
   - ✅ Global daily blocks (Typing 22:00-22:15, Web Dev 22:15-23:15, Sleep 00:30-06:00, Quran blocks, Masjid review)
   - ✅ Library rotation: Monday STR M Feynman, Tuesday ANALY2 Hard Problems, Thursday STAT Problems
   - ✅ Prayer-labeled time blocks (Choroq/Fajr for morning, Maghreb/Isha for evening)
   - ✅ Core habits: Quran Memorization, Quran Review, Typing, Web Dev, Gym, Sleep

2. **Database & Persistence**
   - ✅ Dexie (IndexedDB) as single source of truth
   - ✅ Storage service interface (clean abstraction for future Supabase)
   - ✅ Auto-initialization on app start with loading UI
   - ✅ Zustand hydrates from Dexie without parallel persist middleware
   - ✅ Base schedule marked as immutable (immutableBlockId=null)

3. **UI/UX**
   - ✅ Dark sleek theme with cyan-blue accents
   - ✅ /today page shows today's schedule blocks immediately on fresh load
   - ✅ Blocks grouped by sections (Morning/Midday/Evening/Flexible)
   - ✅ Time model supports both fixed blocks (HH:MM) and prayer-labeled blocks
   - ✅ Loading spinner during initialization

4. **Accountability**
   - ✅ Execution score (visible on /today, sidebar)
   - ✅ Debt task system for missed critical modules
   - ✅ No-Zero-Day with "Fallback Required" prompt (never auto-logs)
   - ✅ Weekly metrics dashboard (in Reviews page)

## Testing Instructions

### Fresh Start (First Time)
1. Open the app in a fresh browser tab
2. You should see "Initializing LifeOS..." loading screen
3. Within 2-3 seconds, it automatically seeds the database with all schedule blocks
4. Navigate to **/today** → should show **8-15+ schedule blocks** for today's day of week
5. Blocks are grouped by Morning/Midday/Evening/Flexible sections
6. Each block shows: title, time (or duration if prayer-labeled), category badge, details

### Key Pages to Test
- **Today (`/today`)**: Should show today's blocks immediately. Click checkmarks to mark complete.
- **Week (`/week`)**: Grid view of all 7 days with completion heatmap
- **Study (`/study`)**: Module priority list (sorted by coefficient×weakness)
- **Habits (`/habits`)**: Quran, Typing, Web Dev, Gym, Sleep streaks
- **Gym (`/gym`)**: Full-body templates (Squat/Push/Row)
- **Reviews (`/reviews`)**: Weekly metrics dashboard
- **Settings (`/settings`)**: Prayer times, thresholds, and **"Reset Database & Re-seed"** button

### Reset Database for Testing
1. Go to **Settings** → scroll to **"Developer Tools"**
2. Click **"Reset Database & Re-seed"**
3. Confirm when prompted
4. Page reloads, database is wiped, app re-seeds automatically
5. Verify /today shows blocks again

### Acceptance Tests (Must Pass)
- [ ] Fresh load (empty IndexedDB) → seed runs → /today shows 8+ blocks for today
- [ ] /week grid shows all blocks across 7 days
- [ ] Toggle "done" on any block → completion reflected in execution score
- [ ] Mark critical study block missed → DebtTask appears in queue
- [ ] Log a focus session → Session created, weekly hours updated
- [ ] Settings Export button → JSON backup downloaded
- [ ] Reset Database → data cleared, re-seeded on reload

## Architecture

```
lib/schemas.ts         → Zod schemas (ScheduleBlock, Module, Session, etc.)
lib/seed-data.ts       → EXACT schedule blocks (100+), modules, habits
lib/db.ts              → Dexie setup, StorageService (query, upsert, delete)
lib/utils-schedule.ts  → getDayOfWeek, sortBlocksByTime, groupBySection
store/store.ts         → Zustand store (hydrates from Dexie, write-through)
app/(app)/today/page.tsx  → Today's schedule with section grouping
app/(app)/*             → Week, Study, Habits, Gym, Reviews, Settings
```

## Key Design Decisions

1. **TimeKind: 'fixed' | 'label'**
   - Fixed blocks: startTime/endTime in HH:MM (e.g., "09:00"-"10:30")
   - Label blocks: labelTime + durationMinutes (e.g., Maghreb 30min)

2. **DayOfWeek: 0=Monday → 6=Sunday**
   - Monday-first grid (not JavaScript's 0=Sunday)

3. **Base Schedule Immutability**
   - Base blocks have immutableBlockId=null
   - UI enforces read-only (no inline edits)
   - New versions reference base via immutableBlockId

4. **Module Priority**
   - Formula: coefficient × weakness
   - ALGO2: 4 × 45 = 180 (highest)
   - OPM: 1 × 25 = 25 (lowest)

## Data Model
- **ScheduleBlock**: 100+ blocks (seeded exactly from schedule.html)
- **Module**: 8 modules with coef/weakness/priorityScore
- **Session**: Focus/study/gym/typing logged entries
- **Habit**: Quran, Typing, Web Dev, Gym, Sleep with streaks
- **DebtTask**: Missed critical blocks suggest rescheduling
- **WeeklyReview**: Metrics per week (study hours, gym, WPM, etc.)
- **Settings**: Prayer times, thresholds, notifications

## Next Steps (Not Implemented Yet)

- Command palette (Ctrl+K)
- Focus timer with distraction counting
- WeeklyReview templates for Friday/Sunday
- Gym progressive overload tracking
- Typing WPM history
- Quran memorization tracking
- Chart visualizations (Recharts)

## Troubleshooting

**Q: "Database already initialized" but no blocks show?**
- A: IndexedDB persists. Clear browser storage or use Settings → Reset Database.

**Q: /today shows empty?**
- A: Check that today's dayOfWeek matches seed blocks. Use console: `new Date().getDay()` → convert to (day+6)%7.

**Q: Why "Initializing LifeOS..." takes 2+ seconds?**
- A: Dexie is creating IndexedDB, seeding 100+ blocks. Intentional for data integrity.

---

**Status**: Ready for acceptance testing. All seed data matches spec exactly.
