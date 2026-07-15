import { addDays, format, parseISO } from 'date-fns';

/** Local-time date key. All storage and lookups use this format. */
export function toKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDaysKey(key: string, n: number): string {
  return toKey(addDays(parseISO(key), n));
}

/** Header title for a diary day. `base` defaults to today (injectable for tests). */
export function dayTitle(key: string, base: string = todayKey()): string {
  if (key === base) return 'TODAY';
  if (key === addDaysKey(base, -1)) return 'YESTERDAY';
  if (key === addDaysKey(base, 1)) return 'TOMORROW';
  return format(parseISO(key), 'EEE · MMM d').toUpperCase();
}
