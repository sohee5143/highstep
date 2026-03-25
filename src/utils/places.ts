import { supabase } from './supabaseClient';
import { CURRENT_SEASON, PlaceInfo } from '../types';

interface DbSession {
  id: number;
  place: string;
  date: string | null;
  season: string | null;
  workout_schedule_id?: number | null;
  workout_schedule?: {
    id: number;
    date: string;
    gyms: {
      id: number;
      name: string;
      icon_url: string | null;
    } | null;
  } | null;
}

interface DbWorkoutSchedule {
  id: number;
  date: string | null;
  season: string | null;
  gyms: {
    id: number;
    name: string;
    icon_url: string | null;
  } | null;
}

let cachedValue: PlaceInfo[] | null = null;
let cachedPromise: Promise<PlaceInfo[]> | null = null;

export function clearPlacesCache(): void {
  cachedValue = null;
  cachedPromise = null;
}

function formatDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

function toDateOrderValue(dateLabel: string | null): number {
  if (!dateLabel) return Number.MAX_SAFE_INTEGER;
  const [monthStr, dayStr] = dateLabel.split('/');
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return Number.MAX_SAFE_INTEGER;
  return month * 100 + day;
}

export async function fetchPlacesForCurrentSeason(options?: { useCache?: boolean }): Promise<PlaceInfo[]> {
  const useCache = options?.useCache !== false;
  if (useCache) {
    if (cachedValue) return cachedValue;
    if (cachedPromise) return cachedPromise;
  }

  const run = async (): Promise<PlaceInfo[]> => {
    const { data: schedules, error: scheduleError } = await supabase
      .from<DbWorkoutSchedule>('workout_schedule')
      .select('id, date, season, gyms(id, name, icon_url)')
      .eq('season', CURRENT_SEASON)
      .order('date', { ascending: true });

    const { data, error } = await supabase
      .from<DbSession>('sessions')
      .select('id, place, date, season, workout_schedule_id, workout_schedule:workout_schedule_id(id, date, gyms(id, name, icon_url))')
      .eq('season', CURRENT_SEASON);

    if ((scheduleError || !schedules) && (error || !data)) {
      console.error('[client] sessions(place) 조회 실패', error || scheduleError);
      return [];
    }

    const byKey: Record<string, PlaceInfo> = {};

    (schedules || [])
      .filter((s) => !!s.gyms?.name)
      .forEach((s) => {
        const key = `schedule:${s.id}`;
        byKey[key] = {
          key,
          name: s.gyms!.name,
          dateLabel: formatDateLabel(s.date),
        };
      });

    (data || []).forEach((s) => {
      const scheduleId = s.workout_schedule?.id || s.workout_schedule_id;
      const name = s.workout_schedule?.gyms?.name || s.place;
      const date = s.workout_schedule?.date || s.date;

      if (!name) return;

      const key = scheduleId ? `schedule:${scheduleId}` : `legacy:${name}`;
      const nextDateLabel = formatDateLabel(date || null);
      const existing = byKey[key];

      if (!existing) {
        byKey[key] = {
          key,
          name,
          dateLabel: nextDateLabel,
        };
        return;
      }

      if (!existing.dateLabel && nextDateLabel) {
        existing.dateLabel = nextDateLabel;
      }
    });

    return Object.values(byKey).sort((a, b) => {
      const dateA = toDateOrderValue(a.dateLabel);
      const dateB = toDateOrderValue(b.dateLabel);
      if (dateA !== dateB) return dateA - dateB;
      return a.name.localeCompare(b.name, 'ko-KR');
    });
  };

  const p = run();
  if (useCache) cachedPromise = p;

  try {
    const result = await p;
    if (useCache && result.length > 0) cachedValue = result;
    return result;
  } finally {
    if (useCache) cachedPromise = null;
  }
}
