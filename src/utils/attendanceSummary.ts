import { supabase } from './supabaseClient';
import { AttendanceRecord } from '../types';

interface DbMember {
  id: number;
  name: string;
  type: string | null;
  gender: string | null;
  required_attendance: number | null;
  base_attendance_count: number | null;
  status: string | null;
}

interface DbCheckin {
  member_id: number;
  session_id: number;
  kind: string | null;
}

interface DbSession {
  id: number;
  place: string | null;
  date?: string | null;
  season?: string | null;
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

interface SessionMeta {
  key: string;
  name: string;
}

let cachedValue: AttendanceRecord[] | null = null;
let cachedPromise: Promise<AttendanceRecord[]> | null = null;

export function clearAttendanceSummaryCache(): void {
  cachedValue = null;
  cachedPromise = null;
}

export async function fetchAttendanceSummary(options?: { useCache?: boolean }): Promise<AttendanceRecord[]> {
  const useCache = options?.useCache !== false;
  if (useCache) {
    if (cachedValue) return cachedValue;
    if (cachedPromise) return cachedPromise;
  }

  const run = async (): Promise<AttendanceRecord[]> => {
    const sessionsPromise = (async (): Promise<DbSession[]> => {
      const { data, error } = await supabase
        .from<DbSession>('sessions')
        .select('id, place, date, season, workout_schedule_id, workout_schedule:workout_schedule_id(id, date, gyms(id, name, icon_url))');

      if (!error && data) return data;

      const { data: legacyData, error: legacyError } = await supabase
        .from<DbSession>('sessions')
        .select('id, place, date, season');

      if (legacyError) {
        console.error('[client] sessions 조회 실패', legacyError);
        return [];
      }

      return legacyData || [];
    })();

    const [membersRes, checkinsRes, sessions] = await Promise.all([
      supabase
        .from<DbMember>('members')
        .select('id, name, type, gender, required_attendance, base_attendance_count, status'),
      supabase
        .from<DbCheckin>('checkins')
        .select('member_id, session_id, kind'),
      sessionsPromise,
    ]);

    const { data: members, error: membersError } = membersRes;
    if (membersError) {
      console.error('[client] members 조회 실패', membersError);
      return [];
    }

    const { data: checkins, error: checkinsError } = checkinsRes;
    if (checkinsError) {
      console.error('[client] checkins 조회 실패', checkinsError);
      return [];
    }

  const sessionMetaById: Record<number, SessionMeta> = {};
  (sessions || []).forEach((s) => {
    const scheduleId = s.workout_schedule?.id || s.workout_schedule_id;
    const gymName = s.workout_schedule?.gyms?.name || s.place;

    if (!gymName) return;

    const key = scheduleId ? `schedule:${scheduleId}` : `legacy:${gymName}`;
    sessionMetaById[s.id] = { key, name: gymName };
  });

  const extraByMemberId: Record<number, number> = {};
  const perMemberPlace: Record<number, Record<string, number | string>> = {};

  (checkins || []).forEach((c) => {
    const mid = c.member_id;
    const sid = c.session_id;
    const sessionMeta = sessionMetaById[sid];
    const kind = c.kind;

    if (!sessionMeta) return;

    if (!perMemberPlace[mid]) perMemberPlace[mid] = {};

    if (kind === '25분기 반영') {
      perMemberPlace[mid][sessionMeta.key] = '25분기 반영';
    } else {
      extraByMemberId[mid] = (extraByMemberId[mid] || 0) + 1;
      if (perMemberPlace[mid][sessionMeta.key] !== '25분기 반영') {
        perMemberPlace[mid][sessionMeta.key] = 1;
      }
    }
  });

  const records: AttendanceRecord[] = (members || []).map((m) => {
    const mid = m.id;
    const baseAttendance = m.base_attendance_count || 0;
    const extraDb = extraByMemberId[mid] || 0;

    return {
      type: m.type || '',
      gender: m.gender || '',
      name: m.name,
      requiredAttendance: m.required_attendance || 0,
      attendanceCount: baseAttendance + extraDb,
      status: m.status || 'X',
      records: perMemberPlace[mid] || {},
    };
  });

  records.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

  return records;
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
