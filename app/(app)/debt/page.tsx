'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DebtTask } from '@/lib/schemas';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function DebtPage() {
  const debtTasks = useLifeOsStore((state) => state.debtTasks);
  const modules = useLifeOsStore((state) => state.modules);
  const createDebtTask = useLifeOsStore((state) => state.createDebtTask);
  const updateDebtTask = useLifeOsStore((state) => state.updateDebtTask);
  const deleteDebtTask = useLifeOsStore((state) => state.deleteDebtTask);
  const isLoading = useLifeOsStore((state) => state.isLoading);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formModule, setFormModule] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const pendingTasks = debtTasks.filter((t) => t.status === 'pending');
  const completedTasks = debtTasks.filter((t) => t.status === 'completed');

  const handleCreate = async () => {
    if (!formModule) return;
    setIsCreating(true);
    try {
      await createDebtTask(formModule, 'manual-' + Date.now());
      setFormModule('');
      setFormNotes('');
      setShowAddForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = async (task: DebtTask) => {
    await updateDebtTask({ ...task, status: 'completed', updatedAt: new Date() });
  };

  const handleDelete = async (id: string) => {
    await deleteDebtTask(id);
  };

  // Color for module badge based on a simple hash
  function moduleBadgeColor(code: string) {
    const colors = [
      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      'bg-red-500/20 text-red-400 border border-red-500/30',
      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) & 0xffff;
    return colors[hash % colors.length];
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Debt Tasks</h1>
          <p className="text-muted-foreground">Missed sessions to recover</p>
        </div>
        <Button
          variant={showAddForm ? 'destructive' : 'default'}
          onClick={() => setShowAddForm((v) => !v)}
          size="sm"
        >
          {showAddForm ? 'Cancel' : '+ Add Debt Task'}
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="p-5 mb-6 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
          <h2 className="text-base font-semibold text-foreground mb-4">New Debt Task</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Module</label>
              <Select value={formModule} onValueChange={setFormModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module…" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.code}>
                      {m.code} — {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="What was missed?"
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!formModule || isCreating}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isCreating ? 'Creating…' : 'Create Debt Task'}
            </Button>
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-orange-400">{pendingTasks.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{completedTasks.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </Card>
      </div>

      {/* Pending tasks */}
      {pendingTasks.length === 0 ? (
        <Card className="p-8 text-center border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent mb-6">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-lg font-semibold text-green-400">No debt — you're on track!</p>
          <p className="text-sm text-muted-foreground mt-1">All sessions are up to date.</p>
        </Card>
      ) : (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Pending Tasks <span className="text-muted-foreground text-sm font-normal">({pendingTasks.length})</span>
          </h2>
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <DebtCard
                key={task.id}
                task={task}
                moduleBadgeColor={moduleBadgeColor}
                formatDate={formatDate}
                onComplete={() => handleComplete(task)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks (collapsible) */}
      {completedTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {showCompleted ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Completed ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <DebtCard
                  key={task.id}
                  task={task}
                  moduleBadgeColor={moduleBadgeColor}
                  formatDate={formatDate}
                  muted
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DebtCard({
  task,
  moduleBadgeColor,
  formatDate,
  onComplete,
  onDelete,
  muted,
}: {
  task: DebtTask;
  moduleBadgeColor: (code: string) => string;
  formatDate: (d: Date) => string;
  onComplete?: () => void;
  onDelete?: () => void;
  muted?: boolean;
}) {
  return (
    <Card
      className={`p-4 ${
        muted
          ? 'opacity-60 border-border'
          : 'border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-base font-bold`}>{task.module}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${moduleBadgeColor(task.module)}`}>
              {task.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Created {formatDate(task.createdAt)}</p>
          {task.suggestedDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Suggested: {formatDate(task.suggestedDate)}
            </p>
          )}
          {task.notes && (
            <p className="text-xs text-foreground/70 mt-1 italic">{task.notes}</p>
          )}
        </div>
        {!muted && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-green-400 border-green-500/40 hover:bg-green-500/10 text-xs"
              onClick={onComplete}
            >
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10 text-xs"
              onClick={onDelete}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
