'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isSameDay, getWeekStart, getWeekEnd } from '@/lib/utils-schedule';

type Tab = 'Memorization' | 'Review';

export default function QuranPage() {
  const sessions = useLifeOsStore((state) => state.sessions);
  const logSession = useLifeOsStore((state) => state.logSession);
  const selectedDate = useLifeOsStore((state) => state.selectedDate);
  const isLoading = useLifeOsStore((state) => state.isLoading);

  const [activeTab, setActiveTab] = useState<Tab>('Memorization');
  // Memorization fields
  const [surah, setSurah] = useState('');
  const [fromAyah, setFromAyah] = useState('');
  const [toAyah, setToAyah] = useState('');
  const [memNotes, setMemNotes] = useState('');
  // Review fields
  const [reviewRange, setReviewRange] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    setIsLogging(true);
    try {
      if (activeTab === 'Memorization') {
        const range = surah ? `${surah} ${fromAyah}–${toAyah}`.trim() : '';
        const ayahCount = (parseInt(toAyah) - parseInt(fromAyah) + 1) || 0;
        await logSession({
          type: 'quran_memorization',
          durationMinutes: ayahCount > 0 ? ayahCount * 2 : 5, // estimate 2min/ayah
          notesText: [range, memNotes].filter(Boolean).join(' | ') || 'Memorization session',
          date: selectedDate,
          deepWork: false,
          distractionCount: 0,
        });
        setSurah(''); setFromAyah(''); setToAyah(''); setMemNotes('');
      } else {
        await logSession({
          type: 'quran_review',
          durationMinutes: 20,
          notesText: [reviewRange, reviewNotes].filter(Boolean).join(' | ') || 'Review session',
          date: selectedDate,
          deepWork: false,
          distractionCount: 0,
        });
        setReviewRange(''); setReviewNotes('');
      }
    } finally {
      setIsLogging(false);
    }
  };

  const quranSessions = sessions.filter(
    (s) => s.type === 'quran_memorization' || s.type === 'quran_review'
  );
  const filteredSessions = sessions
    .filter((s) => s.type === (activeTab === 'Memorization' ? 'quran_memorization' : 'quran_review'))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const todaySessions = quranSessions.filter((s) => isSameDay(s.date, selectedDate));
  const weekSessions = quranSessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);

  const canSubmitMem = activeTab === 'Memorization' && surah && fromAyah && toAyah;
  const canSubmitRev = activeTab === 'Review';

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading…</p></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Quran Tracker</h1>
        <p className="text-muted-foreground">Log what you memorized or reviewed after each session</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Today', value: todaySessions.length + ' sessions' },
          { label: 'This Week', value: weekSessions.length + ' sessions' },
          { label: 'Total Logged', value: quranSessions.length },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-xl font-bold text-purple-400">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-6">
        {(['Memorization', 'Review'] as Tab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' : ''}
          >
            {tab === 'Memorization' ? '📖 Memorization (Hifz)' : '🔄 Review (Muraja\'a)'}
          </Button>
        ))}
      </div>

      {/* Log form */}
      <Card className="p-6 mb-6 border-purple-500/30">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {activeTab === 'Memorization' ? 'What did you memorize today?' : 'What did you review?'}
        </h2>

        {activeTab === 'Memorization' ? (
          <div className="space-y-4">
            <div>
              <Label>Surah Name</Label>
              <Input
                placeholder="e.g., Al-Baqarah, Al-Mulk..."
                value={surah}
                onChange={(e) => setSurah(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Ayah #</Label>
                <Input
                  type="number" min={1} placeholder="1"
                  value={fromAyah}
                  onChange={(e) => setFromAyah(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>To Ayah #</Label>
                <Input
                  type="number" min={1} placeholder="5"
                  value={toAyah}
                  onChange={(e) => setToAyah(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            {fromAyah && toAyah && parseInt(toAyah) >= parseInt(fromAyah) && (
              <p className="text-sm text-purple-400 font-medium">
                📊 {parseInt(toAyah) - parseInt(fromAyah) + 1} ayahs
              </p>
            )}
            <div>
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="Difficulty level, repetitions needed..."
                value={memNotes}
                onChange={(e) => setMemNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>What did you review?</Label>
              <Input
                placeholder="e.g., Juz 30, Al-Mulk, Pages 580–600..."
                value={reviewRange}
                onChange={(e) => setReviewRange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="Strong / weak parts, things to repeat..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleLog}
          disabled={!(canSubmitMem || canSubmitRev) || isLogging}
          className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isLogging ? 'Saving…' : '✓ Log Session'}
        </Button>
      </Card>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent {activeTab} History</h2>
        {filteredSessions.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No {activeTab.toLowerCase()} sessions logged yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map((s) => (
              <Card key={s.id} className="p-4 border-purple-500/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    {s.notesText && (
                      <p className="text-xs text-purple-400 mt-0.5">{s.notesText}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
