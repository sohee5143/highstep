import { supabase } from './supabaseClient';
import { CURRENT_SEASON } from '../types';

interface DbSession {
  place: string;
  date: string | null;
  season: string | null;
}

export interface PlaceInfo {
  name: string;
  dateLabel: string | null;
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

export async function fetchPlacesForCurrentSeason(options?: { useCache?: boolean }): Promise<PlaceInfo[]> {
  const useCache = options?.useCache !== false;
  if (useCache) {
    if (cachedValue) return cachedValue;
    if (cachedPromise) return cachedPromise;
  }

  const run = async (): Promise<PlaceInfo[]> => {
  const { data, error } = await supabase
    .from<DbSession>('sessions')
    .select('place, date, season')
    .eq('season', CURRENT_SEASON);

  if (error || !data) {
    console.error('[client] sessions(place) 조회 실패', error);
    return [];
  }

  const earliestDateByPlace: Record<string, string | null> = {};

  data.forEach((s) => {
    const place = s.place;
    if (!place) return;
    const dateStr = s.date;

    if (!earliestDateByPlace[place]) {
      earliestDateByPlace[place] = dateStr;
      return;
    }

    if (dateStr && earliestDateByPlace[place]) {
      if (dateStr < earliestDateByPlace[place]!) {
        earliestDateByPlace[place] = dateStr;
      }
    }
  });

  const places: PlaceInfo[] = Object.keys(earliestDateByPlace)
    .sort((a, b) => {
      const da = earliestDateByPlace[a] || '';
      const db = earliestDateByPlace[b] || '';
      if (da && db && da !== db) return da < db ? -1 : 1;
      return a.localeCompare(b, 'ko-KR');
    })
    .map((name) => ({
      name,
      dateLabel: formatDateLabel(earliestDateByPlace[name] || null),
    }));

    return places;
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
