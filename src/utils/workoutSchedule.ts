import { supabase } from './supabaseClient';
import { CURRENT_SEASON, ScheduleEntry } from '../types';

interface SessionRow {
  id: number;
  workout_schedule_id?: number | null;
  date?: string | null;
  place?: string | null;
  season?: string | null;
}

const SCHEDULE_SELECT = 'id, date, gym_id, gyms(id, name, icon_url, created_at)';

export async function fetchScheduleForMonth(
  year: number,
  month: number // 1-indexed
): Promise<ScheduleEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from<ScheduleEntry>('workout_schedule')
    .select(SCHEDULE_SELECT)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function fetchScheduleByDate(date: string): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from<ScheduleEntry>('workout_schedule')
    .select(SCHEDULE_SELECT)
    .eq('date', date)
    .order('gym_id', { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function addSchedule(date: string, gymId: number): Promise<void> {
  const payload = [{ date, gym_id: gymId, season: CURRENT_SEASON }];
  const { error } = await supabase
    .from('workout_schedule')
    .insert(payload);

  if (!error) return;

  const { error: legacyError } = await supabase
    .from('workout_schedule')
    .insert([{ date, gym_id: gymId }]);

  if (legacyError) console.error('addSchedule failed', legacyError);
}

export async function deleteSchedule(id: number): Promise<void> {
  const { error } = await supabase.from('workout_schedule').delete().eq('id', id);
  if (error) console.error('deleteSchedule failed', error);
}

export async function findOrCreateSessionForSchedule(schedule: ScheduleEntry): Promise<number | null> {
  const gymName = schedule.gyms?.name || null;

  const { data: linkedSessions, error: linkedError } = await supabase
    .from<SessionRow>('sessions')
    .select('id, workout_schedule_id, date, place')
    .eq('workout_schedule_id', schedule.id)
    .limit(1);

  if (!linkedError && linkedSessions && linkedSessions.length > 0) {
    return linkedSessions[0].id;
  }

  let legacyQuery = supabase
    .from<SessionRow>('sessions')
    .select('id, workout_schedule_id, date, place')
    .eq('date', schedule.date)
    .limit(1);

  if (gymName) {
    legacyQuery = legacyQuery.eq('place', gymName);
  }

  const { data: legacySessions, error: legacyError } = await legacyQuery;
  if (!legacyError && legacySessions && legacySessions.length > 0) {
    const legacySession = legacySessions[0];

    if (!legacySession.workout_schedule_id) {
      await supabase
        .from('sessions')
        .update({ workout_schedule_id: schedule.id, season: CURRENT_SEASON })
        .eq('id', legacySession.id);
    }

    return legacySession.id;
  }

  const payload = {
    workout_schedule_id: schedule.id,
    date: schedule.date,
    place: gymName,
    season: CURRENT_SEASON,
  };

  const { data: createdWithLink, error: createWithLinkError } = await supabase
    .from<SessionRow>('sessions')
    .insert([payload])
    .select('id')
    .single();

  if (!createWithLinkError && createdWithLink) {
    return createdWithLink.id;
  }

  const { data: createdLegacy, error: createLegacyError } = await supabase
    .from<SessionRow>('sessions')
    .insert([{ date: schedule.date, place: gymName, season: CURRENT_SEASON }])
    .select('id')
    .single();

  if (createLegacyError || !createdLegacy) {
    console.error('findOrCreateSessionForSchedule failed', createLegacyError || createWithLinkError);
    return null;
  }

  return createdLegacy.id;
}
