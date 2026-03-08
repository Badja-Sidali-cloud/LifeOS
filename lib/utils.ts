import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ensures a value is a valid Date object.
 * Dexie serializes Date fields as ISO strings, this rehydrates them.
 * @param val - Date, ISO string, or falsy value
 * @returns Date object or null if invalid
 */
export function ensureDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}
