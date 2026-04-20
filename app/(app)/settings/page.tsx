'use client';

import { useState, useEffect } from 'react';
import { useLifeOsStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { Check, Edit2, X, Plus, Bell, BellOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  Alarm, getAlarms, saveAlarm, deleteAlarm,
  toggleAlarm, requestPermission, DEFAULT_ALARMS, nextFireTime,
} from '@/lib/alarms';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CATEGORIES = ['study', 'uni', 'library', 'tdprep', 'webdev', 'typing', 'gym', 'quran', 'masjid', 'free', 'sleep'] as const;

export default function SettingsPage() {
  const settings = useLifeOsStore((state) => state.settings);
  const updateSettings = useLifeOsStore((state) => state.updateSettings);
  const modules = useLifeOsStore((state) => state.modules);
  const updateModule = useLifeOsStore((state) => state.updateModule);
  const baseScheduleBlocks = useLifeOsStore((state) => state.baseScheduleBlocks);
  const addScheduleBlock = useLifeOsStore((state) => state.addScheduleBlock);
  const updateScheduleBlock = useLifeOsStore((state) => state.updateScheduleBlock);
  const deleteScheduleBlock = useLifeOsStore((state) => state.deleteScheduleBlock);
  const isLoading = useLifeOsStore((state) => state.isLoading);
  const { theme, setTheme } = useTheme();

  const [userName, setUserName] = useState('Sidali');
  const [nzdThreshold, setNzdThreshold] = useState('30');
  const [saveMsg, setSaveMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Module editing
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [modCoeff, setModCoeff] = useState('');
  const [modWeakness, setModWeakness] = useState('');
  const [modTarget, setModTarget] = useState('');

  // Schedule block editing
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [filterDay, setFilterDay] = useState<number | null>(null);

  // New block form
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState('0');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('09:00');
  const [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>('study');
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  // ── Alarm state ──────────────────────────────────────────────────────────
  const [alarms, setAlarms]             = useState<Alarm[]>([]);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [newAlarmTitle, setNewAlarmTitle] = useState('');
  const [newAlarmBody, setNewAlarmBody]   = useState('');
  const [newAlarmTime, setNewAlarmTime]   = useState('08:00');
  const [newAlarmDays, setNewAlarmDays]   = useState<number[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotifPermission(Notification?.permission ?? 'default');
      getAlarms().then(setAlarms).catch(() => {});
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  const handleToggleAlarm = async (id: string, enabled: boolean) => {
    await toggleAlarm(id, enabled);
    setAlarms(await getAlarms());
  };

  const handleDeleteAlarm = async (id: string) => {
    await deleteAlarm(id);
    setAlarms(await getAlarms());
  };

  const handleSeedDefaultAlarms = async () => {
    for (const alarm of DEFAULT_ALARMS) {
      await saveAlarm({ ...alarm, fireAt: nextFireTime(alarm), fired: false });
    }
    setAlarms(await getAlarms());
  };

  const handleAddAlarm = async () => {
    if (!newAlarmTitle || !newAlarmTime) return;
    const alarm: Alarm = {
      id: uuidv4(),
      title: newAlarmTitle,
      body: newAlarmBody,
      timeHH: newAlarmTime,
      days: newAlarmDays,
      enabled: true,
      url: '/today',
    };
    await saveAlarm(alarm);
    setAlarms(await getAlarms());
    setNewAlarmTitle(''); setNewAlarmBody(''); setNewAlarmTime('08:00');
    setNewAlarmDays([]); setShowAddAlarm(false);
  };

  const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    const saved = localStorage.getItem('lifeos_username');
    if (saved) setUserName(saved);
  }, []);

  useEffect(() => {
    if (settings) setNzdThreshold(String(settings.noZeroDayThresholdMinutes || 30));
  }, [settings]);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    localStorage.setItem('lifeos_username', userName);
    try {
      await updateSettings({ noZeroDayThresholdMinutes: parseInt(nzdThreshold) || 30, updatedAt: new Date() } as any);
      setSaveMsg('Saved ✓');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditModule = (mod: typeof modules[0]) => {
    setEditingModule(mod.id);
    setModCoeff(String(mod.coefficient));
    setModWeakness(String(mod.weakness));
    setModTarget(String(mod.targetHoursPerWeek));
  };

  const saveModule = async (mod: typeof modules[0]) => {
    const coeff = parseFloat(modCoeff) || mod.coefficient;
    const weakness = parseFloat(modWeakness) || mod.weakness;
    await updateModule({
      ...mod,
      coefficient: coeff,
      weakness,
      priorityScore: coeff * weakness,
      targetHoursPerWeek: parseFloat(modTarget) || mod.targetHoursPerWeek,
    });
    setEditingModule(null);
  };

  const startEditBlock = (block: typeof baseScheduleBlocks[0]) => {
    setEditingBlock(block.id);
    setBlockTitle(block.title);
    setBlockStart(block.startTime || '');
    setBlockEnd(block.endTime || '');
  };

  const saveBlock = async (block: typeof baseScheduleBlocks[0]) => {
    await updateScheduleBlock({
      ...block,
      title: blockTitle,
      startTime: blockStart as any,
      endTime: blockEnd as any,
      updatedAt: new Date(),
    });
    setEditingBlock(null);
  };

  const handleAddBlock = async () => {
    if (!newTitle.trim() || !newStart || !newEnd) return;
    setIsAddingBlock(true);
    try {
      const now = new Date();
      // Calculate duration from start/end times
      const [sh, sm] = newStart.split(':').map(Number);
      const [eh, em] = newEnd.split(':').map(Number);
      const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
      await addScheduleBlock({
        id: uuidv4(),
        dayOfWeek: parseInt(newDay) as any,
        title: newTitle.trim(),
        category: newCategory,
        timeKind: 'fixed',
        startTime: newStart as any,
        endTime: newEnd as any,
        durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
        weight: 1,
        labelTime: null,
        immutableBlockId: null,
        createdAt: now,
        updatedAt: now,
      });
      setNewTitle('');
      setNewStart('08:00');
      setNewEnd('09:00');
      setNewCategory('study');
      setShowAddBlock(false);
    } finally {
      setIsAddingBlock(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  const filteredBlocks = baseScheduleBlocks
    .filter((b) => filterDay === null ? true : b.dayOfWeek === filterDay)
    .filter((b) => b.timeKind === 'fixed')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="mb-2">
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Customize everything in your LifeOS</p>
      </div>

      {/* ── General ── */}
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4">General</h3>
        <div className="space-y-4">
          <div>
            <Label>Your Name (shown in greeting)</Label>
            <Input
              className="mt-1 max-w-xs"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Sidali"
            />
          </div>
          <div>
            <Label>Min. study minutes for No-Zero-Day</Label>
            <Input
              type="number" className="mt-1 max-w-xs"
              value={nzdThreshold}
              onChange={(e) => setNzdThreshold(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveGeneral} disabled={isSaving}>
            {saveMsg || (isSaving ? 'Saving...' : 'Save Changes')}
          </Button>
        </div>
      </Card>

      {/* ── Appearance ── */}
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4">Appearance</h3>
        <div className="flex gap-2">
          <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="flex-1">🌙 Dark</Button>
          <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="flex-1">☀️ Light</Button>
        </div>
      </Card>

      {/* ── Modules ── */}
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-1">Modules</h3>
        <p className="text-sm text-muted-foreground mb-4">Edit coefficient, weakness, and weekly target hours. Priority = coeff × weakness.</p>
        <div className="space-y-2">
          {[...modules].sort((a, b) => b.priorityScore - a.priorityScore).map((mod) => {
            const isEditing = editingModule === mod.id;
            return (
              <div key={mod.id} className="rounded-lg border border-border p-3">
                {!isEditing ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">{mod.code}</span>
                      <span className="text-xs text-muted-foreground ml-2">{mod.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Coeff: <strong className="text-foreground">{mod.coefficient}</strong></span>
                      <span>Weakness: <strong className="text-foreground">{mod.weakness}%</strong></span>
                      <span>Target: <strong className="text-foreground">{mod.targetHoursPerWeek}h/wk</strong></span>
                      <span>Priority: <strong className="text-accent">{mod.priorityScore}</strong></span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditModule(mod)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground text-sm">{mod.code}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Coefficient</Label>
                        <Input type="number" className="mt-1 h-8 text-sm" value={modCoeff} onChange={(e) => setModCoeff(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Weakness (0–100)</Label>
                        <Input type="number" className="mt-1 h-8 text-sm" value={modWeakness} onChange={(e) => setModWeakness(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Target h/week</Label>
                        <Input type="number" className="mt-1 h-8 text-sm" value={modTarget} onChange={(e) => setModTarget(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveModule(mod)}><Check className="w-3 h-3 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingModule(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Schedule Blocks ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-foreground">Schedule Blocks</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddBlock((v) => !v)}>
            <Plus className="w-3 h-3 mr-1" />
            Add Block
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Edit, add, or delete any block in your weekly schedule.</p>

        {/* Add Block Form */}
        {showAddBlock && (
          <div className="mb-4 p-4 rounded-lg border border-accent/40 bg-accent/5 space-y-3">
            <p className="text-sm font-semibold text-foreground">New Block</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Title</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="e.g., ALGO2 Deep Work"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Day</Label>
                <Select value={newDay} onValueChange={setNewDay}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (
                      <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as any)}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Start</Label>
                <Input type="time" className="mt-1 h-8 text-sm" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Input type="time" className="mt-1 h-8 text-sm" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddBlock} disabled={!newTitle.trim() || isAddingBlock}>
                <Check className="w-3 h-3 mr-1" />
                {isAddingBlock ? 'Adding...' : 'Add Block'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddBlock(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
        {/* Day filter */}
        <div className="flex gap-1 flex-wrap mb-4">
          <button
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterDay === null ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
          >All</button>
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => setFilterDay(filterDay === i ? null : i)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterDay === i ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
            >{d}</button>
          ))}
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filteredBlocks.map((block) => {
            const isEditing = editingBlock === block.id;
            return (
              <div key={block.id} className="rounded border border-border p-2.5">
                {!isEditing ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-8 shrink-0">{DAYS[block.dayOfWeek]}</span>
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{block.startTime}–{block.endTime}</span>
                      <span className="text-sm text-foreground truncate">{block.title}</span>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditBlock(block)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteScheduleBlock(block.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input className="mt-1 h-8 text-sm" value={blockTitle} onChange={(e) => setBlockTitle(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start (HH:MM)</Label>
                        <Input type="time" className="mt-1 h-8 text-sm" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">End (HH:MM)</Label>
                        <Input type="time" className="mt-1 h-8 text-sm" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveBlock(block)}><Check className="w-3 h-3 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingBlock(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Alarms & Notifications ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-foreground">Alarms & Notifications</h3>
          {notifPermission === 'granted'
            ? <span className="text-xs text-green-400 flex items-center gap-1"><Bell className="w-3 h-3" />Enabled</span>
            : <span className="text-xs text-muted-foreground flex items-center gap-1"><BellOff className="w-3 h-3" />Off</span>}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Get notified before key moments — leaving home, evening study, weekends.
        </p>

        {/* Permission */}
        {notifPermission !== 'granted' && (
          <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-sm font-medium text-foreground mb-2">
              {notifPermission === 'denied'
                ? '⚠️ Notifications blocked — enable in Android settings'
                : '🔔 Allow notifications to use alarms'}
            </p>
            {notifPermission !== 'denied' && (
              <Button size="sm" onClick={handleRequestPermission}>
                Allow Notifications
              </Button>
            )}
          </div>
        )}

        {/* Load defaults button */}
        {alarms.length === 0 && notifPermission === 'granted' && (
          <Button variant="outline" size="sm" className="mb-4" onClick={handleSeedDefaultAlarms}>
            Load suggested alarms for your schedule
          </Button>
        )}

        {/* Alarm list */}
        {alarms.length > 0 && (
          <div className="space-y-2 mb-4">
            {alarms.map(alarm => (
              <div key={alarm.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{alarm.timeHH}</span>
                    <span className="text-sm text-foreground truncate">{alarm.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alarm.days.length === 0
                      ? 'Every day'
                      : alarm.days.map(d => DAYS_SHORT[d]).join(', ')}
                    {alarm.body ? ` · ${alarm.body}` : ''}
                  </p>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => handleToggleAlarm(alarm.id, !alarm.enabled)}
                  className={`w-10 h-6 rounded-full transition-colors shrink-0 ${alarm.enabled ? 'bg-accent' : 'bg-secondary'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full mx-auto transition-transform ${alarm.enabled ? 'translate-x-2' : '-translate-x-2'}`} />
                </button>
                <button onClick={() => handleDeleteAlarm(alarm.id)} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add alarm form */}
        {showAddAlarm ? (
          <div className="space-y-3 p-3 rounded-lg border border-accent/40 bg-accent/5">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Title</Label>
                <Input className="mt-1 h-8 text-sm" placeholder="e.g., Study time 📚" value={newAlarmTitle} onChange={e => setNewAlarmTitle(e.target.value)} autoFocus />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Message (optional)</Label>
                <Input className="mt-1 h-8 text-sm" placeholder="e.g., Start with ALGO2" value={newAlarmBody} onChange={e => setNewAlarmBody(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input type="time" className="mt-1 h-8 text-sm" value={newAlarmTime} onChange={e => setNewAlarmTime(e.target.value)} />
              </div>
            </div>
            {/* Day picker */}
            <div>
              <Label className="text-xs">Days (empty = every day)</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {DAYS_SHORT.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => setNewAlarmDays(prev =>
                      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                    )}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      newAlarmDays.includes(i) ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAlarm} disabled={!newAlarmTitle || !newAlarmTime}>
                <Check className="w-3 h-3 mr-1" /> Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddAlarm(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAddAlarm(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add Alarm
          </Button>
        )}
      </Card>

      {/* ── Data ── */}
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-1">Data</h3>
        <p className="text-sm text-muted-foreground mb-4">Backup your data or reset everything.</p>
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={async () => {
            const { db } = await import('@/lib/db');
            const [blocks, modules, sessions] = await Promise.all([db.scheduleBlocks.toArray(), db.modules.toArray(), db.sessions.toArray()]);
            const blob = new Blob([JSON.stringify({ blocks, modules, sessions, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
          }}>
            📥 Export Backup (JSON)
          </Button>
          <Button
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => {
              if (confirm('Delete ALL data and reset? This cannot be undone.')) {
                const req = window.indexedDB.deleteDatabase('LifeOS');
                req.onsuccess = () => window.location.reload();
              }
            }}
          >
            🗑️ Reset Database & Re-seed
          </Button>
        </div>
      </Card>
    </div>
  );
}
