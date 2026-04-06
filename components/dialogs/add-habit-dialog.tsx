'use client';

import { useState } from 'react';
import { useLifeOsStore } from '@/store/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const HABIT_TYPES = [
  { value: 'quran_memorization', label: 'Quran Memorization' },
  { value: 'quran_review', label: 'Quran Review' },
  { value: 'typing', label: 'Typing Practice' },
  { value: 'webdev', label: 'Web Development' },
  { value: 'gym', label: 'Gym/Exercise' },
  { value: 'sleep', label: 'Sleep Tracking' },
  { value: 'custom', label: '✏️ Custom (type your own)' },
];

interface AddHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddHabitDialog({ open, onOpenChange }: AddHabitDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [customType, setCustomType] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [isLoading, setIsLoading] = useState(false);

  const addHabit = useLifeOsStore((state) => state.addHabit);

  const resolvedType = type === 'custom' ? (customType.trim().toLowerCase().replace(/\s+/g, '_') || 'custom') : type;
  const isValid = name && type && (type !== 'custom' || customType.trim().length > 0);

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsLoading(true);
    try {
      await addHabit({
        name,
        type: resolvedType as any,
        targetFrequency: frequency as 'daily' | 'weekly',
      });
      setName('');
      setType('');
      setCustomType('');
      setFrequency('daily');
      onOpenChange(false);
    } catch (error) {
      console.error('[v0] Failed to add habit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="habit-name">Habit Name</Label>
            <Input
              id="habit-name"
              placeholder="e.g., Morning Walk, Cooking, Reading..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="habit-type">Category</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="habit-type">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {HABIT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === 'custom' && (
            <div>
              <Label htmlFor="custom-type">Custom Category Name</Label>
              <Input
                id="custom-type"
                placeholder="e.g., cooking, reading, meditation..."
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label htmlFor="habit-frequency">Target Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="habit-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            Create Habit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
