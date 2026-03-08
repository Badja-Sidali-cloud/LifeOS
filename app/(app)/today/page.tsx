'use client';

import { useEffect, useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { ScheduleBlock, Session } from '@/lib/schemas';
import { getDayOfWeek, getBlocksForDay, sortBlocksByTime, groupBlocksBySection, getCategoryLabel, getCategoryBgColor, getCategoryColor, formatDuration, hashStringToNumber, isSameDay } from '@/lib/utils-schedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function TodayPage() {
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const setSelectedDate = useLifeOsStore((state) => state.setSelectedDate);
  const baseScheduleBlocks = useLifeOsStore((state) => state.baseScheduleBlocks);
  const sessions = useLifeOsStore((state) => state.sessions);
  const isLoading = useLifeOsStore((state) => state.isLoading);
  const logSession = useLifeOsStore((state) => state.logSession);
  const deleteSession = useLifeOsStore((state) => state.deleteSession);

  const [todayBlocks, setTodayBlocks] = useState<ScheduleBlock[]>([]);
  const [completedBlockMap, setCompletedBlockMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const dayOfWeek = getDayOfWeek(selectedDate);
    const blocks = getBlocksForDay(baseScheduleBlocks, dayOfWeek);
    const sorted = sortBlocksByTime(blocks);
    setTodayBlocks(sorted);

    // Calculate which blocks are completed (derive from sessions)
    const completed = new Map<string, string>();
    for (const block of blocks) {
      const blockSession = sessions.find(
        (s) =>
          isSameDay(s.date, selectedDate) &&
          s.module === block.id &&
          s.type === 'block_complete'
      );
      if (blockSession) {
        completed.set(block.id, blockSession.id);
      }
    }
    setCompletedBlockMap(completed);
  }, [selectedDate, baseScheduleBlocks, sessions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading today's schedule...</p>
      </div>
    );
  }

  const sections = groupBlocksBySection(todayBlocks);
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const isToday = isSameDay(selectedDate, new Date());

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header with Date Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" onClick={handlePrevDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {dayName} {isToday ? '(Today)' : ''}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            {todayBlocks.length} blocks scheduled • {completedBlockMap.size} completed
          </p>
        </div>
      </div>

      {/* Blocks by Section */}
      <div className="space-y-8">
        {['Morning', 'Midday', 'Evening', 'Flexible'].map((section) => {
          const sectionBlocks = sections[section] || [];
          if (sectionBlocks.length === 0) return null;

          return (
            <div key={section}>
              <h2 className="text-xl font-semibold text-foreground mb-4">{section}</h2>
              <div className="space-y-3">
                {sectionBlocks.map((block) => {
                  const isCompleted = completedBlockMap.has(block.id);
                  const duration = block.timeKind === 'fixed' && block.startTime && block.endTime
                    ? `${block.startTime} - ${block.endTime}`
                    : `${block.durationMinutes}m`;
                  
                  // Deterministic color based on block ID
                  const colorIndex = hashStringToNumber(block.id) % 5;
                  const colorVars = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
                  const borderColor = `var(${colorVars[colorIndex]})`;

                  return (
                    <Card
                      key={block.id}
                      className={`p-4 border-l-4 transition-all ${getCategoryBgColor(block.category)} ${
                        isCompleted ? 'opacity-60' : ''
                      }`}
                      style={{ borderLeftColor: borderColor }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isCompleted && <Check className="w-5 h-5 text-accent flex-shrink-0" />}
                            <h3 className={`font-semibold text-foreground ${isCompleted ? 'opacity-70' : ''}`}>
                              {block.title}
                            </h3>
                            <span className="text-xs px-2 py-1 bg-secondary/50 text-secondary-foreground rounded">
                              {getCategoryLabel(block.category)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{duration}</p>
                          {block.details && (
                            <p className="text-sm text-foreground/80">{block.details}</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant={isCompleted ? 'default' : 'outline'}
                            className="h-8 px-3"
                            onClick={async () => {
                              if (isCompleted) {
                                // Delete the session from DB
                                const sessionId = completedBlockMap.get(block.id);
                                if (sessionId) {
                                  await deleteSession(sessionId);
                                  setCompletedBlockMap(prev => {
                                    const next = new Map(prev);
                                    next.delete(block.id);
                                    return next;
                                  });
                                }
                              } else {
                                // Log completion as session
                                const sessionId = await logSession({
                                  type: 'block_complete',
                                  module: block.id,
                                  durationMinutes: block.durationMinutes || 0,
                                  date: selectedDate,
                                  deepWork: true,
                                  distractionCount: 0,
                                  notesText: block.title,
                                });
                                setCompletedBlockMap(prev => new Map(prev).set(block.id, sessionId));
                              }
                            }}
                          >
                            {isCompleted ? 'Done' : 'Mark Done'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Block */}
      <div className="mt-12 pt-8 border-t border-border">
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Unplanned Activity
        </Button>
      </div>
    </div>
  );
}
