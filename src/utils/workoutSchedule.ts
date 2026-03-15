import { supabase } from './supabaseClient';
import { ScheduleEntry } from '../types';

export async function fetchScheduleForMonth(
  year: number,
  month: number // 1-indexed
): Promise<ScheduleEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from<ScheduleEntry>('workout_schedule')
    .select('id, date, gym_id, gyms(id, name, icon_url)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function addSchedule(date: string, gymId: number): Promise<void> {
  const { error } = await supabase
    .from('workout_schedule')
    .insert([{ date, gym_id: gymId }]);
  if (error) console.error('addSchedule failed', error);
}

export async function deleteSchedule(id: number): Promise<void> {
  const { error } = await supabase.from('workout_schedule').delete().eq('id', id);
  if (error) console.error('deleteSchedule failed', error);
}
