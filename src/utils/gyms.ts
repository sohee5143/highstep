import { supabase } from './supabaseClient';
import { Gym } from '../types';

export async function fetchGyms(): Promise<Gym[]> {
  const { data, error } = await supabase
    .from<Gym>('gyms')
    .select('id, name, icon_url, created_at')
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function createGym(name: string, iconUrl: string | null): Promise<Gym | null> {
  const { data, error } = await supabase
    .from<Gym>('gyms')
    .insert([{ name, icon_url: iconUrl }])
    .single();
  if (error) {
    console.error('createGym failed', error);
    return null;
  }
  return data;
}

export async function deleteGym(id: number): Promise<void> {
  const { error } = await supabase.from('gyms').delete().eq('id', id);
  if (error) console.error('deleteGym failed', error);
}

export async function uploadGymIcon(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('gym-icons').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    console.error('uploadGymIcon failed', error);
    return null;
  }
  const { publicURL } = supabase.storage.from('gym-icons').getPublicUrl(path);
  return publicURL;
}
