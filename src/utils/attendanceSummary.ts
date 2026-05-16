import { supabase } from './supabaseClient';
import { AttendanceRecord } from '../types';
import { getCurrentQuarter } from './quarters';

interface DbMember {
  id: number;
  name: string;
  type: string | null;
  gender: string | null;
  required_attendance: number | null;
  base_attendance_count: number | null;
  status: string | null;
}

interface DbMemberSeasonProgress {
  member_id: number;
  season: string;
  year: number;
  quarter: number;
  status: 'full' | 'minus_one' | 'X' | '부상';
  attendance_count: number;
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
  year?: number;
  quarter?: number;
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

export function clearAttendanceSummaryCache(): void {
}

/**
 * 특정 분기의 출석 현황 조회
 * @param year 연도 (e.g., 2026)
 * @param quarter 분기 (1-4)
 */
export async function fetchAttendanceSummaryByQuarter(
  year: number,
  quarter: number
): Promise<AttendanceRecord[]> {
  const sessionsPromise = (async (): Promise<DbSession[]> => {
    const { data, error } = await supabase
      .from<DbSession>('sessions')
      .select('id, place, date, season, year, quarter, workout_schedule_id, workout_schedule:workout_schedule_id(id, date, gyms(id, name, icon_url))');

    if (!error && data) return data;

    const { data: legacyData, error: legacyError } = await supabase
      .from<DbSession>('sessions')
      .select('id, place, date, season, year, quarter');

    if (legacyError) {
      console.error('[client] sessions 조회 실패', legacyError);
      return [];
    }

    return legacyData || [];
  })();

  const [membersRes, checkinsRes, sessions, seasonProgressRes] = await Promise.all([
    supabase
      .from<DbMember>('members')
      .select('id, name, type, gender, required_attendance, base_attendance_count, status'),
    supabase
      .from<DbCheckin>('checkins')
      .select('member_id, session_id, kind'),
    sessionsPromise,
    supabase
      .from<DbMemberSeasonProgress>('member_season_progress')
      .select('member_id, season, year, quarter, status, attendance_count')
      .eq('year', year)
      .eq('quarter', quarter)
      .order('member_id'),
  ]);

  const { data: members, error: membersError } = membersRes;
  if (membersError) {
    console.error('[client] members 조회 실패', membersError);
    return [];
  }

  const { data: checkins, error: checkinsError } = checkinsRes;
  if (checkinsError) {
    console.error('[client] checkins 조회 실패', checkinsError);
  }

  const { data: seasonProgress, error: seasonProgressError } = seasonProgressRes;
  if (seasonProgressError) {
    console.error('[client] member_season_progress 조회 실패', seasonProgressError);
  }

  console.log(`[client] 분기 ${year}-Q${quarter} 출석 데이터 조회`);
  console.log('[client] seasonProgress:', seasonProgress);

  // member_id -> status 맵핑
  const statusByMemberId: Record<number, 'full' | 'minus_one' | 'X' | '부상'> = {};
  (seasonProgress || []).forEach((sp) => {
    statusByMemberId[sp.member_id] = sp.status;
  });

  const sessionMetaById: Record<number, SessionMeta> = {};
  (sessions || []).forEach((s) => {
    // 해당 분기의 세션만 필터링
    if (s.year !== year || s.quarter !== quarter) return;

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
    const attendanceCount = baseAttendance + extraDb;
    const requiredAttendance = m.required_attendance || 0;

    // status 결정 우선순위:
    // 1. members.status가 '부상'이면 → '부상'
    // 2. member_season_progress에서 상태를 찾으면 → 사용
    // 3. 없으면 프론트에서 계산
    let status: 'full' | 'minus_one' | 'X' | '부상';

    if (m.status === '부상') {
      status = '부상';
    } else if (statusByMemberId[mid]) {
      status = statusByMemberId[mid];
    } else {
      if (attendanceCount >= requiredAttendance) {
        status = 'full';
      } else if (attendanceCount === requiredAttendance - 1) {
        status = 'minus_one';
      } else {
        status = 'X';
      }
    }

    return {
      type: m.type || '',
      gender: m.gender || '',
      name: m.name,
      requiredAttendance,
      attendanceCount,
      status,
      records: perMemberPlace[mid] || {},
      quarter,
      year,
      quarterKey: `${year}_Q${quarter}`,
    };
  });

  records.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

  return records;
}

/**
 * 현재 분기 데이터 조회 (기존 함수와 호환)
 */
export async function fetchAttendanceSummary(options?: { useCache?: boolean }): Promise<AttendanceRecord[]> {
  // 현재 분기 자동 계산
  const currentQuarter = getCurrentQuarter();
  return fetchAttendanceSummaryByQuarter(currentQuarter.year, currentQuarter.quarter);
}
