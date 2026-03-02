import { PLACES } from '../types';

export interface LocalCheck {
  name: string;
  place: string;
  timestamp: number;
}

const STORAGE_KEY = 'highstep_attendance_checks_v1';

export function loadChecks(): LocalCheck[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.name === 'string' &&
        typeof item.place === 'string' &&
        typeof item.timestamp === 'number'
    );
  } catch {
    return [];
  }
}

export function addCheck(check: LocalCheck): void {
  if (typeof window === 'undefined') return;
  const current = loadChecks();
  current.push(check);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore write errors
  }
}

export function removeCheck(target: LocalCheck): void {
  if (typeof window === 'undefined') return;
  const current = loadChecks();
  const filtered = current.filter(
    (c) =>
      !(
        c.name === target.name &&
        c.place === target.place &&
        c.timestamp === target.timestamp
      )
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore write errors
  }
}

export function getChecksForName(name: string): LocalCheck[] {
  return loadChecks().filter((c) => c.name === name);
}

export interface NameSummary {
  totalExtra: number;
  perPlaceCount: Record<string, number>;
  perPlaceLatest: Record<string, number>;
}

export function getSummaryForName(name: string): NameSummary {
  const checks = getChecksForName(name);
  const perPlaceCount: Record<string, number> = {};
  const perPlaceLatest: Record<string, number> = {};
  let totalExtra = 0;

  for (const check of checks) {
    if (!PLACES.includes(check.place)) continue;
    totalExtra += 1;
    perPlaceCount[check.place] = (perPlaceCount[check.place] || 0) + 1;
    if (!perPlaceLatest[check.place] || perPlaceLatest[check.place] < check.timestamp) {
      perPlaceLatest[check.place] = check.timestamp;
    }
  }

  return { totalExtra, perPlaceCount, perPlaceLatest };
}

export function loadAllChecks(): LocalCheck[] {
  return loadChecks();
}
