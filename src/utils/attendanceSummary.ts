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
  place: string;
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
    const [membersRes, checkinsRes, sessionsRes] = await Promise.all([
      supabase
        .from<DbMember>('members')
        .select('id, name, type, gender, required_attendance, base_attendance_count, status'),
      supabase
        .from<DbCheckin>('checkins')
        .select('member_id, session_id, kind'),
      supabase
        .from<DbSession>('sessions')
        .select('id, place'),
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

    const { data: sessions, error: sessionsError } = sessionsRes;
    if (sessionsError) {
      console.error('[client] sessions 조회 실패', sessionsError);
      return [];
    }

  const sessionPlaceById: Record<number, string> = {};
  (sessions || []).forEach((s) => {
    sessionPlaceById[s.id] = s.place;
  });

  const extraByMemberId: Record<number, number> = {};
  const perMemberPlace: Record<number, Record<string, number | string>> = {};

  (checkins || []).forEach((c) => {
    const mid = c.member_id;
    const sid = c.session_id;
    const place = sessionPlaceById[sid];
    const kind = c.kind;

    if (!place) return;

    if (!perMemberPlace[mid]) perMemberPlace[mid] = {};

    if (kind === '25분기 반영') {
      perMemberPlace[mid][place] = '25분기 반영';
    } else {
      extraByMemberId[mid] = (extraByMemberId[mid] || 0) + 1;
      if (perMemberPlace[mid][place] !== '25분기 반영') {
        perMemberPlace[mid][place] = 1;
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
