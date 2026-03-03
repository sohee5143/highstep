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

export async function fetchAttendanceSummary(): Promise<AttendanceRecord[]> {
  const { data: members, error: membersError } = await supabase
    .from<DbMember>('members')
    .select('id, name, type, gender, required_attendance, base_attendance_count, status');

  if (membersError) {
    console.error('[client] members 조회 실패', membersError);
    return [];
  }

  const { data: checkins, error: checkinsError } = await supabase
    .from<DbCheckin>('checkins')
    .select('member_id, session_id, kind');

  if (checkinsError) {
    console.error('[client] checkins 조회 실패', checkinsError);
    return [];
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from<DbSession>('sessions')
    .select('id, place');

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
}
